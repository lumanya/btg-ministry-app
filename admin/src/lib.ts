/** Small helpers shared by the dashboard pages. Kept free of the browser so they can be tested with Node. */

export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "On Repentance, part 2!" -> "on-repentance-part-2" */
export function slugify(title: string): string {
  return title
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '');
}

/** Today's date in Tanzania as YYYY-MM-DD, matching the database's ministry_today(). */
export function todayInTanzania(now: Date = new Date()): string {
  return new Date(now.getTime() + 3 * 3600 * 1000).toISOString().slice(0, 10);
}

export function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export type DevotionalState = 'draft' | 'scheduled' | 'live';

/** What members see: drafts are hidden, published ones dated in the future are scheduled. */
export function devotionalState(status: string, publishOn: string, today: string): DevotionalState {
  if (status !== 'published') return 'draft';
  return publishOn > today ? 'scheduled' : 'live';
}

/** "2025-10-11" -> "Sat, 11 Oct 2025" */
export function formatDay(iso: string): string {
  const d = new Date(`${iso}T12:00:00Z`);
  const wd = WEEKDAYS[d.getUTCDay()].slice(0, 3);
  return `${wd}, ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** "2026-11-14T16:02:00Z" -> "14 Nov, 19:02" in Tanzania time */
export function formatMoment(iso: string): string {
  const d = new Date(new Date(iso).getTime() + 3 * 3600 * 1000);
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}, ${hh}:${mm}`;
}

/** Turns Supabase errors into sentences staff can act on. */
export function friendlyError(error: { message?: string; code?: string } | null | undefined): string {
  if (!error) return '';
  const msg = error.message ?? '';
  if (error.code === '23505' && /slug/.test(msg)) return 'Another devotional already uses this link. Change the link and try again.';
  if (error.code === '23505') return 'That already exists.';
  if (error.code === '23514') return 'One of the fields is too long or not in the right format.';
  if (error.code === '42501' || /row-level security/i.test(msg)) return 'Your account isn’t allowed to do that.';
  if (error.code === 'P0001' || error.code === 'P0002') return msg;
  if (/Failed to fetch|NetworkError|network/i.test(msg)) return 'Couldn’t reach the server. Check your connection and try again.';
  if (/Invalid login credentials/i.test(msg)) return 'That email and password don’t match an account.';
  if (/Email not confirmed/i.test(msg)) return 'Confirm your email first, using the code sent when you signed up in the app.';
  return msg || 'Something went wrong. Try again.';
}

/** plural(1, 'draft') -> "1 draft"; plural(3, 'draft') -> "3 drafts" */
export function plural(n: number, word: string): string {
  return `${n} ${n === 1 ? word : `${word}s`}`;
}

/** "2026-12-12T18:30" typed in Tanzania time -> ISO timestamp. */
export function eatInputToIso(value: string): string {
  return new Date(`${value}:00+03:00`).toISOString();
}

/** ISO timestamp -> "2026-12-12T18:30" for a datetime-local input, in Tanzania time. */
export function isoToEatInput(iso: string): string {
  return new Date(Date.parse(iso) + 3 * 3600 * 1000).toISOString().slice(0, 16);
}

/** "Sat 12 Dec, 18:30" in Tanzania time. */
export function formatEat(iso: string): string {
  const d = new Date(Date.parse(iso) + 3 * 3600 * 1000);
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  return `${WEEKDAYS[d.getUTCDay()].slice(0, 3)} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}, ${hh}:${mm}`;
}

/** "12:40" -> 760, "1:02:05" -> 3725, "90" -> 90; null when it isn't a time. */
export function parseClock(text: string): number | null {
  const t = text.trim();
  if (!t) return null;
  if (!/^\d{1,5}(:\d{1,2}){0,2}$/.test(t)) return null;
  const parts = t.split(':').map(Number);
  if (parts.slice(1).some((p) => p > 59)) return null;
  return parts.reduce((total, p) => total * 60 + p, 0);
}

/** 760 -> "12:40", 3725 -> "1:02:05" */
export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

/** The video id from a YouTube link or a bare id; null when there isn't one. */
export function youtubeIdFrom(text: string): string | null {
  const t = text.trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(t)) return t;
  const m = t.match(/(?:youtu\.be\/|[?&]v=|\/(?:embed|live|shorts)\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}
