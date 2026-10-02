import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { setLang, useLang, type Lang } from '@/lib/lang';

/**
 * Shared layout for the public legal pages (/privacy, /terms): readable
 * without an account, with their own RU/KZ/EN switcher, and a short
 * plain-language summary on top — readers are 14–18.
 */

export interface LegalSection {
  heading: string;
  paragraphs?: string[];
  list?: string[];
}

export interface LegalContent {
  title: string;
  summaryTitle: string;
  summary: string[];
  sections: LegalSection[];
}

const LANG_LABEL: Record<Lang, string> = { ru: 'Русский', en: 'English', kz: 'Қазақша' };
const UI: Record<Lang, { back: string; updated: string }> = {
  ru: { back: '← TeamUp', updated: 'Дата последнего обновления' },
  en: { back: '← TeamUp', updated: 'Last updated' },
  kz: { back: '← TeamUp', updated: 'Соңғы жаңарту күні' },
};

// Minimal inline formatter: **bold** and [label](url) (mailto:, https: or a
// /path inside the app). Kept intentionally tiny — legal text, not markdown.
function renderInline(text: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g).filter(Boolean);
  return parts.map((part, i) => {
    const bold = part.match(/^\*\*([^*]+)\*\*$/);
    if (bold) return <strong key={i}>{bold[1]}</strong>;
    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link) {
      if (link[2].startsWith('/')) {
        return (
          <Link key={i} to={link[2]} className="font-medium text-accent-700 underline underline-offset-2">
            {link[1]}
          </Link>
        );
      }
      const isExternal = link[2].startsWith('http');
      return (
        <a
          key={i}
          className="font-medium text-accent-700 underline underline-offset-2"
          href={link[2]}
          target={isExternal ? '_blank' : undefined}
          rel={isExternal ? 'noreferrer' : undefined}
        >
          {link[1]}
        </a>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export function LegalPage({ content, updated }: { content: Record<Lang, LegalContent>; updated: string }) {
  // Opens in whatever language the visitor already picked; switching here
  // updates that shared choice too.
  const lang = useLang();
  const c = content[lang];

  return (
    <div className="min-h-dvh bg-surface-50 px-4 py-10">
      <main className="mx-auto max-w-2xl rounded-3xl border border-surface-200 bg-white p-6 shadow-card sm:p-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link to="/" className="text-sm font-medium text-accent-700 hover:underline">
            {UI[lang].back}
          </Link>
          <div className="flex gap-1 rounded-full bg-surface-100 p-1" role="group" aria-label="Language">
            {(Object.keys(LANG_LABEL) as Lang[]).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLang(l)}
                aria-pressed={lang === l}
                className={`min-h-[32px] rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                  lang === l ? 'bg-white text-surface-900 shadow-sm' : 'text-surface-600 hover:text-surface-800'
                }`}
              >
                {LANG_LABEL[l]}
              </button>
            ))}
          </div>
        </div>

        <h1 className="mt-4 text-2xl font-bold text-surface-900">{c.title}</h1>
        <p className="mt-1 text-sm text-surface-500">
          {UI[lang].updated}: {updated}
        </p>

        <section className="mt-6 rounded-2xl bg-accent-50 p-5 text-sm leading-relaxed text-surface-800">
          <h2 className="text-base font-semibold text-surface-900">{c.summaryTitle}</h2>
          <ul className="mt-2 list-disc space-y-1.5 pl-5">
            {c.summary.map((item, i) => (
              <li key={i}>{renderInline(item)}</li>
            ))}
          </ul>
        </section>

        <div className="mt-6 space-y-5 text-sm leading-relaxed text-surface-700">
          {c.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="text-base font-semibold text-surface-900">{section.heading}</h2>
              {section.paragraphs?.map((p, i) => (
                <p key={i} className="mt-1.5">
                  {renderInline(p)}
                </p>
              ))}
              {section.list && (
                <ul className="mt-1.5 list-disc space-y-1 pl-5">
                  {section.list.map((item, i) => (
                    <li key={i}>{renderInline(item)}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
