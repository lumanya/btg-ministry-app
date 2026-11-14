-- Push notifications, YouTube playlist settings and events.
--
-- Who can do what:
--   everyone (guests too)  register their phone for notifications and choose topics;
--                          read published events and visible playlists
--   staff                  send or schedule announcements, choose playlists, manage events
--
-- Notifications are sent by the send-notifications Edge Function, which runs every
-- few minutes (see README: "Notifications"). It uses the service role, so devices
-- and the outbox are not readable by members.

-- ---------------------------------------------------------------------------
-- Devices that receive notifications
-- ---------------------------------------------------------------------------

create table if not exists public.push_devices (
  token text primary key check (token ~ '^(Exponent|Expo)PushToken\[.+\]$' and char_length(token) <= 200),
  user_id uuid references auth.users (id) on delete set null,
  platform text not null check (platform in ('ios', 'android', 'web')),
  -- Topics this phone wants: live, devotional, services, events, announcements
  topics text[] not null default array['live', 'devotional', 'services', 'events', 'announcements']
    check (topics <@ array['live', 'devotional', 'services', 'events', 'announcements']),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index if not exists push_devices_topics_idx on public.push_devices using gin (topics);

alter table public.push_devices enable row level security;
-- No policies: only the functions below and the sender (service role) touch this table.

-- Registers or updates this phone. Anyone may call it; it only ever affects the given token.
create or replace function public.register_push_device(device_token text, device_platform text, device_topics text[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.push_devices (token, user_id, platform, topics, last_seen_at)
  values (device_token, auth.uid(), device_platform, coalesce(device_topics, array[]::text[]), now())
  on conflict (token) do update
    set user_id = coalesce(auth.uid(), public.push_devices.user_id),
        platform = excluded.platform,
        topics = excluded.topics,
        last_seen_at = now();
end;
$$;

-- Turns notifications off for this phone.
create or replace function public.unregister_push_device(device_token text)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.push_devices where token = device_token;
$$;

-- How many phones would receive each topic (for the dashboard).
create or replace function public.push_audience()
returns json
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_staff() then
    raise exception 'Only staff can see this.' using errcode = '42501';
  end if;
  return json_build_object(
    'devices', (select count(*) from public.push_devices),
    'live', (select count(*) from public.push_devices where 'live' = any (topics)),
    'devotional', (select count(*) from public.push_devices where 'devotional' = any (topics)),
    'services', (select count(*) from public.push_devices where 'services' = any (topics)),
    'events', (select count(*) from public.push_devices where 'events' = any (topics)),
    'announcements', (select count(*) from public.push_devices where 'announcements' = any (topics))
  );
end;
$$;

revoke execute on function public.register_push_device(text, text, text[]) from public;
revoke execute on function public.unregister_push_device(text) from public;
revoke execute on function public.push_audience() from public, anon;
grant execute on function public.register_push_device(text, text, text[]) to anon, authenticated;
grant execute on function public.unregister_push_device(text) to anon, authenticated;
grant execute on function public.push_audience() to authenticated;

-- ---------------------------------------------------------------------------
-- Outbox: announcements from staff and automatic notifications
-- ---------------------------------------------------------------------------

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 80),
  body text not null check (char_length(body) between 1 and 240),
  topic text not null default 'announcements' check (topic in ('live', 'devotional', 'services', 'events', 'announcements')),
  -- Screen to open when tapped, e.g. /live, /devotional/on-repentance, /events/<id>
  url text check (url is null or url ~ '^/[A-Za-z0-9/_\-]*$'),
  send_at timestamptz not null default now(),
  status text not null default 'queued' check (status in ('queued', 'sending', 'sent', 'failed', 'cancelled')),
  -- Automatic notifications use a key so each is sent once (e.g. live:<videoId>).
  dedupe_key text unique,
  sent_count integer,
  error text,
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create index if not exists notifications_due_idx on public.notifications (status, send_at);

alter table public.notifications enable row level security;

create policy "Staff read notifications"
  on public.notifications for select
  to authenticated
  using ((select public.is_staff()));

create policy "Staff queue announcements"
  on public.notifications for insert
  to authenticated
  with check ((select public.is_staff()) and status = 'queued' and dedupe_key is null and sent_count is null);

-- Staff can only cancel or reschedule something that hasn't gone out.
create policy "Staff cancel or reschedule queued notifications"
  on public.notifications for update
  to authenticated
  using ((select public.is_staff()) and status = 'queued')
  with check ((select public.is_staff()) and status in ('queued', 'cancelled'));

-- ---------------------------------------------------------------------------
-- YouTube playlists: which ones show in the app, in what order
-- ---------------------------------------------------------------------------

create table if not exists public.playlists (
  youtube_id text primary key check (char_length(youtube_id) between 2 and 64),
  -- Optional nicer name than the one on YouTube.
  title text check (char_length(title) <= 100),
  visible boolean not null default true,
  sort integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.playlists enable row level security;

create policy "Anyone can read playlist settings"
  on public.playlists for select
  to anon, authenticated
  using (true);

create policy "Staff manage playlists"
  on public.playlists for all
  to authenticated
  using ((select public.is_staff()))
  with check ((select public.is_staff()));

-- ---------------------------------------------------------------------------
-- Events: conferences and special services
-- ---------------------------------------------------------------------------

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 120),
  starts_at timestamptz not null,
  ends_at timestamptz check (ends_at is null or ends_at >= starts_at),
  location_name text check (char_length(location_name) <= 120),
  address text check (char_length(address) <= 240),
  description text not null default '' check (char_length(description) <= 8000),
  image_url text check (image_url is null or image_url ~ '^https://'),
  registration_url text check (registration_url is null or registration_url ~ '^https://'),
  livestreamed boolean not null default false,
  status text not null default 'draft' check (status in ('draft', 'published')),
  -- Send "Tomorrow:" and "Starting soon" reminders to phones that follow events.
  remind boolean not null default true,
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists events_starts_at_idx on public.events (starts_at);

alter table public.events enable row level security;

create policy "Anyone can read published events"
  on public.events for select
  to anon, authenticated
  using (status = 'published' or (select public.is_staff()));

create policy "Staff manage events"
  on public.events for all
  to authenticated
  using ((select public.is_staff()))
  with check ((select public.is_staff()));

drop trigger if exists events_touch_updated_at on public.events;
create trigger events_touch_updated_at
  before update on public.events
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Table access for the API roles (rows are still filtered by the policies above)
-- ---------------------------------------------------------------------------

grant select on public.playlists, public.events to anon, authenticated;
grant insert, update, delete on public.playlists, public.events to authenticated;
grant select, insert, update on public.notifications to authenticated;
revoke all on public.push_devices from anon, authenticated;
