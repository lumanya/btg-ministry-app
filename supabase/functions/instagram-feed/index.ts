// Supabase Edge Function: the ministry's Instagram videos as clips for the app.
//
//   GET /functions/v1/instagram-feed         -> { connected, clips: Clip[] }   (members)
//   GET /functions/v1/instagram-feed?all=1   -> every video, with hidden/playable flags (dashboard)
//
// The Instagram access key is kept in public.instagram_auth (staff paste it on the
// dashboard's Clips page). It lasts 60 days; this function renews it when it has less
// than 30 days left, so it never runs out while the app is in use.
//
// Video links from Instagram stop working after a while, so the list is cached for
// 15 minutes at most and the app fetches it fresh when the Clips screen opens.

import { createClient } from 'npm:@supabase/supabase-js@2';

import { buildClips, type ClipSetting, type InstagramMedia, shouldRefresh } from './clips.ts';

const GRAPH = 'https://graph.instagram.com';
const CACHE_MS = 15 * 60 * 1000;
const FIELDS = 'id,media_type,media_url,thumbnail_url,permalink,caption,timestamp';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
};

let cache: { at: number; media: InstagramMedia[] } | null = null;

function json(body: unknown, status = 200, maxAge = 0) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': maxAge ? `public, max-age=${maxAge}` : 'no-store' },
  });
}

type Auth = { access_token: string; expires_at: string | null; refreshed_at: string | null; updated_at: string };

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

async function loadMedia(token: string): Promise<InstagramMedia[]> {
  const out: InstagramMedia[] = [];
  let url: string | null = `${GRAPH}/me/media?fields=${FIELDS}&limit=50&access_token=${encodeURIComponent(token)}`;
  // Two pages (about 100 posts) is plenty for a feed of recent clips.
  for (let page = 0; url && page < 2; page++) {
    const res: Response = await fetch(url);
    const body = (await res.json()) as { data?: InstagramMedia[]; paging?: { next?: string }; error?: { message?: string } };
    if (!res.ok) throw new Error(body.error?.message ?? `Instagram returned ${res.status}`);
    out.push(...(body.data ?? []));
    url = body.paging?.next ?? null;
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (req.method !== 'GET') return json({ error: 'Use GET' }, 405);
  const all = new URL(req.url).searchParams.get('all') === '1';

  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) return json({ error: 'Server is not configured' }, 500);
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  const [{ data: auth }, { data: settings }] = await Promise.all([
    admin.from('instagram_auth').select('access_token,expires_at,refreshed_at,updated_at').eq('id', 1).maybeSingle(),
    admin.from('clips').select('instagram_id,hidden,title,sermon_youtube_id,sermon_start_seconds'),
  ]);
  if (!auth) return json({ connected: false, clips: [] }, 200, 60);

  try {
    if (!cache || Date.now() - cache.at > CACHE_MS) {
      const token = await freshToken(admin, auth as Auth);
      cache = { at: Date.now(), media: await loadMedia(token) };
    }
    const clips = buildClips(cache.media, (settings ?? []) as ClipSetting[], all);
    return json({ connected: true, clips }, 200, all ? 0 : 300);
  } catch (err) {
    console.error('instagram-feed', err);
    // An old list is better than none while Instagram is unreachable.
    if (cache) return json({ connected: true, clips: buildClips(cache.media, (settings ?? []) as ClipSetting[], all), stale: true }, 200, 60);
    return json({ connected: true, clips: [], error: 'Couldn’t reach Instagram. Check the access key on the dashboard.' }, 502);
  }
});
