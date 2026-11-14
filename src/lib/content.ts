/**
 * Turns rows from the Supabase content tables into what the screens use.
 * Kept free of React Native so it can be tested with plain Node.
 */
import type { ArtTone, Devotional } from '../content/sample';

export type Series = { name: string; tone: ArtTone };
export type Service = {
  id: string;
  day: string;
  time: string;
  name: string;
  meta: string;
  /** From the database: 0 = Sunday. Lets screens show the day in the member's language. */
  weekday?: number;
  venue?: string | null;
  livestreamed?: boolean;
};

export type Lang = 'en' | 'sw';
export type GivingMethod = { key: string; label: string; number: string; name: string };

export type DevotionalRow = {
  slug: string;
  title: string;
  title_sw?: string | null;
  subtitle_sw?: string | null;
  scripture_text_sw?: string | null;
  excerpt_sw?: string | null;
  body_sw?: string | null;
  subtitle: string | null;
  scripture_ref: string | null;
  scripture_text: string | null;
  excerpt: string;
  body: string;
  audio_url: string | null;
  publish_on: string;
  series: { name: string } | { name: string }[] | null;
};

export type ServiceRow = { id: string; name: string; name_sw?: string | null; weekday: number; start_time: string; venue: string | null; livestreamed: boolean };
export type GivingRow = { id: string; label: string; number: string; account_name: string | null };

/** The columns the app reads, with the series name joined in. */
export const DEVOTIONAL_COLUMNS =
  'slug,title,subtitle,scripture_ref,scripture_text,excerpt,body,audio_url,publish_on,title_sw,subtitle_sw,scripture_text_sw,excerpt_sw,body_sw,series:series_id(name)';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const TONES: ArtTone[] = ['brown', 'deep', 'sand'];

/** Picks the Kiswahili version of a field when the member reads in Kiswahili and it exists. */
function pick(lang: Lang, en: string | null | undefined, sw: string | null | undefined) {
  return lang === 'sw' && sw?.trim() ? sw : en;
}

export function mapDevotional(raw: DevotionalRow, lang: Lang = 'en'): Devotional {
  const r = {
    ...raw,
    title: pick(lang, raw.title, raw.title_sw) ?? raw.title,
    subtitle: pick(lang, raw.subtitle, raw.subtitle_sw) ?? null,
    scripture_text: pick(lang, raw.scripture_text, raw.scripture_text_sw) ?? null,
    // A Swahili body without its own summary shouldn't show the English summary.
    excerpt: lang === 'sw' && raw.body_sw?.trim() ? (raw.excerpt_sw ?? '') : (pick(lang, raw.excerpt, raw.excerpt_sw) ?? ''),
    body: pick(lang, raw.body, raw.body_sw) ?? '',
  };
  const series = Array.isArray(r.series) ? r.series[0] : r.series;
  const body = r.body?.trim() ?? '';
  return {
    id: r.slug,
    date: r.publish_on,
    title: r.title,
    subtitle: r.subtitle || undefined,
    scripture: r.scripture_ref ? { ref: r.scripture_ref, text: r.scripture_text || undefined } : undefined,
    lang: lang === 'sw' && raw.body_sw?.trim() ? 'sw' : 'en',
    excerpt: r.excerpt?.trim() || firstParagraph(body),
    body: body || undefined,
    audioUrl: r.audio_url || undefined,
    series: series?.name || undefined,
  };
}

export function mapSeries(r: { name: string; tone: string }): Series {
  return { name: r.name, tone: (TONES as string[]).includes(r.tone) ? (r.tone as ArtTone) : 'brown' };
}

/** "18:30:00" -> "18:30" */
export function formatTime(t: string) {
  const [h = '00', m = '00'] = t.split(':');
  return `${h.padStart(2, '0')}:${m.padStart(2, '0')}`;
}

export function mapService(r: ServiceRow, lang: Lang = 'en'): Service {
  const meta = [r.venue?.trim(), r.livestreamed ? 'Livestreamed' : null].filter(Boolean).join(' · ');
  return {
    id: r.id,
    day: DAYS[r.weekday] ?? '',
    time: formatTime(r.start_time),
    name: pick(lang, r.name, r.name_sw) ?? r.name,
    meta,
    weekday: r.weekday,
    venue: r.venue,
    livestreamed: r.livestreamed,
  };
}

export function mapGiving(r: GivingRow): GivingMethod {
  return { key: r.id, label: r.label, number: r.number, name: r.account_name ?? '' };
}

/** Splits a devotional body into paragraphs at blank lines. */
export function paragraphs(text: string | undefined): string[] {
  if (!text) return [];
  return text
    .replace(/\r\n/g, '\n')
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s*\n\s*/g, ' ').trim())
    .filter(Boolean);
}

