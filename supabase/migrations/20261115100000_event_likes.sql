-- Events can be liked and their views counted too.
alter table public.likes drop constraint if exists likes_kind_check;
alter table public.likes add constraint likes_kind_check check (kind in ('video', 'devotional', 'event'));
alter table public.views drop constraint if exists views_kind_check;
alter table public.views add constraint views_kind_check check (kind in ('video', 'devotional', 'event'));
