-- Starting content taken from btgministry.org, so the app has something to show on day one.
-- Run once in the SQL editor after the migrations (or automatically with `npx supabase db reset` locally).
-- Values in [SQUARE BRACKETS] must be filled in by the ministry, from the admin dashboard.

insert into public.series (name, tone, sort) values
  ('The Soul', 'deep', 1),
  ('Death & Life', 'sand', 2),
  ('Knowledge', 'brown', 3)
on conflict (name) do nothing;

insert into public.devotionals (slug, title, subtitle, scripture_ref, scripture_text, excerpt, body, series_id, publish_on, status) values
  ('vision-of-paul', 'The Vision of Paul', null, '2 Corinthians 12:2', null,
   'I knew a man in Christ above fourteen years ago, such an one caught up to the third heaven.',
   'I knew a man in Christ above fourteen years ago, such an one caught up to the third heaven.', null, '2025-09-30', 'published'),
  ('introduction-to-death', 'Introduction to Death', null, null, null,
   'What you cannot control, you fear.', 'What you cannot control, you fear.',
   (select id from public.series where name = 'Death & Life'), '2025-10-02', 'published'),
  ('death', 'Death', null, 'Hebrews 2:14', null,
   'That through death he might destroy him that had the power of death.',
   'That through death he might destroy him that had the power of death.',
   (select id from public.series where name = 'Death & Life'), '2025-10-04', 'published'),
  ('death-spheres-of-life', 'Death: Spheres of Life', null, null, null,
   'To better understand death, we must first understand what life is.',
   'To better understand death, we must first understand what life is.',
   (select id from public.series where name = 'Death & Life'), '2025-10-07', 'published'),
  ('power-of-hades-1', 'Power of Hades, part 1', null, 'Revelation 20:1–4', null,
   'And I saw an angel come down from heaven, having the key of the bottomless pit.',
   'And I saw an angel come down from heaven, having the key of the bottomless pit.',
   (select id from public.series where name = 'Death & Life'), '2025-10-08', 'published'),
  ('our-father-who-art-in-heaven', 'Our Father who art in heaven', null, '1 Corinthians 11:3', null,
   'The head of every man is Christ, and the head of Christ is God.',
   'The head of every man is Christ, and the head of Christ is God.', null, '2025-10-09', 'published'),
  ('on-repentance', 'On Repentance', 'de paenitentia', 'Acts 3:19',
   'Repent ye therefore, and be converted, that your sins may be blotted out, when the times of refreshing shall come from the presence of the Lord.',
   'Repentance is simply the change of mind.', 'Repentance is simply the change of mind.', null, '2025-10-11', 'published'),
  ('knowledge-that-makes-man-enlightened', 'The Knowledge that Makes Man Enlightened', null, null, null,
   'This is the knowledge that makes man be himself. It makes man receive himself.',
   'This is the knowledge that makes man be himself. It makes man receive himself.',
   (select id from public.series where name = 'Knowledge'), '2025-10-13', 'published'),
  ('knowledge-that-makes-man-ignorant', 'Knowledge that Makes Man Ignorant', null, null, null,
   'Any knowledge that does not come from the inner being of man makes man stay in ignorance.',
   'Any knowledge that does not come from the inner being of man makes man stay in ignorance.',
   (select id from public.series where name = 'Knowledge'), '2025-10-14', 'published')
on conflict (slug) do nothing;

insert into public.services (name, weekday, start_time, venue, livestreamed, sort)
select * from (values
  ('Sunday Service', 0, time '09:00', '[VENUE]', true, 1),
  ('Midweek teaching', 3, time '18:00', '[VENUE]', true, 2)
) as v(name, weekday, start_time, venue, livestreamed, sort)
where not exists (select 1 from public.services);

insert into public.giving_methods (label, number, account_name, sort)
select * from (values
  ('M-Pesa · Vodacom Lipa number', '50492190', 'Building the Temple of God Ministry', 1),
  ('CRDB Bank · Account number', '0152647614000', 'Iman Christopher Mwakanyamale', 2)
) as v(label, number, account_name, sort)
where not exists (select 1 from public.giving_methods);

insert into public.quotes (text)
select * from (values
  ('Man is the spirit in mortal body, seeking immortality through the garment of light; when immortality is attained, eternity is born.'),
  ('You can’t take yourself out of the consciousness of death without embracing the consciousness of life.'),
  ('Unless you learn the consciousness of Christ, you won’t grasp the flow of revelation, as consciousness is what renews your mind.')
) as v(text)
where not exists (select 1 from public.quotes);
