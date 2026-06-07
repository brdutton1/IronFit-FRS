-- Multi-provider video library + movement demo links + per-client AI entitlement.
--
-- Phase A: the videos library grows from YouTube-only to multi-provider so trainers
--   can link the content they already have (YouTube / TikTok / Vimeo), played in-app.
-- Phase B: a movement can use a linked library video as its demo ("watch & follow"),
--   instead of being forced to upload an MP4 (links can't feed the pose engine).
-- Phase D: AI Mirror becomes a per-CLIENT entitlement (client-pays). Default ON, no
--   billing yet — just the seam + an owner grant/revoke lever.

-- ── Phase A — multi-provider videos ───────────────────────────────────────
alter table public.videos rename column youtube_id to external_id;
alter table public.videos add column if not exists provider text not null default 'youtube'
  check (provider in ('youtube', 'tiktok', 'vimeo'));
alter table public.videos add column if not exists url text;           -- canonical link (oEmbed / open original)
alter table public.videos add column if not exists thumbnail_url text; -- optional preview for non-YouTube

-- ── Phase B — movement demo link ──────────────────────────────────────────
alter table public.movements add column if not exists video_id uuid
  references public.videos(id) on delete set null;

-- ── Phase D — per-client AI Mirror entitlement ────────────────────────────
alter table public.profiles add column if not exists ai_mirror_enabled boolean not null default true;

-- Surface the entitlement to the owner Control Center user list.
drop function if exists public.admin_list_users();

create function public.admin_list_users()
returns table (
  user_id uuid,
  email text,
  role text,
  display_name text,
  trainer_id uuid,
  is_owner boolean,
  ai_mirror_enabled boolean,
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
    select p.user_id, u.email::text, p.role::text, p.display_name, p.trainer_id,
           p.is_owner, p.ai_mirror_enabled, p.created_at
    from public.profiles p
    join auth.users u on u.id = p.user_id
    order by p.role, u.email;
end;
$$;

revoke execute on function public.admin_list_users() from anon, public;
grant execute on function public.admin_list_users() to authenticated;
