import { XMLParser } from 'fast-xml-parser';

/**
 * Reads a standard podcast RSS feed (the kind every podcast host provides,
 * and the same feed Spotify and Apple Podcasts use).
 */

export type Episode = {
  id: string;
  title: string;
  description: string;
  /** Null for sample episodes that have no recording yet. */
  audioUrl: string | null;
  /** Seconds, when the feed says. */
  duration: number | null;
  /** ISO date. */
  date: string | null;
  artwork: string | null;
  /** Series or season label, when the feed has one. */
  series: string | null;
};

export type Podcast = {
  title: string;
  description: string;
  artwork: string | null;
  episodes: Episode[];
};

type Node = Record<string, unknown>;

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  processEntities: true,
  htmlEntities: true,
  // Elements that can repeat must always be arrays.
  isArray: (name) => name === 'item' || name === 'itunes:category',
});

function text(v: unknown): string {
  if (v === undefined || v === null) return '';
  if (typeof v === 'string' || typeof v === 'number') return String(v).trim();
  if (typeof v === 'object' && '#text' in (v as Node)) return text((v as Node)['#text']);
  return '';
}

function attr(v: unknown, name: string): string | null {
  if (v && typeof v === 'object') {
    const a = (v as Node)[`@_${name}`];
    return typeof a === 'string' && a ? a : null;
  }
  return null;
}

/** "1:02:10", "48:05" or "2885" -> seconds. */
export function parseDuration(v: string): number | null {
  const s = v.trim();
  if (!s) return null;
  if (/^\d+$/.test(s)) return Number(s);
  const parts = s.split(':').map(Number);
  if (parts.some((n) => Number.isNaN(n))) return null;
  return parts.reduce((total, n) => total * 60 + n, 0);
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

/** Removes HTML tags, decodes entities and collapses whitespace in show notes. */
export function plainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, code: string) => {
      if (code[0] === '#') {
        const n = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
        return Number.isFinite(n) ? String.fromCodePoint(n) : m;
      }
      return ENTITIES[code.toLowerCase()] ?? m;
    })
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function parsePodcastRss(xml: string): Podcast {
  const doc = parser.parse(xml) as Node;
  const channel = ((doc.rss as Node | undefined)?.channel ?? {}) as Node;
  const showArtwork = attr(channel['itunes:image'], 'href') ?? (text((channel.image as Node | undefined)?.url) || null);
  const items = (channel.item as Node[] | undefined) ?? [];

  const episodes: Episode[] = items
    .map((item, i): Episode => {
      const enclosure = item.enclosure;
      const audioUrl = attr(enclosure, 'url');
      const guid = text(item.guid);
      const date = text(item.pubDate);
      const season = text(item['itunes:season']);
      const parsedDate = date ? new Date(date) : null;
      return {
        id: guid || audioUrl || `episode-${i}`,
        title: text(item['itunes:title']) || text(item.title) || 'Untitled episode',
        description: plainText(text(item['content:encoded']) || text(item.description) || text(item['itunes:summary'])),
        audioUrl,
        duration: parseDuration(text(item['itunes:duration'])),
        date: parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate.toISOString() : null,
        artwork: attr(item['itunes:image'], 'href') ?? showArtwork,
        series: season ? `Season ${season}` : null,
      };
    })
    .filter((e) => e.audioUrl);

  return {
    title: text(channel.title) || 'Podcast',
    description: plainText(text(channel.description) || text(channel['itunes:summary'])),
    artwork: showArtwork,
    episodes,
  };
}

/** 3730 -> "1:02:10", 125 -> "2:05". */
export function formatClock(seconds: number) {
  const total = Math.max(0, Math.floor(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}

/** 2885 -> "48 min", 3730 -> "1 hr 2 min". */
export function formatLength(seconds: number | null) {
  if (!seconds) return null;
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)} hr${mins % 60 ? ` ${mins % 60} min` : ''}`;
}
