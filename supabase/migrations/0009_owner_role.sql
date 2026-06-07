-- Owner / super-admin tier + trainer isolation (multi-tenant foundation).
--
-- Until now every trainer could see every other trainer's clients (0006). To sell
-- this to outside trainers each trainer must be walled off to their own clients,
-- and one OWNER (super-admin) retains the cross-practice view via the Control
-- Center. Owner is an added flag on top of a normal trainer account, so the owner
-- keeps full trainer abilities AND gains super-admin powers.

alter table public.profiles
  add column if not exists is_owner boolean not null default false;

-- Seed the platform owner (brdutton1@outlook.com).
update public.profiles set is_owner = true
where user_id = '13c773fa-cbbb-4791-847f-ccfaa2c76829';

-- Caller is the owner? SECURITY DEFINER bypasses RLS, so no recursion.
create or replace function public.is_owner()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (select 1 from public.profiles where user_id = auth.uid() and is_owner);
$$;

revoke execute on function public.is_owner() from anon, public;
grant execute on function public.is_owner() to authenticated;

-- Isolate trainers: the 0006 cross-practice reads move from "any trainer" to
-- "owner only". Regular trainers fall back to the per-trainer policies (0001/0002)
-- and once again see only their own clients.
drop policy if exists "trainers read all profiles" on public.profiles;
drop policy if exists "trainers read all movements" on public.movements;
drop policy if exists "trainers read all attempts" on public.client_attempts;
drop policy if exists "trainers read all intake" on public.client_intake;
drop policy if exists "trainers read all programs" on public.program_assignments;
drop policy if exists "trainers reassign clients" on public.profiles;

create policy "owner reads all profiles"
  on public.profiles for select
  using (public.is_owner());

create policy "owner reads all movements"
  on public.movements for select
  using (public.is_owner());

create policy "owner reads all attempts"
  on public.client_attempts for select
  using (public.is_owner());

create policy "owner reads all intake"
  on public.client_intake for select
  using (public.is_owner());

create policy "owner reads all programs"
  on public.program_assignments for select
  using (public.is_owner());

-- Owner may edit any profile: change roles, grant owner, transfer clients.
create policy "owner manages all profiles"
  on public.profiles for update
  using (public.is_owner())
  with check (public.is_owner());

-- Master user list for the Control Center: only the owner can read emails
-- (auth.users) alongside profile fields.
create or replace function public.admin_list_users()
returns table (
  user_id uuid,
  email text,
  role text,
  display_name text,
  trainer_id uuid,
  is_owner boolean,
  created_at timestamptz
)
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  if not public.is_owner() then
    raise exception 'not authorized';
  end if;
  return query
    select p.user_id, u.email::text, p.role::text, p.display_name, p.trainer_id, p.is_owner, p.created_at
    from public.profiles p
    join auth.users u on u.id = p.user_id
    order by p.role, u.email;
end;
$$;

revoke execute on function public.admin_list_users() from anon, public;
grant execute on function public.admin_list_users() to authenticated;
