import { useEffect, useRef, useState } from "react";
import { Pause, Play, Repeat, Repeat1, Shuffle, SkipBack, SkipForward, Waves } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { AlbumArt } from "@/components/player/AlbumArt";
import { Visualizer } from "@/components/player/Visualizer";
import { FloatingNavbar } from "@/components/player/FloatingNavbar";
import { EqualizerSheet } from "@/components/player/EqualizerSheet";
import { EffectsSheet } from "@/components/player/EffectsSheet";
import { QueueSheet } from "@/components/player/QueueSheet";
import { HistorySheet } from "@/components/player/HistorySheet";
import { FilePicker } from "@/components/player/FilePicker";
import { ThemePicker } from "@/components/player/ThemePicker";
import { useAudioEngine } from "@/hooks/useAudioEngine";
import { useSwipe } from "@/hooks/useSwipe";
import type { Track, PlayHistoryEntry } from "@/lib/types";
import { formatTime } from "@/lib/audio-utils";
import { applyPlaylistOrder, parseM3U } from "@/lib/playlist-utils";
import { applyTheme, THEMES } from "@/lib/themes";
import { savePlayHistory, getPlayHistory, clearPlayHistory } from "@/lib/history-utils";

type VizMode = "pulse" | "bars";

const QUEUE_INDEX_KEY = "mp.queue.index.v1";
const THEME_KEY = "mp.theme.v1";
const THEME_AUTO_KEY = "mp.theme.auto.v1";

