import AsyncStorage from '@react-native-async-storage/async-storage';
import { NetworkStateType, useNetworkState } from 'expo-network';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';

/**
 * Low-data mode. "Auto" saves data on mobile data and uses full quality on Wi-Fi.
 * While it is active the app loads smaller pictures and checks for new content
 * less often; podcast episodes can be downloaded on Wi-Fi to listen offline.
 */
export type DataSaverPreference = 'auto' | 'on' | 'off';

const STORAGE_KEY = 'btg.datasaver.v1';

type DataSaverState = {
  preference: DataSaverPreference;
  setPreference: (p: DataSaverPreference) => void;
  /** True when the app should save data right now. */
  active: boolean;
  /** True on mobile data (not Wi-Fi), when the phone says so. */
  cellular: boolean;
  /** False when the phone reports no connection. */
  online: boolean;
};

const DataSaverContext = createContext<DataSaverState | null>(null);

export function DataSaverProvider({ children }: { children: ReactNode }) {
  const [preference, setPref] = useState<DataSaverPreference>('auto');
  const network = useNetworkState();
  const cellular = Platform.OS !== 'web' && network.type === NetworkStateType.CELLULAR;
  const online = network.isConnected !== false;

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => {
        if (v === 'auto' || v === 'on' || v === 'off') setPref(v);
      })
      .catch(() => {});
  }, []);

  const setPreference = useCallback((p: DataSaverPreference) => {
    setPref(p);
    AsyncStorage.setItem(STORAGE_KEY, p).catch(() => {});
  }, []);

  const value = useMemo(
    () => ({ preference, setPreference, active: preference === 'on' || (preference === 'auto' && cellular), cellular, online }),
    [preference, setPreference, cellular, online],
  );
  return <DataSaverContext.Provider value={value}>{children}</DataSaverContext.Provider>;
}

export function useDataSaver() {
  const ctx = useContext(DataSaverContext);
  if (!ctx) throw new Error('useDataSaver must be used inside DataSaverProvider');
  return ctx;
}

/** YouTube thumbnails come in sizes; data saver uses the 320×180 one (about 10 KB instead of 100+ KB). */
export function smallThumbnail(url: string | null, saving: boolean): string | null {
  if (!url || !saving) return url;
  return url.replace(/\/(maxresdefault|sddefault|hqdefault|hq720)(\.jpg|\.webp)/, '/mqdefault$2');
}
