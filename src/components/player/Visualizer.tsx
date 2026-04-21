import { useEffect, useRef } from "react";

type Mode = "circular" | "bars" | "pulse";

export function Visualizer({
  getAnalyser,
  mode,
  active,
  onEnergyFrame,
}: {
  getAnalyser: () => AnalyserNode | null;
  mode: Mode;
  active: boolean;
  onEnergyFrame?: (value: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let accent = "18 95% 62%";
    let accent2 = "332 88% 64%";
    let accent3 = "42 96% 62%";
    let lastColorRead = -999;

    const readColors = (time: number) => {
      if (time - lastColorRead < 220) return;
      lastColorRead = time;
      const rootStyles = getComputedStyle(document.documentElement);
      accent = rootStyles.getPropertyValue("--glow").trim() || accent;
      accent2 = rootStyles.getPropertyValue("--glow-2").trim() || accent2;
      accent3 = rootStyles.getPropertyValue("--glow-3").trim() || accent3;
    };

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    let data = new Uint8Array(getAnalyser()?.frequencyBinCount ?? 128);
    let energy = 0;
    let bass = 0;
    let ambient = 0;
    let lastFrame = 0;

    const draw = (time = 0) => {
      rafRef.current = requestAnimationFrame(draw);
      if (time - lastFrame < 16) return;
      lastFrame = time;

      readColors(time);

      const analyser = getAnalyser();
      if (analyser && data.length !== analyser.frequencyBinCount) {
        data = new Uint8Array(analyser.frequencyBinCount);
      }

      if (analyser && active) analyser.getByteFrequencyData(data);
      else data.fill(0);

      const { width: W, height: H } = canvas;
      ctx.clearRect(0, 0, W, H);

      let total = 0;
      for (let i = 0; i < data.length; i++) total += data[i];
      const overall = total / Math.max(1, data.length * 255);

      const sr = analyser?.context.sampleRate ?? 44100;
      const fftSize = analyser?.fftSize ?? 2048;
      const binHz = sr / fftSize;
      const bassBins = Math.max(2, Math.min(data.length - 1, Math.floor(160 / binHz)));
      let bassSum = 0;
      for (let i = 1; i <= bassBins; i++) bassSum += data[i] || 0;
      const bassRaw = bassSum / Math.max(1, bassBins * 255);

      const targetEnergy = active ? Math.min(1, overall * 1.75) : 0;
      const targetBass = active ? Math.min(1, bassRaw * 1.5) : 0;
      // Smooth attack/release for canvas visualizer
      energy += (targetEnergy - energy) * (targetEnergy > energy ? 0.26 : 0.08);
      bass += (targetBass - bass) * (targetBass > bass ? 0.3 : 0.12);

      // Ambient glow - smooth and responsive without flickering
      const targetAmbient = active ? Math.min(1, overall * 1.6 + bassRaw * 0.6) : 0;
      ambient += (targetAmbient - ambient) * (targetAmbient > ambient ? 0.18 : 0.1);

      const pulse = Math.min(1, energy * 0.72 + bass * 0.58);
      onEnergyFrame?.(ambient);

      if (mode === "pulse") {
        if (pulse < 0.01 && !active) return;

        const inset = Math.min(W, H) * 0.13;
        const x = inset;
        const y = inset;
        const w = W - inset * 2;
        const h = H - inset * 2;
        const radius = Math.min(w, h) * 0.17;
        const spread = Math.min(W, H) * (0.02 + pulse * 0.035);

        ctx.globalCompositeOperation = "lighter";
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        ctx.shadowBlur = 12 + pulse * 22;
        ctx.shadowColor = `hsl(${accent} / ${0.2 + pulse * 0.34})`;
        ctx.strokeStyle = `hsl(${accent} / ${0.16 + pulse * 0.28})`;
        ctx.lineWidth = dpr * (1 + pulse * 1.1);
        roundRect(ctx, x - spread, y - spread, w + spread * 2, h + spread * 2, radius + spread);
        ctx.stroke();

        if (pulse > 0.06) {
          const s2 = spread * 1.35;
          ctx.shadowBlur = 18 + pulse * 28;
          ctx.shadowColor = `hsl(${accent2} / ${0.16 + pulse * 0.24})`;
          ctx.strokeStyle = `hsl(${accent2} / ${0.08 + pulse * 0.16})`;
          ctx.lineWidth = dpr * 0.8;
          roundRect(ctx, x - s2, y - s2, w + s2 * 2, h + s2 * 2, radius + s2);
          ctx.stroke();
        }

        if (bass > 0.08) {
          const s3 = spread * 0.55;
          ctx.shadowBlur = 10 + bass * 20;
          ctx.shadowColor = `hsl(${accent3} / ${0.12 + bass * 0.22})`;
          ctx.strokeStyle = `hsl(${accent3} / ${0.07 + bass * 0.14})`;
          ctx.lineWidth = dpr * 0.7;
          roundRect(ctx, x - s3, y - s3, w + s3 * 2, h + s3 * 2, radius + s3);
          ctx.stroke();
        }

        ctx.shadowBlur = 0;
        ctx.globalCompositeOperation = "source-over";
        return;
      }

      if (mode === "circular") {
        const cx = W / 2;
        const cy = H / 2;
        const radius = Math.min(W, H) * 0.34;
        const barCount = 64;
        const step = Math.floor((data.length || barCount) / barCount) || 1;

        for (let i = 0; i < barCount; i++) {
          const v = (data[i * step] || 0) / 255;
          const len = 5 + v * (Math.min(W, H) * 0.16);
          const angle = (i / barCount) * Math.PI * 2 - Math.PI / 2;
          const x1 = cx + Math.cos(angle) * radius;
          const y1 = cy + Math.sin(angle) * radius;
          const x2 = cx + Math.cos(angle) * (radius + len);
          const y2 = cy + Math.sin(angle) * (radius + len);
          const grad = ctx.createLinearGradient(x1, y1, x2, y2);
          grad.addColorStop(0, `hsl(${accent2} / 0.8)`);
          grad.addColorStop(1, `hsl(${accent} / 0.95)`);
          ctx.strokeStyle = grad;
          ctx.lineWidth = 2.5 * dpr;
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }
        return;
      }

      const barCount = 48;
      const gap = 4 * dpr;
      const bw = (W - gap * (barCount - 1)) / barCount;
      const step = Math.floor((data.length || barCount) / barCount) || 1;

      for (let i = 0; i < barCount; i++) {
        const v = (data[i * step] || 0) / 255;
        const h = Math.max(4 * dpr, v * H * 0.94);
        const x = i * (bw + gap);
        const y = H - h;
        const grad = ctx.createLinearGradient(0, y, 0, H);
        grad.addColorStop(0, `hsl(${accent} / 0.95)`);
        grad.addColorStop(1, `hsl(${accent2} / 0.45)`);
        ctx.fillStyle = grad;
        roundRect(ctx, x, y, bw, h, Math.min(bw / 2, 6 * dpr));
        ctx.fill();
      }
    };

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      ro.disconnect();
      onEnergyFrame?.(0);
    };
  }, [getAnalyser, mode, active, onEnergyFrame]);

  return <canvas ref={canvasRef} className="block h-full w-full" aria-hidden="true" />;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
}