function firstParagraph(body: string) {
  const p = paragraphs(body)[0] ?? '';
  return p.length > 220 ? `${p.slice(0, 217).trimEnd()}…` : p;
}

/** A devotional's recording as a player episode, so it plays in the same player as the podcast. */
export function devotionalEpisode(d: Devotional) {
  return {
    id: `devotional-${d.id}`,
    title: d.title,
    description: d.excerpt,
    audioUrl: d.audioUrl ?? null,
    duration: null,
    date: d.date,
    artwork: null,
    series: 'Daily devotional',
  };
}

/* ---------- Events ---------- */

export type MinistryEvent = {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string | null;
  locationName: string | null;
  address: string | null;
  description: string;
  imageUrl: string | null;
  registrationUrl: string | null;
  livestreamed: boolean;
};

export type EventRow = {
  id: string;
  title: string;
  title_sw?: string | null;
  description_sw?: string | null;
  starts_at: string;
  ends_at: string | null;
  location_name: string | null;
  address: string | null;
  description: string;
  image_url: string | null;
  registration_url: string | null;
  livestreamed: boolean;
};

export const EVENT_COLUMNS = 'id,title,starts_at,ends_at,location_name,address,description,image_url,registration_url,livestreamed,title_sw,description_sw';

export function mapEvent(r: EventRow, lang: Lang = 'en'): MinistryEvent {
  return {
    id: r.id,
    title: pick(lang, r.title, r.title_sw) ?? r.title,
    startsAt: r.starts_at,
    endsAt: r.ends_at,
    locationName: r.location_name,
    address: r.address,
    description: pick(lang, r.description, r.description_sw) ?? '',
    imageUrl: r.image_url,
    registrationUrl: r.registration_url,
    livestreamed: !!r.livestreamed,
  };
}

/** Events that haven't finished yet, soonest first. */
export function upcomingEvents(events: MinistryEvent[], now: Date = new Date()): MinistryEvent[] {
  const t = now.getTime();
  return events
    .filter((e) => Date.parse(e.endsAt ?? e.startsAt) + (e.endsAt ? 0 : 3 * 3600 * 1000) > t)
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
}

const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function hhmm(d: Date) {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export type DateNames = { day: (i: number) => string; month: (i: number) => string; starts: (time: string) => string };

const englishNames: DateNames = {
  day: (i) => WEEKDAYS_LONG[i],
  month: (i) => MONTHS_LONG[i],
  starts: (time) => `Starts ${time}`,
};

/** "Saturday, 12 December" and "10:00 – 16:00" (or "12 – 14 December") in the phone's time zone. */
export function eventWhen(e: Pick<MinistryEvent, 'startsAt' | 'endsAt'>, n: DateNames = englishNames) {
  const s = new Date(e.startsAt);
  const end = e.endsAt ? new Date(e.endsAt) : null;
  const sameDay = !end || end.toDateString() === s.toDateString();
  const day = `${n.day(s.getDay())}, ${s.getDate()} ${n.month(s.getMonth())}`;
  if (sameDay) return { day, time: end ? `${hhmm(s)} – ${hhmm(end)}` : hhmm(s), multiDay: false };
  const range =
    end.getMonth() === s.getMonth()
      ? `${s.getDate()} – ${end.getDate()} ${n.month(s.getMonth())}`
      : `${s.getDate()} ${n.month(s.getMonth())} – ${end.getDate()} ${n.month(end.getMonth())}`;
  return { day: range, time: n.starts(hhmm(s)), multiDay: true };
}

/** Day number and short month for the date tile, e.g. { day: '12', month: 'DEC' }. */
export function dateTile(iso: string, n: DateNames = englishNames) {
  const d = new Date(iso);
  return { day: String(d.getDate()), month: n.month(d.getMonth()).slice(0, 3).toUpperCase() };
}

/* ---------- Playlists ---------- */

export type PlaylistSetting = { youtube_id: string; title: string | null; visible: boolean; sort: number };

/** The channel's playlists as staff arranged them: hidden ones removed, renamed, in their order. */
export function arrangePlaylists<P extends { id: string; title: string }>(lists: P[], settings: PlaylistSetting[]): P[] {
  const byId = new Map(settings.map((s) => [s.youtube_id, s]));
  return lists
    .map((p, i) => ({ p, s: byId.get(p.id), i }))
    .filter(({ s }) => !s || s.visible)
    .sort((a, b) => (a.s?.sort ?? 1000 + a.i) - (b.s?.sort ?? 1000 + b.i))
    .map(({ p, s }) => (s?.title ? { ...p, title: s.title } : p));
}
