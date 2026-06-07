-- Richer intake: structured focus areas (tap-to-select) + a light health note.
-- Additive and non-destructive; existing client_intake RLS already covers these.
alter table public.client_intake
  add column if not exists focus_areas text[],
  add column if not exists avoid_notes text;
