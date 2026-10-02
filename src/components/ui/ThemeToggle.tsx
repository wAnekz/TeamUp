import { Moon, Sun } from 'lucide-react';
import { setTheme, useTheme, type ThemePref } from '@/lib/theme';
import { useT } from '@/i18n';
import { cn } from '@/utils/cn';

/** Navbar button: flips between light and dark. */
export function ThemeToggle({ className }: { className?: string }) {
  const { dark } = useTheme();
  const t = useT().theme;
  return (
    <button
      type="button"
      onClick={() => setTheme(dark ? 'light' : 'dark')}
      aria-label={dark ? t.toLight : t.toDark}
      title={dark ? t.toLight : t.toDark}
      className={cn('inline-flex h-9 w-9 items-center justify-center rounded-xl text-surface-600 hover:bg-surface-100', className)}
    >
      {dark ? <Sun size={17} aria-hidden /> : <Moon size={17} aria-hidden />}
    </button>
  );
}

/** Settings row: light / dark / as in the system. */
export function ThemePicker() {
  const { pref } = useTheme();
  const t = useT().theme;
  const options: { value: ThemePref; label: string }[] = [
    { value: 'light', label: t.light },
    { value: 'dark', label: t.dark },
    { value: 'system', label: t.system },
  ];
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-surface-800">{t.title}</span>
      <div role="group" aria-label={t.title} className="flex gap-1 rounded-full bg-surface-100 p-1">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed={pref === o.value}
            onClick={() => setTheme(o.value)}
            className={cn(
              'min-h-[32px] rounded-full px-3 py-1 text-xs font-medium transition-colors',
              pref === o.value ? 'bg-white text-surface-900 shadow-sm' : 'text-surface-600 hover:text-surface-800',
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
