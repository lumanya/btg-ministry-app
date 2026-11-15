import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * The dashboard signs in with the same accounts as the app. What each person can
 * see and change is decided by the database's rules (supabase/migrations), not here.
 */
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_KEY as string | undefined;

export const supabase: SupabaseClient | null = url && key ? createClient(url, key) : null;

/** The YouTube feed function (playlists, videos), on the same Supabase project. */
export const FEED_URL = `${url ?? ''}/functions/v1/youtube-feed`;

/** The Instagram clips function; `?all=1` lists every video, hidden ones too. */
export const CLIPS_URL = `${url ?? ''}/functions/v1/instagram-feed`;

/** Use inside pages, which only render once the client exists. */
export function db(): SupabaseClient {
  if (!supabase) throw new Error('Supabase is not configured');
  return supabase;
}

export type StaffRole = 'editor' | 'admin';
