import type { Clip } from '../../supabase/functions/instagram-feed/clips';

export type { Clip };

/** Posted in the last three days. */
export function isNewClip(c: Clip, now = Date.now()) {
  return !!c.postedAt && now - Date.parse(c.postedAt) < 3 * 24 * 3600 * 1000;
}

/** 760 -> "12:40", 3725 -> "1:02:05" */
export function clock(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

/** Words that keep a capital when an all-caps title is tidied. */
const PROPER = ['Mungu', 'Yesu', 'Kristo', 'Roho', 'Mtakatifu', 'Bwana', 'Biblia', 'Iman', 'Mwakanyamale', 'BTG', 'God', 'Jesus', 'Christ', 'Lord', 'Holy', 'Spirit', 'Bible', 'I'];
const PROPER_MAP = new Map(PROPER.map((w) => [w.toLowerCase(), w]));

/**
 * Instagram captions are often in capitals ("DUNIA NI ULIMWENGU WA ROHONI").
 * Shown large in the app, sentence case reads calmer: "Dunia ni ulimwengu wa rohoni".
 * Titles that already use lower case are left as written.
 */
export function seedTitle(title: string) {
  if (/\p{Ll}/u.test(title)) return title;
  const lower = title.toLowerCase().replace(/\p{L}+/gu, (w) => PROPER_MAP.get(w) ?? w);
  return lower.replace(/^(\P{L}*)(\p{L})/u, (_, lead: string, first: string) => lead + first.toUpperCase());
}

/**
 * Longer text typed in capitals ("LIGHT FROM LIGHT. LIFE FROM LIFE") reads calmer
 * in sentence case: each sentence and line starts with a capital, names of God stay
 * capitalised. Text that already uses lower case is left as written.
 */
export function calmCaps(text: string) {
  if (/\p{Ll}/u.test(text) || !/\p{Lu}/u.test(text)) return text;
  const lower = text.toLowerCase().replace(/\p{L}+/gu, (w) => PROPER_MAP.get(w) ?? w);
  return lower.replace(/(^|[.!?]\s+|\n\s*)(\P{L}*)(\p{L})/gu, (_, start: string, lead: string, first: string) => start + lead + first.toUpperCase());
}
