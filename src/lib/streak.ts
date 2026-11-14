/**
 * Reading streak: how many days in a row a devotional was read.
 * Days are local calendar dates written "YYYY-MM-DD".
 */

export function dayKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function addDays(key: string, n: number): string {
  const [y, m, d] = key.split('-').map(Number);
  return dayKey(new Date(y, m - 1, d + n));
}

/**
 * Consecutive days read, ending today. A streak stays alive through today
 * even before today's reading, so it only breaks after a full missed day.
 */
export function currentStreak(readDays: Iterable<string>, today: string = dayKey()): number {
  const days = new Set(readDays);
  let cursor = days.has(today) ? today : addDays(today, -1);
  let count = 0;
  while (days.has(cursor)) {
    count += 1;
    cursor = addDays(cursor, -1);
  }
  return count;
}

/** Longest run of consecutive days ever read. */
export function longestStreak(readDays: Iterable<string>): number {
  const days = new Set(readDays);
  let best = 0;
  for (const day of days) {
    if (days.has(addDays(day, -1))) continue; // not the start of a run
    let run = 1;
    let cursor = addDays(day, 1);
    while (days.has(cursor)) {
      run += 1;
      cursor = addDays(cursor, 1);
    }
    best = Math.max(best, run);
  }
  return best;
}

/** The Monday-to-Sunday week containing `today`, with which days were read. */
export function weekProgress(readDays: Iterable<string>, today: string = dayKey()) {
  const days = new Set(readDays);
  const [y, m, d] = today.split('-').map(Number);
  const mondayOffset = (new Date(y, m - 1, d).getDay() + 6) % 7;
  return Array.from({ length: 7 }, (_, i) => {
    const key = addDays(today, i - mondayOffset);
    return { key, read: days.has(key), isToday: key === today, isFuture: key > today };
  });
}
