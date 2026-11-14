-- BTG Ministry content and member data.
--
-- Who can do what:
--   everyone (guests too)  read published devotionals, series, services, giving details and quotes;
--                          send a prayer request
--   members (signed in)    the above, plus keep their own reading streak and saved items
--   editors (staff)        create, edit and publish content; read and answer prayer requests
--   admins (staff)         everything editors can do, plus add and remove staff
--
-- Apply with: npx supabase db push   (or paste into the SQL editor of the Supabase dashboard)

-- ---------------------------------------------------------------------------
-- Staff
-- ---------------------------------------------------------------------------

create table if not exists public.staff (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'editor' check (role in ('editor', 'admin')),
  added_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.staff enable row level security;

-- These run with the owner's rights so policies can check staff without recursion.
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.staff where user_id = (select auth.uid()));
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.staff where user_id = (select auth.uid()) and role = 'admin');
$$;

create policy "Staff can see the staff list"
  on public.staff for select
  to authenticated
  using (user_id = (select auth.uid()) or (select public.is_staff()));

create policy "Admins add staff"
  on public.staff for insert
  to authenticated
  with check ((select public.is_admin()));

create policy "Admins change staff roles"
  on public.staff for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "Admins remove staff"
  on public.staff for delete
  to authenticated
  using ((select public.is_admin()));

-- Never leave the ministry without an admin.
create or replace function public.keep_one_admin()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.role = 'admin'
     and (tg_op = 'DELETE' or new.role <> 'admin')
     and not exists (select 1 from public.staff where role = 'admin' and user_id <> old.user_id) then
    raise exception 'The ministry needs at least one admin.' using errcode = 'P0001';
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists staff_keep_one_admin on public.staff;
create trigger staff_keep_one_admin
  before update or delete on public.staff
  for each row execute function public.keep_one_admin();

-- Today's date in Tanzania, so a devotional dated today appears at midnight local time.
create or replace function public.ministry_today()
returns date
language sql
stable
set search_path = ''
as $$
  select (now() at time zone 'Africa/Dar_es_Salaam')::date;
$$;

-- ---------------------------------------------------------------------------
-- Series (groups of devotionals and teachings, e.g. "The Soul")
-- ---------------------------------------------------------------------------

create table if not exists public.series (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(name) between 1 and 60),
  tone text not null default 'brown' check (tone in ('brown', 'deep', 'sand')),
  sort integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.series enable row level security;

create policy "Anyone can read series"
  on public.series for select
  to anon, authenticated
  using (true);

create policy "Staff manage series"
  on public.series for all
  to authenticated
  using ((select public.is_staff()))
  with check ((select public.is_staff()));

-- ---------------------------------------------------------------------------
-- Devotionals
-- ---------------------------------------------------------------------------

create table if not exists public.devotionals (
  id uuid primary key default gen_random_uuid(),
  -- Used in links and by the app: lowercase words joined by hyphens.
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 100),
  title text not null check (char_length(title) between 1 and 160),
  subtitle text check (char_length(subtitle) <= 160),
  scripture_ref text check (char_length(scripture_ref) <= 80),
  scripture_text text check (char_length(scripture_text) <= 1000),
  excerpt text not null default '' check (char_length(excerpt) <= 400),
  -- Paragraphs separated by a blank line.
  body text not null default '' check (char_length(body) <= 40000),
  series_id uuid references public.series (id) on delete set null,
  audio_url text check (audio_url is null or audio_url ~ '^https://'),
  -- The day it becomes "today's devotional" in the app.
  publish_on date not null default public.ministry_today(),
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists devotionals_publish_on_idx on public.devotionals (publish_on desc);

alter table public.devotionals enable row level security;

-- Published devotionals appear on their date; drafts and future ones stay with staff.
create policy "Anyone can read published devotionals"
  on public.devotionals for select
  to anon, authenticated
  using (status = 'published' and publish_on <= (select public.ministry_today()));

create policy "Staff can read every devotional"
  on public.devotionals for select
  to authenticated
  using ((select public.is_staff()));

create policy "Staff add devotionals"
  on public.devotionals for insert
  to authenticated
  with check ((select public.is_staff()));

create policy "Staff edit devotionals"
  on public.devotionals for update
  to authenticated
  using ((select public.is_staff()))
  with check ((select public.is_staff()));

create policy "Staff delete devotionals"
  on public.devotionals for delete
  to authenticated
  using ((select public.is_staff()));

create or replace function public.stamp_devotional()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  new.updated_by = auth.uid();
  return new;
end;
$$;

drop trigger if exists devotionals_stamp on public.devotionals;
create trigger devotionals_stamp
  before update on public.devotionals
  for each row execute function public.stamp_devotional();

