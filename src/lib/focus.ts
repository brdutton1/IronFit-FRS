import type { Movement } from '@/types/movement';
import type { ProgramAssignment } from '@/types/program';

export interface FocusItem {
  movement: Movement;
  note: string | null;
}

/**
 * Shape a client's "Your focus" list: the movements their trainer pinned, in the
 * program's order, joined to the live library. Assignments whose movement is not
 * in the library (unpublished/archived) are dropped so a client never sees a
 * broken tile. The `program` array is expected pre-sorted by sort_order.
 */
export function focusMovements(movements: Movement[], program: ProgramAssignment[]): FocusItem[] {
  const byId = new Map(movements.map((m) => [m.id, m]));
  return program
    .map((p) => ({ movement: byId.get(p.movement_id), note: p.note }))
    .filter((x): x is FocusItem => Boolean(x.movement));
}
