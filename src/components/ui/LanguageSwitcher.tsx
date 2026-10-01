import { LANG_LABEL, LANG_SHORT, LANGS, setLang, useLang } from '@/lib/lang';
import { cn } from '@/utils/cn';

export function LanguageSwitcher({ compact = false, className }: { compact?: boolean; className?: string }) {
  const lang = useLang();
  return (
    <div className={cn('flex gap-0.5 rounded-full bg-surface-100 p-0.5', className)} role="group" aria-label="Language">
      {LANGS.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
          title={LANG_LABEL[l]}
          className={cn(
            'rounded-full px-2 py-1 text-xs font-medium transition-colors',
            lang === l ? 'bg-white text-surface-900 shadow-sm' : 'text-surface-600 hover:text-surface-800',
          )}
        >
          {compact ? LANG_SHORT[l] : LANG_LABEL[l]}
        </button>
      ))}
    </div>
  );
}