-- ---------------------------------------------------------------------------
-- Weekly services (shown on the Live tab when nothing is scheduled on YouTube)
-- ---------------------------------------------------------------------------

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  -- 0 = Sunday … 6 = Saturday
  weekday smallint not null check (weekday between 0 and 6),
  start_time time not null,
  venue text check (char_length(venue) <= 120),
  livestreamed boolean not null default true,
  active boolean not null default true,
  sort integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.services enable row level security;

create policy "Anyone can read active services"
  on public.services for select
  to anon, authenticated
  using (active or (select public.is_staff()));

create policy "Staff manage services"
  on public.services for all
  to authenticated
  using ((select public.is_staff()))
  with check ((select public.is_staff()));

-- ---------------------------------------------------------------------------
-- Giving details (M-Pesa, bank)
-- ---------------------------------------------------------------------------

create table if not exists public.giving_methods (
  id uuid primary key default gen_random_uuid(),
  label text not null check (char_length(label) between 1 and 80),
  number text not null check (char_length(number) between 1 and 40),
  account_name text check (char_length(account_name) <= 120),
  active boolean not null default true,
  sort integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.giving_methods enable row level security;

create policy "Anyone can read active giving details"
  on public.giving_methods for select
  to anon, authenticated
  using (active or (select public.is_staff()));

create policy "Staff manage giving details"
  on public.giving_methods for all
  to authenticated
  using ((select public.is_staff()))
  with check ((select public.is_staff()));

-- ---------------------------------------------------------------------------
-- "Word for today" quotes on the home screen
-- ---------------------------------------------------------------------------

create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  text text not null check (char_length(text) between 1 and 400),
  attribution text not null default 'Iman Mwakanyamale' check (char_length(attribution) <= 80),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.quotes enable row level security;

create policy "Anyone can read active quotes"
  on public.quotes for select
  to anon, authenticated
  using (active or (select public.is_staff()));

create policy "Staff manage quotes"
  on public.quotes for all
  to authenticated
  using ((select public.is_staff()))
  with check ((select public.is_staff()));

-- ---------------------------------------------------------------------------
-- Prayer requests
-- ---------------------------------------------------------------------------

create table if not exists public.prayer_requests (
  id uuid primary key default gen_random_uuid(),
  -- Set for members; empty for guests.
  user_id uuid references auth.users (id) on delete set null default auth.uid(),
  name text check (char_length(name) <= 80),
  contact text check (char_length(contact) <= 120),
  message text not null check (char_length(btrim(message)) between 3 and 2000),
  status text not null default 'new' check (status in ('new', 'prayed', 'archived')),
  handled_by uuid references auth.users (id) on delete set null,
  handled_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists prayer_requests_created_idx on public.prayer_requests (created_at desc);

alter table public.prayer_requests enable row level security;

-- Anyone can send one, but only as themselves and only as a new request.
create policy "Anyone can send a prayer request"
  on public.prayer_requests for insert
  to anon, authenticated
  with check (
    status = 'new'
    and handled_by is null
    and (user_id is null or user_id = (select auth.uid()))
  );

create policy "Members can see their own prayer requests"
  on public.prayer_requests for select
  to authenticated
  using (user_id = (select auth.uid()) or (select public.is_staff()));

create policy "Staff update prayer requests"
  on public.prayer_requests for update
  to authenticated
  using ((select public.is_staff()))
  with check ((select public.is_staff()));

create policy "Staff delete prayer requests"
  on public.prayer_requests for delete
  to authenticated
  using ((select public.is_staff()));

-- Record who marked a request as prayed for, and when.
create or replace function public.stamp_prayer_request()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status is distinct from old.status then
    new.handled_by = auth.uid();
    new.handled_at = now();
  end if;
  return new;
end;
$$;

drop trigger if exists prayer_requests_stamp on public.prayer_requests;
create trigger prayer_requests_stamp
  before update on public.prayer_requests
  for each row execute function public.stamp_prayer_request();

-- Slow down floods: at most 30 requests a minute from the whole app, 3 an hour per member.
create or replace function public.limit_prayer_requests()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.prayer_requests where created_at > now() - interval '1 minute') >= 30 then
    raise exception 'Many prayer requests are arriving right now. Please try again in a minute.' using errcode = 'P0001';
  end if;
  if new.user_id is not null and (
    select count(*) from public.prayer_requests
    where user_id = new.user_id and created_at > now() - interval '1 hour'
  ) >= 3 then
    raise exception 'You have sent several requests this hour. Please try again later.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists prayer_requests_limit on public.prayer_requests;
create trigger prayer_requests_limit
  before insert on public.prayer_requests
  for each row execute function public.limit_prayer_requests();

-- ---------------------------------------------------------------------------
-- Member data: reading streak and saved items, so they follow a member to a new phone
-- ---------------------------------------------------------------------------

create table if not exists public.reading_log (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  devotional_slug text not null check (char_length(devotional_slug) <= 100),
  read_on date not null,
  primary key (user_id, devotional_slug)
);

alter table public.reading_log enable row level security;

create policy "Members manage their own reading log"
  on public.reading_log for all
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create table if not exists public.saved_items (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null check (kind in ('video', 'devotional')),
  item_id text not null check (char_length(item_id) <= 100),
  -- For sermons: the title, thumbnail and date, so the Saved list shows without the feed.
  data jsonb check (data is null or pg_column_size(data) <= 4000),
  created_at timestamptz not null default now(),
  primary key (user_id, kind, item_id)
);

alter table public.saved_items enable row level security;

create policy "Members manage their own saved items"
  on public.saved_items for all
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Staff tools (called from the admin dashboard)
-- ---------------------------------------------------------------------------

-- Numbers for the dashboard's overview.
create or replace function public.admin_overview()
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
    'members', (select count(*) from auth.users),
    'members_this_week', (select count(*) from auth.users where created_at > now() - interval '7 days'),
    'devotionals_published', (select count(*) from public.devotionals where status = 'published' and publish_on <= public.ministry_today()),
    'devotionals_scheduled', (select count(*) from public.devotionals where status = 'published' and publish_on > public.ministry_today()),
    'devotionals_drafts', (select count(*) from public.devotionals where status = 'draft'),
    'prayer_new', (select count(*) from public.prayer_requests where status = 'new'),
    'reads_this_week', (select count(*) from public.reading_log where read_on > public.ministry_today() - 7),
    'next_scheduled_on', (select min(publish_on) from public.devotionals where status = 'published' and publish_on > public.ministry_today()),
    'last_published_on', (select max(publish_on) from public.devotionals where status = 'published')
  );
