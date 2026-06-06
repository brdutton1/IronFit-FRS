/**
 * Signal smoothing + smoothness scoring for joint-angle trajectories.
 * Pure math, fully unit-tested.
 */

/** Centered moving average. `window` is clamped to odd and ≥ 1. */
export function movingAverage(signal: number[], window = 5): number[] {
  if (signal.length === 0) return [];
  const w = Math.max(1, window % 2 === 0 ? window + 1 : window);
  const half = Math.floor(w / 2);
  const out: number[] = new Array(signal.length);
  for (let i = 0; i < signal.length; i++) {
    let sum = 0;
    let count = 0;
    for (let j = i - half; j <= i + half; j++) {
      if (j >= 0 && j < signal.length) {
        sum += signal[j];
        count++;
      }
    }
    out[i] = sum / count;
  }
  return out;
}

export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/** Population variance. */
export function variance(values: number[]): number {
  if (values.length === 0) return 0;
  const m = mean(values);
  return mean(values.map((v) => (v - m) ** 2));
}

export function range(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.max(...values) - Math.min(...values);
}

/**
 * Smoothness score in [0, 1], where 1 is perfectly smooth. We compare the raw
 * signal to its moving average and report 1 - (residual RMSE / signal range).
 * A signal with no range is, trivially, perfectly smooth.
 */
export function smoothnessScore(signal: number[], window = 5): number {
  if (signal.length < 3) return 1;
  const smoothed = movingAverage(signal, window);
  const sqErr = signal.map((v, i) => (v - smoothed[i]) ** 2);
  const rmse = Math.sqrt(mean(sqErr));
  const r = range(signal);
  if (r < 1e-6) return 1;
  return Math.min(1, Math.max(0, 1 - rmse / r));
}
