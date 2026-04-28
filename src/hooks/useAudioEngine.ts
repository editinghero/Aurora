import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EQ_BANDS, type EqGains, type Track } from "@/lib/types";
import { createReverbImpulse } from "@/lib/reverb";

export type RepeatMode = "off" | "all" | "one";

type EngineState = {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  speed: number;
  preservePitch: boolean;
  reverbWet: number; // 0..1
  eightDEnabled: boolean;
  eightDSpeed: number;
  eqGains: EqGains;
  shuffle: boolean;
  repeat: RepeatMode;
};

const DEFAULT_EQ: EqGains = new Array(EQ_BANDS.length).fill(0);

export function useAudioEngine(queue: Track[], currentIndex: number, onIndexChange: (i: number) => void) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const eqNodesRef = useRef<BiquadFilterNode[]>([]);
  const dryGainRef = useRef<GainNode | null>(null);
  const wetGainRef = useRef<GainNode | null>(null);
  const convolverRef = useRef<ConvolverNode | null>(null);
  const pannerRef = useRef<StereoPannerNode | null>(null);
  const masterRef = useRef<GainNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);

  const [state, setState] = useState<EngineState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 1,
    speed: 1,
    preservePitch: true,
    reverbWet: 0,
    eightDEnabled: false,
    eightDSpeed: 0.15,
    eqGains: DEFAULT_EQ,
    shuffle: false,
    repeat: "off",
  });

  // Lazy graph init on first user gesture (play)
  const ensureGraph = useCallback(() => {
    if (!audioRef.current) {
      const a = new Audio();
      a.crossOrigin = "anonymous";
      a.preload = "metadata";
      audioRef.current = a;
    }
    if (ctxRef.current) return;
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx: AudioContext = new Ctx();
    ctxRef.current = ctx;

    const src = ctx.createMediaElementSource(audioRef.current!);
    sourceRef.current = src;

    // 10-band EQ chain
    const filters = EQ_BANDS.map((freq, i) => {
      const f = ctx.createBiquadFilter();
      if (i === 0) f.type = "lowshelf";
      else if (i === EQ_BANDS.length - 1) f.type = "highshelf";
      else f.type = "peaking";
      f.frequency.value = freq;
      f.Q.value = 1;
      f.gain.value = 0;
      return f;
    });
    eqNodesRef.current = filters;
    for (let i = 0; i < filters.length - 1; i++) filters[i].connect(filters[i + 1]);

    // Dry / wet split for reverb with tone-shaping pre-filter for warmth.
    const dry = ctx.createGain(); dry.gain.value = 1;
    const wet = ctx.createGain(); wet.gain.value = 0;
    const reverbPre = ctx.createBiquadFilter();
    reverbPre.type = "lowpass";
    reverbPre.frequency.value = 6500; // tame harsh highs going into the reverb
    reverbPre.Q.value = 0.7;
    const conv = ctx.createConvolver();
    conv.normalize = true;
    conv.buffer = createReverbImpulse(ctx, 3.5, 3.5);

    // 8D Panner
    const panner = ctx.createStereoPanner();
    panner.pan.value = 0;

    const master = ctx.createGain(); master.gain.value = 1;
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.82;

    src.connect(filters[0]);
    const eqOut = filters[filters.length - 1];
    eqOut.connect(dry);
    eqOut.connect(reverbPre);
    reverbPre.connect(conv);
    conv.connect(wet);
    dry.connect(panner);
    wet.connect(panner);
    panner.connect(master);
    master.connect(analyser);
    analyser.connect(ctx.destination);

    dryGainRef.current = dry;
    wetGainRef.current = wet;
    convolverRef.current = conv;
    pannerRef.current = panner;
    masterRef.current = master;
    analyserRef.current = analyser;
  }, []);

  // 8D Animation Loop
  useEffect(() => {
    if (state.eightDEnabled && state.isPlaying) {
      const animate = (time: number) => {
        if (pannerRef.current) {
          // Sine wave oscillation for smooth 360-like rotation effect
          const pan = Math.sin(time / 1000 * state.eightDSpeed * Math.PI * 2);
          pannerRef.current.pan.setTargetAtTime(pan, ctxRef.current!.currentTime, 0.05);
        }
        animationRef.current = requestAnimationFrame(animate);
      };
      animationRef.current = requestAnimationFrame(animate);
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      if (pannerRef.current && ctxRef.current) {
        pannerRef.current.pan.setTargetAtTime(0, ctxRef.current.currentTime, 0.1);
      }
    }
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [state.eightDEnabled, state.isPlaying, state.eightDSpeed]);

  // Bind <audio> events
  useEffect(() => {
    const a = audioRef.current ?? (audioRef.current = new Audio());
    a.preload = "metadata";

    const onTime = () => setState((s) => ({ ...s, currentTime: a.currentTime }));
    const onMeta = () => setState((s) => ({ ...s, duration: a.duration || 0 }));
    const onPlay = () => setState((s) => ({ ...s, isPlaying: true }));
    const onPause = () => setState((s) => ({ ...s, isPlaying: false }));
    const onEnd = () => handleEnded();

    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onMeta);
    a.addEventListener("durationchange", onMeta);
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    a.addEventListener("ended", onEnd);
    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onMeta);
      a.removeEventListener("durationchange", onMeta);
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
      a.removeEventListener("ended", onEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue, currentIndex, state.repeat, state.shuffle]);

  // Load source when track changes
  const objectUrlRef = useRef<string | null>(null);
  useEffect(() => {
    const a = audioRef.current ?? (audioRef.current = new Audio());
    const track = queue[currentIndex];
    if (!track) {
      a.removeAttribute("src");
      a.load();
      return;
    }
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const url = URL.createObjectURL(track.file);
    objectUrlRef.current = url;
    a.src = url;
    a.playbackRate = state.speed;
    (a as any).preservesPitch = state.preservePitch;
    (a as any).mozPreservesPitch = state.preservePitch;
    (a as any).webkitPreservesPitch = state.preservePitch;
    a.volume = state.volume;
    
    // Restore last position for this track
    const savedPosition = localStorage.getItem(`track-position-${track.id}`);
    if (savedPosition) {
      a.currentTime = parseFloat(savedPosition);
    }
    
    if (state.isPlaying) {
      a.play().catch(() => {});
    }
    return () => {
      // Save position before cleanup
      if (track && a.currentTime > 0) {
        localStorage.setItem(`track-position-${track.id}`, a.currentTime.toString());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue, currentIndex]);

  // Save position periodically while playing
  useEffect(() => {
    if (!state.isPlaying) return;
    
    const interval = setInterval(() => {
      const a = audioRef.current;
      const track = queue[currentIndex];
      if (a && track && a.currentTime > 0) {
        localStorage.setItem(`track-position-${track.id}`, a.currentTime.toString());
      }
    }, 5000); // Save every 5 seconds
    
    return () => clearInterval(interval);
  }, [state.isPlaying, queue, currentIndex]);

  useEffect(() => () => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
  }, []);

  const handleEnded = useCallback(() => {
    const a = audioRef.current!;
    if (state.repeat === "one") {
      a.currentTime = 0;
      a.play().catch(() => {});
      return;
    }
    if (queue.length === 0) return;
    let next = currentIndex + 1;
    if (state.shuffle) {
      if (queue.length > 1) {
        do { next = Math.floor(Math.random() * queue.length); } while (next === currentIndex);
      } else next = 0;
    }
    if (next >= queue.length) {
      if (state.repeat === "all") next = 0;
      else { setState((s) => ({ ...s, isPlaying: false })); return; }
    }
    onIndexChange(next);
  }, [queue, currentIndex, state.repeat, state.shuffle, onIndexChange]);

  const play = useCallback(async () => {
    ensureGraph();
    const a = audioRef.current!;
    if (ctxRef.current?.state === "suspended") await ctxRef.current.resume();
    try { await a.play(); } catch {}
  }, [ensureGraph]);

  const pause = useCallback(() => audioRef.current?.pause(), []);
  const toggle = useCallback(() => (state.isPlaying ? pause() : play()), [state.isPlaying, play, pause]);

  const seek = useCallback((t: number) => {
    const a = audioRef.current; if (!a) return;
    a.currentTime = Math.max(0, Math.min(a.duration || 0, t));
  }, []);

  const setVolume = useCallback((v: number) => {
    if (audioRef.current) audioRef.current.volume = v;
    setState((s) => ({ ...s, volume: v }));
  }, []);

  const setSpeed = useCallback((s: number) => {
    if (audioRef.current) audioRef.current.playbackRate = s;
    setState((p) => ({ ...p, speed: s }));
  }, []);

  const setPreservePitch = useCallback((b: boolean) => {
    const a = audioRef.current as any;
    if (a) { a.preservesPitch = b; a.mozPreservesPitch = b; a.webkitPreservesPitch = b; }
    setState((p) => ({ ...p, preservePitch: b }));
  }, []);

  const setReverbWet = useCallback((w: number) => {
    ensureGraph();
    if (wetGainRef.current && dryGainRef.current && ctxRef.current) {
      const t = ctxRef.current.currentTime;
      // Equal-power-ish crossfade so the perceived loudness stays stable
      // and reverb sounds lush rather than washed out.
      const wetGain = Math.sin((w * Math.PI) / 2) * 0.9;
      const dryGain = Math.cos((w * Math.PI) / 2) * 0.85 + 0.15;
      wetGainRef.current.gain.linearRampToValueAtTime(wetGain, t + 0.08);
      dryGainRef.current.gain.linearRampToValueAtTime(dryGain, t + 0.08);
    }
    setState((p) => ({ ...p, reverbWet: w }));
  }, [ensureGraph]);

  const setEightDEnabled = useCallback((b: boolean) => {
    ensureGraph();
    setState((p) => ({ ...p, eightDEnabled: b }));
  }, [ensureGraph]);

  const setEightDSpeed = useCallback((s: number) => {
    setState((p) => ({ ...p, eightDSpeed: s }));
  }, []);

  const setEqGain = useCallback((index: number, gainDb: number) => {
    ensureGraph();
    const node = eqNodesRef.current[index];
    if (node && ctxRef.current) {
      node.gain.setTargetAtTime(gainDb, ctxRef.current.currentTime, 0.02);
    }
    setState((p) => {
      const next = [...p.eqGains]; next[index] = gainDb;
      return { ...p, eqGains: next };
    });
  }, [ensureGraph]);

  const resetEq = useCallback(() => {
    eqNodesRef.current.forEach((n) => { if (ctxRef.current) n.gain.setTargetAtTime(0, ctxRef.current.currentTime, 0.02); });
    setState((p) => ({ ...p, eqGains: [...DEFAULT_EQ] }));
  }, []);

  const next = useCallback(() => {
    if (!queue.length) return;
    let i = currentIndex + 1;
    if (state.shuffle && queue.length > 1) {
      do { i = Math.floor(Math.random() * queue.length); } while (i === currentIndex);
    }
    if (i >= queue.length) i = 0;
    onIndexChange(i);
  }, [queue, currentIndex, state.shuffle, onIndexChange]);

  const prev = useCallback(() => {
    const a = audioRef.current;
    if (a && a.currentTime > 3) { a.currentTime = 0; return; }
    if (!queue.length) return;
    let i = currentIndex - 1;
    if (i < 0) i = queue.length - 1;
    onIndexChange(i);
  }, [queue, currentIndex, onIndexChange]);

  const toggleShuffle = useCallback(() => setState((p) => ({ ...p, shuffle: !p.shuffle })), []);
  const cycleRepeat = useCallback(() => setState((p) => ({
    ...p, repeat: p.repeat === "off" ? "all" : p.repeat === "all" ? "one" : "off",
  })), []);

  const getAnalyser = useCallback(() => analyserRef.current, []);

  return useMemo(() => ({
    state,
    play, pause, toggle, seek, next, prev,
    setVolume, setSpeed, setPreservePitch, setReverbWet,
    setEightDEnabled, setEightDSpeed,
    setEqGain, resetEq,
    toggleShuffle, cycleRepeat,
    getAnalyser,
  }), [state, play, pause, toggle, seek, next, prev, setVolume, setSpeed, setPreservePitch, setReverbWet, setEightDEnabled, setEightDSpeed, setEqGain, resetEq, toggleShuffle, cycleRepeat, getAnalyser]);
}
