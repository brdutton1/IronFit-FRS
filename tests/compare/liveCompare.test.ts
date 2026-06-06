import { describe, expect, it } from 'vitest';
import { LiveSession, scoreStillness, scoreTarget, type FrameResult } from '@/lib/compare/liveCompare';
import type { ReferenceDataset } from '@/types/reference';
import cleanFixture from '../fixtures/references/shoulder-car-clean.json';
import { makeShoulderCarPerformance } from '../helpers/pose';

const reference = cleanFixture as ReferenceDataset;

function runSession(peakDeg: number, spinalFlexion = 0): { results: FrameResult[]; session: LiveSession } {
  const session = new LiveSession({
    reference,
    targetKeys: ['shoulder_flexion_right'],
    stillnessKeys: ['spinal_flexion'],
    primaryKey: 'shoulder_flexion_right',
    rotationLimited: {},
  });
  const frames = makeShoulderCarPerformance(peakDeg, 31, spinalFlexion);
  const results = frames.map((f) => session.update(f));
  return { results, session };
}

/** The frame where the target reached its highest current angle. */
function peakFrame(results: FrameResult[]): FrameResult {
  return results.reduce((best, r) =>
    r.targets[0].current > best.targets[0].current ? r : best,
  );
}

describe('scoreTarget — band boundaries', () => {
  const key = 'shoulder_flexion_right' as const;
  it('within 15% of reference ROM is GREEN', () => {
    expect(scoreTarget(100, 0, 90, 90, 'high', false, key).color).toBe('green');
  });
  it('15–30% short is YELLOW', () => {
    expect(scoreTarget(100, 0, 80, 80, 'high', false, key).color).toBe('yellow');
  });
  it('more than 30% short is RED', () => {
    expect(scoreTarget(100, 0, 60, 60, 'high', false, key).color).toBe('red');
  });
  it('moving the wrong direction is RED regardless of peak', () => {
    const e = scoreTarget(100, 50, 0, 30, 'high', false, key);
    expect(e.wrongDirection).toBe(true);
    expect(e.color).toBe('red');
  });
  it('low confidence yields GRAY (skipped)', () => {
    expect(scoreTarget(100, 0, 100, 100, 'low', false, key).color).toBe('gray');
  });
  it('reports romPct relative to reference ROM', () => {
    expect(scoreTarget(100, 0, 75, 75, 'high', false, key).romPct).toBeCloseTo(75);
  });
});

describe('scoreStillness — band boundaries', () => {
  const key = 'spinal_flexion' as const;
  it('under 5° is BLUE (still)', () => {
    expect(scoreStillness(0, 3, 'high', false, key).color).toBe('blue');
  });
  it('5–15° is YELLOW (drifting)', () => {
    expect(scoreStillness(0, 10, 'high', false, key).color).toBe('yellow');
  });
  it('over 15° is RED and flags compensating', () => {
    const e = scoreStillness(0, 20, 'high', false, key);
    expect(e.color).toBe('red');
    expect(e.compensating).toBe(true);
  });
  it('low confidence yields GRAY', () => {
    expect(scoreStillness(0, 20, 'low', false, key).color).toBe('gray');
  });
});

describe('LiveSession — synthetic performances against a clean reference', () => {
  it('perfect match: ~100% ROM and a GREEN target at peak', () => {
    const { results, session } = runSession(170, 0);
    expect(session.finalPrimaryRomPct()).toBeGreaterThanOrEqual(95);
    expect(peakFrame(results).targets[0].color).toBe('green');
    // Stillness joint stayed put.
    expect(peakFrame(results).stillness[0].color).toBe('blue');
  });

  it('25% under-ROM: ~75% ROM and a YELLOW target at peak', () => {
    const { results, session } = runSession(0.75 * 170, 0);
    const rom = session.finalPrimaryRomPct();
    expect(rom).toBeGreaterThan(68);
    expect(rom).toBeLessThan(82);
    expect(peakFrame(results).targets[0].color).toBe('yellow');
  });

  it('compensating: target reaches range but stillness joint goes RED', () => {
    const { results } = runSession(170, 20);
    const peak = peakFrame(results);
    expect(peak.targets[0].color).toBe('green');
    expect(peak.stillness[0].color).toBe('red');
    expect(peak.stillness[0].compensating).toBe(true);
  });
});
