import { describe, expect, it } from 'vitest';
import { focusAreaLabels, FOCUS_AREAS } from '@/lib/intakeOptions';

describe('focusAreaLabels', () => {
  it('maps known keys to their labels in order', () => {
    expect(focusAreaLabels(['hip', 'shoulder'])).toEqual(['Hips', 'Shoulders']);
  });

  it('drops unknown keys', () => {
    expect(focusAreaLabels(['hip', 'nope', 'cervical'])).toEqual(['Hips', 'Neck']);
  });

  it('handles null / empty', () => {
    expect(focusAreaLabels(null)).toEqual([]);
    expect(focusAreaLabels([])).toEqual([]);
  });

  it('every focus-area key resolves to a label', () => {
    expect(focusAreaLabels(FOCUS_AREAS.map((a) => a.key))).toHaveLength(FOCUS_AREAS.length);
  });
});
