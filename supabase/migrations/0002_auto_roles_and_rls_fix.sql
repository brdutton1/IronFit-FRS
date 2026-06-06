-- Auto-assign roles on sign-up + fix the self-referential profiles RLS recursion.

-- Helper: caller's trainer_id WITHOUT triggering profiles RLS (SECURITY DEFINER
-- bypasses RLS), so policies can reference it without recursing.
create or replace function public.auth_user_trainer_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select trainer_id from public.profiles where user_id = auth.uid();
$$;

revoke execute on function public.auth_user_trainer_id() from anon, public;
grant execute on function public.auth_user_trainer_id() to authenticated;

-- On sign-up: the IronFit trainers get 'trainer'; everyone else is a 'client'
-- auto-joined to Lee (the single training practice). Reversible demo shortcut —
-- the long-term version is an in-app role/trainer-code step.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_role text;
  v_trainer uuid;
begin
  if new.email in ('lee.e.irons@gmail.com', 'leah@ironfitlabs.com', 'brdutton1@outlook.com') then
    v_role := 'trainer';
    v_trainer := null;
  else
    v_role := 'client';
    v_trainer := (select id from auth.users where email = 'lee.e.irons@gmail.com' limit 1);
  end if;

  insert into public.profiles (user_id, display_name, role, trainer_id)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', new.email), v_role, v_trainer)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from anon, authenticated, public;

-- Replace the recursive policies with non-recursive ones using the helper.
drop policy if exists "client reads their trainer" on public.profiles;
create policy "client reads their trainer"
  on public.profiles for select
  using (user_id = public.auth_user_trainer_id());

drop policy if exists "client reads live movements from their trainer" on public.movements;
create policy "client reads live movements from their trainer"
  on public.movements for select
  using (status = 'live' and trainer_id = public.auth_user_trainer_id());

drop policy if exists "client reads trainer reference videos" on storage.objects;
create policy "client reads trainer reference videos"
  on storage.objects for select
  using (
    bucket_id = 'reference-videos'
    and (storage.foldername(name))[1] = public.auth_user_trainer_id()::text
  );

drop policy if exists "anyone signed-in reads thumbnails of their trainer" on storage.objects;
create policy "anyone signed-in reads thumbnails of their trainer"
  on storage.objects for select
  using (
    bucket_id = 'reference-thumbnails'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or (storage.foldername(name))[1] = public.auth_user_trainer_id()::text
    )
  );
