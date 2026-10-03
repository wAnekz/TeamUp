import { useMemo, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { cn } from '@/utils/cn';
import { interestLabel, skillLabel, translateError, useT } from '@/i18n';

// Same selection UX as TagPicker (pill buttons, toggle on click), but for
// lists too long to dump flat on screen — grouped into collapsible
// categories with a search box that filters across all of them and
// auto-expands whichever categories still have matches.
export function CategorizedTagPicker<T extends string>({
  categories,
  selected,
  onToggle,
  label,
  error: rawError,
  name,
  searchPlaceholder,
  kind = 'interest',
}: {
  categories: Record<string, readonly T[]>;
  selected: T[];
  onToggle: (value: T) => void;
  label?: string;
  error?: string;
  name?: string;
  searchPlaceholder?: string;
  // Which dictionary labels come from. Stored values never change — only
  // what's shown (and searched) is translated.
  kind?: 'skill' | 'interest';
}) {
  const t = useT();
  const labelOf = (v: T) => (kind === 'skill' ? skillLabel(t, v) : interestLabel(t, v));
  const categoryLabel = (c: string) => (kind === 'skill' ? t.skillCategories[c] : t.interestCategories[c]) ?? c;
  const error = translateError(t, rawError);
  const [query, setQuery] = useState('');
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return categories;
    const result: Record<string, T[]> = {};
    for (const [category, options] of Object.entries(categories)) {
      // Match the shown label and the stored value, so "football" and
      // "футбол" both find it whatever the UI language.
      const matches = options.filter((o) => o.toLowerCase().includes(q) || labelOf(o).toLowerCase().includes(q));
      if (matches.length > 0) result[category] = matches;
    }
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories, query, t]);

  const isSearching = query.trim().length > 0;

  const toggleCategory = (category: string) => {
    setOpenCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  };

  return (
    <div data-field={name} className={cn(error && 'rounded-xl ring-1 ring-red-300 ring-offset-2')}>
      {label && <span className="mb-1.5 block text-sm font-medium text-surface-700">{label}</span>}

      {selected.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {selected.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onToggle(s)}
              className="rounded-full border border-accent-600 bg-accent-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent-700"
            >
              {labelOf(s)} ×
            </button>
          ))}
        </div>
      )}

      <div className="relative mb-2">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={searchPlaceholder ?? (kind === 'skill' ? t.picker.searchSkills : t.picker.searchInterests)}
          className="w-full rounded-xl border border-surface-400 py-2 pl-9 pr-3 text-sm focus:border-accent-500"
        />
      </div>

      <div className="space-y-1.5 rounded-xl border border-surface-200 p-2">
        {Object.entries(filtered).map(([category, options]) => {
          const open = isSearching || openCategories.has(category);
          const selectedInCategory = options.filter((o) => selected.includes(o)).length;
          return (
            <div key={category} className="rounded-lg">
              <button
                type="button"
                aria-expanded={open}
                onClick={() => toggleCategory(category)}
                className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm font-medium text-surface-700 hover:bg-surface-50"
              >
                <span>
                  {categoryLabel(category)}
                  {selectedInCategory > 0 && <span className="ml-1.5 text-xs font-normal text-accent-600">({selectedInCategory})</span>}
                </span>
                <ChevronDown size={14} className={cn('text-surface-400 transition-transform', open && 'rotate-180')} />
              </button>
              {open && (
                <div className="flex flex-wrap gap-2 px-2 pb-2 pt-1">
                  {options.map((opt) => {
                    const active = selected.includes(opt);
                    return (
                      <button
                        type="button"
                        key={opt}
                        aria-pressed={active}
                        onClick={() => onToggle(opt)}
                        className={cn(
                          'rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
                          active
                            ? 'border-accent-600 bg-accent-600 text-white'
                            : 'border-surface-200 bg-white text-surface-600 hover:border-accent-300 hover:text-accent-700',
                        )}
                      >
                        {labelOf(opt)}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
        {Object.keys(filtered).length === 0 && <p className="px-2 py-3 text-center text-sm text-surface-400">{t.picker.noMatches}</p>}
      </div>

      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </div>
  );
}
