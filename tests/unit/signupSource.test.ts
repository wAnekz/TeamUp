import { describe, expect, it } from 'vitest';
import { normalizeSource } from '@/lib/signupSource';

describe('normalizeSource', () => {
  it('keeps short lowercase tags the rules accept', () => {
    expect(normalizeSource('poster-165')).toBe('poster-165');
    expect(normalizeSource('TG_Class')).toBe('tg_class');
    expect(normalizeSource(' insta story ')).toBe('insta-story');
  });

  it('drops anything the rules would refuse', () => {
    expect(normalizeSource('')).toBeNull();
    expect(normalizeSource(null)).toBeNull();
    expect(normalizeSource('постер')).toBeNull();
    expect(normalizeSource('a/b')).toBeNull();
    expect(normalizeSource('x'.repeat(41))).toBeNull();
    // Would be a reserved Firestore field name as a key in config/metrics.
    expect(normalizeSource('__x__')).toBeNull();
    expect(normalizeSource('-a')).toBeNull();
  });
});
