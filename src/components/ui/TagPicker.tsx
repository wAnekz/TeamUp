import { cn } from '@/utils/cn';

export function TagPicker<T extends string>({
  options,
  selected,
  onToggle,
  label,
  error,
  name,
}: {
  options: readonly T[];
  selected: T[];
  onToggle: (value: T) => void;
  label?: string;
  error?: string;
  /** Optional field path (e.g. `roles.0.requiredSkills`) used only as a
   *  data-field marker so scrollToFirstError can find and highlight this
   *  picker — it has no real <input>, so react-hook-form's own [name]
   *  lookup can't locate it on its own. */
  name?: string;
}) {
  return (
    <div data-field={name} className={cn(error && 'rounded-xl ring-1 ring-red-300 ring-offset-2')}>
      {label && <span className="mb-1.5 block text-sm font-medium text-surface-700">{label}</span>}
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const active = selected.includes(opt);
          return (
            <button
              type="button"
              key={opt}
              onClick={() => onToggle(opt)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
                active
                  ? 'border-accent-600 bg-accent-600 text-white'
                  : 'border-surface-200 bg-white text-surface-600 hover:border-accent-300 hover:text-accent-700',
              )}
            >
              {opt}
            </button>
          );
        })}
      </div>
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </div>
  );
}
