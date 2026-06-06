import { describe, expect, it } from 'vitest';
import { extractReferenceDataset, referenceQuality } from '@/lib/reference/extractor';
import { LM } from '@/lib/pose/landmarks';
import { makePose, makeShoulderCarPerformance } from '../helpers/pose';

const baseInput = {
  movement_id: 'm1',
  fps: 30,
  targetAngles: ['shoulder_flexion_right'] as const,
  stillnessAngles: ['spinal_flexion'] as const,
  primaryAngle: 'shoulder_flexion_right' as const,
  cameraAngle: 'side' as const,
  multiRep: false,
  cues: ['reach long'],
  compensationPatterns: ['lumbar_extension'],
};

describe('extractReferenceDataset', () => {
  it('captures peak and ROM of the target joint', () => {
    const frames = makeShoulderCarPerformance(160, 31, 0);
    const ds = extractReferenceDataset({ ...baseInput, frames });
    const t = ds.target_joints.shoulder_flexion_right;
    expect(t.peak).toBeGreaterThan(150);
    expect(t.peak).toBeLessThanOrEqual(161);
    expect(t.rom).toBeGreaterThan(150);
    expect(t.confidence).toBe('high');
    expect(t.smoothness_score).toBeGreaterThan(0.8);
  });

  it('reports a still stillness joint as low-variance, low-deviation', () => {
    const frames = makeShoulderCarPerformance(160, 31, 0);
    const ds = extractReferenceDataset({ ...baseInput, frames });
    const s = ds.stillness_joints.spinal_flexion;
    expect(s.variance).toBeLessThan(1);
    expect(s.max_deviation).toBeLessThan(2);
    expect(s.confidence).toBe('high');
  });

  it('detects a moving stillness joint (compensation in the reference)', () => {
    // Trunk leans 20° at peak → spinal_flexion should show real deviation.
    const frames = makeShoulderCarPerformance(160, 31, 20);
    const ds = extractReferenceDataset({ ...baseInput, frames });
    expect(ds.stillness_joints.spinal_flexion.max_deviation).toBeGreaterThan(15);
  });

  it('single-rep movement reports rep_count 1; multi-rep counts peaks', () => {
    const single = makeShoulderCarPerformance(150, 31, 0);
    expect(extractReferenceDataset({ ...baseInput, frames: single }).rep_count).toBe(1);

    const multi = [...makeShoulderCarPerformance(150, 21, 0), ...makeShoulderCarPerformance(150, 21, 0)];
    const ds = extractReferenceDataset({ ...baseInput, frames: multi, multiRep: true });
    expect(ds.rep_count).toBe(2);
  });

  it('duration is frames / fps', () => {
    const frames = makeShoulderCarPerformance(120, 30, 0);
    const ds = extractReferenceDataset({ ...baseInput, frames });
    expect(ds.duration_sec).toBeCloseTo(1, 5);
  });

  it('flags rotation-limited joints from a front camera angle', () => {
    const frames = [makePose({ shoulderFlexionRight: 90 })];
    const ds = extractReferenceDataset({
      ...baseInput,
      targetAngles: ['shoulder_rotation_right'],
      primaryAngle: 'shoulder_rotation_right',
      cameraAngle: 'front',
      frames,
    });
    expect(ds.target_joints.shoulder_rotation_right.rotation_limited).toBe(true);
  });

  it('aggregate confidence drops when a frame has a poorly-seen landmark', () => {
    const good = makeShoulderCarPerformance(160, 20, 0);
    const bad = makePose({ shoulderFlexionRight: 80, visibility: { [LM.RIGHT_ELBOW]: 0.3 } });
    const ds = extractReferenceDataset({ ...baseInput, frames: [...good, bad] });
    expect(ds.target_joints.shoulder_flexion_right.confidence).toBe('low');
    expect(referenceQuality(ds)).toBe('low');
  });
});

describe('referenceQuality', () => {
  it('is high when every target joint is high-confidence', () => {
    const frames = makeShoulderCarPerformance(160, 31, 0);
    const ds = extractReferenceDataset({ ...baseInput, frames });
    expect(referenceQuality(ds)).toBe('high');
  });
});
