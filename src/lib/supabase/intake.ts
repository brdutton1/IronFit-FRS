import type { ClientIntake } from '@/types/profile';
import { supabase } from './client';

export interface TrainerRef {
  id: string;
  display_name: string | null;
}

/** Resolve a trainer's invite code (from the intake link) to the trainer. */
export async function trainerByCode(code: string): Promise<TrainerRef | null> {
  const { data, error } = await supabase.rpc('trainer_by_code', { p_code: code });
  if (error) throw new Error(error.message);
  const row = Array.isArray(data) ? data[0] : data;
  return row ? { id: row.id, display_name: row.display_name } : null;
}

export interface IntakeInput {
  trainer_id: string;
  phone: string;
  goals: string;
  injuries: string;
  experience: string;
  emergency_contact: string;
  consent: boolean;
}

/** Save (or update) the signed-in client's intake row. */
export async function saveIntake(clientId: string, input: IntakeInput): Promise<{ error: string | null }> {
  const { error } = await supabase.from('client_intake').upsert(
    {
      client_id: clientId,
      trainer_id: input.trainer_id,
      phone: input.phone || null,
      goals: input.goals || null,
      injuries: input.injuries || null,
      experience: input.experience || null,
      emergency_contact: input.emergency_contact || null,
      consent_at: input.consent ? new Date().toISOString() : null,
    },
    { onConflict: 'client_id' },
  );
  return { error: error?.message ?? null };
}

/** A client's intake (RLS: the client, their trainer, or any trainer for the overview). */
export async function getClientIntake(clientId: string): Promise<ClientIntake | null> {
  const { data, error } = await supabase
    .from('client_intake')
    .select('*')
    .eq('client_id', clientId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as ClientIntake) ?? null;
}
