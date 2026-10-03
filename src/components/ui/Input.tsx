import { forwardRef, useId, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/utils/cn';
import { translateError, useT } from '@/i18n';

interface FieldWrapProps {
  label?: string;
  error?: string;
  hint?: string;
}

// border-surface-400: field outlines need 3:1 against the card (WCAG 1.4.11);
// surface-200 was ~1.3:1 and the box was barely visible.
const fieldBase =
  'w-full rounded-xl border border-surface-400 bg-white px-3.5 py-2.5 text-sm text-surface-900 placeholder:text-surface-400 transition-colors focus:border-accent-500 disabled:bg-surface-100 disabled:text-surface-400';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & FieldWrapProps>(
  ({ label, error: rawError, hint, className, id, ...props }, ref) => {
    const error = translateError(useT(), rawError);
    const descId = useId();
    const desc = error || hint;
    return (
      <label className="block" htmlFor={id}>
        {label && <span className="mb-1.5 block text-sm font-medium text-surface-700">{label}</span>}
        <input
          ref={ref}
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={desc ? descId : undefined}
          className={cn(fieldBase, error && 'border-red-400', className)}
          {...props}
        />
        {hint && !error && <span id={descId} className="mt-1 block text-xs text-surface-500">{hint}</span>}
        {error && <span id={descId} className="mt-1 block text-xs text-red-600">{error}</span>}
      </label>
    );
  },
);
Input.displayName = 'Input';

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement> & FieldWrapProps & { maxLength?: number }
>(({ label, error: rawError, hint, className, id, maxLength, value, ...props }, ref) => {
  const error = translateError(useT(), rawError);
  const descId = useId();
  const desc = error || hint;
  return (
    <label className="block" htmlFor={id}>
      {label && <span className="mb-1.5 block text-sm font-medium text-surface-700">{label}</span>}
      <textarea
        ref={ref}
        id={id}
        value={value}
        maxLength={maxLength}
        aria-invalid={error ? true : undefined}
        aria-describedby={desc ? descId : undefined}
        className={cn(fieldBase, 'min-h-[100px] resize-y', error && 'border-red-400', className)}
        {...props}
      />
      <div className="mt-1 flex items-center justify-between">
        {error ? (
          <span id={descId} className="text-xs text-red-600">{error}</span>
        ) : (
          <span id={descId} className="text-xs text-surface-400">{hint}</span>
        )}
        {maxLength && typeof value === 'string' && (
          <span className="text-xs text-surface-400">
            {value.length}/{maxLength}
          </span>
        )}
      </div>
    </label>
  );
});
Textarea.displayName = 'Textarea';
