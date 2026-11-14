// Supabase Edge Function: GET /functions/v1/youtube-feed
//
// Returns the BTG Ministry YouTube channel as a small JSON feed:
// what is live now, upcoming streams, and past livestreams and videos.
//
// Secrets (set with `supabase secrets set`):
//   YOUTUBE_API_KEY     required: a YouTube Data API v3 key
//   YOUTUBE_CHANNEL_ID  optional: defaults to the Iman Mwakanyamale channel
//
// Cost: 2 quota units per refresh (playlistItems.list + videos.list). With the
// 5-minute cache below that stays far inside YouTube's free 10,000 units a day.

import { buildFeed, uploadsPlaylistId, type YouTubeVideoItem } from './feed.ts';

const API = 'https://www.googleapis.com/youtube/v3';
const DEFAULT_CHANNEL_ID = 'UC0wRGjSLCWbmVqMfvX3PIiw';
const CACHE_MS = 5 * 60 * 1000;
const LIVE_CACHE_MS = 60 * 1000;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
};

let cache: { at: number; ttl: number; body: string } | null = null;

function respond(body: string, status = 200, maxAge = 60) {
  return new Response(body, {
    status,
    headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': `public, max-age=${maxAge}` },
  });
}

async function youtube<T>(path: string, params: Record<string, string>, key: string): Promise<T> {
  const url = new URL(`${API}/${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set('key', key);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`YouTube ${path} failed: ${res.status} ${await res.text()}`);
  return (await res.json()) as T;
}

async function loadFeed(key: string, channelId: string) {
  const playlist = await youtube<{ items?: { contentDetails?: { videoId?: string } }[] }>(
    'playlistItems',
    { part: 'contentDetails', playlistId: uploadsPlaylistId(channelId), maxResults: '50' },
    key,
  );
  const ids = (playlist.items ?? []).map((i) => i.contentDetails?.videoId).filter((id): id is string => !!id);
  if (ids.length === 0) return buildFeed(channelId, []);

  const videos = await youtube<{ items?: YouTubeVideoItem[] }>(
    'videos',
    { part: 'snippet,contentDetails,liveStreamingDetails', id: ids.join(','), maxResults: '50' },
    key,
  );
  return buildFeed(channelId, videos.items ?? []);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (req.method !== 'GET') return respond(JSON.stringify({ error: 'Use GET' }), 405);

  const key = Deno.env.get('YOUTUBE_API_KEY');
  if (!key) return respond(JSON.stringify({ error: 'YOUTUBE_API_KEY is not set' }), 500, 0);
  const channelId = Deno.env.get('YOUTUBE_CHANNEL_ID') ?? DEFAULT_CHANNEL_ID;

  if (cache && Date.now() - cache.at < cache.ttl) return respond(cache.body);

  try {
    const feed = await loadFeed(key, channelId);
    // Refresh faster while a stream is live or about to start.
    const soon = feed.upcoming.some((v) => Date.parse(v.scheduledStart!) - Date.now() < 30 * 60 * 1000);
    const ttl = feed.live || soon ? LIVE_CACHE_MS : CACHE_MS;
    cache = { at: Date.now(), ttl, body: JSON.stringify(feed) };
    return respond(cache.body);
  } catch (err) {
    console.error(err);
    // Serve the last good feed rather than an error when YouTube is unreachable.
    if (cache) return respond(cache.body);
    return respond(JSON.stringify({ error: 'Could not load the YouTube feed' }), 502, 0);
  }
});
