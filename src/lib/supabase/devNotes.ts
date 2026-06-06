import type { DevNote } from '@/types/devNote';
import { supabase } from './client';

const TABLE = 'dev_notes';

/** All testing notes, newest first (RLS: any authenticated tester sees the list). */
export async function listDevNotes(): Promise<DevNote[]> {
  const { data, error } = await supabase.from(TABLE).select('*').order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as DevNote[];
}

export interface NewDevNote {
  author_id: string;
  author_name: string | null;
  author_role: string | null;
  page_path: string;
  page_title: string | null;
  body: string;
}

/** Post a note. Browser/viewport context is captured here so the tester does nothing extra. */
export async function addDevNote(note: NewDevNote): Promise<DevNote> {
  const user_agent = typeof navigator !== 'undefined' ? navigator.userAgent : null;
  const viewport = typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : null;
  const { data, error } = await supabase
    .from(TABLE)
    .insert({ ...note, user_agent, viewport })
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return data as DevNote;
}

export async function setResolved(id: string, resolved: boolean): Promise<void> {
  const { error } = await supabase.from(TABLE).update({ resolved }).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteDevNote(id: string): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq('id', id);
  if (error) throw new Error(error.message);
}
