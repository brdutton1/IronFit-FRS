import type { Video, VideoDraft } from '@/types/video';
import { supabase } from './client';

const TABLE = 'videos';

/** A trainer's own videos plus the live built-in library (RLS-scoped). */
export async function listTrainerVideos(trainerId: string): Promise<Video[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .or(`trainer_id.eq.${trainerId},trainer_id.is.null`)
    .order('updated_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Video[];
}

/** Live videos visible to a client (RLS restricts to built-ins + their trainer). */
export async function listClientVideos(): Promise<Video[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('status', 'live')
    .order('title');
  if (error) throw new Error(error.message);
  return (data ?? []) as Video[];
}

export async function getVideo(id: string): Promise<Video | null> {
  const { data, error } = await supabase.from(TABLE).select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Video) ?? null;
}

export async function createVideo(trainerId: string, draft: VideoDraft): Promise<Video> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert({ ...draft, trainer_id: trainerId })
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return data as Video;
}

export async function updateVideo(id: string, patch: Partial<VideoDraft>): Promise<Video> {
  const { data, error } = await supabase
    .from(TABLE)
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return data as Video;
}

export async function deleteVideo(id: string): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function setVideoStatus(id: string, status: Video['status']): Promise<void> {
  const { error } = await supabase
    .from(TABLE)
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(error.message);
}
