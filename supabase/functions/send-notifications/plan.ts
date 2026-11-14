/**
 * Decides which automatic notifications are due. Pure (no Deno or network),
 * so it can be tested with plain Node.
 *
 * Every automatic notification has a dedupe key, and the outbox table refuses a
 * second row with the same key, so running this every few minutes sends each one once.
 */

export type Topic = 'live' | 'devotional' | 'services' | 'events' | 'announcements';

export type Planned = {
  dedupe_key: string;
  topic: Topic;
  title: string;
  body: string;
  url: string;
};

export type PlanInput = {
  now: Date;
  /** From the YouTube feed. */
  live: { id: string; title: string } | null;
  upcoming: { id: string; title: string; scheduledStart: string | null }[];
  /** Active weekly services: weekday 0 = Sunday, start_time "18:30:00", Tanzania time. */
  services: { id: string; name: string; weekday: number; start_time: string; livestreamed: boolean }[];
  /** Today's published devotional (Tanzania date), if any. */
  devotional: { slug: string; title: string; scripture_ref: string | null; publish_on: string } | null;
  /** Published events with reminders on, starting within the next day or so. */
  events: { id: string; title: string; starts_at: string; location_name: string | null }[];
};

const EAT_OFFSET_MS = 3 * 60 * 60 * 1000;
const MIN = 60 * 1000;
/** Send "starting soon" this long before a start time. */
const SOON_MS = 30 * MIN;
/** The daily devotional goes out from 06:00 until 21:00 Tanzania time. */
const DEVOTIONAL_FROM_HOUR = 6;
const DEVOTIONAL_UNTIL_HOUR = 21;

/** Tanzania wall-clock parts for a moment. */
export function eat(d: Date) {
  const t = new Date(d.getTime() + EAT_OFFSET_MS);
  return {
    date: t.toISOString().slice(0, 10),
    weekday: t.getUTCDay(),
    hour: t.getUTCHours(),
    hhmm: `${String(t.getUTCHours()).padStart(2, '0')}:${String(t.getUTCMinutes()).padStart(2, '0')}`,
  };
}

/** The next start of a weekly service (Tanzania time) at or after `from` minus a minute. */
export function nextServiceStart(weekday: number, startTime: string, from: Date): Date {
  const [h, m] = startTime.split(':').map(Number);
  const local = eat(from);
  const base = Date.parse(`${local.date}T00:00:00Z`) - EAT_OFFSET_MS; // midnight Tanzania, as UTC ms
  for (let add = 0; add < 8; add++) {
    const day = new Date(base + add * 24 * 60 * MIN);
    if (eat(day).weekday !== weekday) continue;
    const start = new Date(day.getTime() + (h * 60 + m) * MIN);
    if (start.getTime() >= from.getTime() - MIN) return start;
  }
  return new Date(base + 8 * 24 * 60 * MIN);
}

function within(start: number, now: number, before: number) {
  const until = start - now;
  return until <= before && until > -5 * MIN;
}

export function plan(input: PlanInput): Planned[] {
  const out: Planned[] = [];
  const now = input.now.getTime();
  const today = eat(input.now);

  if (input.live) {
    out.push({
      dedupe_key: `live:${input.live.id}`,
      topic: 'live',
      title: 'We’re live now',
      body: `${input.live.title} · Join the service in the app.`,
      url: '/live',
    });
  }

  // YouTube streams scheduled to start soon.
  const soonStreams = input.upcoming.filter((u) => u.scheduledStart && within(Date.parse(u.scheduledStart), now, SOON_MS));
  for (const u of soonStreams) {
    out.push({
      dedupe_key: `upcoming:${u.id}`,
      topic: 'services',
      title: 'Starting in 30 minutes',
      body: `${u.title} · Tap to join the livestream.`,
      url: '/live',
    });
  }

  // Weekly services, unless a YouTube stream is already announced for the same time.
  if (!soonStreams.length && !input.live) {
    for (const s of input.services) {
      const start = nextServiceStart(s.weekday, s.start_time, input.now);
      if (!within(start.getTime(), now, SOON_MS)) continue;
      out.push({
        dedupe_key: `service:${s.id}:${eat(start).date}`,
        topic: 'services',
        title: `${s.name} starts at ${eat(start).hhmm}`,
        body: s.livestreamed ? 'Join us in person or watch live in the app.' : 'We look forward to seeing you.',
        url: '/live',
      });
    }
  }

  const d = input.devotional;
  if (d && d.publish_on === today.date && today.hour >= DEVOTIONAL_FROM_HOUR && today.hour < DEVOTIONAL_UNTIL_HOUR) {
    out.push({
      dedupe_key: `devotional:${d.publish_on}`,
      topic: 'devotional',
      title: 'Today’s devotional',
      body: d.scripture_ref ? `${d.title} · ${d.scripture_ref}` : d.title,
      url: `/devotional/${d.slug}`,
    });
  }

  for (const e of input.events) {
    const start = Date.parse(e.starts_at);
    const until = start - now;
    const where = e.location_name ? ` · ${e.location_name}` : '';
    if (until > 0 && until <= 60 * MIN) {
      out.push({
        dedupe_key: `event:${e.id}:soon`,
        topic: 'events',
        title: `Starting soon: ${e.title}`,
        body: `Today at ${eat(new Date(start)).hhmm}${where}`,
        url: `/events/${e.id}`,
      });
    } else if (until > 2 * 60 * MIN && until <= 24 * 60 * MIN) {
      const day = eat(new Date(start)).date === today.date ? 'Today' : 'Tomorrow';
      out.push({
        dedupe_key: `event:${e.id}:day`,
        topic: 'events',
        title: `${day}: ${e.title}`,
        body: `${day} at ${eat(new Date(start)).hhmm}${where}`,
        url: `/events/${e.id}`,
      });
    }
  }

  return out;
}

/** Splits a list into chunks (Expo accepts up to 100 messages per request). */
export function chunks<T>(list: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}
