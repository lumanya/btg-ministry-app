-- The account's whole video history from Instagram, kept between server restarts.
--
-- Reading every post takes many requests, so instagram-feed reads the full history
-- a few times a day and only the newest posts every 15 minutes, keeping the list
-- here. Only the server function (service role) can read or write it.

create table if not exists public.instagram_cache (
  id integer primary key default 1 check (id = 1),
  media jsonb not null default '[]'::jsonb,
  -- When the newest posts were last read, and when the whole history was.
  fetched_at timestamptz,
  full_at timestamptz
);

alter table public.instagram_cache enable row level security;
revoke all on public.instagram_cache from anon, authenticated;
