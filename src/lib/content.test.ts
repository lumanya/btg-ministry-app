import assert from 'node:assert/strict';
import { test } from 'node:test';

import { arrangePlaylists, calendarLink, mapPrayer, prayerOfDay, daysUntil, eventWhen, formatTime, mapDevotional, mapService, paragraphs, upcomingEvents } from './content.ts';

test('maps a devotional row for the app', () => {
  const d = mapDevotional({
    slug: 'on-repentance',
    title: 'On Repentance',
    subtitle: '',
    scripture_ref: 'Acts 3:19',
    scripture_text: null,
    excerpt: '',
    body: 'Repentance is the change of mind.\n\nSecond paragraph.',
    audio_url: null,
    publish_on: '2025-10-11',
    series: [{ name: 'Knowledge' }],
  });
  assert.equal(d.id, 'on-repentance');
  assert.equal(d.subtitle, undefined);
  assert.deepEqual(d.scripture, { ref: 'Acts 3:19', text: undefined });
  assert.equal(d.excerpt, 'Repentance is the change of mind.');
  assert.equal(d.series, 'Knowledge');
});

test('splits a body into paragraphs at blank lines', () => {
  assert.deepEqual(paragraphs('One\nline\n\n\nTwo\r\n\r\nThree  '), ['One line', 'Two', 'Three']);
  assert.deepEqual(paragraphs(''), []);
});

test('picks Kiswahili devotional text when it exists', () => {
  const row = { slug: 'a', title: 'Grace', title_sw: 'Neema', subtitle: null, scripture_ref: 'John 1:1', scripture_text: 'In the beginning', scripture_text_sw: 'Hapo mwanzo', excerpt: 'Short', body: 'Body', body_sw: 'Mwili', audio_url: null, publish_on: '2026-11-15', series: null };
  const sw = mapDevotional(row, 'sw');
  assert.equal(sw.title, 'Neema');
  assert.equal(sw.body, 'Mwili');
  assert.equal(sw.lang, 'sw');
  assert.equal(sw.scripture?.text, 'Hapo mwanzo');
  const en = mapDevotional(row, 'en');
  assert.equal(en.title, 'Grace');
  assert.equal(en.lang, 'en');
  // Only a title in Kiswahili: the body stays English, so the reader shows the English Bible version.
  assert.equal(mapDevotional({ ...row, body_sw: null }, 'sw').lang, 'en');
});

test('formats weekly services', () => {
  assert.equal(formatTime('9:5:00'), '09:05');
  assert.deepEqual(mapService({ id: '1', name: 'Sunday Service', weekday: 0, start_time: '09:00:00', venue: 'Dar es Salaam', livestreamed: true }), {
    id: '1',
    day: 'Sun',
    time: '09:00',
    name: 'Sunday Service',
    meta: 'Dar es Salaam · Livestreamed',
    weekday: 0,
    venue: 'Dar es Salaam',
    livestreamed: true,
  });
  const sw = { id: '3', name: 'Sunday Service', name_sw: 'Ibada ya Jumapili', weekday: 0, start_time: '09:00', venue: null, livestreamed: false };
  assert.equal(mapService(sw, 'sw').name, 'Ibada ya Jumapili');
  assert.equal(mapService(sw, 'en').name, 'Sunday Service');
  assert.equal(mapService({ id: '2', name: 'Prayer', weekday: 3, start_time: '18:00', venue: null, livestreamed: false }).meta, '');
});


test('arranges playlists by staff settings', () => {
  const lists = [
    { id: 'a', title: 'A' },
    { id: 'b', title: 'B' },
    { id: 'c', title: 'C' },
  ];
  const out = arrangePlaylists(lists, [
    { youtube_id: 'b', title: 'Better B', visible: true, sort: 1 },
    { youtube_id: 'c', title: null, visible: false, sort: 0 },
  ]);
  assert.deepEqual(out.map((p) => p.title), ['Better B', 'A']);
});

test('upcoming events and their dates', () => {
  const now = new Date('2026-11-14T12:00:00Z');
  const ev = (id: string, startsAt: string, endsAt: string | null = null) => ({
    id, title: id, startsAt, endsAt, locationName: null, address: null, description: '', imageUrl: null, registrationUrl: null, livestreamed: false,
  });
  const list = upcomingEvents([ev('later', '2026-12-01T07:00:00Z'), ev('past', '2026-11-01T07:00:00Z'), ev('today', '2026-11-14T10:00:00Z')], now);
  assert.deepEqual(list.map((e) => e.id), ['today', 'later']);
  assert.equal(eventWhen({ startsAt: '2026-12-12T07:00:00Z', endsAt: '2026-12-14T13:00:00Z' }).multiDay, true);
});

test('days until an event, by calendar day', () => {
  const now = new Date(2026, 10, 22, 21, 0);
  assert.equal(daysUntil(new Date(2026, 10, 22, 23, 0).toISOString(), now), 0);
  assert.equal(daysUntil(new Date(2026, 10, 23, 8, 0).toISOString(), now), 1);
  assert.equal(daysUntil(new Date(2026, 11, 6, 16, 0).toISOString(), now), 14);
});

test('calendar link carries the title, times and place', () => {
  const link = calendarLink({ title: 'End Time Awakening', startsAt: '2026-12-06T13:00:00Z', endsAt: null, locationName: 'BTG Temple', address: 'Dar es Salaam', description: 'Come' });
  const q = new URL(link).searchParams;
  assert.equal(q.get('text'), 'End Time Awakening');
  assert.equal(q.get('dates'), '20261206T130000Z/20261206T150000Z');
  assert.equal(q.get('location'), 'BTG Temple, Dar es Salaam');
});

test('one confession and one declaration a day, in turn', () => {
  const list = [
    mapPrayer({ id: 'c1', kind: 'confession', text: 'C one', text_sw: 'K moja' }),
    mapPrayer({ id: 'c2', kind: 'confession', text: 'C two' }),
    mapPrayer({ id: 'd1', kind: 'declaration', text: ' D one ', scripture: 'Romans 10:9' }),
  ];
  const day = (d: number) => new Date(2026, 10, d, 9);
  assert.notEqual(prayerOfDay(list, 'confession', day(24))?.id, prayerOfDay(list, 'confession', day(25))?.id);
  assert.equal(prayerOfDay(list, 'confession', day(24))?.id, prayerOfDay(list, 'confession', day(26))?.id);
  assert.equal(prayerOfDay(list, 'confession', new Date(2026, 10, 24, 0, 5))?.id, prayerOfDay(list, 'confession', new Date(2026, 10, 24, 23, 55))?.id);
  assert.equal(prayerOfDay(list, 'declaration', day(24))?.text, 'D one');
  assert.equal(prayerOfDay([], 'declaration', day(24)), null);
  assert.equal(mapPrayer({ id: 'x', kind: 'confession', text: 'C', text_sw: 'K' }, 'sw').text, 'K');
  assert.equal(mapPrayer({ id: 'x', kind: 'confession', text: 'C', text_sw: ' ' }, 'sw').text, 'C');
});
