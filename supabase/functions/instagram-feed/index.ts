// Supabase Edge Function: the ministry's Instagram videos as clips for the app.
//
//   GET /functions/v1/instagram-feed                    -> { connected, clips: Clip[] }   (members, every clip)
//   GET /functions/v1/instagram-feed?limit=40&offset=40 -> one batch, with total and hasMore (the app)
//   GET /functions/v1/instagram-feed?all=1              -> every video, with hidden/playable flags (dashboard)
//
// The Instagram access key is kept in public.instagram_auth (staff paste it on the
// dashboard's Clips page). It lasts 60 days; this function renews it when it has less
// than 30 days left, so it never runs out while the app is in use.
//
// The whole history (old feed videos, Reels, videos in carousels) is read every
// 6 hours and kept in public.instagram_cache; in between, only the newest page is
// read every 15 minutes and merged in. Video links from Instagram stop working after
// a while, which is why the newest posts are refreshed often.

import { createClient } from 'npm:@supabase/supabase-js@2';

import { buildClips, type ClipSetting, type InstagramMedia, mediaUrl, mergeMedia, shouldRefresh, videosOf } from './clips.ts';

const GRAPH = 'https://graph.instagram.com';
/** Read the newest posts again after this long. */
const RECENT_MS = 15 * 60 * 1000;
/** Read the whole history again after this long. */
const FULL_MS = 6 * 3600 * 1000;
/** 50 posts a page: up to 2,000 posts of history. */
const MAX_PAGES = 40;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
};

let memory: { at: number; full: number; auth: string; media: InstagramMedia[] } | null = null;
let inFlight: Promise<InstagramMedia[]> | null = null;

function json(body: unknown, status = 200, maxAge = 0) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': maxAge ? `public, max-age=${maxAge}` : 'no-store' },
  });
}

type Auth = { access_token: string; account_id: string | null; expires_at: string | null; refreshed_at: string | null; updated_at: string };

// deno-lint-ignore no-explicit-any
async function freshToken(admin: any, auth: Auth): Promise<string> {
  if (!shouldRefresh(auth)) return auth.access_token;
  try {
    const res = await fetch(`${GRAPH}/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(auth.access_token)}`);
    const body = (await res.json()) as { access_token?: string; expires_in?: number };
    if (!res.ok || !body.access_token) throw new Error(`refresh returned ${res.status}`);
    const now = new Date();
    await admin
      .from('instagram_auth')
      .update({
        access_token: body.access_token,
        expires_at: new Date(now.getTime() + (body.expires_in ?? 60 * 24 * 3600) * 1000).toISOString(),
        refreshed_at: now.toISOString(),
      })
      .eq('id', 1);
    return body.access_token;
  } catch (err) {
    console.error('instagram-feed: could not renew the key', err);
    return auth.access_token; // Still valid for now; try again next time.
  }
}

async function loadMedia(token: string, accountId: string | null, pages: number): Promise<InstagramMedia[]> {
  const out: InstagramMedia[] = [];
  let url: string | null = mediaUrl(token, accountId);
  for (let page = 0; url && page < pages; page++) {
    const res: Response = await fetch(url);
    const body = (await res.json()) as { data?: InstagramMedia[]; paging?: { next?: string }; error?: { message?: string } };
    if (!res.ok) throw new Error(body.error?.message ?? `Instagram returned ${res.status}`);
    out.push(...(body.data ?? []));
    url = body.paging?.next ?? null;
  }
  return out;
}

/**
 * The account's videos, newest first: from memory, the stored history, or Instagram,
 * whichever is fresh enough. Reconnecting Instagram on the dashboard starts over.
 */
// deno-lint-ignore no-explicit-any
async function currentMedia(admin: any, auth: Auth): Promise<InstagramMedia[]> {
  const now = Date.now();
  if (memory && memory.auth === auth.updated_at && now - memory.at < RECENT_MS && now - memory.full < FULL_MS) return memory.media;

  const { data: row } = await admin.from('instagram_cache').select('media,fetched_at,full_at').eq('id', 1).maybeSingle();
  let media = (row?.media ?? []) as InstagramMedia[];
  let at = Date.parse(row?.fetched_at ?? '') || 0;
  let full = Date.parse(row?.full_at ?? '') || 0;
  const reconnected = Date.parse(auth.updated_at) > full;

  try {
    if (!media.length || reconnected || now - full > FULL_MS) {
      const token = await freshToken(admin, auth);
      media = videosOf(await loadMedia(token, auth.account_id, MAX_PAGES));
      at = full = now;
      await admin.from('instagram_cache').upsert({ id: 1, media, fetched_at: new Date(at).toISOString(), full_at: new Date(full).toISOString() });
    } else if (now - at > RECENT_MS) {
      const token = await freshToken(admin, auth);
      media = mergeMedia(media, videosOf(await loadMedia(token, auth.account_id, 1)));
      at = now;
      await admin.from('instagram_cache').upsert({ id: 1, media, fetched_at: new Date(at).toISOString(), full_at: new Date(full).toISOString() });
    }
  } catch (err) {
    // Instagram unreachable or busy: the stored history is better than nothing.
    if (!media.length || reconnected) throw err;
    console.error('instagram-feed: using the stored list', err);
  }
  memory = { at, full, auth: auth.updated_at, media };
  return media;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (req.method !== 'GET') return json({ error: 'Use GET' }, 405);
  const params = new URL(req.url).searchParams;
  const all = params.get('all') === '1';
  const offset = Math.max(0, Number(params.get('offset')) || 0);
  const limit = Math.min(200, Math.max(0, Number(params.get('limit')) || 0));
  // Without a limit, every clip (older app versions and the dashboard).
  const page = (clips: ReturnType<typeof buildClips>) => {
    const shown = limit ? clips.slice(offset, offset + limit) : clips;
    return { clips: shown, total: clips.length, hasMore: offset + shown.length < clips.length };
  };

  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) return json({ error: 'Server is not configured' }, 500);
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  const [{ data: auth }, { data: settings }] = await Promise.all([
    admin.from('instagram_auth').select('access_token,account_id,expires_at,refreshed_at,updated_at').eq('id', 1).maybeSingle(),
    admin.from('clips').select('instagram_id,hidden,title,sermon_youtube_id,sermon_start_seconds'),
  ]);
  if (!auth) return json({ connected: false, clips: [] }, 200, 60);

  try {
    inFlight ??= currentMedia(admin, auth as Auth).finally(() => {
      inFlight = null;
    });
    const media = await inFlight;
    return json({ connected: true, ...page(buildClips(media, (settings ?? []) as ClipSetting[], all)) }, 200, all ? 0 : 300);
  } catch (err) {
    console.error('instagram-feed', err);
    // An old list is better than none while Instagram is unreachable.
    if (memory) return json({ connected: true, ...page(buildClips(memory.media, (settings ?? []) as ClipSetting[], all)), stale: true }, 200, 60);
    return json({ connected: true, clips: [], error: 'Couldn’t reach Instagram. Check the access key on the dashboard.' }, 502);
  }
});
