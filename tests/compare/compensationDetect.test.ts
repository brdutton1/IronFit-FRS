import { describe, expect, it } from 'vitest';
import {
  CompensationDebouncer,
  detectCompensations,
  familiesForPatternJoint,
  jointFamily,
} from '@/lib/compare/compensationDetect';
import type { StillnessEval } from '@/lib/compare/liveCompare';
import type { CompensationPattern } from '@/types/movement';

const lumbarPattern: CompensationPattern = {
  joint: 'lumbar',
  tag: 'lumbar_extension',
  label: 'Lumbar extending',
  cue: 'Drop the ribs.',
};

function stillness(key: StillnessEval['key'], compensating: boolean, deviation = 20): StillnessEval {
  return {
    key,
    color: compensating ? 'red' : 'blue',
    current: deviation,
    deviation,
    compensating,
    confidence: 'high',
    rotationLimited: false,
  };
}

describe('joint family mapping', () => {
  it('extracts the base family from an angle key', () => {
    expect(jointFamily('spinal_flexion')).toBe('spinal');
    expect(jointFamily('cervical_rotation')).toBe('cervical');
  });

  it('maps lumbar/thoracic patterns onto the spinal proxy', () => {
    expect(familiesForPatternJoint('lumbar')).toEqual(['spinal']);
    expect(familiesForPatternJoint('thoracic')).toEqual(['spinal']);
    expect(familiesForPatternJoint('cervical')).toEqual(['cervical']);
  });
});

describe('detectCompensations', () => {
  it('fires the matching pattern when its watched joint is compensating', () => {
    const active = detectCompensations([stillness('spinal_flexion', true)], [lumbarPattern]);
    expect(active).toHaveLength(1);
    expect(active[0].pattern.tag).toBe('lumbar_extension');
    expect(active[0].triggeredBy).toBe('spinal_flexion');
  });

  it('does not fire when the watched joint is still', () => {
    expect(detectCompensations([stillness('spinal_flexion', false)], [lumbarPattern])).toHaveLength(0);
  });

  it('does not fire for an unrelated compensating joint', () => {
    expect(detectCompensations([stillness('cervical_flexion', true)], [lumbarPattern])).toHaveLength(0);
  });
});

describe('CompensationDebouncer', () => {
  it('suppresses until the pattern fires N consecutive frames', () => {
    const d = new CompensationDebouncer(3);
    const active = detectCompensations([stillness('spinal_flexion', true)], [lumbarPattern]);
    expect(d.step(active)).toHaveLength(0); // frame 1
    expect(d.step(active)).toHaveLength(0); // frame 2
    expect(d.step(active)).toHaveLength(1); // frame 3 → stable
  });

  it('resets the streak when the pattern stops firing', () => {
    const d = new CompensationDebouncer(2);
    const firing = detectCompensations([stillness('spinal_flexion', true)], [lumbarPattern]);
    const quiet = detectCompensations([stillness('spinal_flexion', false)], [lumbarPattern]);
    d.step(firing); // streak 1
    d.step(quiet); // reset
    expect(d.step(firing)).toHaveLength(0); // streak 1 again, not yet stable
    expect(d.step(firing)).toHaveLength(1); // streak 2 → stable
  });
});
