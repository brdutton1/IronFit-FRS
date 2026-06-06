import type { Session } from '@supabase/supabase-js';
import type { Profile } from '@/types/profile';
import { supabase } from './client';

/**
 * Email + password sign-in. No email is sent, so nothing in the login path can
 * be intercepted by an email scanner, rate-limited, or fail to deliver.
 */
export async function signInWithPassword(email: string, password: string): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  return { error: error?.message ?? null };
}

/**
 * Create an account with email + password. With "Confirm email" disabled on the
 * project this returns a session immediately (instant sign-in). `needsConfirm`
 * is true if a session was NOT returned (confirmation still enabled) so the UI
 * can prompt accordingly.
 */
export async function signUpWithPassword(
  email: string,
  password: string,
): Promise<{ error: string | null; needsConfirm: boolean }> {
  const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
  return { error: error?.message ?? null, needsConfirm: !error && !data.session };
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

export async function getSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

/** Subscribe to auth state. Returns an unsubscribe function. */
export function onAuthChange(cb: (session: Session | null) => void): () => void {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => cb(session));
  return () => data.subscription.unsubscribe();
}

/** Fetch the profile row (role, display name) for the signed-in user. */
export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) {
    console.error('[IronFit] getProfile failed', error.message);
    return null;
  }
  return data as Profile | null;
}

/**
 * A trainer invites a client by pre-creating their profile keyed to email isn't
 * possible before signup; in v1 Lee shares the app URL and, on first sign-in, a
 * client's profile defaults to role 'client' with trainer_id set by Lee from
 * the dashboard. This helper sets a freshly-signed-in user's display name.
 */
export async function upsertOwnProfile(
  userId: string,
  fields: Partial<Pick<Profile, 'display_name' | 'role' | 'trainer_id'>>,
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('profiles')
    .upsert({ user_id: userId, ...fields }, { onConflict: 'user_id' });
  return { error: error?.message ?? null };
}
