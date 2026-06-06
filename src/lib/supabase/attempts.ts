import type { ClientAttempt } from '@/types/attempt';
import type { Confidence } from '@/types/reference';
import { supabase } from './client';

const TABLE = 'client_attempts';

export interface NewAttempt {
  movement_id: string;
  rom_achieved_pct: number;
  compensation_flags: string[];
  confidence: Confidence | null;
}

/** Record an attempt. Only ROM% + flags are stored — never raw pose/video. */
export async function recordAttempt(clientId: string, attempt: NewAttempt): Promise<ClientAttempt> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert({ ...attempt, client_id: clientId })
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return data as ClientAttempt;
}

/** A client's own attempts for a movement (most recent first). */
export async function listClientAttempts(
  clientId: string,
  movementId?: string,
): Promise<ClientAttempt[]> {
  let query = supabase
    .from(TABLE)
    .select('*')
    .eq('client_id', clientId)
    .order('attempted_at', { ascending: false });
  if (movementId) query = query.eq('movement_id', movementId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as ClientAttempt[];
}

/** Trainer view: every attempt on the trainer's movements (RLS auto-scopes to
 * movements this trainer owns), newest first. Feeds the Clients dashboard. */
export async function listTrainerAttempts(): Promise<ClientAttempt[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('attempted_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as ClientAttempt[];
}

/** Trainer view: attempts across their clients (RLS enforces ownership). */
export async function listAttemptsForMovement(movementId: string): Promise<ClientAttempt[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('movement_id', movementId)
    .order('attempted_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as ClientAttempt[];
}

/** A client may delete their own history. */
export async function deleteAttempt(id: string): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq('id', id);
  if (error) throw new Error(error.message);
}
