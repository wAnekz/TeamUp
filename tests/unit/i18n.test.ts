import { describe, expect, it } from 'vitest';
import type { ZodTypeAny } from 'zod';
import { en } from '@/i18n/en';
import { ru } from '@/i18n/ru';
import { kz } from '@/i18n/kz';
import {
  applicationSchema,
  authSchema,
  lookingForTeamSchema,
  profileSchema,
  projectSchema,
  roleSchema,
} from '@/utils/validation';
import { INTERESTS, SKILLS } from '@/types';
import { INTEREST_CATEGORIES, SKILL_CATEGORIES } from '@/constants/options';

type Tree = Record<string, unknown>;

// Walks two dictionaries in parallel: same keys, same kinds of values, no
// empty strings, and functions return non-empty strings for sample args.
function compare(a: Tree, b: Tree, path: string[] = []) {
  for (const key of Object.keys(a)) {
    const p = [...path, key].join('.');
    const va = a[key];
    const vb = b[key];
    // Label maps (skills/interests/categories) are partial on purpose.
    if (['skills', 'interests', 'skillCategories', 'interestCategories'].includes(path[0] ?? key)) continue;
    expect(vb, `missing ${p}`).not.toBeUndefined();
    if (typeof va === 'string') {
      expect(typeof vb, p).toBe('string');
      expect((vb as string).trim().length, `empty ${p}`).toBeGreaterThan(0);
    } else if (typeof va === 'function') {
      expect(typeof vb, p).toBe('function');
      const out = (vb as (...args: unknown[]) => unknown)(3, 'X', 2);
      expect(typeof out === 'string' && out.length > 0, `bad output ${p}`).toBe(true);
    } else if (Array.isArray(va)) {
      expect(Array.isArray(vb), p).toBe(true);
      expect((vb as unknown[]).length, p).toBe(va.length);
    } else if (va && typeof va === 'object') {
      compare(va as Tree, vb as Tree, [...path, key]);
    }
  }
}

describe('dictionaries', () => {
  it('ru has every key en has', () => compare(en as unknown as Tree, ru as unknown as Tree));
  it('kz has every key en has', () => compare(en as unknown as Tree, kz as unknown as Tree));

  it('translate every interest and every category into ru and kz', () => {
    for (const i of INTERESTS) {
      if (['DevOps', 'AR/VR', 'E-commerce', 'Data Science'].includes(i)) continue; // same word in all three
      expect(ru.interests[i], `ru interest ${i}`).toBeTruthy();
    }
    for (const c of Object.keys(INTEREST_CATEGORIES)) {
      expect(ru.interestCategories[c]).toBeTruthy();
      expect(kz.interestCategories[c]).toBeTruthy();
    }
    for (const c of Object.keys(SKILL_CATEGORIES)) {
      expect(ru.skillCategories[c]).toBeTruthy();
      expect(kz.skillCategories[c]).toBeTruthy();
    }
  });

  it('only map real stored values (a typo would silently never show)', () => {
    for (const d of [ru, kz]) {
      for (const k of Object.keys(d.skills)) expect(SKILLS).toContain(k);
      for (const k of Object.keys(d.interests)) expect(INTERESTS).toContain(k);
    }
  });
});

describe('validation messages', () => {
  // Every custom message in the zod schemas is a key the form fields
  // translate — a message that isn't a key would show up raw.
  function collectMessages(schema: ZodTypeAny, out = new Set<string>()): Set<string> {
    const def = schema._def as Record<string, unknown>;
    for (const check of (def.checks as { message?: string }[] | undefined) ?? []) if (check.message) out.add(check.message);
    if (def.effect && typeof def.schema === 'object') collectMessages(def.schema as ZodTypeAny, out);
    if (typeof def.shape === 'function') for (const s of Object.values((def.shape as () => Tree)())) collectMessages(s as ZodTypeAny, out);
    for (const k of ['innerType', 'type', 'schema', 'left', 'right']) if (def[k] && typeof def[k] === 'object' && '_def' in (def[k] as object)) collectMessages(def[k] as ZodTypeAny, out);
    for (const o of (def.options as ZodTypeAny[] | undefined) ?? []) collectMessages(o, out);
    return out;
  }

  it('all schema messages exist in every dictionary', () => {
    const messages = new Set<string>();
    for (const s of [profileSchema, projectSchema, roleSchema, applicationSchema, lookingForTeamSchema, authSchema]) {
      collectMessages(s as unknown as ZodTypeAny, messages);
    }
    // .refine() messages aren't in _def.checks — add the known ones.
    messages.add('oneContact');
    messages.add('deadlineRequired');
    expect(messages.size).toBeGreaterThan(10);
    for (const m of messages) {
      for (const d of [en, ru, kz]) expect((d.validation as Record<string, string>)[m], `validation.${m}`).toBeTruthy();
    }
  });
});
