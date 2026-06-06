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

/** A single client's profile (RLS: only the owning trainer or the client). */
export async function getClientProfile(clientId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('user_id', clientId).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Profile) ?? null;
}
