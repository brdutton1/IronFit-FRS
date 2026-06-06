import type { Movement, MovementDraft } from '@/types/movement';
import type { Confidence, ReferenceDataset } from '@/types/reference';
import { supabase } from './client';

const TABLE = 'movements';

/** All movements owned by a trainer (any status). */
export async function listTrainerMovements(trainerId: string): Promise<Movement[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('trainer_id', trainerId)
    .order('updated_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Movement[];
}

/** Live movements visible to a client (RLS restricts to their trainer). */
export async function listLiveMovements(): Promise<Movement[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('status', 'live')
    .order('name');
  if (error) throw new Error(error.message);
  return (data ?? []) as Movement[];
}

export async function getMovement(id: string): Promise<Movement | null> {
  const { data, error } = await supabase.from(TABLE).select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Movement) ?? null;
}

export async function createMovement(trainerId: string, draft: MovementDraft): Promise<Movement> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert({ ...draft, trainer_id: trainerId })
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return data as Movement;
}

export async function updateMovement(id: string, patch: Partial<MovementDraft>): Promise<Movement> {
  const { data, error } = await supabase
    .from(TABLE)
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return data as Movement;
}

/** Attach an extracted reference dataset + computed quality to a movement. */
export async function saveReference(
  id: string,
  reference: ReferenceDataset,
  quality: Confidence,
  videoPath: string,
): Promise<Movement> {
  const { data, error } = await supabase
    .from(TABLE)
    .update({
      reference_dataset: reference,
      reference_quality: quality,
      reference_video_path: videoPath,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return data as Movement;
}

export async function setMovementStatus(id: string, status: Movement['status']): Promise<void> {
  const { error } = await supabase
    .from(TABLE)
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(error.message);
}
