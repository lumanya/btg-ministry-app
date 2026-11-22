-- Event posters: the latest picture posts from Instagram, kept beside the videos
-- so staff can pick one on the dashboard's Events page. A chosen poster is copied
-- into the public "media" bucket (Instagram's links expire), so events keep it.

alter table public.instagram_cache
  add column if not exists images jsonb not null default '[]'::jsonb;

-- Staff may queue one "New event" message per event: the key event:<id>:new is
-- unique, so publishing the same event again never notifies members twice.
drop policy if exists "Staff queue announcements" on public.notifications;
create policy "Staff queue announcements"
  on public.notifications for insert
  to authenticated
  with check (
    (select public.is_staff())
    and status = 'queued'
    and sent_count is null
    and (dedupe_key is null or (topic = 'events' and dedupe_key ~ '^event:[0-9a-f-]{36}:new$'))
  );
