/**
 * Generates a higher-quality synthetic stereo impulse response for ConvolverNode.
 * Uses exponential decay with subtle low-pass coloration, early reflections,
 * and a short pre-delay to create a lush, professional-sounding reverb.
 */
export function createReverbImpulse(
  ctx: AudioContext,
  seconds = 3.5,
  decay = 3.5,
): AudioBuffer {
  const rate = ctx.sampleRate;
  const length = Math.max(1, Math.floor(rate * seconds));
  const preDelay = Math.floor(rate * 0.025); // 25ms pre-delay
  const impulse = ctx.createBuffer(2, length, rate);

  for (let ch = 0; ch < 2; ch++) {
    const data = impulse.getChannelData(ch);

    // Early reflections to simulate room boundaries and add "texture"
    for (let j = 0; j < 10; j++) {
      const pos = Math.floor(Math.random() * rate * 0.045) + Math.floor(rate * 0.005);
      if (pos < length) {
        data[pos] += (Math.random() * 2 - 1) * 0.2;
      }
    }

    let lp = 0;
    // Stereo decorrelation via different filter coefficients
    const lpCoef = 0.25 + ch * 0.12;

    for (let i = 0; i < length; i++) {
      if (i < preDelay) continue;
      const t = (i - preDelay) / (length - preDelay);

      // Lush exponential decay envelope
      const env = Math.pow(1 - t, decay) * Math.exp(-t * 2.5);

      // Multi-source noise for a thicker, less "grainy" tail
      const noise = (Math.random() * 2 - 1) * 0.7 + (Math.random() * 2 - 1) * 0.3;

      lp = lp * lpCoef + noise * (1 - lpCoef);
      data[i] += lp * env;
    }

    // DC Offset removal (High Pass) and normalization
    let mean = 0;
    for (let i = 0; i < length; i++) mean += data[i];
    mean /= length;

    let max = 0;
    for (let i = 0; i < length; i++) {
      data[i] -= mean; // Remove DC offset
      const abs = Math.abs(data[i]);
      if (abs > max) max = abs;
    }

    if (max > 0) {
      for (let i = 0; i < length; i++) {
        // Gain reduction (0.6) to avoid clipping when convolved with loud source
        data[i] = (data[i] / max) * 0.6;
        // Smooth fade-out at the very end
        if (i > length - 500) {
          data[i] *= (length - i) / 500;
        }
      }
    }
  }
  return impulse;
}
