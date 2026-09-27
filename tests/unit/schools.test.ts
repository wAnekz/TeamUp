import { describe, expect, it } from 'vitest';
import { normalizeSchool, schoolDocId, searchSchools } from '@/utils/schoolSearch';
import * as server from '../../functions/src/schools';
import type { SchoolItem } from '@/types';

const S: SchoolItem[] = [
  { id: '1', name: 'НИШ ФМН г. Алматы', city: 'Алматы', key: '', aliases: ['NIS PhM Almaty'], verified: true },
  { id: '2', name: 'НИШ ХБН г. Алматы', city: 'Алматы', key: '', aliases: ['NIS ChB Almaty'], verified: true },
  { id: '3', name: 'РФМШ Алматы', city: 'Алматы', key: '', aliases: ['RFMSh'], verified: true },
  { id: '4', name: 'Haileybury Almaty', city: 'Алматы', key: '' },
  { id: '5', name: 'Школа-лицей №165', city: 'Алматы', key: '' },
  { id: '6', name: 'Школа №16', city: 'Алматы', key: '' },
  { id: '7', name: 'Школа-гимназия №165', city: 'Шымкент', key: '' },
  { id: '8', name: 'НИШ ФМН г. Астана', city: 'Астана', key: '' },
];

const names = (q: string, city = 'Алматы') => searchSchools(S, q, city).map((s) => s.id);

describe('searchSchools', () => {
  it('finds a school by its number in any common phrasing', () => {
    for (const q of ['165', 'сш 165', 'школа №165', 'лицей 165']) expect(names(q)[0]).toBe('5');
  });

  it('never confuses 16 with 165', () => {
    expect(names('16')).toEqual(['6']);
    expect(names('165')).not.toContain('6');
  });

  it('ranks the student’s own city first', () => {
    expect(names('165', 'Шымкент')[0]).toBe('7');
  });

  it('forgives typos in longer words', () => {
    expect(names('heileybury')).toEqual(['4']);
    expect(names('haylebury')).toEqual(['4']);
  });

  it('understands abbreviations and synonyms', () => {
    expect(names('ниш хбн')).toEqual(['2']);
    expect(names('nis')).toEqual(expect.arrayContaining(['1', '2', '8']));
    expect(names('физмат')).toEqual(expect.arrayContaining(['1', '8']));
    expect(names('рфмш')).toEqual(['3']);
  });

  it('returns nothing for nonsense or an empty query', () => {
    expect(names('xyz')).toEqual([]);
    expect(names('  ')).toEqual([]);
  });
});

describe('school ids', () => {
  it('are the same for spelling variants, so simultaneous adds dedupe', () => {
    expect(schoolDocId('Школа-лицей №165', 'Алматы')).toBe(schoolDocId('школа-лицей  165', 'алматы'));
  });

  it('differ by city', () => {
    expect(schoolDocId('Школа №1', 'Алматы')).not.toBe(schoolDocId('Школа №1', 'Астана'));
  });

  it('match between client and server (the server links old free-text schools with the same ids)', () => {
    for (const [name, city] of [
      ['Школа-лицей №165', 'Алматы'],
      ['NIS «Almaty»', 'Almaty'],
      ['Ёлочная школа #3', null],
    ] as const) {
      expect(server.schoolDocId(name, city)).toBe(schoolDocId(name, city));
      expect(server.normalizeSchool(name)).toBe(normalizeSchool(name));
    }
  });
});
