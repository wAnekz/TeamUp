import { describe, expect, it } from 'vitest';
import { devpostAudience, draftsFromSite, pageToText, parseDevpostPage } from '../../functions/src/eventCollector';

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

describe('website source', () => {
  const page = `<html><head><title>x</title><script>var a = 1;</script></head><body>
    <nav><a href="/about">About</a></nav>
    <h2>Хакатон Almaty Teens 2027</h2><p>Для учеников 8-11 классов. <a href="/reg?a=1&amp;b=2">Регистрация</a></p>
    <a href="#top">Наверх</a><footer>© 2026</footer></body></html>`;

  it('flattens a page to text with absolute links and no menus or scripts', () => {
    expect(pageToText(page, 'https://example.kz/events/')).toBe(
      'Хакатон Almaty Teens 2027\nДля учеников 8-11 классов. Регистрация [https://example.kz/reg?a=1&b=2]\nНаверх',
    );
  });

  it('keeps only links that are really on the page and skips past events', () => {
    const text = pageToText(page, 'https://example.kz/events/');
    const drafts = draftsFromSite(
      {
        events: [
          {
            title: 'Almaty Teens 2027',
            date: '2099-02-01',
            registrationUrl: 'https://example.kz/reg?a=1&b=2',
            url: 'https://made-up.example/event',
            excerpt: 'Для учеников 8-11 классов.',
            inKazakhstan: true,
          },
          { title: 'Old one', date: '2020-01-01' },
        ],
      },
      'https://example.kz/events/',
      text,
    );
    expect(drafts).toHaveLength(1);
    expect(drafts[0]).toMatchObject({
      source: 'website',
      sourceUrl: 'https://example.kz/reg?a=1&b=2',
      registrationUrl: 'https://example.kz/reg?a=1&b=2',
      sourceText: 'Для учеников 8-11 классов.',
      country: 'KZ',
    });
  });
});