end;
$$;

-- The staff list with names and emails (auth.users is not readable directly).
create or replace function public.list_staff()
returns table (user_id uuid, email text, full_name text, role text, created_at timestamptz)
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
    select s.user_id, u.email::text, p.full_name, s.role, s.created_at
    from public.staff s
    join auth.users u on u.id = s.user_id
    left join public.profiles p on p.id = s.user_id
    order by s.role, u.email;
end;
$$;

-- Give an existing account staff access. The person signs up in the app first.
create or replace function public.add_staff(staff_email text, staff_role text default 'editor')
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  target uuid;
begin
  if not public.is_admin() then
    raise exception 'Only admins can add staff.' using errcode = '42501';
  end if;
  if staff_role not in ('editor', 'admin') then
    raise exception 'Role must be editor or admin.' using errcode = '22023';
  end if;
  select id into target from auth.users where lower(email) = lower(btrim(staff_email));
  if target is null then
    raise exception 'No account uses that email. Ask them to create an account in the app first.' using errcode = 'P0002';
  end if;
  insert into public.staff (user_id, role, added_by)
  values (target, staff_role, auth.uid())
  on conflict (user_id) do update set role = excluded.role;
  return target;
end;
$$;

-- Lets the dashboard know whether the signed-in person is staff, and which role.
create or replace function public.my_staff_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.staff where user_id = (select auth.uid());
$$;

revoke execute on function public.admin_overview() from public, anon;
revoke execute on function public.list_staff() from public, anon;
revoke execute on function public.add_staff(text, text) from public, anon;
revoke execute on function public.my_staff_role() from public, anon;
grant execute on function public.admin_overview() to authenticated;
grant execute on function public.list_staff() to authenticated;
grant execute on function public.add_staff(text, text) to authenticated;
grant execute on function public.my_staff_role() to authenticated;

-- ---------------------------------------------------------------------------
-- Table access for the app's API roles (rows are still filtered by the policies above)
-- ---------------------------------------------------------------------------

grant select on public.series, public.devotionals, public.services, public.giving_methods, public.quotes to anon, authenticated;
grant insert on public.prayer_requests to anon, authenticated;
grant select, update, delete on public.prayer_requests to authenticated;
grant insert, update, delete on public.series, public.devotionals, public.services, public.giving_methods, public.quotes to authenticated;
grant select, insert, update, delete on public.staff, public.reading_log, public.saved_items to authenticated;

-- ---------------------------------------------------------------------------
-- Storage: a public "media" bucket for devotional audio and images; only staff upload
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 52428800, array['audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "Staff upload media"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'media' and (select public.is_staff()));

create policy "Staff replace media"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'media' and (select public.is_staff()));

create policy "Staff delete media"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'media' and (select public.is_staff()));
