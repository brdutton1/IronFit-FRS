import type { Movement } from '@/types/movement';

export type MovementKind = 'coached' | 'follow_along';

/**
 * A movement is "coached" (full AI mirror — ROM %, compensation flags) when it
 * has an extracted reference dataset; otherwise it's a "follow-along" demo backed
 * by a linked video. One place owns this distinction so badges, gating, and
 * analytics never re-infer it inconsistently.
 */
export function movementKind(m: Pick<Movement, 'reference_dataset'>): MovementKind {
  return m.reference_dataset ? 'coached' : 'follow_along';
}

export const KIND_LABEL: Record<MovementKind, string> = {
  coached: 'AI Mirror',
  follow_along: 'Follow-along',
};
