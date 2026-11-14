// Run with: npm test
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { currentStreak, dayKey, longestStreak, weekProgress } from './streak.ts';

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
  // Last read two days ago: broken.
  assert.equal(currentStreak(['2026-11-11', '2026-11-12'], '2026-11-14'), 0);
});

test('streaks cross month and year boundaries', () => {
  assert.equal(currentStreak(['2026-10-31', '2026-11-01'], '2026-11-01'), 2);
  assert.equal(currentStreak(['2025-12-31', '2026-01-01'], '2026-01-01'), 2);
});

test('longest streak finds the best run', () => {
  assert.equal(longestStreak(['2026-11-01', '2026-11-02', '2026-11-05', '2026-11-06', '2026-11-07', '2026-11-10']), 3);
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
