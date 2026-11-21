/**
 * Reading streak: how many days a devotional was read, in a row.
 * Days are local calendar dates written "YYYY-MM-DD".
 *
 * Grace: one missed day each Monday-to-Sunday week doesn't break the streak.
 * A grace day bridges the gap but isn't counted as a day read, and two missed
 * days in a row still break it.
 */

export function dayKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function addDays(key: string, n: number): string {
  const [y, m, d] = key.split('-').map(Number);
  return dayKey(new Date(y, m - 1, d + n));
}

/** The Monday that starts the week containing `key`. */
export function weekStart(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  const mondayOffset = (new Date(y, m - 1, d).getDay() + 6) % 7;
  return addDays(key, -mondayOffset);
}

export type Streak = {
  /** Days read in the current run. */
  count: number;
  /** Missed days the run was carried over by grace. */
  graced: string[];
  /** Whether this week's grace day is still unused. */
  graceReady: boolean;
};

/** Walks back from `end` (which must be read or skippable) counting the run. */
function runEndingAt(days: Set<string>, end: string) {
  let cursor = end;
  let count = 0;
  const graced: string[] = [];
  const usedWeeks = new Set<string>();
  let lastWasGrace = false;
  for (;;) {
    if (days.has(cursor)) {
      count += 1;
      lastWasGrace = false;
    } else {
      const week = weekStart(cursor);
      if (lastWasGrace || usedWeeks.has(week)) break;
      usedWeeks.add(week);
      graced.push(cursor);
      lastWasGrace = true;
    }
    cursor = addDays(cursor, -1);
  }
  // A grace day only counts when a day read comes before it.
  if (lastWasGrace) graced.pop();
  return { count, graced };
}

/**
 * The current run, ending today. It stays alive through today even before
 * today's reading, so only a missed day that grace can't cover breaks it.
 */
export function streakInfo(readDays: Iterable<string>, today: string = dayKey()): Streak {
  const days = new Set(readDays);
  const start = days.has(today) ? today : addDays(today, -1);
  const run = runEndingAt(days, start);
  const count = run.count;
  const graced = count > 0 ? run.graced : [];
  const thisWeek = weekStart(today);
  return { count, graced, graceReady: !graced.some((g) => weekStart(g) === thisWeek) };
}

export function currentStreak(readDays: Iterable<string>, today: string = dayKey()): number {
  return streakInfo(readDays, today).count;
}

/** Longest run ever read, with the same grace rule. */
export function longestStreak(readDays: Iterable<string>): number {
  const days = new Set(readDays);
  let best = 0;
  for (const day of days) {
    // Only start from the last day of a run (the next day isn't read).
    if (days.has(addDays(day, 1))) continue;
    best = Math.max(best, runEndingAt(days, day).count);
  }
  return best;
}

/** The Monday-to-Sunday week containing `today`, with which days were read or carried by grace. */
export function weekProgress(readDays: Iterable<string>, today: string = dayKey(), graced: Iterable<string> = []) {
  const days = new Set(readDays);
  const grace = new Set(graced);
  const monday = weekStart(today);
  return Array.from({ length: 7 }, (_, i) => {
    const key = addDays(monday, i);
    return { key, read: days.has(key), grace: grace.has(key), isToday: key === today, isFuture: key > today };
  });
}

/** Growth milestones for days in a row: a seed planted, then rooted, growing and fruitful. */
export const MILESTONES = [
  { days: 7, name: 'Planted' },
  { days: 21, name: 'Rooted' },
  { days: 40, name: 'Growing' },
  { days: 100, name: 'Fruitful' },
] as const;

export function growth(count: number) {
  const reached = [...MILESTONES].reverse().find((m) => count >= m.days) ?? null;
  const next = MILESTONES.find((m) => count < m.days) ?? null;
  return { reached, next, remaining: next ? next.days - count : 0 };
}
