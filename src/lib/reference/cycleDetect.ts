/**
 * Repetition detection via peak finding on the primary joint trajectory.
 * Pure math, fully unit-tested.
 */

import { movingAverage, range } from './smoothing';

export interface PeakOptions {
  /**
   * Minimum prominence a peak must clear, as a fraction of the signal range.
   * Default 0.3 — a peak has to reach at least 30% of the full ROM to count as
   * a rep, which rejects jitter. See README "Thresholds".
   */
  minProminenceFraction?: number;
  /** Minimum samples between two peaks, to avoid double-counting one rep. */
  minDistance?: number;
  /** Smoothing window applied before detection. */
  smoothWindow?: number;
  /**
   * Absolute minimum range (in the signal's own units — degrees for joint
   * angles) the smoothed signal must span before any peak counts. Rejects pure
   * jitter where every wiggle would otherwise clear a fraction-of-range bar.
   * Default 10° — a rep has meaningfully more ROM than sensor noise. Tunable.
   */
  minAbsoluteRange?: number;
}

/**
 * Find indices of local maxima that clear a prominence threshold. Used for rep
 * counting; deliberately simple and robust to small noise.
 */
export function detectPeaks(signal: number[], opts: PeakOptions = {}): number[] {
  const { minProminenceFraction = 0.3, minDistance = 5, smoothWindow = 5, minAbsoluteRange = 10 } = opts;
  if (signal.length < 3) return [];

  const s = movingAverage(signal, smoothWindow);
  const r = range(s);
  if (r < minAbsoluteRange) return [];
  const min = Math.min(...s);
  const threshold = min + r * minProminenceFraction;

  const peaks: number[] = [];
  for (let i = 1; i < s.length - 1; i++) {
    if (s[i] > s[i - 1] && s[i] >= s[i + 1] && s[i] >= threshold) {
      // Enforce min distance: keep the taller of two close peaks.
      const last = peaks[peaks.length - 1];
      if (last !== undefined && i - last < minDistance) {
        if (s[i] > s[last]) peaks[peaks.length - 1] = i;
      } else {
        peaks.push(i);
      }
    }
  }
  return peaks;
}

/**
 * Count repetitions in a primary-joint trajectory.
 * - When `multiRep` is false, the clip is treated as a single rep (1).
 * - When true, the rep count is the number of detected peaks (min 1).
 */
export function countReps(trajectory: number[], multiRep: boolean, opts?: PeakOptions): number {
  if (!multiRep) return 1;
  const peaks = detectPeaks(trajectory, opts);
  return Math.max(1, peaks.length);
}
