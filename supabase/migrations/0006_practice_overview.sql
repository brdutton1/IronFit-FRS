-- Practice-wide overview shared by all trainers (Bryan, Lee, Leah). In this
-- single small practice every trainer can see every roster and reassign clients.
-- This intentionally loosens per-trainer isolation among TRAINERS only; clients
-- still see nothing but their own data.

-- Caller is a trainer? SECURITY DEFINER bypasses RLS, so no recursion.
create or replace function public.is_trainer()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (select 1 from public.profiles where user_id = auth.uid() and role = 'trainer');
$$;

revoke execute on function public.is_trainer() from anon, public;
grant execute on function public.is_trainer() to authenticated;

-- Additive read policies (OR with existing ones) for the practice-wide view.
create policy "trainers read all profiles"
  on public.profiles for select
  using (public.is_trainer());

create policy "trainers read all movements"
  on public.movements for select
  using (public.is_trainer());

create policy "trainers read all attempts"
  on public.client_attempts for select
  using (public.is_trainer());

create policy "trainers read all intake"
  on public.client_intake for select
  using (public.is_trainer());

create policy "trainers read all programs"
  on public.program_assignments for select
  using (public.is_trainer());

-- Any trainer may reassign a client to another trainer (and edit client profile
-- fields) — needed for the shared overview's "move client" action.
create policy "trainers reassign clients"
  on public.profiles for update
  using (public.is_trainer() and role = 'client')
  with check (public.is_trainer() and role = 'client');
