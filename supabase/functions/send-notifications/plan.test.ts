import assert from 'node:assert/strict';
import { test } from 'node:test';

import { chunks, eat, nextServiceStart, plan, type PlanInput } from './plan.ts';

const base: PlanInput = { now: new Date('2026-11-15T05:00:00Z'), live: null, upcoming: [], services: [], devotional: null, events: [] };
// 2026-11-15 is a Sunday; 05:00 UTC = 08:00 in Tanzania.

test('Tanzania time', () => {
  assert.deepEqual(eat(new Date('2026-11-15T05:00:00Z')), { date: '2026-11-15', weekday: 0, hour: 8, hhmm: '08:00' });
  assert.equal(eat(new Date('2026-11-14T21:30:00Z')).date, '2026-11-15');
});

test('next weekly service', () => {
  assert.equal(nextServiceStart(0, '09:00:00', base.now).toISOString(), '2026-11-15T06:00:00.000Z');
  // Wednesday 18:00 after a Sunday
  assert.equal(nextServiceStart(3, '18:00', base.now).toISOString(), '2026-11-18T15:00:00.000Z');
});

test('live stream', () => {
  const p = plan({ ...base, live: { id: 'abc', title: 'Sunday Service' } });
  assert.deepEqual(p.map((x) => [x.dedupe_key, x.topic, x.url]), [['live:abc', 'live', '/live']]);
});

test('service reminder 30 minutes before, once per day', () => {
  const services = [{ id: 's1', name: 'Sunday Service', weekday: 0, start_time: '09:00:00', livestreamed: true }];
  assert.equal(plan({ ...base, now: new Date('2026-11-15T05:20:00Z'), services }).length, 0); // 40 min before
  const p = plan({ ...base, now: new Date('2026-11-15T05:32:00Z'), services }); // 28 min before
  assert.deepEqual(p.map((x) => [x.dedupe_key, x.title]), [['service:s1:2026-11-15', 'Sunday Service starts at 09:00']]);
});

test('a YouTube stream scheduled for the same time replaces the weekly reminder', () => {
  const services = [{ id: 's1', name: 'Sunday Service', weekday: 0, start_time: '09:00', livestreamed: true }];
  const upcoming = [{ id: 'yt1', title: 'Sunday Service', scheduledStart: '2026-11-15T06:00:00Z' }];
  const p = plan({ ...base, now: new Date('2026-11-15T05:35:00Z'), services, upcoming });
  assert.deepEqual(p.map((x) => x.dedupe_key), ['upcoming:yt1']);
});

test('daily devotional between 06:00 and 21:00 on its date', () => {
  const devotional = { slug: 'walking-in-the-light', title: 'Walking in the Light', scripture_ref: '1 John 1:7', publish_on: '2026-11-15' };
  assert.equal(plan({ ...base, now: new Date('2026-11-15T02:00:00Z'), devotional }).length, 0); // 05:00 EAT
  const [p] = plan({ ...base, devotional });
  assert.equal(p.dedupe_key, 'devotional:2026-11-15');
  assert.equal(p.body, 'Walking in the Light · 1 John 1:7');
  assert.equal(p.url, '/devotional/walking-in-the-light');
  assert.equal(plan({ ...base, devotional: { ...devotional, publish_on: '2026-11-14' } }).length, 0);
});

test('event reminders: the day before and an hour before', () => {
  const ev = (starts_at: string) => [{ id: 'e1', title: 'Annual Conference', starts_at, location_name: 'Mlimani City' }];
  const day = plan({ ...base, events: ev('2026-11-16T04:30:00Z') }); // 23.5 hours away
  assert.deepEqual(day.map((x) => [x.dedupe_key, x.title, x.body]), [['event:e1:day', 'Tomorrow: Annual Conference', 'Tomorrow at 07:30 · Mlimani City']]);
  const soon = plan({ ...base, events: ev('2026-11-15T05:45:00Z') });
  assert.deepEqual(soon.map((x) => x.dedupe_key), ['event:e1:soon']);
  assert.equal(plan({ ...base, events: ev('2026-11-15T06:30:00Z') }).length, 0); // 90 minutes away: between reminders
});

test('chunks', () => {
  assert.deepEqual(chunks([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
});
