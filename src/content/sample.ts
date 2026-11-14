/**
 * Sample content for the first version of the app.
 *
 * Everything here is temporary and will be replaced by live sources:
 * - sermons and the livestream  -> the youtube-feed server function (src/state/feed.tsx)
 * - devotionals                 -> the devotionals published on btgministry.org
 * - podcast episodes            -> the podcast RSS feed
 *
 * Titles, dates and scripture references are taken from BTG Ministry's own
 * website and YouTube channel. Values in [SQUARE BRACKETS] are unknown and
 * must be filled in by the ministry.
 */

import type { FeedVideo } from '../../supabase/functions/youtube-feed/feed';

export type ArtTone = 'brown' | 'deep' | 'sand';

/**
 * Stand-in videos shown until the YouTube feed is connected (see README).
 * The first is a real Sunday service on the channel; the others reuse
 * devotional titles and dates and have no video yet.
 */
export const sampleVideos: FeedVideo[] = [
  {
    id: 'pdvLSZRh3N8',
    youtubeId: 'pdvLSZRh3N8',
    title: 'Consciousness & Realities of Realms',
    description: 'You are welcome to Building the Temple of God Ministry.',
    date: '2024-05-12T09:00:00+03:00',
    thumbnail: 'https://i.ytimg.com/vi/pdvLSZRh3N8/hqdefault.jpg',
    duration: null,
    kind: 'stream',
    scheduledStart: null,
  },
  {
    id: 'sample-vision-of-paul',
    youtubeId: null,
    title: 'The Vision of Paul',
    description: '[SERMON DESCRIPTION]',
    date: '2025-09-30T09:00:00+03:00',
    thumbnail: null,
    duration: null,
    kind: 'video',
    scheduledStart: null,
  },
  {
    id: 'sample-power-of-hades',
    youtubeId: null,
    title: 'Power of Hades',
    description: '[SERMON DESCRIPTION]',
    date: '2025-10-08T09:00:00+03:00',
    thumbnail: null,
    duration: null,
    kind: 'video',
    scheduledStart: null,
  },
  {
    id: 'sample-spheres-of-life',
    youtubeId: null,
    title: 'Death: Spheres of Life',
    description: '[SERMON DESCRIPTION]',
    date: '2025-10-07T09:00:00+03:00',
    thumbnail: null,
    duration: null,
    kind: 'video',
    scheduledStart: null,
  },
  {
    id: 'sample-the-soul',
    youtubeId: null,
    title: 'The Soul: Consciousness',
    description: '[SERMON DESCRIPTION]',
    date: '2025-09-27T09:00:00+03:00',
    thumbnail: null,
    duration: null,
    kind: 'video',
    scheduledStart: null,
  },
];

export type Devotional = {
  id: string;
  /** ISO date, e.g. 2025-10-11 */
  date: string;
  title: string;
  subtitle?: string;
  scripture?: { ref: string; text?: string };
  excerpt: string;
  series?: string;
};

