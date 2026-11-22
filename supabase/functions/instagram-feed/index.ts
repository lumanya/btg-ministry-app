// Supabase Edge Function: the ministry's Instagram videos as clips for the app.
//
//   GET /functions/v1/instagram-feed                    -> { connected, clips: Clip[] }   (members, every clip)
//   GET /functions/v1/instagram-feed?limit=40&offset=40 -> one batch, with total and hasMore (the app)
//   GET /functions/v1/instagram-feed?all=1              -> every video, with hidden/playable flags (dashboard)
//   GET /functions/v1/instagram-feed?posters=1          -> the latest picture posts, for event posters (dashboard)
//   POST /functions/v1/instagram-feed { import: "<id>" } -> staff only: copies that poster into the
//                                                          public "media" bucket and returns its link
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

import { buildClips, type ClipSetting, collabUrl, combineMedia, type InstagramMedia, mediaUrl, mergeMedia, mergePosters, type Poster, postersOf, shouldRefresh, videosOf } from './clips.ts';

const GRAPH = 'https://graph.instagram.com';
/** Read the newest posts again after this long. */
const RECENT_MS = 15 * 60 * 1000;
/** Read the whole history again after this long. */
const FULL_MS = 6 * 3600 * 1000;
/** 50 posts a page: up to 2,000 posts of history. */
const MAX_PAGES = 40;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type Store = { media: InstagramMedia[]; images: Poster[] };
let memory: ({ at: number; full: number; auth: string } & Store) | null = null;
let inFlight: Promise<Store> | null = null;

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

/** The account's own posts plus collab posts it accepted (which /media leaves out). */
async function loadMedia(token: string, accountId: string | null, pages: number): Promise<InstagramMedia[]> {
  const own = await loadPages(mediaUrl(token, accountId), pages);
  const first = collabUrl(token, accountId);
  let collabs: InstagramMedia[] = [];
  if (first) {
    try {
      collabs = await loadPages(first, Math.min(pages, 10));
    } catch (err) {
      // Older keys may lack access to collab posts: carry on with the account's own posts.
      console.error('instagram-feed: could not read collab posts', err);
    }
  }
  return combineMedia(own, collabs);
}

async function loadPages(firstUrl: string, pages: number): Promise<InstagramMedia[]> {
  const out: InstagramMedia[] = [];
  let url: string | null = firstUrl;
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
async function currentMedia(admin: any, auth: Auth): Promise<Store> {
  const now = Date.now();
  if (memory && memory.auth === auth.updated_at && now - memory.at < RECENT_MS && now - memory.full < FULL_MS) return memory;

  const { data: row } = await admin.from('instagram_cache').select('media,images,fetched_at,full_at').eq('id', 1).maybeSingle();
  let media = (row?.media ?? []) as InstagramMedia[];
  let images = (row?.images ?? []) as Poster[];
  let at = Date.parse(row?.fetched_at ?? '') || 0;
  let full = Date.parse(row?.full_at ?? '') || 0;
  const reconnected = Date.parse(auth.updated_at) > full;

  try {
    // No posters stored yet (e.g. a history saved before posters were kept): read everything again.
    const noPosters = !images.length && now - full > RECENT_MS;
    if (!media.length || reconnected || noPosters || now - full > FULL_MS) {
      const token = await freshToken(admin, auth);
      const raw = await loadMedia(token, auth.account_id, MAX_PAGES);
      media = videosOf(raw);
      images = postersOf(raw);
      at = full = now;
      await admin.from('instagram_cache').upsert({ id: 1, media, images, fetched_at: new Date(at).toISOString(), full_at: new Date(full).toISOString() });
    } else if (now - at > RECENT_MS) {
      const token = await freshToken(admin, auth);
      const raw = await loadMedia(token, auth.account_id, 1);
      media = mergeMedia(media, videosOf(raw));
      images = mergePosters(images, postersOf(raw));
      at = now;
      await admin.from('instagram_cache').upsert({ id: 1, media, images, fetched_at: new Date(at).toISOString(), full_at: new Date(full).toISOString() });
    }
  } catch (err) {
    // Instagram unreachable or busy: the stored history is better than nothing.
    if (!media.length || reconnected) throw err;
    console.error('instagram-feed: using the stored list', err);
  }
  memory = { at, full, auth: auth.updated_at, media, images };
  return memory;
}

/** Staff only: copies a poster from Instagram into the public media bucket (Instagram's links expire). */
// deno-lint-ignore no-explicit-any
async function importPoster(req: Request, admin: any, url: string, store: Store): Promise<Response> {
  const anon = Deno.env.get('SUPABASE_ANON_KEY');
  const authHeader = req.headers.get('Authorization');
  if (!anon || !authHeader) return json({ error: 'Sign in on the dashboard first.' }, 401);
  const asUser = createClient(url, anon, { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } });
  const { data: staff } = await asUser.rpc('is_staff');
  if (!staff) return json({ error: 'Only staff can add event posters.' }, 403);

  const body = (await req.json().catch(() => ({}))) as { import?: string };
  const id = String(body.import ?? '');
  const poster = store.images.find((p) => p.id === id);
  if (!/^[0-9]{5,40}$/.test(id) || !poster) return json({ error: 'That post isn’t in the latest Instagram posters. Refresh and try again.' }, 404);

  const res = await fetch(poster.imageUrl);
  if (!res.ok) return json({ error: 'Couldn’t download the poster from Instagram. Try again.' }, 502);
  const type = res.headers.get('content-type')?.split(';')[0] ?? 'image/jpeg';
  const ext = type === 'image/png' ? 'png' : type === 'image/webp' ? 'webp' : 'jpg';
  const path = `events/instagram-${id}.${ext}`;
  const { error } = await admin.storage.from('media').upload(path, await res.arrayBuffer(), { contentType: type, upsert: true });
  if (error) return json({ error: 'Couldn’t save the poster. Try again.' }, 500);
  const publicUrl = admin.storage.from('media').getPublicUrl(path).data.publicUrl as string;
  return json({ url: publicUrl, caption: poster.caption, postedAt: poster.postedAt });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (req.method !== 'GET' && req.method !== 'POST') return json({ error: 'Use GET or POST' }, 405);
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
    const store = await inFlight;
    if (req.method === 'POST') return await importPoster(req, admin, url, store);
    if (params.get('posters') === '1') return json({ connected: true, posters: store.images }, 200, 0);
    return json({ connected: true, ...page(buildClips(store.media, (settings ?? []) as ClipSetting[], all)) }, 200, all ? 0 : 300);
  } catch (err) {
    console.error('instagram-feed', err);
    // An old list is better than none while Instagram is unreachable.
    if (memory) return json({ connected: true, ...page(buildClips(memory.media, (settings ?? []) as ClipSetting[], all)), stale: true }, 200, 60);
    return json({ connected: true, clips: [], error: 'Couldn’t reach Instagram. Check the access key on the dashboard.' }, 502);
  }
});
