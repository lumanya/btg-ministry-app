/**
 * Merging the reading streak and saved items on the phone with the copy in a
 * member's account. Kept free of React Native so it can be tested with plain Node.
 */
import type { FeedVideo } from './video';

export type Stored = {
  /** devotional id -> the day (YYYY-MM-DD) it was marked as read */
  read: Record<string, string>;
  savedDevotionals: string[];
  /** Saved sermons keep a copy of the video so they still list when the feed changes. */
  savedVideos: FeedVideo[];
  /** The account this data belongs to; null for a guest. */
  owner: string | null;
};

export const emptyLibrary: Stored = { read: {}, savedDevotionals: [], savedVideos: [], owner: null };

export type ReadRow = { devotional_slug: string; read_on: string };
export type SavedRow = { kind: 'video' | 'devotional'; item_id: string; data: unknown };

/**
 * Combines the phone's library with the account's when a member signs in.
 *
 * - A guest's reading and saves carry over into the account.
 * - Data left on the phone by a *different* account is dropped, not mixed in.
 *
 * Returns the merged library and the rows the server doesn't have yet.
 */
export function mergeOnSignIn(local: Stored, reads: ReadRow[], saved: SavedRow[], uid: string) {
  const base = local.owner && local.owner !== uid ? emptyLibrary : local;

  const read: Record<string, string> = {};
  for (const r of reads) read[r.devotional_slug] = r.read_on;
  const uploadReads: ReadRow[] = [];
  for (const [slug, day] of Object.entries(base.read)) {
    if (!(slug in read)) {
      read[slug] = day;
      uploadReads.push({ devotional_slug: slug, read_on: day });
    }
  }

  const serverDevotionals = saved.filter((s) => s.kind === 'devotional').map((s) => s.item_id);
  const serverVideos = saved.filter((s) => s.kind === 'video' && isVideo(s.data)).map((s) => s.data as FeedVideo);
  const uploadSaved: SavedRow[] = [];

  const savedDevotionals = [...serverDevotionals];
  for (const id of base.savedDevotionals) {
    if (!savedDevotionals.includes(id)) {
      savedDevotionals.unshift(id);
      uploadSaved.push({ kind: 'devotional', item_id: id, data: null });
    }
  }

  const savedVideos = [...serverVideos];
  for (const v of base.savedVideos) {
    if (!savedVideos.some((x) => x.id === v.id)) {
      savedVideos.unshift(v);
      uploadSaved.push({ kind: 'video', item_id: v.id, data: compactVideo(v) });
    }
  }

  return { next: { read, savedDevotionals, savedVideos, owner: uid } as Stored, uploadReads, uploadSaved };
}

/** Only what the Saved list needs, to keep rows small. */
export function compactVideo(v: FeedVideo): FeedVideo {
  return {
    id: v.id,
    youtubeId: v.youtubeId,
    title: v.title,
    description: v.description.slice(0, 300),
    date: v.date,
    thumbnail: v.thumbnail,
    duration: v.duration,
    kind: v.kind,
    scheduledStart: v.scheduledStart,
  };
}

function isVideo(x: unknown): x is FeedVideo {
  return !!x && typeof x === 'object' && typeof (x as FeedVideo).id === 'string' && typeof (x as FeedVideo).title === 'string';
}
