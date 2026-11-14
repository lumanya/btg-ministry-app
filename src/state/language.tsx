import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import { createContext, Fragment, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { getLang, Lang, setLang } from '@/i18n';

/**
 * The app's language: the phone's (when it is Kiswahili or English), or one the
 * member picks in Settings. Changing it re-renders the whole app in that language.
 */
export type LanguagePreference = 'system' | Lang;

const STORAGE_KEY = 'btg.language.v1';

function phoneLanguage(): Lang {
  try {
    return getLocales().some((l) => l.languageCode === 'sw') ? 'sw' : 'en';
  } catch {
    return 'en';
  }
}

// Decide before the first screen renders, so the app doesn't flash English.
setLang(phoneLanguage());

type LanguageState = {
  lang: Lang;
  preference: LanguagePreference;
  setPreference: (p: LanguagePreference) => void;
};

const LanguageContext = createContext<LanguageState | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [preference, setPref] = useState<LanguagePreference>('system');
  const [lang, setLangState] = useState<Lang>(getLang());

  const apply = useCallback((p: LanguagePreference) => {
    const next = p === 'system' ? phoneLanguage() : p;
    setLang(next);
    setPref(p);
    setLangState(next);
  }, []);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => {
        if (v === 'en' || v === 'sw' || v === 'system') apply(v);
      })
      .catch(() => {});
  }, [apply]);

  const setPreference = useCallback(
    (p: LanguagePreference) => {
      AsyncStorage.setItem(STORAGE_KEY, p).catch(() => {});
      apply(p);
    },
    [apply],
  );

  const value = useMemo(() => ({ lang, preference, setPreference }), [lang, preference, setPreference]);

  // Keyed by language: everything below renders again in the new language.
  return (
    <LanguageContext.Provider value={value}>
      <Fragment key={lang}>{children}</Fragment>
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used inside LanguageProvider');
  return ctx;
}
