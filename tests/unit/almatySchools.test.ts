import { describe, expect, it } from 'vitest';
import almaty from '../../functions/src/data/schools-almaty.json';
import { schoolDocId, normalizeSchool, searchSchools } from '@/utils/schoolSearch';
import type { SchoolItem } from '@/types';

const S: SchoolItem[] = almaty.map((s) => ({
  id: schoolDocId(s.name, 'Алматы'),
  name: s.name,
  city: 'Алматы',
  key: normalizeSchool(s.name),
  aliases: s.aliases,
  verified: true,
}));
const top = (q: string) => searchSchools(S, q, 'Алматы', 3).map((s) => s.name);
const number = (name: string) => Number(name.match(/№(\d+)/)?.[1]);

describe('Almaty school list', () => {
  it('has every numbered state school 1-211 and unique ids', () => {
    const nums = new Set(almaty.map((s) => number(s.name)).filter(Boolean));
    for (let n = 1; n <= 211; n++) expect(nums.has(n), `№${n}`).toBe(true);
    expect(new Set(S.map((s) => s.id)).size).toBe(S.length);
  });

  it('finds schools the way students type them', () => {
    expect(number(top('школа 65')[0])).toBe(65);
    expect(number(top('гимназия 159')[0])).toBe(159);
    expect(number(top('65 мектеп')[0])).toBe(65);
    expect(number(top('лицей 165')[0])).toBe(165);
    expect(number(top('школа 27')[0])).toBe(27);
    expect(top('джоо')).toContain('JOO High School Almaty');
    expect(top('физтех')).toContain('PhysTech School Almaty');
  });
});