const Index = () => {
  const [queue, setQueue] = useState<Track[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [eqOpen, setEqOpen] = useState(false);
  const [fxOpen, setFxOpen] = useState(false);
  const [queueOpen, setQueueOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [playHistory, setPlayHistory] = useState<PlayHistoryEntry[]>([]);
  const [vizMode, setVizMode] = useState<VizMode>("pulse");
  const [playlistEntries, setPlaylistEntries] = useState<string[]>([]);
  const [themeId, setThemeId] = useState<string>(() => localStorage.getItem(THEME_KEY) || "ember");
  const [autoTheme, setAutoTheme] = useState<boolean>(() => {
    const stored = localStorage.getItem(THEME_AUTO_KEY);
    return stored === null ? true : stored === "1";
  });

  const engine = useAudioEngine(queue, currentIndex, setCurrentIndex);
  const current = queue[currentIndex];
  const swipeRef = useRef<HTMLElement>(null);

  // Load play history on mount
  useEffect(() => {
    setPlayHistory(getPlayHistory());
  }, []);

  // Track when a song starts playing
  useEffect(() => {
    if (current && engine.state.isPlaying) {
      savePlayHistory(current);
      setPlayHistory(getPlayHistory());
    }
  }, [current?.id, engine.state.isPlaying]);

  useEffect(() => {
    const t = THEMES.find((x) => x.id === themeId) ?? THEMES[0];
    if (!autoTheme) {
      applyTheme(t);
    }
    localStorage.setItem(THEME_KEY, t.id);
  }, [themeId, autoTheme]);

  useEffect(() => {
    localStorage.setItem(THEME_AUTO_KEY, autoTheme ? "1" : "0");
    if (autoTheme && current) {
      const idx = Math.floor(Math.random() * THEMES.length);
      const randomTheme = THEMES[idx];
      applyTheme(randomTheme);
    }
  }, [autoTheme, current?.id]);

  useSwipe(swipeRef, {
    onSwipeLeft: () => engine.next(),
    onSwipeRight: () => engine.prev(),
    onSwipeUp: () => setQueueOpen(true),
    onSwipeDown: () => {
      if (eqOpen) setEqOpen(false);
      else if (fxOpen) setFxOpen(false);
      else if (queueOpen) setQueueOpen(false);
    },
  });

  useEffect(() => {
    const idx = Number(localStorage.getItem(QUEUE_INDEX_KEY) || 0);
    if (!Number.isNaN(idx)) setCurrentIndex(idx);
  }, []);

  useEffect(() => {
    localStorage.setItem(QUEUE_INDEX_KEY, String(currentIndex));
  }, [currentIndex]);

  const addTracks = (tracks: Track[], replace: boolean) => {
    const base = replace ? [] : queue;
    const seen = new Set(base.map((t) => t.id));
    const merged = [...base];
    for (const t of tracks) if (!seen.has(t.id)) merged.push(t);

    const ordered = playlistEntries.length ? applyPlaylistOrder(merged, playlistEntries) : merged;
    setQueue(ordered);

    // Autoplay
    if (replace || queue.length === 0) {
      setCurrentIndex(0);
      setTimeout(() => engine.play(), 100);
    } else if (!engine.state.isPlaying && tracks.length > 0) {
      const firstNewTrackIndex = ordered.findIndex(t => tracks.some(newT => newT.id === t.id));
      if (firstNewTrackIndex >= 0) {
        setCurrentIndex(firstNewTrackIndex);
        setTimeout(() => engine.play(), 100);
      }
    }
  };

  const clearQueue = () => {
    queue.forEach((t) => t.artworkUrl && URL.revokeObjectURL(t.artworkUrl));
    setQueue([]);
    setCurrentIndex(0);
    engine.pause();
  };

  const importPlaylist = async (playlistFile: File) => {
    try {
      const text = await playlistFile.text();
      const entries = parseM3U(text);
      if (!entries.length) return;

      setPlaylistEntries(entries);
      if (!queue.length) return;

      const activeId = current?.id;
      const ordered = applyPlaylistOrder(queue, entries);
      setQueue(ordered);

      if (activeId) {
        const nextIndex = ordered.findIndex((track) => track.id === activeId);
        if (nextIndex >= 0 && nextIndex !== currentIndex) setCurrentIndex(nextIndex);
      }
    } catch (err) {
      console.error('Failed to import playlist:', err);
    }
  };

  const moveQueueItem = (from: number, to: number) => {
    if (from === to || to < 0 || to >= queue.length) return;

    setQueue((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      if (!moved) return prev;
      next.splice(to, 0, moved);
      return next;
    });

    setCurrentIndex((prev) => {
      if (prev === from) return to;
      if (from < prev && to >= prev) return prev - 1;
      if (from > prev && to <= prev) return prev + 1;
      return prev;
    });
  };

  const playFromHistory = (trackId: string) => {
    const idx = queue.findIndex((t) => t.id === trackId);
    if (idx >= 0) {
      setCurrentIndex(idx);
      setTimeout(() => engine.play(), 0);
      setHistoryOpen(false);
    }
  };

  const handleClearHistory = () => {
    clearPlayHistory();
    setPlayHistory([]);
  };

  return (
    <main ref={swipeRef} className="relative min-h-screen overflow-hidden touch-pan-y">
      <h1 className="sr-only">Aurora Music Player — sleek local audio player with EQ and reverb</h1>

      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 left-1/2 h-[460px] w-[460px] -translate-x-1/2 rounded-full opacity-30 blur-3xl"
             style={{ background: "radial-gradient(circle, hsl(var(--glow) / 0.55), hsl(var(--glow-2) / 0.35) 55%, transparent 70%)" }} />
        <div className="absolute -bottom-40 -right-20 h-[380px] w-[380px] rounded-full opacity-25 blur-3xl"
             style={{ background: "radial-gradient(circle, hsl(var(--glow-2) / 0.5), transparent 70%)" }} />
      </div>

      <div className="mx-auto flex min-h-screen w-full max-w-xl flex-col px-4 pb-28 pt-4 sm:pb-32 sm:pt-6">
        <header className="mb-3 flex items-center gap-2 animate-fade-in-up">
          <ThemePicker
            current={themeId}
            autoChange={autoTheme}
            onSelect={(t) => setThemeId(t.id)}
            onToggleAuto={setAutoTheme}
          />
          <div className="min-w-0 flex-1 px-1">
            <p className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground sm:text-[10px]">Now Playing</p>
            <h2 className="mt-0.5 truncate text-sm font-semibold sm:text-base">{current?.title ?? "Nothing loaded"}</h2>
            <p className="truncate text-[11px] text-muted-foreground sm:text-xs">
              {current?.artist || (queue.length ? "Unknown artist" : "Swipe ← → to skip · ↑ for library")}
            </p>
          </div>
          <button
            onClick={() => setVizMode((m) => (m === "pulse" ? "bars" : "pulse"))}
            className="icon-btn h-9 w-9 shrink-0"
            aria-label="Toggle bars visualizer"
          >
            <Waves className="h-4 w-4" />
          </button>
        </header>

        <section className="relative flex min-h-0 flex-1 flex-col items-center justify-center pt-1">
          <div className="relative aspect-square w-full max-w-[200px] sm:max-w-[320px] lg:max-w-[440px]">
            <div className="pointer-events-none absolute inset-[-18px] sm:inset-[-24px] lg:inset-[-30px]">
              <div className="art-glow-circle-1 absolute w-32 h-32 rounded-full" />
              <div className="art-glow-circle-2 absolute w-40 h-40 rounded-full" />
              <div className="art-glow-circle-3 absolute w-36 h-36 rounded-full" />
            </div>
            <div className="relative h-full w-full">
              <AlbumArt track={current} />
            </div>
          </div>

          {vizMode === "bars" && (
            <div className="mt-3 h-16 w-full sm:mt-4 sm:h-20">
              <Visualizer getAnalyser={engine.getAnalyser} mode="bars" active={engine.state.isPlaying} />
            </div>
          )}
        </section>

        <section className="mt-3 space-y-2.5">
          <div className="space-y-1.5">
            <Slider
              min={0}
              max={engine.state.duration || 0}
              step={0.1}
              value={[Math.min(engine.state.currentTime, engine.state.duration || 0)]}
              onValueChange={(v) => engine.seek(v[0])}
              disabled={!current}
            />
            <div className="flex justify-between text-[10px] tabular-nums text-muted-foreground sm:text-[11px]">
              <span>{formatTime(engine.state.currentTime)}</span>
              <span>{formatTime(engine.state.duration)}</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <button
              aria-label="Shuffle"
              onClick={engine.toggleShuffle}
              className={`icon-btn h-9 w-9 sm:h-10 sm:w-10 ${engine.state.shuffle ? "text-accent" : ""}`}
            >
              <Shuffle className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-1.5 sm:gap-2">
              <button aria-label="Previous" onClick={engine.prev} className="icon-btn h-10 w-10 sm:h-11 sm:w-11" disabled={!queue.length}>
                <SkipBack className="h-4 w-4" />
              </button>
              <button
                aria-label={engine.state.isPlaying ? "Pause" : "Play"}
                onClick={engine.toggle}
                disabled={!current}
                className="inline-flex h-12 w-12 items-center justify-center rounded-full text-primary-foreground transition-transform active:scale-95 disabled:opacity-40 sm:h-14 sm:w-14"
                style={{ background: "linear-gradient(135deg, hsl(var(--glow-3)), hsl(var(--glow)) 55%, hsl(var(--glow-2)))" }}
              >
                {engine.state.isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
              </button>
              <button aria-label="Next" onClick={engine.next} className="icon-btn h-10 w-10 sm:h-11 sm:w-11" disabled={!queue.length}>
                <SkipForward className="h-4 w-4" />
              </button>
            </div>

            <button
              aria-label="Repeat"
              onClick={engine.cycleRepeat}
              className={`icon-btn h-9 w-9 sm:h-10 sm:w-10 ${engine.state.repeat !== "off" ? "text-accent" : ""}`}
            >
              {engine.state.repeat === "one" ? <Repeat1 className="h-4 w-4" /> : <Repeat className="h-4 w-4" />}
            </button>
          </div>
        </section>

        {queue.length === 0 && (
          <section className="mt-6 animate-fade-in-up">
            <FilePicker variant="full" onTracks={addTracks} onPlaylist={importPlaylist} />
          </section>
        )}
      </div>

      <FloatingNavbar
        onAddTracks={addTracks}
        onOpenQueue={() => setQueueOpen(true)}
        onOpenEq={() => setEqOpen(true)}
        onOpenEffects={() => setFxOpen(true)}
        onOpenHistory={() => setHistoryOpen(true)}
      />

      <EqualizerSheet
        open={eqOpen}
        onOpenChange={setEqOpen}
        gains={engine.state.eqGains}
        onChange={engine.setEqGain}
        onReset={engine.resetEq}
      />
      <EffectsSheet
        open={fxOpen}
        onOpenChange={setFxOpen}
        speed={engine.state.speed}
        onSpeed={engine.setSpeed}
        preservePitch={engine.state.preservePitch}
        onPreservePitch={engine.setPreservePitch}
        reverbWet={engine.state.reverbWet}
        onReverbWet={engine.setReverbWet}
      />
      <QueueSheet
        open={queueOpen}
        onOpenChange={setQueueOpen}
        queue={queue}
        currentIndex={currentIndex}
        onSelect={(i) => { setCurrentIndex(i); setTimeout(() => engine.play(), 0); }}
        onAdd={addTracks}
        onPlaylist={importPlaylist}
        onMove={moveQueueItem}
        onClear={clearQueue}
      />
      <HistorySheet
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        history={playHistory}
        onPlay={playFromHistory}
        onClear={handleClearHistory}
      />
    </main>
  );
};

export default Index;
