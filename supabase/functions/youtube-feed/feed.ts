/**
 * Pure helpers that turn YouTube Data API responses into the feed the app reads.
 * No Deno or Node APIs here, so the app can share the types and tests can run
 * this file directly.
 */

export type FeedVideoKind = 'live' | 'upcoming' | 'stream' | 'video';

export type FeedVideo = {
  /** Route id in the app. Equals youtubeId for videos from YouTube. */
  id: string;
  youtubeId: string | null;
  title: string;
  description: string;
  /** ISO timestamp: the stream's start for livestreams, the upload time otherwise. */
  date: string;
  thumbnail: string | null;
  /** "1:42:10" or "48:05"; null while live or before it starts. */
  duration: string | null;
  kind: FeedVideoKind;
  /** For upcoming streams: when it is scheduled to start. */
  scheduledStart: string | null;
};

export type Feed = {
  channelId: string;
  live: FeedVideo | null;
  upcoming: FeedVideo[];
  /** Past livestreams and uploaded videos, newest first. */
  videos: FeedVideo[];
  fetchedAt: string;
};

/** The parts of a `videos.list` item this feed reads. */
export type YouTubeVideoItem = {
  id: string;
  snippet?: {
    title?: string;
    description?: string;
    publishedAt?: string;
    liveBroadcastContent?: 'live' | 'upcoming' | 'none' | string;
    thumbnails?: Record<string, { url: string; width?: number; height?: number } | undefined>;
  };
  contentDetails?: { duration?: string };
  liveStreamingDetails?: {
    scheduledStartTime?: string;
    actualStartTime?: string;
    actualEndTime?: string;
  };
};

/** Videos shorter than this are treated as Shorts and left out of the sermon list. */
export const SHORTS_MAX_SECONDS = 75;

/** Upcoming streams scheduled further back than this are stale and dropped. */
const STALE_UPCOMING_MS = 24 * 60 * 60 * 1000;

/** The channel's "uploads" playlist: the channel id with UC swapped for UU. */
export function uploadsPlaylistId(channelId: string) {
  return channelId.startsWith('UC') ? `UU${channelId.slice(2)}` : channelId;
}

/** Parses an ISO 8601 duration such as "PT1H2M10S" into seconds. */
export function durationSeconds(iso: string | undefined): number | null {
  if (!iso) return null;
  const m = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(iso);
  if (!m) return null;
  const [, d, h, min, s] = m.map((v) => (v ? Number(v) : 0));
  return d * 86400 + h * 3600 + min * 60 + s;
}

/** 3730 -> "1:02:10", 2885 -> "48:05". */
export function formatDuration(total: number | null): string | null {
  if (total === null || total <= 0) return null;
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

function bestThumbnail(item: YouTubeVideoItem): string | null {
  const t = item.snippet?.thumbnails ?? {};
  return (t.maxres ?? t.standard ?? t.high ?? t.medium ?? t.default)?.url ?? null;
}

function classify(item: YouTubeVideoItem): FeedVideoKind {
  const live = item.snippet?.liveBroadcastContent;
  if (live === 'live') return 'live';
  if (live === 'upcoming') return 'upcoming';
  return item.liveStreamingDetails?.actualStartTime ? 'stream' : 'video';
}

export function toFeedVideo(item: YouTubeVideoItem): FeedVideo {
  const kind = classify(item);
  const lsd = item.liveStreamingDetails;
  const date = lsd?.actualStartTime ?? lsd?.scheduledStartTime ?? item.snippet?.publishedAt ?? new Date(0).toISOString();
  return {
    id: item.id,
    youtubeId: item.id,
    title: item.snippet?.title?.trim() || 'Untitled',
    description: item.snippet?.description?.trim() ?? '',
    date,
    thumbnail: bestThumbnail(item),
    duration: kind === 'live' || kind === 'upcoming' ? null : formatDuration(durationSeconds(item.contentDetails?.duration)),
    kind,
    scheduledStart: lsd?.scheduledStartTime ?? null,
  };
}

/** Builds the feed from `videos.list` items (any order). */
export function buildFeed(channelId: string, items: YouTubeVideoItem[], now: Date = new Date()): Feed {
  const all = items.map((item) => ({ item, video: toFeedVideo(item) }));
  const byDateDesc = (a: FeedVideo, b: FeedVideo) => Date.parse(b.date) - Date.parse(a.date);

  const live = all.filter((x) => x.video.kind === 'live').map((x) => x.video).sort(byDateDesc)[0] ?? null;

  const upcoming = all
    .map((x) => x.video)
    .filter((v) => v.kind === 'upcoming' && v.scheduledStart && Date.parse(v.scheduledStart) > now.getTime() - STALE_UPCOMING_MS)
    .sort((a, b) => Date.parse(a.scheduledStart!) - Date.parse(b.scheduledStart!));

  const videos = all
    .filter(({ item, video }) => {
      if (video.kind === 'stream') return true;
      if (video.kind !== 'video') return false;
      const secs = durationSeconds(item.contentDetails?.duration);
      return secs === null || secs > SHORTS_MAX_SECONDS;
    })
    .map((x) => x.video)
    .sort(byDateDesc);

  return { channelId, live, upcoming, videos, fetchedAt: now.toISOString() };
}
