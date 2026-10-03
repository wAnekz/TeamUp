import { useMemo, useRef, useState } from 'react';
import { Check, MapPin, Plus, School, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useAddSchool, useSchools } from '@/hooks/useSchoolStats';
import { searchSchools } from '@/utils/schoolSearch';
import { errorToMessage } from '@/lib/toast';
import { cn } from '@/utils/cn';
import { useT } from '@/i18n';
import type { SchoolItem } from '@/types';

export interface PickedSchool {
  id: string;
  name: string;
}

/**
 * Search-as-you-type school picker. Picking from the shared directory is
 * what keeps "NIS Almaty", "НИШ ФМН Алматы" and "ниш алматы" from becoming
 * three schools on the leaderboard. Only when nothing fits can the student
 * add a new one — with the closest matches shown right above that button.
 */
export function SchoolPicker({
  value,
  onChange,
  city,
  uid,
  hint,
}: {
  value: PickedSchool | null;
  onChange: (school: PickedSchool | null) => void;
  city?: string;
  uid: string;
  hint?: string;
}) {
  const { data: schools, isLoading } = useSchools();
  const addSchool = useAddSchool();
  const tAll = useT();
  const t = tAll.school;
  const [editing, setEditing] = useState(!value);
  const [text, setText] = useState('');
  const [active, setActive] = useState(0);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCity, setNewCity] = useState(city ?? '');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => searchSchools(schools ?? [], text, city), [schools, text, city]);
  const showList = editing && text.trim().length >= 2;

  const pick = (school: SchoolItem) => {
    onChange({ id: school.id, name: school.name });
    setEditing(false);
    setAdding(false);
    setText('');
  };

  const startAdding = () => {
    setNewName(text.trim());
    setNewCity(city ?? '');
    setError(null);
    setAdding(true);
  };

  const submitNew = async () => {
    setError(null);
    if (newName.trim().length < 3) return setError(t.fullName);
    if (newCity.trim().length < 2) return setError(t.addCity);
    try {
      pick(await addSchool.mutateAsync({ name: newName, city: newCity, uid }));
    } catch (e) {
      setError(errorToMessage(e));
    }
  };

  // While adding, keep showing what already exists under the name being typed
  // — the last chance to catch a duplicate.
  const similarToNew = useMemo(
    () => (adding ? searchSchools(schools ?? [], newName, newCity, 3) : []),
    [adding, schools, newName, newCity],
  );

  return (
    <div className="block">
      <span className="mb-1.5 block text-sm font-medium text-surface-700">{t.label}</span>

      {!editing && value ? (
        <div className="flex items-center gap-2 rounded-xl border border-surface-200 bg-white px-3.5 py-2.5">
          <School size={16} className="shrink-0 text-accent-600" />
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-surface-900">{value.name}</span>
          <button
            type="button"
            onClick={() => {
              setEditing(true);
              setTimeout(() => inputRef.current?.focus(), 0);
            }}
            className="shrink-0 text-xs font-medium text-accent-600 hover:underline"
          >
            {t.change}
          </button>
          <button
            type="button"
            aria-label={t.remove}
            onClick={() => {
              onChange(null);
              setEditing(true);
            }}
            className="shrink-0 rounded-lg p-1 text-surface-400 hover:bg-surface-100"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search size={16} className="pointer-events-none absolute left-3.5 top-3 text-surface-400" />
          <input
            ref={inputRef}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setActive(0);
              setAdding(false);
            }}
            onKeyDown={(e) => {
              if (!showList) return;
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActive((i) => Math.min(i + 1, results.length - 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActive((i) => Math.max(i - 1, 0));
              } else if (e.key === 'Enter') {
                e.preventDefault();
                if (results[active]) pick(results[active]);
              }
            }}
            placeholder={isLoading ? t.loading : t.placeholder}
            className="w-full rounded-xl border border-surface-400 bg-white py-2.5 pl-10 pr-3.5 text-sm text-surface-900 placeholder:text-surface-400 focus:border-accent-500"
            autoComplete="off"
          />
          {value && (
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="absolute right-3 top-2.5 text-xs font-medium text-surface-500 hover:text-surface-700"
            >
              {tAll.common.cancel}
            </button>
          )}

          {showList && !adding && (
            <div className="mt-1.5 overflow-hidden rounded-xl border border-surface-200 bg-white shadow-card">
              {results.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => pick(s)}
                  className={cn(
                    'flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left',
                    i === active ? 'bg-accent-50' : 'hover:bg-surface-50',
                  )}
                >
                  <School size={15} className="shrink-0 text-surface-400" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-surface-900">{s.name}</span>
                    {s.city && <span className="block text-xs text-surface-500">{s.city}</span>}
                  </span>
                  {s.verified && <Check size={14} className="shrink-0 text-emerald-600" />}
                </button>
              ))}
              {results.length === 0 && (
                <p className="px-3.5 py-2.5 text-sm text-surface-500">{t.nothing(text.trim())}</p>
              )}
              <button
                type="button"
                onClick={startAdding}
                className="flex w-full items-center gap-2 border-t border-surface-100 px-3.5 py-2.5 text-left text-sm font-medium text-accent-700 hover:bg-accent-50"
              >
                <Plus size={15} /> {t.notInList}
              </button>
            </div>
          )}

          {adding && (
            <div className="mt-1.5 space-y-3 rounded-xl border border-accent-200 bg-accent-50/50 p-3.5">
              <p className="text-sm font-medium text-surface-800">{t.addTitle}</p>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={t.namePlaceholder}
                className="w-full rounded-xl border border-surface-400 bg-white px-3.5 py-2 text-sm focus:border-accent-500"
              />
              <div className="relative">
                <MapPin size={14} className="pointer-events-none absolute left-3 top-2.5 text-surface-400" />
                <input
                  value={newCity}
                  onChange={(e) => setNewCity(e.target.value)}
                  placeholder={t.city}
                  className="w-full rounded-xl border border-surface-400 bg-white py-2 pl-8 pr-3.5 text-sm focus:border-accent-500"
                />
              </div>
              {similarToNew.length > 0 && (
                <div>
                  <p className="text-xs text-surface-500">{t.isItOne}</p>
                  <div className="mt-1 space-y-1">
                    {similarToNew.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => pick(s)}
                        className="flex w-full items-center gap-2 rounded-lg bg-white px-2.5 py-1.5 text-left text-sm hover:bg-accent-50"
                      >
                        <School size={13} className="shrink-0 text-surface-400" />
                        <span className="truncate">{s.name}</span>
                        {s.city && <span className="shrink-0 text-xs text-surface-400">· {s.city}</span>}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {error && <p className="text-xs text-red-600">{error}</p>}
              <div className="flex gap-2">
                <Button type="button" size="sm" onClick={submitNew} loading={addSchool.isPending}>
                  {t.add}
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setAdding(false)}>
                  {tAll.common.back}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
      {hint && <span className="mt-1 block text-xs text-surface-500">{hint}</span>}
    </div>
  );
}
