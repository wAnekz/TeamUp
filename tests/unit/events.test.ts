import { describe, expect, it } from 'vitest';
import { devpostAudience, parseDevpostPage } from '../../functions/src/eventCollector';

// "Who can participate" blocks copied from real Devpost pages (Oct 2026).
const ALL = 'All countries/territories, excluding standard exceptions';

describe('devpostAudience keeps only events a 14-18 year old in Kazakhstan can enter', () => {
  it('keeps explicit under-18 age ranges', () => {
    expect(devpostAudience(`Ages 13+ only Students only ${ALL}`).ok).toBe(true);
    expect(devpostAudience(`Ages 14+ only Students only ${ALL}`).ok).toBe(true);
    expect(devpostAudience(`Ages 13 to 18 only Students only ${ALL}`).ok).toBe(true);
    expect(devpostAudience(`Ages 13 to 22 only Students only ${ALL}`).ok).toBe(true);
  });

  it('drops adult, corporate and university-only hackathons', () => {
    expect(devpostAudience(`Above legal age of majority in country of residence ${ALL}`)).toEqual({
      ok: false,
      reason: 'adults only (18+)',
    });
    expect(devpostAudience(`Ages 18+ only ${ALL}`).ok).toBe(false);
    expect(devpostAudience(`Above legal age of majority in country of residence Professionals/Post grads only ${ALL}`).ok).toBe(false);
    expect(devpostAudience(`Ages 16+ only College students only ${ALL}`).ok).toBe(false);
  });

  it('drops events Kazakhstan cannot join', () => {
    expect(devpostAudience('Ages 13+ only Students only Only specific countries/territories included United States').ok).toBe(false);
    expect(devpostAudience('Ages 13+ only Specific countries/territories excluded Afghanistan Kazakhstan Russia').ok).toBe(false);
    expect(devpostAudience('Ages 13+ only Only specific countries/territories included Kazakhstan Uzbekistan').ok).toBe(true);
  });

  it('drops anything it cannot verify', () => {
    expect(devpostAudience(null).ok).toBe(false);
    expect(devpostAudience(`Students only ${ALL}`).ok).toBe(false);
  });
});

describe('parseDevpostPage', () => {
  it('reads the eligibility block and the tagline', () => {
    const html = `<html><head><meta property="og:description" content="Build tech that makes school life better &amp; easier."></head>
      <body><div>Who can participate</div><ul><li>Ages 13 to 18 only</li><li>Students only</li></ul><a>View full rules</a>
      <script>var x = "Who can participate";</script></body></html>`;
    expect(parseDevpostPage(html)).toEqual({
      eligibility: 'Ages 13 to 18 only Students only',
      tagline: 'Build tech that makes school life better & easier.',
    });
  });

  it('returns nulls when the page has neither', () => {
    expect(parseDevpostPage('<html><body>Nothing here</body></html>')).toEqual({ eligibility: null, tagline: null });
  });
});
