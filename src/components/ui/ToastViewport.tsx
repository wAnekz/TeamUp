import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';
import { subscribeToasts, dismiss, type ToastMessage } from '@/lib/toast';
import { cn } from '@/utils/cn';

const ICONS = { success: CheckCircle2, error: XCircle, info: Info };
const STYLES: Record<ToastMessage['kind'], string> = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  error: 'border-red-200 bg-red-50 text-red-800',
  info: 'border-accent-200 bg-accent-50 text-accent-800',
};

/**
 * Mounted once in main.tsx, outside the router so it survives navigation.
 * Sits above the mobile bottom tab bar (bottom-20) and above everything else
 * (z-[100]) so it's never hidden behind a modal or the navbar.
 */
export function ToastViewport() {
  const [items, setItems] = useState<ToastMessage[]>([]);

  useEffect(() => subscribeToasts(setItems), []);

  if (items.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-20 z-[100] flex flex-col items-center gap-2 px-4 sm:bottom-6"
    >
      {items.map((t) => {
        const Icon = ICONS[t.kind];
        return (
          <div
            key={t.id}
            role={t.kind === 'error' ? 'alert' : 'status'}
            className={cn(
              'pointer-events-auto flex w-full max-w-sm animate-slide-up items-start gap-2 rounded-xl border px-3.5 py-2.5 text-sm shadow-card',
              STYLES[t.kind],
            )}
          >
            <Icon size={16} className="mt-0.5 shrink-0" />
            <p className="flex-1">{t.text}</p>
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() => dismiss(t.id)}
              className="shrink-0 opacity-60 hover:opacity-100"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
