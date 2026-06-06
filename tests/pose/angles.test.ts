import { describe, expect, it } from 'vitest';
import {
  angleBetweenVectors,
  angleFromVertical,
  computeAngle,
  interiorAngle,
  lineAngleFromHorizontal,
  midpoint,
} from '@/lib/pose/angles';
import { angleConfidence } from '@/lib/pose/confidence';
import { LM } from '@/lib/pose/landmarks';
import { makeFrame, makePose } from '../helpers/pose';

const closeTo = (a: number, b: number, tol = 1e-6) => Math.abs(a - b) <= tol;

describe('vector geometry', () => {
  it('angleBetweenVectors handles parallel, perpendicular, opposite', () => {
    expect(angleBetweenVectors({ x: 1, y: 0 }, { x: 1, y: 0 })).toBeCloseTo(0);
    expect(angleBetweenVectors({ x: 1, y: 0 }, { x: 0, y: 1 })).toBeCloseTo(90);
    expect(angleBetweenVectors({ x: 1, y: 0 }, { x: -1, y: 0 })).toBeCloseTo(180);
  });

  it('degenerate (zero-length) vectors return 0, not NaN', () => {
    expect(angleBetweenVectors({ x: 0, y: 0 }, { x: 1, y: 0 })).toBe(0);
  });

  it('interiorAngle measures the angle at the vertex', () => {
    // a-(0,0), b-(1,0) vertex, c-(1,1): right angle.
    expect(interiorAngle({ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 })).toBeCloseTo(90);
  });

  it('angleFromVertical: up=0, horizontal=90, down=180 (y grows downward)', () => {
    expect(angleFromVertical({ x: 0, y: -1 })).toBeCloseTo(0);
    expect(angleFromVertical({ x: 1, y: 0 })).toBeCloseTo(90);
    expect(angleFromVertical({ x: 0, y: 1 })).toBeCloseTo(180);
  });

  it('lineAngleFromHorizontal and midpoint', () => {
    expect(closeTo(lineAngleFromHorizontal({ x: 0, y: 0 }, { x: 1, y: 0 }), 0)).toBe(true);
    expect(midpoint({ x: 0, y: 0 }, { x: 2, y: 4 })).toEqual({ x: 1, y: 2 });
  });
});

describe('computeAngle — elbow flexion', () => {
  it('straight arm = 0°', () => {
    const frame = makeFrame({
      [LM.RIGHT_SHOULDER]: { x: 0.5, y: 0.3 },
      [LM.RIGHT_ELBOW]: { x: 0.5, y: 0.5 },
      [LM.RIGHT_WRIST]: { x: 0.5, y: 0.7 },
    });
    expect(computeAngle('elbow_flexion_right', frame)).toBeCloseTo(0);
  });

  it('90° bend reads ~90° flexion', () => {
    const frame = makeFrame({
      [LM.RIGHT_SHOULDER]: { x: 0.5, y: 0.3 },
      [LM.RIGHT_ELBOW]: { x: 0.5, y: 0.5 },
      [LM.RIGHT_WRIST]: { x: 0.7, y: 0.5 },
    });
    expect(computeAngle('elbow_flexion_right', frame)).toBeCloseTo(90);
  });
});

describe('computeAngle — shoulder elevation', () => {
  it('arm at side ≈ 0°, overhead ≈ 180°, horizontal ≈ 90°', () => {
    expect(computeAngle('shoulder_flexion_right', makePose({ shoulderFlexionRight: 0 }))).toBeCloseTo(0, 4);
    expect(computeAngle('shoulder_flexion_right', makePose({ shoulderFlexionRight: 180 }))).toBeCloseTo(180, 4);
    expect(computeAngle('shoulder_flexion_right', makePose({ shoulderFlexionRight: 90 }))).toBeCloseTo(90, 4);
  });

  it('abduction shares the elevation triangle', () => {
    const frame = makePose({ shoulderFlexionRight: 120 });
    expect(computeAngle('shoulder_abduction_right', frame)).toBeCloseTo(
      computeAngle('shoulder_flexion_right', frame),
      6,
    );
  });
});

describe('computeAngle — spinal flexion proxy', () => {
  it('upright ≈ 0°, leaning forward increases', () => {
    expect(computeAngle('spinal_flexion', makePose({ spinalFlexion: 0 }))).toBeCloseTo(0, 4);
    expect(computeAngle('spinal_flexion', makePose({ spinalFlexion: 25 }))).toBeCloseTo(25, 4);
  });
});

describe('computeAngle — knee flexion', () => {
  it('straight leg = 0°', () => {
    const frame = makeFrame({
      [LM.RIGHT_HIP]: { x: 0.5, y: 0.4 },
      [LM.RIGHT_KNEE]: { x: 0.5, y: 0.6 },
      [LM.RIGHT_ANKLE]: { x: 0.5, y: 0.8 },
    });
    expect(computeAngle('knee_flexion_right', frame)).toBeCloseTo(0);
  });
});

describe('angle confidence reflects landmark visibility', () => {
  it('high when all required landmarks are clearly visible', () => {
    expect(angleConfidence('shoulder_flexion_right', makePose({ shoulderFlexionRight: 90 }))).toBe('high');
  });

  it('low when a required landmark is barely visible', () => {
    const frame = makePose({ shoulderFlexionRight: 90, visibility: { [LM.RIGHT_ELBOW]: 0.3 } });
    expect(angleConfidence('shoulder_flexion_right', frame)).toBe('low');
  });

  it('reduced when a required landmark is in the middle band', () => {
    const frame = makePose({ shoulderFlexionRight: 90, visibility: { [LM.RIGHT_ELBOW]: 0.6 } });
    expect(angleConfidence('shoulder_flexion_right', frame)).toBe('reduced');
  });
});
