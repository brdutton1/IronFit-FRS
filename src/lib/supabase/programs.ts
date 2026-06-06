import type { ProgramAssignment } from '@/types/program';
import { supabase } from './client';

const TABLE = 'program_assignments';

/** A client's pinned "Your focus" movements, in display order. */
export async function listClientProgram(clientId: string): Promise<ProgramAssignment[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('client_id', clientId)
    .order('sort_order')
    .order('created_at');
  if (error) throw new Error(error.message);
  return (data ?? []) as ProgramAssignment[];
}

/** Pin a movement to a client's focus (idempotent on the client+movement pair). */
export async function assignMovement(
  trainerId: string,
  clientId: string,
  movementId: string,
  note: string | null,
  sortOrder: number,
): Promise<{ error: string | null }> {
  const { error } = await supabase.from(TABLE).upsert(
    { trainer_id: trainerId, client_id: clientId, movement_id: movementId, note: note || null, sort_order: sortOrder },
    { onConflict: 'client_id,movement_id' },
  );
  return { error: error?.message ?? null };
}

/** Update the coaching note on an existing focus item. */
export async function updateAssignmentNote(id: string, note: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from(TABLE).update({ note: note || null }).eq('id', id);
  return { error: error?.message ?? null };
}

/** Remove a movement from a client's focus. */
export async function unassignMovement(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from(TABLE).delete().eq('id', id);
  return { error: error?.message ?? null };
}
