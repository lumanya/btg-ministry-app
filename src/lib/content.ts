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
