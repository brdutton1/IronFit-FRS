/**
 * Compensation detection. Maps a compensating stillness joint to the structured
 * compensation pattern Lee tagged, so we can surface the right cue in the banner.
 * Includes a debounce so one jittery frame doesn't fire an alert.
 */

import type { CompensationPattern } from '@/types/movement';
import type { AngleKey } from '@/lib/pose/landmarks';
import type { StillnessEval } from './liveCompare';
import { COMPENSATION_DEBOUNCE_FRAMES } from './thresholds';

/** Base joint family of an angle key, e.g. 'spinal_flexion' → 'spinal'. */
export function jointFamily(key: AngleKey | string): string {
  return String(key).split('_')[0];
}

/**
 * Which angle-key families a tagged pattern's joint should watch. Lee tags a
 * pattern against a body region ('lumbar', 'thoracic', 'cervical', 'shoulder',
 * …); the spine families are all observed through the spinal_* proxies.
 */
export function familiesForPatternJoint(joint: string): string[] {
  const j = joint.toLowerCase();
  if (j === 'lumbar' || j === 'thoracic' || j === 'spine' || j === 'spinal') return ['spinal'];
  if (j === 'cervical' || j === 'neck') return ['cervical'];
  return [j];
}

export interface ActiveCompensation {
  pattern: CompensationPattern;
  /** The stillness joint key whose drift triggered it. */
  triggeredBy: AngleKey;
  deviation: number;
}

/**
 * Given this frame's stillness evaluations and the movement's compensation
 * patterns, return the patterns currently firing (their watched joint is RED).
 */
export function detectCompensations(
  stillness: StillnessEval[],
  patterns: CompensationPattern[],
): ActiveCompensation[] {
  const compensating = stillness.filter((s) => s.compensating);
  if (compensating.length === 0) return [];

  const active: ActiveCompensation[] = [];
  for (const pattern of patterns) {
    const families = familiesForPatternJoint(pattern.joint);
    const hit = compensating.find((s) => families.includes(jointFamily(s.key)));
    if (hit) active.push({ pattern, triggeredBy: hit.key, deviation: hit.deviation });
  }
  return active;
}

/**
 * Stateful debouncer: a pattern must fire on N consecutive frames before we
 * report it active, and clears immediately once it stops firing.
 */
export class CompensationDebouncer {
  private streak = new Map<string, number>();

  constructor(private readonly frames = COMPENSATION_DEBOUNCE_FRAMES) {}

  /** Feed this frame's active compensations; return those past the debounce. */
  step(active: ActiveCompensation[]): ActiveCompensation[] {
    const seen = new Set<string>();
    const stable: ActiveCompensation[] = [];
    for (const a of active) {
      seen.add(a.pattern.tag);
      const next = (this.streak.get(a.pattern.tag) ?? 0) + 1;
      this.streak.set(a.pattern.tag, next);
      if (next >= this.frames) stable.push(a);
    }
    // Reset streaks for patterns not firing this frame.
    for (const tag of this.streak.keys()) {
      if (!seen.has(tag)) this.streak.set(tag, 0);
    }
    return stable;
  }
}
