-- In-app 1:1 chat between a client and their trainer.
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(user_id) on delete cascade,
  recipient_id uuid not null references public.profiles(user_id) on delete cascade,
  body text not null check (length(trim(body)) > 0 and length(body) <= 4000),
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists messages_pair_idx on public.messages (sender_id, recipient_id, created_at);
create index if not exists messages_recipient_idx on public.messages (recipient_id, created_at);

alter table public.messages enable row level security;

create policy "read own conversations"
  on public.messages for select
  using (auth.uid() = sender_id or auth.uid() = recipient_id);

-- Send only as yourself, only to your trainer (if a client) or to one of your
-- clients (if a trainer).
create policy "send to your trainer or your client"
  on public.messages for insert
  with check (
    sender_id = auth.uid()
    and (
      recipient_id = public.auth_user_trainer_id()
      or recipient_id in (select user_id from public.profiles where trainer_id = auth.uid())
    )
  );

create policy "mark received as read"
  on public.messages for update
  using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());

-- Stream new messages into open threads.
alter publication supabase_realtime add table public.messages;
