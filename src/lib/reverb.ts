/**
 * Generates a higher-quality synthetic stereo impulse response for ConvolverNode.
 * Uses exponential decay with subtle low-pass coloration and a short pre-delay
 * to avoid the harsh "white-noise-burst" sound of a naive IR.
 */
export function createReverbImpulse(
  ctx: AudioContext,
  seconds = 3.2,
  decay = 3.0,
): AudioBuffer {
  const rate = ctx.sampleRate;
  const length = Math.max(1, Math.floor(rate * seconds));
  const preDelay = Math.floor(rate * 0.02); // 20ms pre-delay → sense of space
  const impulse = ctx.createBuffer(2, length, rate);

  for (let ch = 0; ch < 2; ch++) {
    const data = impulse.getChannelData(ch);
    // Simple one-pole low-pass state for smoother, warmer tail.
    let lp = 0;
    const lpCoef = 0.35 + ch * 0.05; // slight stereo decorrelation
    for (let i = 0; i < length; i++) {
      if (i < preDelay) { data[i] = 0; continue; }
      const t = (i - preDelay) / (length - preDelay);
      // Exponential decay envelope (smoother than power curve)
      const env = Math.pow(1 - t, decay) * Math.exp(-t * 3);
      const noise = Math.random() * 2 - 1;
      lp = lp * lpCoef + noise * (1 - lpCoef);
      data[i] = lp * env;
    }
    // Normalize per channel to keep volume consistent
    let max = 0;
    for (let i = 0; i < length; i++) if (Math.abs(data[i]) > max) max = Math.abs(data[i]);
    if (max > 0) for (let i = 0; i < length; i++) data[i] /= max;
  }
  return impulse;
}
