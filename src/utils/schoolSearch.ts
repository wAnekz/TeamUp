import type { SchoolItem } from '@/types';

/** Must match normalizeSchool() in functions/src/schools.ts. */
export function normalizeSchool(name: string | null | undefined) {
  return (name ?? '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[«»"'.,№#()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Deterministic doc id from name + city, so two students adding the same
 * new school end up on one document instead of two (the second create hits
 * an existing doc and just selects it). Must match functions/src/schools.ts.
 */
export function schoolDocId(name: string, city: string | null | undefined) {
  const part = (s: string) => normalizeSchool(s).replace(/[\s/]+/g, '-').slice(0, 90);
  return `${part(name)}__${part(city ?? '') || 'kz'}`;
}

// Words that don't tell schools apart — "школа 165" should match on 165.
const STOP_WORDS = new Set([
  'школа', 'школы', 'сш', 'сош', 'кгу', 'гу', 'общеобразовательная', 'средняя', 'мектеп', 'мектебі', 'жалпы',
  'білім', 'беретін', 'орта', 'school', 'г', 'город', 'city', 'им', 'имени', 'the', 'of', 'no',
]);

// Common ways people write the same thing, folded to one token.
const SYNONYMS: Record<string, string> = {
  нзм: 'nis', ниш: 'nis', назарбаев: 'nis', nazarbayev: 'nis', интеллектуальная: 'nis', зияткерлік: 'nis',
  рфмш: 'rfmsh', rfmsh: 'rfmsh', рфмш2: 'rfmsh',
  фмн: 'fmn', физмат: 'fmn', хбн: 'hbn',
  алматы: 'almaty', алма: 'almaty', астана: 'astana', нурсултан: 'astana',
  гимназия: 'gymnasium', гимн: 'gymnasium', лицей: 'lyceum', лицея: 'lyceum', lyceum: 'lyceum', gymnasium: 'gymnasium',
};

function tokens(text: string) {
  return normalizeSchool(text)
    .split(/[\s\-–—/]+/)
    .map((t) => SYNONYMS[t] ?? t)
    .filter((t) => t && !STOP_WORDS.has(t));
}

// Levenshtein, early-exit once it's clearly more than `max` apart.
function editDistance(a: string, b: string, max: number) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      rowMin = Math.min(rowMin, cur[j]);
    }
    if (rowMin > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
}

function tokenScore(q: string, candidates: string[]) {
  let best = 0;
  for (const c of candidates) {
    if (c === q) return 1;
    // Numbers must match exactly — "School 16" is not "School 165".
    if (/^\d+$/.test(q) || /^\d+$/.test(c)) continue;
    if (c.startsWith(q) && q.length >= 2) best = Math.max(best, 0.9);
    else if (q.length >= 4 && c.includes(q)) best = Math.max(best, 0.7);
    else if (q.length >= 4) {
      const d = editDistance(q, c.slice(0, q.length + 1), 2);
      if (d <= (q.length >= 7 ? 2 : 1)) best = Math.max(best, 0.75);
    }
  }
  return best;
}

/**
 * Ranks schools for a search box. Every meaningful query word has to hit
 * something (name, alias or city) — typos within 1-2 letters, prefixes and
 * synonyms count. Same-city schools float up.
 */
export function searchSchools(schools: SchoolItem[], queryText: string, city?: string | null, limit = 8) {
  const q = tokens(queryText);
  if (q.length === 0) return [];
  const cityTokens = tokens(city ?? '');

  return schools
    .map((school) => {
      const hay = [...tokens(school.name), ...(school.aliases ?? []).flatMap(tokens), ...tokens(school.city ?? '')];
      let total = 0;
      for (const qt of q) {
        const s = tokenScore(qt, hay);
        if (s === 0) return null;
        total += s;
      }
      let score = total / q.length;
      if (cityTokens.length && cityTokens.some((c) => tokens(school.city ?? '').includes(c))) score += 0.15;
      if (school.verified) score += 0.05;
      return { school, score };
    })
    .filter((r): r is { school: SchoolItem; score: number } => r !== null)
    .sort((a, b) => b.score - a.score || a.school.name.localeCompare(b.school.name))
    .slice(0, limit)
    .map((r) => r.school);
}
