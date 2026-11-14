/**
 * Turns rows from the Supabase content tables into what the screens use.
 * Kept free of React Native so it can be tested with plain Node.
 */
import type { ArtTone, Devotional } from '../content/sample';

export type Series = { name: string; tone: ArtTone };
export type Service = { id: string; day: string; time: string; name: string; meta: string };
export type GivingMethod = { key: string; label: string; number: string; name: string };

export type DevotionalRow = {
  slug: string;
  title: string;
  subtitle: string | null;
  scripture_ref: string | null;
  scripture_text: string | null;
  excerpt: string;
  body: string;
  audio_url: string | null;
  publish_on: string;
  series: { name: string } | { name: string }[] | null;
};

export type ServiceRow = { id: string; name: string; weekday: number; start_time: string; venue: string | null; livestreamed: boolean };
export type GivingRow = { id: string; label: string; number: string; account_name: string | null };

/** The columns the app reads, with the series name joined in. */
export const DEVOTIONAL_COLUMNS = 'slug,title,subtitle,scripture_ref,scripture_text,excerpt,body,audio_url,publish_on,series:series_id(name)';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const TONES: ArtTone[] = ['brown', 'deep', 'sand'];

export function mapDevotional(r: DevotionalRow): Devotional {
  const series = Array.isArray(r.series) ? r.series[0] : r.series;
  const body = r.body?.trim() ?? '';
  return {
    id: r.slug,
    date: r.publish_on,
    title: r.title,
    subtitle: r.subtitle || undefined,
    scripture: r.scripture_ref ? { ref: r.scripture_ref, text: r.scripture_text || undefined } : undefined,
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

export function mapService(r: ServiceRow): Service {
  const meta = [r.venue?.trim(), r.livestreamed ? 'Livestreamed' : null].filter(Boolean).join(' · ');
  return { id: r.id, day: DAYS[r.weekday] ?? '', time: formatTime(r.start_time), name: r.name, meta };
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
  starts_at: string;
  ends_at: string | null;
  location_name: string | null;
  address: string | null;
  description: string;
  image_url: string | null;
  registration_url: string | null;
  livestreamed: boolean;
};

export const EVENT_COLUMNS = 'id,title,starts_at,ends_at,location_name,address,description,image_url,registration_url,livestreamed';

export function mapEvent(r: EventRow): MinistryEvent {
  return {
    id: r.id,
    title: r.title,
    startsAt: r.starts_at,
    endsAt: r.ends_at,
    locationName: r.location_name,
    address: r.address,
    description: r.description ?? '',
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

/** "Saturday, 12 December" and "10:00 – 16:00" (or "12 – 14 December") in the phone's time zone. */
export function eventWhen(e: Pick<MinistryEvent, 'startsAt' | 'endsAt'>) {
  const s = new Date(e.startsAt);
  const end = e.endsAt ? new Date(e.endsAt) : null;
  const sameDay = !end || end.toDateString() === s.toDateString();
  const day = `${WEEKDAYS_LONG[s.getDay()]}, ${s.getDate()} ${MONTHS_LONG[s.getMonth()]}`;
  if (sameDay) return { day, time: end ? `${hhmm(s)} – ${hhmm(end)}` : hhmm(s), multiDay: false };
  const range =
    end.getMonth() === s.getMonth()
      ? `${s.getDate()} – ${end.getDate()} ${MONTHS_LONG[s.getMonth()]}`
      : `${s.getDate()} ${MONTHS_LONG[s.getMonth()]} – ${end.getDate()} ${MONTHS_LONG[end.getMonth()]}`;
  return { day: range, time: `Starts ${hhmm(s)}`, multiDay: true };
}

/** Day number and short month for the date tile, e.g. { day: '12', month: 'DEC' }. */
export function dateTile(iso: string) {
  const d = new Date(iso);
  return { day: String(d.getDate()), month: MONTHS_LONG[d.getMonth()].slice(0, 3).toUpperCase() };
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
