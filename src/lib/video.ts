import type { ArtTone } from '@/content/sample';
import { compact, dayName, monthName, t } from '@/i18n';

import type { Feed, FeedPlaylist, FeedVideo, PlaylistPage } from '../../supabase/functions/youtube-feed/feed';

export type { Feed, FeedPlaylist, FeedVideo, PlaylistPage };


/** "12 May 2024" in the phone's time zone. */
export function formatDay(iso: string) {
  const d = new Date(iso);
  return `${d.getDate()} ${monthName(d.getMonth(), true)} ${d.getFullYear()}`;
}

/** "Sun 16 Nov, 10:00" in the phone's time zone. */
export function formatStart(iso: string) {
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${dayName(d.getDay(), true)} ${d.getDate()} ${monthName(d.getMonth(), true)}, ${hh}:${mm}`;
}

/** Short line under a video title. */
export function videoMeta(v: FeedVideo) {
  switch (v.kind) {
    case 'live':
      return t('Streaming now');
    case 'upcoming':
      return v.scheduledStart ? t('Starts {when}', { when: formatStart(v.scheduledStart) }) : t('Coming up');
    case 'stream':
      return t('Livestream · {date}', { date: formatDay(v.date) }) + viewsSuffix(v);
    default:
      return t('Video · {date}', { date: formatDay(v.date) }) + viewsSuffix(v);
  }
}

/** " · 1.2K views" from YouTube's count, or nothing when there isn't one. */
function viewsSuffix(v: FeedVideo) {
  return v.views ? ` · ${viewCount(v.views)}` : '';
}

/** "1 view", "1.2K views". */
export function viewCount(n: number) {
  return n === 1 ? t('1 view') : t('{n} views', { n: compact(n) });
}

/** Alternating artwork tones for videos without a thumbnail. */
export function videoTone(index: number): ArtTone {
  return index % 2 === 0 ? 'deep' : 'brown';
}

export function youtubeWatchUrl(v: FeedVideo) {
  return v.youtubeId ? `https://www.youtube.com/watch?v=${v.youtubeId}` : null;
}

export function findVideo(feed: Feed, id: string): FeedVideo | undefined {
  return [feed.live, ...feed.upcoming, ...feed.videos].find((v): v is FeedVideo => !!v && v.id === id);
}
