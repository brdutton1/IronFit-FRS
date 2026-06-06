import { describe, expect, it } from 'vitest';
import { focusMovements } from '@/lib/focus';
import type { Movement } from '@/types/movement';
import type { ProgramAssignment } from '@/types/program';

function mv(id: string, name: string): Movement {
  return { id, name } as Movement;
}
function pa(movement_id: string, sort_order: number, note: string | null = null): ProgramAssignment {
  return {
    id: `a-${movement_id}`,
    trainer_id: 't',
    client_id: 'c',
    movement_id,
    note,
    sort_order,
    created_at: '2026-01-01T00:00:00Z',
  };
}

describe('focusMovements', () => {
  const library = [mv('m1', 'Hip CAR'), mv('m2', 'Shoulder CAR'), mv('m3', 'Spinal flow')];

  it('returns assignments in the program order, joined to the library', () => {
    // program is pre-sorted by sort_order (m2 before m1)
    const program = [pa('m2', 0, 'slow'), pa('m1', 1)];
    const out = focusMovements(library, program);
    expect(out.map((f) => f.movement.id)).toEqual(['m2', 'm1']);
    expect(out[0].note).toBe('slow');
    expect(out[1].note).toBeNull();
  });

  it('drops assignments whose movement is not in the live library', () => {
    const program = [pa('m1', 0), pa('gone', 1), pa('m3', 2)];
    const out = focusMovements(library, program);
    expect(out.map((f) => f.movement.id)).toEqual(['m1', 'm3']);
  });

  it('returns an empty list when there is no program', () => {
    expect(focusMovements(library, [])).toEqual([]);
  });
});
