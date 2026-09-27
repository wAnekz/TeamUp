import { enUS, kk, ru as ruLocale, type Locale } from 'date-fns/locale';
import { getLang, useLang, type Lang } from '@/lib/lang';
import type { Interest, Skill } from '@/types';
import { en, type Dict } from './en';
import { ru } from './ru';
import { kz } from './kz';

export type { Dict };

const DICTS: Record<Lang, Dict> = { en, ru, kz };
const DATE_LOCALES: Record<Lang, Locale> = { en: enUS, ru: ruLocale, kz: kk };

/** Strings for the current language; re-renders on language switch. */
export function useT(): Dict {
  return DICTS[useLang()];
}

/** Same, outside React — hooks' toasts, date helpers, validation. */
export function getT(): Dict {
  return DICTS[getLang()];
}

export function dateLocale(): Locale {
  return DATE_LOCALES[getLang()];
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
