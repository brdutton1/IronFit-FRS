import { describe, expect, it } from 'vitest';
import { mean, movingAverage, range, smoothnessScore, variance } from '@/lib/reference/smoothing';

describe('smoothing primitives', () => {
  it('mean, variance, range', () => {
    expect(mean([2, 4, 6])).toBe(4);
    expect(variance([2, 4, 6])).toBeCloseTo(8 / 3);
    expect(range([1, 5, 3])).toBe(4);
    expect(variance([])).toBe(0);
  });

  it('movingAverage preserves a constant signal and smooths a spike', () => {
    expect(movingAverage([5, 5, 5, 5, 5], 3)).toEqual([5, 5, 5, 5, 5]);
    const smoothed = movingAverage([0, 0, 10, 0, 0], 3);
    expect(smoothed[2]).toBeLessThan(10);
    expect(smoothed[2]).toBeGreaterThan(0);
  });

  it('movingAverage coerces an even window to odd', () => {
    expect(movingAverage([1, 2, 3, 4], 4).length).toBe(4);
  });
});

describe('smoothnessScore', () => {
  it('is 1 for a perfectly smooth ramp', () => {
    const ramp = Array.from({ length: 20 }, (_, i) => i);
    expect(smoothnessScore(ramp)).toBeGreaterThan(0.95);
  });

  it('is lower for a jagged signal than a smooth one', () => {
    const smooth = Array.from({ length: 20 }, (_, i) => i);
    const jagged = Array.from({ length: 20 }, (_, i) => i + (i % 2 === 0 ? 5 : -5));
    expect(smoothnessScore(jagged)).toBeLessThan(smoothnessScore(smooth));
  });

  it('is 1 for a flat (zero-range) signal', () => {
    expect(smoothnessScore([3, 3, 3, 3, 3])).toBe(1);
  });
});
