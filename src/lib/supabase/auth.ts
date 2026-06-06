import type { Session } from '@supabase/supabase-js';
import type { Profile } from '@/types/profile';
import { supabase, siteUrl } from './client';

/**
 * Send a one-time sign-in email. The email template is configured to show a
 * 6-digit CODE (not a clickable link) so email security scanners can't
 * pre-consume the token by following a link. Creates the user if new.
 */
export async function sendLoginCode(email: string): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true, emailRedirectTo: siteUrl },
  });
  return { error: error?.message ?? null };
}

/** Verify the 6-digit code the user typed in. Establishes the session locally. */
export async function verifyLoginCode(email: string, token: string): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.verifyOtp({ email, token: token.trim(), type: 'email' });
  return { error: error?.message ?? null };
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
