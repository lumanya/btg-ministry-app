import AsyncStorage from '@react-native-async-storage/async-storage';
import { Directory, File, Paths } from 'expo-file-system';
import { useEffect, useSyncExternalStore } from 'react';
import { Platform } from 'react-native';

import type { Episode } from '@/lib/podcast';

/**
 * Podcast episodes saved on the phone to listen without internet.
 *
 * The audio files live in the app's own documents folder (removed with the app),
 * and the list of what's downloaded is kept with each episode's details so the
 * Downloads list works offline too.
 */
export type Download = { episode: Episode; uri: string; bytes: number; savedAt: string };

const STORAGE_KEY = 'btg.downloads.v1';
export const downloadsSupported = Platform.OS === 'ios' || Platform.OS === 'android';

let saved: Record<string, Download> = {};
/** 0–1 for episodes being downloaded right now. */
const progress = new Map<string, number>();
const controllers = new Map<string, AbortController>();
const listeners = new Set<() => void>();
let version = 0;
let loaded: Promise<void> | null = null;

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

function persist() {
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(saved)).catch(() => {});
}

function folder() {
  const dir = new Directory(Paths.document, 'podcast');
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  return dir;
}

/** A file name made only of safe characters, keeping the audio's extension. */
function fileName(ep: Episode) {
  const ext = (ep.audioUrl?.split('?')[0].match(/\.(mp3|m4a|aac|ogg|wav)$/i)?.[1] ?? 'mp3').toLowerCase();
  const base = ep.id.replace(/[^A-Za-z0-9_-]/g, '_').slice(-80) || 'episode';
  return `${base}.${ext}`;
}

/** Reads the saved list once, dropping entries whose file has gone. */
export function loadDownloads() {
  loaded ??= AsyncStorage.getItem(STORAGE_KEY)
    .then((raw) => {
      const list = raw ? (JSON.parse(raw) as Record<string, Download>) : {};
      saved = Object.fromEntries(
        Object.entries(list).filter(([, d]) => {
          try {
            return downloadsSupported && new File(d.uri).exists;
          } catch {
            return false;
          }
        }),
      );
      emit();
    })
    .catch(() => {});
  return loaded;
}

/** The file to play instead of streaming, when the episode is downloaded. */
export function downloadedUri(id: string): string | null {
  return saved[id]?.uri ?? null;
}

export async function downloadEpisode(ep: Episode): Promise<void> {
  if (!downloadsSupported || !ep.audioUrl || saved[ep.id] || progress.has(ep.id)) return;
  const controller = new AbortController();
  controllers.set(ep.id, controller);
  progress.set(ep.id, 0);
  emit();
  const target = new File(folder(), fileName(ep));
  try {
    const file = await File.downloadFileAsync(ep.audioUrl, target, {
      idempotent: true,
      signal: controller.signal,
      onProgress: ({ bytesWritten, totalBytes }) => {
        if (totalBytes > 0) {
          progress.set(ep.id, Math.min(1, bytesWritten / totalBytes));
          emit();
        }
      },
    });
    saved = { ...saved, [ep.id]: { episode: ep, uri: file.uri, bytes: file.size ?? 0, savedAt: new Date().toISOString() } };
    persist();
  } catch (err) {
    try {
      if (target.exists) target.delete();
    } catch {
      // Nothing more to clean up.
    }
    if (!controller.signal.aborted) throw err;
  } finally {
    progress.delete(ep.id);
    controllers.delete(ep.id);
    emit();
  }
}

/** Stops a download in progress. */
export function cancelDownload(id: string) {
  controllers.get(id)?.abort();
}

export function removeDownload(id: string) {
  const d = saved[id];
  if (!d) return;
  try {
    const f = new File(d.uri);
    if (f.exists) f.delete();
  } catch {
    // Already gone.
  }
  const { [id]: _removed, ...rest } = saved;
  saved = rest;
  persist();
  emit();
}

/** Everything downloaded, newest first, with the space it takes. */
export function useDownloads() {
  useSyncExternalStore(subscribe, () => version);
  useEffect(() => {
    loadDownloads();
  }, []);
  const list = Object.values(saved).sort((a, b) => b.savedAt.localeCompare(a.savedAt));
  return {
    list,
    totalBytes: list.reduce((n, d) => n + d.bytes, 0),
    /** 'saved', a number 0–1 while downloading, or null. */
    stateOf: (id: string): 'saved' | number | null => (saved[id] ? 'saved' : progress.has(id) ? (progress.get(id) ?? 0) : null),
  };
}

/** "24 MB" */
export function formatBytes(n: number) {
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`;
  return `${(n / (1024 * 1024)).toFixed(n < 10 * 1024 * 1024 ? 1 : 0)} MB`;
}
