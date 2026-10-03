import { useSyncExternalStore } from 'react';

/**
 * UI language for the whole app. Russian by default (most of the audience);
 * Kazakh and English available from the switcher on the landing/login
 * pages and in Settings. One shared, remembered choice (localStorage) so it
 * carries from landing → sign-up → the app. Strings live in src/i18n/.
 */

export type Lang = 'ru' | 'en' | 'kz';

export const LANG_LABEL: Record<Lang, string> = { ru: 'Русский', en: 'English', kz: 'Қазақша' };
export const LANG_SHORT: Record<Lang, string> = { ru: 'RU', en: 'EN', kz: 'KZ' };
export const LANGS: Lang[] = ['ru', 'kz', 'en'];

const KEY = 'teamup:lang';
const listeners = new Set<() => void>();

function read(): Lang {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'ru' || v === 'en' || v === 'kz') return v;
  } catch {
    // storage blocked — fall through to default
  }
  return 'ru';
}

let current: Lang = read();
if (typeof document !== 'undefined') document.documentElement.lang = current === 'kz' ? 'kk' : current;

// Set by src/i18n: fetches a language's strings before we switch to it, so
// the UI never renders a half-loaded language.
let loadLang: ((lang: Lang) => Promise<void>) | null = null;
export function registerLangLoader(loader: (lang: Lang) => Promise<void>) {
  loadLang = loader;
}

function applyLang(lang: Lang) {
  current = lang;
  try {
    localStorage.setItem(KEY, lang);
  } catch {
    // still switches for this visit
  }
  document.documentElement.lang = lang === 'kz' ? 'kk' : lang;
  listeners.forEach((l) => l());
}

export function setLang(lang: Lang) {
  if (!loadLang) return applyLang(lang);
  // Offline with the chunk not cached yet: stay on the current language.
  loadLang(lang).then(
    () => applyLang(lang),
    () => {},
  );
}

/** Current language outside React (toasts from hooks, date helpers). */
export function getLang(): Lang {
  return current;
}

export function useLang(): Lang {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => current,
  );
}
