-- Kiswahili versions of ministry content, likes and view counts.
--
--   Kiswahili  optional *_sw columns; the app shows them to members who chose Kiswahili
--              and falls back to English where a translation is empty
--   Likes      anyone can like a sermon or devotional once (members by account,
--              guests by an anonymous id the app creates on the phone)
--   Views      one view per person per item per day; counts are public

-- ---------------------------------------------------------------------------
-- Kiswahili content
-- ---------------------------------------------------------------------------

alter table public.devotionals
  add column if not exists title_sw text check (char_length(title_sw) <= 160),
  add column if not exists subtitle_sw text check (char_length(subtitle_sw) <= 160),
  add column if not exists scripture_text_sw text check (char_length(scripture_text_sw) <= 1000),
  add column if not exists excerpt_sw text check (char_length(excerpt_sw) <= 400),
  add column if not exists body_sw text check (char_length(body_sw) <= 40000);

alter table public.quotes
  add column if not exists text_sw text check (char_length(text_sw) <= 400);

alter table public.events
  add column if not exists title_sw text check (char_length(title_sw) <= 120),
  add column if not exists description_sw text check (char_length(description_sw) <= 8000);

alter table public.services
  add column if not exists name_sw text check (char_length(name_sw) <= 80);

alter table public.notifications
  add column if not exists title_sw text check (char_length(title_sw) between 1 and 80),
  add column if not exists body_sw text check (char_length(body_sw) between 1 and 240);

-- Each phone's language, so notifications arrive in it.
alter table public.push_devices
  add column if not exists locale text not null default 'en' check (locale in ('en', 'sw'));

drop function if exists public.register_push_device(text, text, text[]);

create or replace function public.register_push_device(device_token text, device_platform text, device_topics text[], device_locale text default 'en')
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.push_devices (token, user_id, platform, topics, locale, last_seen_at)
  values (device_token, auth.uid(), device_platform, coalesce(device_topics, array[]::text[]), coalesce(device_locale, 'en'), now())
  on conflict (token) do update
    set user_id = coalesce(auth.uid(), public.push_devices.user_id),
        platform = excluded.platform,
        topics = excluded.topics,
        locale = excluded.locale,
        last_seen_at = now();
end;
$$;

