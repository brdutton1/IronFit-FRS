-- Per-client programs — the trainer's "Your focus" pinned for a client. The
-- client still sees the full library; assigned movements are highlighted on top.
create table if not exists public.program_assignments (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.profiles(user_id) on delete cascade,
  client_id uuid not null references public.profiles(user_id) on delete cascade,
  movement_id uuid not null references public.movements(id) on delete cascade,
  note text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (client_id, movement_id)
);

create index if not exists program_client_idx on public.program_assignments(client_id);
create index if not exists program_trainer_idx on public.program_assignments(trainer_id);

alter table public.program_assignments enable row level security;

-- A trainer manages focus for clients on their own roster.
create policy "trainer manages their clients programs"
  on public.program_assignments for all
  using (trainer_id = auth.uid())
  with check (
    trainer_id = auth.uid()
    and client_id in (select user_id from public.profiles where trainer_id = auth.uid())
  );

-- A client reads their own focus.
create policy "client reads own program"
  on public.program_assignments for select
  using (client_id = auth.uid());
