/**
 * PUBLIC Supabase configuration, committed so the production build is
 * self-contained (Vite inlines `VITE_*` at build time, and the Vercel deploy
 * path can't inject env vars here).
 *
 * These two values are SAFE to ship to browsers and commit to git:
 *   - the project URL is public,
 *   - the anon / publishable key is *designed* to be embedded in client code.
 * Your data is protected by row-level security, NOT by hiding this key. The
 * secret `service_role` key is never placed here.
 *
 * Local development overrides these via `.env` (VITE_SUPABASE_URL /
 * VITE_SUPABASE_ANON_KEY). Filled in during deployment.
 */
export const PUBLIC_SUPABASE_URL = '';
export const PUBLIC_SUPABASE_ANON_KEY = '';
