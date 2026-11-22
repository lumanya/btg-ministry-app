/**
 * Turns the ministry's Instagram media into clips for the app.
 * Kept free of Deno and Supabase so it can be tested with plain Node.
 */

/** What the Instagram API returns for each post (the fields we ask for). */
export type InstagramMedia = {
  id: string;
  media_type?: string;
  media_url?: string;
  thumbnail_url?: string;
  permalink?: string;
  caption?: string;
  timestamp?: string;
  /** For carousel posts: the photos and videos inside. */
  children?: { data?: { id: string; media_type?: string; media_url?: string; thumbnail_url?: string }[] };
};

/** Staff settings for a clip (public.clips). */
export type ClipSetting = {
  instagram_id: string;
  hidden: boolean;
  title: string | null;
  sermon_youtube_id: string | null;
  sermon_start_seconds: number | null;
};

export type Clip = {
  id: string;
  /** The video file on Instagram's servers. Null when Instagram won't share it (licensed music). */
  videoUrl: string | null;
  thumbnail: string | null;
  permalink: string | null;
  /** Staff's title, else the first line of the caption, tidied. */
  title: string;
  caption: string;
  postedAt: string | null;
  /** The full sermon this clip comes from, and where in it (seconds). */
  sermon: { youtubeId: string; start: number } | null;
  hidden: boolean;
};

/** "A word on grace 🙏 #faith\nMore…" -> "A word on grace" */
export function clipTitle(caption: string | undefined): string {
  const first = (caption ?? '').split(/\r?\n/).find((l) => l.trim()) ?? '';
  const clean = first
    .replace(/#[\p{L}\p{N}_]+/gu, '')
    .replace(/@[\w.]+/g, '')
    .replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[\s,;:–-]+$/, '');
  if (clean.length <= 60) return clean;
  const cut = clean.slice(0, 57);
  const space = cut.lastIndexOf(' ');
  return `${(space > 30 ? cut.slice(0, space) : cut).trimEnd()}…`;
}

/**
 * Every video on the account: plain video posts and Reels (old feed videos are
 * VIDEO too), plus the videos inside carousel posts, which take the post's
 * caption, date and link.
 */
export function videosOf(media: InstagramMedia[]): InstagramMedia[] {
  const out: InstagramMedia[] = [];
  for (const m of media) {
    if (m.media_type === 'VIDEO') out.push(m);
    else if (m.media_type === 'CAROUSEL_ALBUM') {
      for (const child of m.children?.data ?? []) {
        if (child.media_type !== 'VIDEO') continue;
        out.push({ ...child, permalink: m.permalink, caption: m.caption, timestamp: m.timestamp });
      }
    }
  }
  return out;
}

/** A picture post that could be an event poster. */
export type Poster = { id: string; imageUrl: string; caption: string; permalink: string | null; postedAt: string | null };

/** How many recent picture posts to offer as posters. */
export const POSTER_COUNT = 40;

/**
 * Picture posts, newest first: single images, and the first picture of a carousel
 * (where a poster usually leads).
 */
export function postersOf(media: InstagramMedia[], keep = POSTER_COUNT): Poster[] {
  const out: Poster[] = [];
  for (const m of media) {
    let url: string | undefined;
    if (m.media_type === 'IMAGE') url = m.media_url;
    else if (m.media_type === 'CAROUSEL_ALBUM') url = m.children?.data?.find((c) => c.media_type === 'IMAGE')?.media_url;
    if (!url) continue;
    out.push({ id: m.id, imageUrl: url, caption: (m.caption ?? '').trim(), permalink: m.permalink ?? null, postedAt: m.timestamp ?? null });
  }
  return out.sort((a, b) => (Date.parse(b.postedAt ?? '') || 0) - (Date.parse(a.postedAt ?? '') || 0)).slice(0, keep);
}

/** Fresh posters first, then older ones not in the fresh list. */
export function mergePosters(stored: Poster[], fresh: Poster[], keep = POSTER_COUNT): Poster[] {
  const ids = new Set(fresh.map((p) => p.id));
  return [...fresh, ...stored.filter((p) => !ids.has(p.id))]
    .sort((a, b) => (Date.parse(b.postedAt ?? '') || 0) - (Date.parse(a.postedAt ?? '') || 0))
    .slice(0, keep);
}

/**
 * New posts from the first page added to the stored history: same id = the fresh
 * copy (new video link), newest first.
 */
export function mergeMedia(stored: InstagramMedia[], fresh: InstagramMedia[]): InstagramMedia[] {
  const byId = new Map(stored.map((m) => [m.id, m]));
  for (const m of fresh) byId.set(m.id, m);
  return [...byId.values()].sort((a, b) => (Date.parse(b.timestamp ?? '') || 0) - (Date.parse(a.timestamp ?? '') || 0));
}

/**
 * Videos only, newest first, merged with staff settings.
 * The app gets playable, visible clips; the dashboard (`all`) gets every video.
 */
export function buildClips(media: InstagramMedia[], settings: ClipSetting[], all = false): Clip[] {
  const byId = new Map(settings.map((s) => [s.instagram_id, s]));
  return videosOf(media)
    .map((m): Clip => {
      const s = byId.get(m.id);
      return {
        id: m.id,
        videoUrl: m.media_url ?? null,
        thumbnail: m.thumbnail_url ?? null,
        permalink: m.permalink ?? null,
        title: s?.title?.trim() || clipTitle(m.caption) || 'BTG Ministry',
        caption: (m.caption ?? '').trim(),
        postedAt: m.timestamp ?? null,
        sermon: s?.sermon_youtube_id ? { youtubeId: s.sermon_youtube_id, start: s.sermon_start_seconds ?? 0 } : null,
        hidden: !!s?.hidden,
      };
    })
    .filter((c) => all || (!c.hidden && !!c.videoUrl))
    .sort((a, b) => (Date.parse(b.postedAt ?? '') || 0) - (Date.parse(a.postedAt ?? '') || 0));
}

const DAY = 24 * 3600 * 1000;

/**
 * Long-lived Instagram keys last 60 days and can be renewed once they are a day old.
 * Renew when less than 30 days are left, at most once a day.
 */
export function shouldRefresh(
  auth: { expires_at: string | null; refreshed_at: string | null; updated_at: string },
  now = Date.now(),
): boolean {
  // Business keys (no expiry date) never need renewing.
  if (!auth.expires_at) return false;
  const since = Date.parse(auth.refreshed_at ?? auth.updated_at) || 0;
  if (now - since < DAY) return false;
  return Date.parse(auth.expires_at) - now < 30 * DAY;
}

const FIELDS = 'id,media_type,media_url,thumbnail_url,permalink,caption,timestamp,children{id,media_type,media_url,thumbnail_url}';

/**
 * Where to read the account's posts. Keys from Instagram login read "me" on
 * graph.instagram.com; business keys read the account by its ID on graph.facebook.com.
 */
export function mediaUrl(token: string, accountId: string | null): string {
  const base = accountId ? `https://graph.facebook.com/v25.0/${encodeURIComponent(accountId)}/media` : 'https://graph.instagram.com/me/media';
  return `${base}?fields=${encodeURIComponent(FIELDS)}&limit=50&access_token=${encodeURIComponent(token)}`;
}
