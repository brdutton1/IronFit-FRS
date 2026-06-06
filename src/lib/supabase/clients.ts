import type { Profile } from '@/types/profile';
import { supabase } from './client';

/** The clients assigned to a trainer (RLS also enforces ownership). */
export async function listClients(trainerId: string): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('trainer_id', trainerId)
    .eq('role', 'client')
    .order('display_name');
  if (error) throw new Error(error.message);
  return (data ?? []) as Profile[];
}

/** A single client's profile (RLS: the owning trainer, any trainer, or the client). */
export async function getClientProfile(clientId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('user_id', clientId).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Profile) ?? null;
}

/** Every trainer in the practice (for the shared overview). */
export async function listTrainers(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'trainer')
    .order('display_name');
  if (error) throw new Error(error.message);
  return (data ?? []) as Profile[];
}

/** Every client across the practice (RLS: trainers only). */
export async function listAllClients(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'client')
    .order('display_name');
  if (error) throw new Error(error.message);
  return (data ?? []) as Profile[];
}

/** Move a client onto another trainer's roster. */
export async function reassignClient(clientId: string, trainerId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('profiles').update({ trainer_id: trainerId }).eq('user_id', clientId);
  return { error: error?.message ?? null };
}
