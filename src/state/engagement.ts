import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useSyncExternalStore } from 'react';

import { tap } from '@/lib/haptics';
import { supabase } from '@/lib/supabase';

/**
 * Likes and view counts for sermons and devotionals.
 *
 * Anyone can like: a signed-in member is counted by their account, everyone else
 * by a random id made once on this phone (it says nothing about the person).
 * Counts are shared by every screen, so liking on one screen updates the others.
 */
export type StatKind = 'video' | 'devotional';
export type Stat = { likes: number; views: number; liked: boolean };

const DEVICE_KEY = 'btg.device.v1';
/** Counts are fetched again after this long. */
const FRESH_MS = 60 * 1000;

const stats = new Map<string, Stat>();
const fetchedAt = new Map<string, number>();
const viewed = new Set<string>();
const listeners = new Set<() => void>();
let version = 0;

const keyOf = (kind: StatKind, id: string) => `${kind}:${id}`;

function emit() {
  version++;
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

let deviceIdPromise: Promise<string> | null = null;

function newId() {
  const hex = '0123456789abcdef';
  let out = '';
  for (let i = 0; i < 32; i++) out += hex[Math.floor(Math.random() * 16)];
  return `${out.slice(0, 8)}-${out.slice(8, 12)}-${out.slice(12, 16)}-${out.slice(16, 20)}-${out.slice(20)}`;
}

/** This phone's anonymous id, made the first time it's needed. */
export function deviceId(): Promise<string> {
  deviceIdPromise ??= AsyncStorage.getItem(DEVICE_KEY)
    .then(async (saved) => {
      if (saved && /^[A-Za-z0-9-]{8,64}$/.test(saved)) return saved;
      const id = newId();
      await AsyncStorage.setItem(DEVICE_KEY, id).catch(() => {});
      return id;
    })
    .catch(() => newId());
  return deviceIdPromise;
}

// Signing in or out changes who "you" are, so forget whose likes were shown.
supabase?.auth.onAuthStateChange((event) => {
  if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
    fetchedAt.clear();
    emit();
  }
});

/** Fetches counts for the items not fetched in the last minute. */
export async function loadStats(kind: StatKind, ids: string[]) {
  if (!supabase) return;
  const now = Date.now();
  const due = [...new Set(ids)].filter((id) => now - (fetchedAt.get(keyOf(kind, id)) ?? 0) > FRESH_MS).slice(0, 200);
  if (!due.length) return;
  due.forEach((id) => fetchedAt.set(keyOf(kind, id), now));
  const { data, error } = await supabase.rpc('item_stats', { stat_kind: kind, items: due, device_id: await deviceId() });
  if (error || !Array.isArray(data)) {
    due.forEach((id) => fetchedAt.delete(keyOf(kind, id)));
    return;
  }
  for (const row of data as { item_id: string; likes: number; views: number; liked: boolean }[]) {
    stats.set(keyOf(kind, row.item_id), { likes: Number(row.likes) || 0, views: Number(row.views) || 0, liked: !!row.liked });
  }
  emit();
}

/** Likes or unlikes straight away, then confirms with the server (and undoes it if that fails). */
export async function toggleLike(kind: StatKind, id: string) {
  const key = keyOf(kind, id);
  const before = stats.get(key) ?? { likes: 0, views: 0, liked: false };
  const optimistic = { ...before, liked: !before.liked, likes: Math.max(0, before.likes + (before.liked ? -1 : 1)) };
  stats.set(key, optimistic);
  tap();
  emit();
  if (!supabase) return; // Sample mode: kept on screen only.
  const { data, error } = await supabase.rpc('toggle_like', { like_kind: kind, like_item: id, device_id: await deviceId() });
  if (error || !data) {
    stats.set(key, before);
  } else {
    const r = data as { liked: boolean; likes: number };
    stats.set(key, { ...optimistic, liked: !!r.liked, likes: Number(r.likes) || 0 });
  }
  emit();
}

/** Counts one view of an item (the server keeps one per person per day). */
export async function recordView(kind: StatKind, id: string) {
  const key = keyOf(kind, id);
  if (!supabase || viewed.has(key)) return;
  viewed.add(key);
  const { error } = await supabase.rpc('record_view', { view_kind: kind, view_item: id, device_id: await deviceId() });
  if (error) viewed.delete(key);
}

/** Counts for one item, loading them if needed. */
export function useStat(kind: StatKind, id: string | undefined): Stat | undefined {
  useSyncExternalStore(subscribe, () => version);
  useEffect(() => {
    if (id) loadStats(kind, [id]);
  }, [kind, id]);
  return id ? stats.get(keyOf(kind, id)) : undefined;
}

/** Counts for a list of items, e.g. a screenful of sermons. Read one with the returned function. */
export function useStats(kind: StatKind, ids: string[]) {
  useSyncExternalStore(subscribe, () => version);
  const joined = ids.join(',');
  useEffect(() => {
    if (joined) loadStats(kind, joined.split(','));
  }, [kind, joined]);
  return (id: string) => stats.get(keyOf(kind, id));
}
