/**
 * English and Kiswahili.
 *
 *   t('Good morning')                     -> "Habari za asubuhi" in Kiswahili
 *   t('{n}-day reading streak', { n: 3 }) -> "Mfululizo wa kusoma wa siku 3"
 *
 * The English text is the key, so screens stay readable and a missing translation
 * simply shows English. The current language lives here; LanguageProvider
 * (src/state/language.tsx) sets it and re-renders the app when it changes.
 */
import sw from './sw';

export type Lang = 'en' | 'sw';

let current: Lang = 'en';

export function setLang(lang: Lang) {
  current = lang;
}

export function getLang(): Lang {
  return current;
}

export function t(text: string, vars?: Record<string, string | number>): string {
  let out = current === 'sw' ? (sw[text] ?? text) : text;
  if (vars) for (const [k, v] of Object.entries(vars)) out = out.split(`{${k}}`).join(String(v));
  return out;
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** "Sunday" / "Jumapili"; short gives "Sun" / "Jpili". */
export function dayName(index: number, short = false) {
  const name = t(DAYS[index]);
  if (!short) return name;
  return current === 'sw' ? ['Jpili', 'Jtatu', 'Jnne', 'Jtano', 'Alh', 'Ijum', 'Jmosi'][index] : name.slice(0, 3);
}

/** "November" / "Novemba"; short gives "Nov". */
export function monthName(index: number, short = false) {
  const name = t(MONTHS[index]);
  return short ? name.slice(0, 3) : name;
}

/** One letter per weekday, Monday first, for the streak row. */
export function weekLetters() {
  return current === 'sw' ? ['J', 'J', 'J', 'A', 'I', 'J', 'J'] : ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
}

/** "1 sermon" / "3 sermons" in either language. */
export function count(n: number, one: string, many: string) {
  return n === 1 ? t(one) : t(many, { n });
}

/** 1234 -> "1.2K" (same in both languages). */
export function compact(n: number) {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0).replace(/\.0$/, '')}K`;
  return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
}

/** Day and month names for the event date helpers in src/lib/content.ts. */
export function dateNames() {
  return {
    day: (i: number) => dayName(i),
    month: (i: number) => monthName(i),
    starts: (time: string) => t('Starts {time}', { time }),
  };
}
