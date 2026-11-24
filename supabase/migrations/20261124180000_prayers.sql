-- Confessions and declarations for "A minute of prayer" (the third step of
-- Today's rhythm). Staff add them on the dashboard; the app shows one of each a
-- day, in turn, in English or Kiswahili.

create table if not exists public.prayers (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('confession', 'declaration')),
  text text not null check (char_length(text) between 1 and 1500),
  text_sw text check (text_sw is null or char_length(text_sw) <= 1500),
  -- Where it comes from, e.g. "2 Corinthians 5:17".
  scripture text check (scripture is null or char_length(scripture) <= 80),
  active boolean not null default true,
  sort integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.prayers enable row level security;

drop policy if exists "Anyone can read active prayers" on public.prayers;
create policy "Anyone can read active prayers"
  on public.prayers for select
  to anon, authenticated
  using (active or (select public.is_staff()));

drop policy if exists "Staff manage prayers" on public.prayers;
create policy "Staff manage prayers"
  on public.prayers for all
  to authenticated
  using ((select public.is_staff()))
  with check ((select public.is_staff()));

grant select on public.prayers to anon, authenticated;
grant insert, update, delete on public.prayers to authenticated;