export const devotionals: Devotional[] = [
  {
    id: 'knowledge-that-makes-man-ignorant',
    date: '2025-10-14',
    title: 'Knowledge that Makes Man Ignorant',
    excerpt: 'Any knowledge that does not come from the inner being of man makes man stay in ignorance.',
    series: 'Knowledge',
  },
  {
    id: 'knowledge-that-makes-man-enlightened',
    date: '2025-10-13',
    title: 'The Knowledge that Makes Man Enlightened',
    excerpt: 'This is the knowledge that makes man be himself. It makes man receive himself.',
    series: 'Knowledge',
  },
  {
    id: 'on-repentance',
    date: '2025-10-11',
    title: 'On Repentance',
    subtitle: 'de paenitentia',
    scripture: {
      ref: 'Acts 3:19',
      text: 'Repent ye therefore, and be converted, that your sins may be blotted out, when the times of refreshing shall come from the presence of the Lord.',
    },
    excerpt: 'Repentance is simply the change of mind.',
  },
  {
    id: 'our-father-who-art-in-heaven',
    date: '2025-10-09',
    title: 'Our Father who art in heaven',
    scripture: { ref: '1 Corinthians 11:3' },
    excerpt: 'The head of every man is Christ, and the head of Christ is God.',
  },
  {
    id: 'power-of-hades-1',
    date: '2025-10-08',
    title: 'Power of Hades, part 1',
    scripture: { ref: 'Revelation 20:1–4' },
    excerpt: 'And I saw an angel come down from heaven, having the key of the bottomless pit.',
    series: 'Death & Life',
  },
  {
    id: 'death-spheres-of-life',
    date: '2025-10-07',
    title: 'Death: Spheres of Life',
    excerpt: 'To better understand death, we must first understand what life is.',
    series: 'Death & Life',
  },
  {
    id: 'death',
    date: '2025-10-04',
    title: 'Death',
    scripture: { ref: 'Hebrews 2:14' },
    excerpt: 'That through death he might destroy him that had the power of death.',
    series: 'Death & Life',
  },
  {
    id: 'introduction-to-death',
    date: '2025-10-02',
    title: 'Introduction to Death',
    excerpt: 'What you cannot control, you fear.',
    series: 'Death & Life',
  },
  {
    id: 'vision-of-paul',
    date: '2025-09-30',
    title: 'The Vision of Paul',
    scripture: { ref: '2 Corinthians 12:2' },
    excerpt: 'I knew a man in Christ above fourteen years ago, such an one caught up to the third heaven.',
  },
];

/** The devotional featured as "today" until the live feed is connected. */
export const todaysDevotionalId = 'on-repentance';

export type Episode = { id: string; series: string; title: string };

export const podcast = {
  name: 'BTG Ministry Podcast', // [CONFIRM PODCAST NAME]
  description: 'Audio teachings from Iman Mwakanyamale',
  series: [
    { name: 'The Soul', tone: 'deep' as ArtTone },
    { name: 'Death & Life', tone: 'sand' as ArtTone },
    { name: 'Knowledge', tone: 'brown' as ArtTone },
  ],
  episodes: [
    { id: 'soul-consciousness', series: 'The Soul', title: 'The Soul: Consciousness' },
    { id: 'soul-timeline', series: 'The Soul', title: 'The Soul: Timeline' },
    { id: 'introduction-to-death', series: 'Death & Life', title: 'Introduction to Death' },
    { id: 'spheres-of-life', series: 'Death & Life', title: 'Death: Spheres of Life' },
    { id: 'knowledge-ignorant', series: 'Knowledge', title: 'Knowledge that Makes Man Ignorant' },
    { id: 'knowledge-enlightened', series: 'Knowledge', title: 'The Knowledge that Makes Man Enlightened' },
  ] as Episode[],
};

export const services = [
  { id: 'sunday', day: 'Sun', time: '[TIME]', name: 'Sunday Service', meta: '[VENUE] · Livestreamed' },
  { id: 'midweek', day: '[DAY]', time: '[TIME]', name: 'Midweek teaching', meta: '[VENUE] · Livestreamed' },
];

export const quotes = [
  'Man is the spirit in mortal body, seeking immortality through the garment of light; when immortality is attained, eternity is born.',
  'You can’t take yourself out of the consciousness of death without embracing the consciousness of life.',
  'Unless you learn the consciousness of Christ, you won’t grasp the flow of revelation, as consciousness is what renews your mind.',
];

export const giving = {
  mpesa: { label: 'M-Pesa · Vodacom Lipa number', number: '50492190', name: 'Building the Temple of God Ministry' },
  bank: { label: 'CRDB Bank · Account number', number: '0152647614000', name: 'Iman Christopher Mwakanyamale' },
};

export const links = {
  youtubeChannel: 'https://www.youtube.com/@imanmwakanyamale',
  youtubeStreams: 'https://www.youtube.com/@imanmwakanyamale/streams',
  website: 'https://btgministry.org',
};

export function findDevotional(id: string) {
  return devotionals.find((d) => d.id === id);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "2025-10-11" -> "Oct 11, 2025" */
export function formatDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}
