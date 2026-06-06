-- IronFit Movement Mirror — initial schema, RLS, and storage buckets.
-- Single trainer (Lee), unlimited clients. Clients belong to one trainer.

-- ─────────────────────────────────────────────────────────────────────────
-- profiles
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'client' check (role in ('trainer', 'client')),
  display_name text,
  -- The trainer this client belongs to. Null for trainers.
  trainer_id uuid references profiles(user_id) on delete set null,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

-- Everyone signed in can read their own profile; a trainer can read their
-- clients' profiles; a client can read their trainer's profile.
create policy "read own profile"
  on profiles for select
  using (user_id = auth.uid());

create policy "trainer reads their clients"
  on profiles for select
  using (trainer_id = auth.uid());

create policy "client reads their trainer"
  on profiles for select
  using (user_id = (select trainer_id from profiles where user_id = auth.uid()));

create policy "insert own profile"
  on profiles for insert
  with check (user_id = auth.uid());

create policy "update own profile"
  on profiles for update
  using (user_id = auth.uid());

-- Auto-create a profile row on signup (defaults to role 'client').
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (user_id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', new.email))
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ─────────────────────────────────────────────────────────────────────────
-- movements
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists movements (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references profiles(user_id) on delete cascade,
  name text not null,
  movement_type text not null check (movement_type in ('car', 'pails', 'rails', 'flow', 'other')),
  primary_joint text not null,
  side text not null check (side in ('left', 'right', 'bilateral', 'midline')),
  recommended_camera_angle text not null,
  target_joints jsonb not null default '[]',
  stillness_joints jsonb not null default '[]',
  rom_expectation_deg numeric,
  tempo_expectation text,
  cues text[] not null default '{}',
  compensation_patterns jsonb not null default '[]',
  reference_video_path text,
  reference_dataset jsonb,
  reference_quality text check (reference_quality in ('high', 'reduced', 'low')),
  status text not null default 'draft' check (status in ('draft', 'live', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists movements_trainer_idx on movements(trainer_id);
create index if not exists movements_status_idx on movements(status);

alter table movements enable row level security;

-- Trainers fully manage their own movements.
create policy "trainer manages own movements"
  on movements for all
  using (trainer_id = auth.uid())
  with check (trainer_id = auth.uid());

-- Clients can read LIVE movements belonging to their trainer.
create policy "client reads live movements from their trainer"
  on movements for select
  using (
    status = 'live'
    and trainer_id = (select trainer_id from profiles where user_id = auth.uid())
  );

-- ─────────────────────────────────────────────────────────────────────────
-- client_attempts  (lean: timestamp + ROM% + flags only, no video/biometrics)
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists client_attempts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references profiles(user_id) on delete cascade,
  movement_id uuid not null references movements(id) on delete cascade,
  rom_achieved_pct numeric,
  compensation_flags text[] not null default '{}',
  confidence text check (confidence in ('high', 'reduced', 'low')),
  attempted_at timestamptz not null default now()
);

create index if not exists attempts_client_idx on client_attempts(client_id);
create index if not exists attempts_movement_idx on client_attempts(movement_id);

alter table client_attempts enable row level security;

-- Clients read/write/delete their own attempts.
create policy "client manages own attempts"
  on client_attempts for all
  using (client_id = auth.uid())
  with check (client_id = auth.uid());

-- Trainers can read attempts on movements they own.
create policy "trainer reads attempts on their movements"
  on client_attempts for select
  using (
    movement_id in (select id from movements where trainer_id = auth.uid())
  );

-- ─────────────────────────────────────────────────────────────────────────
-- Storage buckets (private). Signed URLs are issued for playback.
-- ─────────────────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('reference-videos', 'reference-videos', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('reference-thumbnails', 'reference-thumbnails', false)
on conflict (id) do nothing;

-- Trainers manage objects under their own user-id prefix: "<trainer_id>/...".
create policy "trainer writes own reference videos"
  on storage.objects for insert
  with check (
    bucket_id = 'reference-videos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "trainer updates own reference videos"
  on storage.objects for update
  using (
    bucket_id = 'reference-videos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "trainer reads own reference videos"
  on storage.objects for select
  using (
    bucket_id = 'reference-videos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Clients may read reference videos belonging to their trainer.
create policy "client reads trainer reference videos"
  on storage.objects for select
  using (
    bucket_id = 'reference-videos'
    and (storage.foldername(name))[1] = (
      select trainer_id::text from profiles where user_id = auth.uid()
    )
  );

create policy "trainer writes own thumbnails"
  on storage.objects for insert
  with check (
    bucket_id = 'reference-thumbnails'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "anyone signed-in reads thumbnails of their trainer"
  on storage.objects for select
  using (
    bucket_id = 'reference-thumbnails'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or (storage.foldername(name))[1] = (select trainer_id::text from profiles where user_id = auth.uid())
    )
  );
