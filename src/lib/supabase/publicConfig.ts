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
export const PUBLIC_SUPABASE_URL = 'https://ztrfhfdsyydbggjqqxvl.supabase.co';
export const PUBLIC_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp0cmZoZmRzeXlkYmdnanFxeHZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3MDU5NTEsImV4cCI6MjA5NjI4MTk1MX0.Xl_M8jfqNCdx10Sb227XUXCEpxMGWeA9NaH24tHwsdc';