revoke execute on function public.register_push_device(text, text, text[], text) from public;
grant execute on function public.register_push_device(text, text, text[], text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Likes and views
-- ---------------------------------------------------------------------------

create table if not exists public.likes (
  kind text not null check (kind in ('video', 'devotional')),
  item_id text not null check (char_length(item_id) between 1 and 100),
  -- 'u:<account id>' for members, 'd:<anonymous phone id>' for guests
  liker text not null check (liker ~ '^(u|d):[A-Za-z0-9-]{8,64}$'),
  created_at timestamptz not null default now(),
  primary key (kind, item_id, liker)
);

create table if not exists public.views (
  kind text not null check (kind in ('video', 'devotional')),
  item_id text not null check (char_length(item_id) between 1 and 100),
  viewer text not null check (viewer ~ '^(u|d):[A-Za-z0-9-]{8,64}$'),
  day date not null default public.ministry_today(),
  primary key (kind, item_id, viewer, day)
);

create index if not exists likes_item_idx on public.likes (kind, item_id);
create index if not exists views_item_idx on public.views (kind, item_id);

alter table public.likes enable row level security;
alter table public.views enable row level security;
-- No policies: only the functions below read or write these tables.
revoke all on public.likes, public.views from anon, authenticated;

-- Who is acting: the signed-in member, otherwise the phone's anonymous id.
create or replace function public.actor_id(device_id text)
returns text
language plpgsql
stable
set search_path = ''
as $$
begin
  if auth.uid() is not null then
    return 'u:' || auth.uid()::text;
  end if;
  if device_id is null or device_id !~ '^[A-Za-z0-9-]{8,64}$' then
    raise exception 'Missing phone id.' using errcode = '22023';
  end if;
  return 'd:' || device_id;
end;
$$;

-- Likes or unlikes; returns the new state and count.
create or replace function public.toggle_like(like_kind text, like_item text, device_id text default null)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  me text := public.actor_id(device_id);
  now_liked boolean;
begin
  if exists (select 1 from public.likes where kind = like_kind and item_id = like_item and liker = me) then
    delete from public.likes where kind = like_kind and item_id = like_item and liker = me;
    now_liked := false;
  else
    insert into public.likes (kind, item_id, liker) values (like_kind, like_item, me);
    now_liked := true;
  end if;
  return json_build_object(
    'liked', now_liked,
    'likes', (select count(*) from public.likes where kind = like_kind and item_id = like_item)
  );
end;
$$;

-- Counts for a screenful of items, and whether this person liked each.
create or replace function public.item_stats(stat_kind text, items text[], device_id text default null)
returns table (item_id text, likes bigint, views bigint, liked boolean)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  me text := case
    when auth.uid() is not null then 'u:' || auth.uid()::text
    when device_id ~ '^[A-Za-z0-9-]{8,64}$' then 'd:' || device_id
    else null
  end;
begin
  if coalesce(array_length(items, 1), 0) > 200 then
    raise exception 'Ask for at most 200 items at a time.' using errcode = '22023';
  end if;
  return query
    select i.id,
      (select count(*) from public.likes l where l.kind = stat_kind and l.item_id = i.id),
      (select count(*) from public.views v where v.kind = stat_kind and v.item_id = i.id),
      coalesce(me is not null and exists (select 1 from public.likes l where l.kind = stat_kind and l.item_id = i.id and l.liker = me), false)
    from unnest(items) as i(id);
end;
$$;

-- Counts one view per person per item per day.
create or replace function public.record_view(view_kind text, view_item text, device_id text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.views (kind, item_id, viewer)
  values (view_kind, view_item, public.actor_id(device_id))
  on conflict do nothing;
end;
$$;

-- The most liked and viewed items recently, for the dashboard.
create or replace function public.top_items(stat_kind text, since_days integer default 30)
returns table (item_id text, likes bigint, views bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_staff() then
    raise exception 'Only staff can see this.' using errcode = '42501';
  end if;
  return query
    with recent_views as (
      select v.item_id, count(*) as n from public.views v
      where v.kind = stat_kind and v.day > public.ministry_today() - since_days group by v.item_id
    ), recent_likes as (
      select l.item_id, count(*) as n from public.likes l
      where l.kind = stat_kind and l.created_at > now() - make_interval(days => since_days) group by l.item_id
    )
    select coalesce(v.item_id, l.item_id), coalesce(l.n, 0), coalesce(v.n, 0)
    from recent_views v full join recent_likes l on l.item_id = v.item_id
    order by coalesce(v.n, 0) + 3 * coalesce(l.n, 0) desc
    limit 20;
end;
$$;

revoke execute on function public.actor_id(text) from public;
revoke execute on function public.toggle_like(text, text, text) from public;
revoke execute on function public.item_stats(text, text[], text) from public;
revoke execute on function public.record_view(text, text, text) from public;
revoke execute on function public.top_items(text, integer) from public, anon;
grant execute on function public.toggle_like(text, text, text) to anon, authenticated;
grant execute on function public.item_stats(text, text[], text) to anon, authenticated;
grant execute on function public.record_view(text, text, text) to anon, authenticated;
grant execute on function public.top_items(text, integer) to authenticated;

-- When a member deletes their account, remove what they wrote and liked, not just
-- the link to it. Runs before the account row goes, so their id can still be matched.
create or replace function public.forget_deleted_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.prayer_requests where user_id = old.id;
  delete from public.likes where liker = 'u:' || old.id::text;
  delete from public.views where viewer = 'u:' || old.id::text;
  return old;
end;
$$;

revoke execute on function public.forget_deleted_user() from public, anon, authenticated;

drop trigger if exists forget_deleted_user on auth.users;
create trigger forget_deleted_user
  before delete on auth.users
  for each row execute function public.forget_deleted_user();
