-- In-app testing notes: a shared, per-page feedback log used while the team
-- (Bryan, Lee, Leah, and test-client accounts) tries the app. Gated in the UI by
-- a flag that's switched off before real clients onboard. Feedback text only —
-- no client PII — so reads are open to any authenticated tester.
create table if not exists public.dev_notes (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references public.profiles(user_id) on delete set null,
  author_name text,
  page_path text not null,
  page_title text,
  body text not null check (length(trim(body)) > 0 and length(body) <= 4000),
  author_role text,
  user_agent text,
  viewport text,
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists dev_notes_created_idx on public.dev_notes (created_at desc);

alter table public.dev_notes enable row level security;

-- Every logged-in tester sees the same running list.
create policy "authenticated reads all dev notes"
  on public.dev_notes for select
  using (auth.uid() is not null);

-- You can only post as yourself.
create policy "insert own dev note"
  on public.dev_notes for insert
  with check (author_id = auth.uid());

-- Authors manage their own notes; any trainer can resolve / clean up.
create policy "author or trainer updates dev note"
  on public.dev_notes for update
  using (author_id = auth.uid() or public.is_trainer())
  with check (author_id = auth.uid() or public.is_trainer());

create policy "author or trainer deletes dev note"
  on public.dev_notes for delete
  using (author_id = auth.uid() or public.is_trainer());
