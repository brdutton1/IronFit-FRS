-- Shared video library (multi-tenant).
--
-- A central place that houses YouTube links (link + preview thumbnail) so the
-- app can embed and play them IN-APP — clients never leave IronFit. It's the
-- reusable "library for everything trainers are doing": stretches reference a
-- video now, movements/programs can later. We store only the YouTube id + meta,
-- never the video file (that's the separate `reference_video_path` pipeline).
--
-- Ownership mirrors `movements` (0001) + the owner tier (0009):
--   trainer_id NULL  → global / built-in row (platform-provided)
--   trainer_id set   → owned by that trainer

create table if not exists public.videos (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid references public.profiles(user_id) on delete cascade,
  youtube_id text not null,
  title text not null,
  description text,
  regions text[] not null default '{}',
  status text not null default 'live' check (status in ('draft', 'live', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists videos_trainer_idx on public.videos(trainer_id);

alter table public.videos enable row level security;

-- Trainers fully manage their own videos.
create policy "trainer manages own videos"
  on public.videos for all
  using (trainer_id = auth.uid())
  with check (trainer_id = auth.uid());

-- Everyone signed in can read live built-ins (the platform-provided library).
create policy "read live built-in videos"
  on public.videos for select
  using (trainer_id is null and status = 'live');

-- Clients read their own trainer's live videos.
create policy "client reads their trainer's live videos"
  on public.videos for select
  using (
    status = 'live'
    and trainer_id = (select trainer_id from public.profiles where user_id = auth.uid())
  );

-- Owner (super-admin) sees everything.
create policy "owner reads all videos"
  on public.videos for select
  using (public.is_owner());
