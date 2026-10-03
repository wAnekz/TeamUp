import type { Locale } from 'date-fns';
import { ru as ruLocale } from 'date-fns/locale/ru';
import { getLang, registerLangLoader, useLang, type Lang } from '@/lib/lang';
import type { Interest, Skill } from '@/types';
import type { Dict } from './en';
import { ru } from './ru';

export type { Dict };

// Russian (the default for most visitors) ships in the main bundle; Kazakh
// and English (~45 KB each plus a date-fns locale) load on demand, before
// the switch happens (see setLang) or before the first render (main.tsx).
const DICTS: Partial<Record<Lang, Dict>> = { ru };
const DATE_LOCALES: Partial<Record<Lang, Locale>> = { ru: ruLocale };

async function loadLang(lang: Lang): Promise<void> {
  if (DICTS[lang]) return;
  const [dict, locale] =
    lang === 'kz'
      ? await Promise.all([import('./kz').then((m) => m.kz), import('date-fns/locale/kk').then((m) => m.kk)])
      : await Promise.all([import('./en').then((m) => m.en), import('date-fns/locale/en-US').then((m) => m.enUS)]);
  DICTS[lang] = dict;
  DATE_LOCALES[lang] = locale;
}
registerLangLoader(loadLang);

/** Loads the remembered language; main.tsx awaits it before rendering. */
export function ensureLangLoaded(): Promise<void> {
  return loadLang(getLang());
}

/** Strings for the current language; re-renders on language switch. */
export function useT(): Dict {
  return DICTS[useLang()] ?? ru;
}

/** Same, outside React — hooks' toasts, date helpers, validation. */
export function getT(): Dict {
  return DICTS[getLang()] ?? ru;
}

export function dateLocale(): Locale {
  return DATE_LOCALES[getLang()] ?? ruLocale;
}

export function skillLabel(t: Dict, skill: Skill | string) {
  return t.skills[skill as Skill] ?? skill;
}

export function interestLabel(t: Dict, interest: Interest | string) {
  return t.interests[interest as Interest] ?? interest;
}

/**
 * Zod schemas (utils/validation.ts) use keys of `validation` as their
 * messages; form fields pass whatever error they get through this. Unknown
 * strings (Firebase errors, zod defaults) pass through untouched.
 */
export function translateError(t: Dict, message: string | undefined) {
  if (!message) return message;
  return (t.validation as Record<string, string>)[message] ?? message;
}
