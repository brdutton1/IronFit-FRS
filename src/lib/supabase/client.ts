import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_ANON_KEY, PUBLIC_SUPABASE_URL } from './publicConfig';

// Env (local dev) takes precedence; the committed public config is the
// production fallback so the deployed build is self-contained.
const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || PUBLIC_SUPABASE_URL;
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) || PUBLIC_SUPABASE_ANON_KEY;

/**
 * True when Supabase config is present. The UI renders a friendly "configure
 * your .env" notice instead of crashing when it isn't.
 */
export const isSupabaseConfigured = Boolean(url && anonKey);

if (!isSupabaseConfigured) {
  console.warn(
    '[IronFit] Supabase is not configured. Set VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY in .env, or fill in src/lib/supabase/publicConfig.ts.',
  );
}

/** Resolved project URL, reused by storage.ts for the resumable-upload endpoint. */
export const supabaseUrl = url || 'http://localhost:54321';

export const supabase: SupabaseClient = createClient(supabaseUrl, anonKey || 'public-anon-key-placeholder', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export const siteUrl =
  (import.meta.env.VITE_SITE_URL as string | undefined) ||
  (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173');
