-- Clips: short videos from the ministry's Instagram, shown full screen in the app.
--
-- The videos stay on Instagram (no storage cost). The instagram-feed function reads
-- them with the ministry's Instagram access key, which lives in a private table
-- here so the function can renew it every few weeks.
--
--   public.clips            staff choices per video: hide it, link it to a sermon
--   public.instagram_auth   the access key; nobody but the server can read it
--   likes / views           now also count clips

-- ---------------------------------------------------------------------------
-- Staff choices per clip
-- ---------------------------------------------------------------------------

create table if not exists public.clips (
  instagram_id text primary key check (instagram_id ~ '^[0-9_]{3,64}$'),
  hidden boolean not null default false,
  -- Optional nicer title than the first line of the Instagram caption.
  title text check (char_length(title) <= 100),
  -- The full sermon on YouTube this clip comes from, and where in it.
  sermon_youtube_id text check (sermon_youtube_id ~ '^[A-Za-z0-9_-]{6,20}$'),
  sermon_start_seconds integer check (sermon_start_seconds between 0 and 86400),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null default auth.uid()
);

alter table public.clips enable row level security;

drop policy if exists "Anyone can read clip settings" on public.clips;
create policy "Anyone can read clip settings"
  on public.clips for select
  to anon, authenticated
  using (true);

drop policy if exists "Staff manage clips" on public.clips;
create policy "Staff manage clips"
  on public.clips for all
  to authenticated
  using ((select public.is_staff()))
  with check ((select public.is_staff()));

revoke insert, update, delete on public.clips from anon;
grant select on public.clips to anon, authenticated;
grant insert, update, delete on public.clips to authenticated;

-- ---------------------------------------------------------------------------
-- The Instagram access key (server only)
-- ---------------------------------------------------------------------------

create table if not exists public.instagram_auth (
  id smallint primary key default 1 check (id = 1),
  access_token text not null,
  expires_at timestamptz,
  refreshed_at timestamptz,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

alter table public.instagram_auth enable row level security;
revoke all on public.instagram_auth from anon, authenticated;

-- Staff paste a new key from the Meta dashboard; it is stored but never shown again.
create or replace function public.set_instagram_token(token text, expires_in_days integer default 60)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_staff() then
    raise exception 'Only staff can connect Instagram.' using errcode = '42501';
  end if;
  if token is null or char_length(trim(token)) < 20 or char_length(token) > 1000 or trim(token) ~ '\s' then
    raise exception 'That doesn''t look like an Instagram access token.' using errcode = '22023';
  end if;
  insert into public.instagram_auth (id, access_token, expires_at, refreshed_at, updated_at, updated_by)
  values (1, trim(token), now() + make_interval(days => greatest(1, least(expires_in_days, 60))), null, now(), auth.uid())
  on conflict (id) do update
    set access_token = excluded.access_token,
        expires_at = excluded.expires_at,
        refreshed_at = null,
        updated_at = now(),
        updated_by = auth.uid();
end;
$$;

-- What the dashboard shows: connected or not, and until when. Never the key.
create or replace function public.instagram_status()
returns json
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  auth_row public.instagram_auth;
begin
  if not public.is_staff() then
    raise exception 'Only staff can see this.' using errcode = '42501';
  end if;
  select * into auth_row from public.instagram_auth where id = 1;
  return json_build_object(
    'connected', auth_row.id is not null,
    'expires_at', auth_row.expires_at,
    'refreshed_at', auth_row.refreshed_at,
    'updated_at', auth_row.updated_at
  );
end;
$$;

create or replace function public.disconnect_instagram()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_staff() then
    raise exception 'Only staff can disconnect Instagram.' using errcode = '42501';
  end if;
  delete from public.instagram_auth where id = 1;
end;
$$;

revoke execute on function public.set_instagram_token(text, integer) from public, anon;
revoke execute on function public.instagram_status() from public, anon;
revoke execute on function public.disconnect_instagram() from public, anon;
grant execute on function public.set_instagram_token(text, integer) to authenticated;
grant execute on function public.instagram_status() to authenticated;
grant execute on function public.disconnect_instagram() to authenticated;

-- ---------------------------------------------------------------------------
-- Clips can be liked and their views counted
-- ---------------------------------------------------------------------------

alter table public.likes drop constraint if exists likes_kind_check;
alter table public.likes add constraint likes_kind_check check (kind in ('video', 'devotional', 'event', 'clip'));
alter table public.views drop constraint if exists views_kind_check;
alter table public.views add constraint views_kind_check check (kind in ('video', 'devotional', 'event', 'clip'));
