import type { Stretch, StretchDraft } from '@/types/stretch';
import { supabase } from './client';

const TABLE = 'stretches';

/** Live stretches a client can see: built-ins + their trainer's (RLS-scoped). */
export async function listStretches(): Promise<Stretch[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('status', 'live')
    .order('sort_order');
  if (error) throw new Error(error.message);
  return (data ?? []) as Stretch[];
}

/** A trainer's own stretches plus the live built-in library (RLS-scoped). */
export async function listTrainerStretches(trainerId: string): Promise<Stretch[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .or(`trainer_id.eq.${trainerId},trainer_id.is.null`)
    .order('sort_order');
  if (error) throw new Error(error.message);
  return (data ?? []) as Stretch[];
}

export async function getStretch(id: string): Promise<Stretch | null> {
  const { data, error } = await supabase.from(TABLE).select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Stretch) ?? null;
}

export async function createStretch(trainerId: string, draft: StretchDraft): Promise<Stretch> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert({ ...draft, trainer_id: trainerId })
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return data as Stretch;
}

export async function updateStretch(id: string, patch: Partial<StretchDraft>): Promise<Stretch> {
  const { data, error } = await supabase
    .from(TABLE)
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return data as Stretch;
}

export async function deleteStretch(id: string): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq('id', id);
  if (error) throw new Error(error.message);
}
