import { describe, expect, it } from 'vitest';
import { countReps, detectPeaks } from '@/lib/reference/cycleDetect';

/** Build a sine-like multi-rep signal with `reps` clear peaks. */
function multiRep(reps: number, samplesPerRep = 20): number[] {
  const out: number[] = [];
  for (let r = 0; r < reps; r++) {
    for (let i = 0; i < samplesPerRep; i++) {
      const phase = (i / samplesPerRep) * 2 * Math.PI;
      out.push(50 - 50 * Math.cos(phase)); // 0 → 100 → 0
    }
  }
  return out;
}

describe('detectPeaks', () => {
  it('finds one peak in a single rise-and-fall', () => {
    const signal = [0, 10, 30, 60, 90, 100, 90, 60, 30, 10, 0];
    expect(detectPeaks(signal).length).toBe(1);
  });

  it('finds the right number of peaks in a multi-rep signal', () => {
    expect(detectPeaks(multiRep(3)).length).toBe(3);
  });

  it('ignores small jitter below the prominence threshold', () => {
    const flatWithJitter = [50, 51, 49, 52, 48, 51, 50, 49, 51, 50];
    expect(detectPeaks(flatWithJitter).length).toBe(0);
  });

  it('returns no peaks for a flat or too-short signal', () => {
    expect(detectPeaks([5, 5, 5, 5])).toEqual([]);
    expect(detectPeaks([1, 2])).toEqual([]);
  });
});

describe('countReps', () => {
  it('returns 1 for a single-rep movement regardless of the signal', () => {
    expect(countReps(multiRep(3), false)).toBe(1);
  });

  it('counts peaks for a multi-rep movement', () => {
    expect(countReps(multiRep(4), true)).toBe(4);
  });

  it('never returns fewer than 1', () => {
    expect(countReps([5, 5, 5, 5], true)).toBe(1);
  });
});
