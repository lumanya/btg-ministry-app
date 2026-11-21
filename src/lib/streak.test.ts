// Run with: npm test
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { currentStreak, dayKey, growth, longestStreak, streakInfo, weekProgress } from './streak.ts';

test('dayKey uses the local calendar date', () => {
  assert.equal(dayKey(new Date(2026, 10, 4)), '2026-11-04');
});

test('current streak counts back from today', () => {
  assert.equal(currentStreak([], '2026-11-14'), 0);
  assert.equal(currentStreak(['2026-11-14'], '2026-11-14'), 1);
  assert.equal(currentStreak(['2026-11-12', '2026-11-13', '2026-11-14'], '2026-11-14'), 3);
});

test('a streak survives until a full day is missed', () => {
  // Read yesterday but not yet today: still alive.
  assert.equal(currentStreak(['2026-11-12', '2026-11-13'], '2026-11-14'), 2);
  // Two days missed in a row: broken.
  assert.equal(currentStreak(['2026-11-10', '2026-11-11'], '2026-11-14'), 0);
});

test('one grace day a week carries the streak over a missed day', () => {
  // 14 Nov 2026 is a Saturday; Wednesday 11 Nov was missed.
  const s = streakInfo(['2026-11-09', '2026-11-10', '2026-11-12', '2026-11-13', '2026-11-14'], '2026-11-14');
  assert.equal(s.count, 5);
  assert.deepEqual(s.graced, ['2026-11-11']);
  assert.equal(s.graceReady, false);
  // Last read two days ago: yesterday is graced, so still alive.
  assert.equal(currentStreak(['2026-11-11', '2026-11-12'], '2026-11-14'), 2);
  // A second missed day in the same week breaks it.
  assert.equal(currentStreak(['2026-11-09', '2026-11-11', '2026-11-13', '2026-11-14'], '2026-11-14'), 3);
  // Grace resets each Monday: one miss in each week is fine.
  assert.equal(currentStreak(['2026-11-05', '2026-11-07', '2026-11-08', '2026-11-09', '2026-11-11'], '2026-11-11'), 5);
});

test('grace is ready when this week has no missed day', () => {
  const s = streakInfo(['2026-11-09', '2026-11-10'], '2026-11-10');
  assert.equal(s.graceReady, true);
  assert.deepEqual(s.graced, []);
  assert.deepEqual(streakInfo([], '2026-11-10'), { count: 0, graced: [], graceReady: true });
});

test('growth milestones', () => {
  assert.deepEqual(growth(0), { reached: null, next: { days: 7, name: 'Planted' }, remaining: 7 });
  assert.equal(growth(12).reached?.name, 'Planted');
  assert.equal(growth(12).next?.name, 'Rooted');
  assert.equal(growth(12).remaining, 9);
  assert.equal(growth(150).next, null);
});

test('streaks cross month and year boundaries', () => {
  assert.equal(currentStreak(['2026-10-31', '2026-11-01'], '2026-11-01'), 2);
  assert.equal(currentStreak(['2025-12-31', '2026-01-01'], '2026-01-01'), 2);
});

test('longest streak finds the best run', () => {
  assert.equal(longestStreak(['2026-11-01', '2026-11-02', '2026-11-05', '2026-11-06', '2026-11-07', '2026-11-10']), 3);
  // One missed day is carried by grace.
  assert.equal(longestStreak(['2026-11-01', '2026-11-03', '2026-11-04']), 3);
  assert.equal(longestStreak([]), 0);
});

test('week runs Monday to Sunday', () => {
  // 14 Nov 2026 is a Saturday.
  const week = weekProgress(['2026-11-09', '2026-11-13'], '2026-11-14');
  assert.equal(week[0].key, '2026-11-09');
  assert.equal(week[6].key, '2026-11-15');
  assert.deepEqual(week.map((d) => d.read), [true, false, false, false, true, false, false]);
  assert.equal(week[5].isToday, true);
  assert.equal(week[6].isFuture, true);
});
