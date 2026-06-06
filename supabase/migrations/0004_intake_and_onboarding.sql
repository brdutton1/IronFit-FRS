-- Intake-link assignment + trainer profile (contact/welcome) + onboarding gate.
-- Replaces the demo "auto-assign every client to Lee" shortcut: clients now join
-- via a trainer's intake link, which carries the trainer's id into signup.

-- ─────────────────────────────────────────────────────────────────────────
-- profiles: invite code, contact/welcome fields, first-run gate
-- ─────────────────────────────────────────────────────────────────────────
alter table public.profiles
  add column if not exists invite_code text unique,
  add column if not exists phone text,
  add column if not exists bio text,
  add column if not exists welcome_message text,
  add column if not exists avatar_url text,
  add column if not exists onboarded_at timestamptz;

-- Short, human-shareable invite code, e.g. "LEAH-3F9K". Prefix from a name seed,
-- random 4-char suffix; retries until unique.
create or replace function public.generate_invite_code(seed text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prefix text;
  v_code text;
begin
  v_prefix := upper(regexp_replace(coalesce(split_part(seed, '@', 1), 'FRS'), '[^a-zA-Z]', '', 'g'));
  v_prefix := left(coalesce(nullif(v_prefix, ''), 'FRS'), 4);
  loop
    v_code := v_prefix || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 4));
    exit when not exists (select 1 from public.profiles where invite_code = v_code);
  end loop;
  return v_code;
end;
$$;

-- Resolve an invite code to its trainer. SECURITY DEFINER + granted to anon so
-- the public intake page can show "You're joining <trainer>" before signup.
create or replace function public.trainer_by_code(p_code text)
returns table (id uuid, display_name text)
language sql
security definer
stable
set search_path = public
as $$
  select user_id, display_name
  from public.profiles
  where invite_code = upper(trim(p_code)) and role = 'trainer'
  limit 1;
$$;

grant execute on function public.trainer_by_code(text) to anon, authenticated;

-- Backfill codes for the existing trainers.
update public.profiles p
set invite_code = public.generate_invite_code(coalesce(p.display_name, u.email))
from auth.users u
where u.id = p.user_id and p.role = 'trainer' and p.invite_code is null;

-- ─────────────────────────────────────────────────────────────────────────
-- handle_new_user: assign clients to the trainer named in their signup metadata
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_role text;
  v_trainer uuid;
  v_meta_trainer uuid;
begin
  if new.email in ('lee.e.irons@gmail.com', 'leah@ironfitlabs.com', 'brdutton1@outlook.com') then
    v_role := 'trainer';
    v_trainer := null;
  else
    v_role := 'client';
    -- Trainer chosen via the intake link, validated against a real trainer row.
    begin
      v_meta_trainer := nullif(new.raw_user_meta_data->>'trainer_id', '')::uuid;
    exception when others then
      v_meta_trainer := null;
    end;
    v_trainer := (select user_id from public.profiles where user_id = v_meta_trainer and role = 'trainer');
  end if;

  insert into public.profiles (user_id, display_name, role, trainer_id, invite_code)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', new.email),
    v_role,
    v_trainer,
    case when v_role = 'trainer'
      then public.generate_invite_code(coalesce(new.raw_user_meta_data->>'display_name', new.email))
      else null end
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from anon, authenticated, public;

-- ─────────────────────────────────────────────────────────────────────────
-- client_intake: background captured by the intake form
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.client_intake (
  client_id uuid primary key references public.profiles(user_id) on delete cascade,
  trainer_id uuid references public.profiles(user_id) on delete set null,
  phone text,
  goals text,
  injuries text,
  experience text,
  emergency_contact text,
  consent_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.client_intake enable row level security;

create policy "client manages own intake"
  on public.client_intake for all
  using (client_id = auth.uid())
  with check (client_id = auth.uid());

create policy "trainer reads their clients intake"
  on public.client_intake for select
  using (trainer_id = auth.uid());
