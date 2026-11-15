import type { Clip } from '../../supabase/functions/instagram-feed/clips';

export type { Clip };

/** Posted in the last three days. */
export function isNewClip(c: Clip, now = Date.now()) {
  return !!c.postedAt && now - Date.parse(c.postedAt) < 3 * 24 * 3600 * 1000;
}

/** 760 -> "12:40", 3725 -> "1:02:05" */
export function clock(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}
