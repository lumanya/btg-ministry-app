import type { ArtTone } from '@/content/sample';

import type { Feed, FeedVideo } from '../../supabase/functions/youtube-feed/feed';

export type { Feed, FeedVideo };

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** "12 May 2024" in the phone's time zone. */
export function formatDay(iso: string) {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** "Sun 16 Nov, 10:00" in the phone's time zone. */
export function formatStart(iso: string) {
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}, ${hh}:${mm}`;
}

/** Short line under a video title. */
export function videoMeta(v: FeedVideo) {
  switch (v.kind) {
    case 'live':
      return 'Streaming now';
    case 'upcoming':
      return v.scheduledStart ? `Starts ${formatStart(v.scheduledStart)}` : 'Coming up';
    case 'stream':
      return `Livestream · ${formatDay(v.date)}`;
    default:
      return `Video · ${formatDay(v.date)}`;
  }
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
