import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/utils/cn';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('rounded-2xl border border-surface-200 bg-white p-5 shadow-card', className)}
      {...props}
    />
  );
}

type BadgeTone = 'accent' | 'gray' | 'green' | 'red' | 'yellow';
const tones: Record<BadgeTone, string> = {
  accent: 'bg-accent-50 text-accent-700',
  gray: 'bg-surface-100 text-surface-600',
  green: 'bg-emerald-50 text-emerald-700',
  red: 'bg-red-50 text-red-700',
  yellow: 'bg-amber-50 text-amber-700',
};

export function Badge({
  tone = 'gray',
  className,
  children,
}: {
  tone?: BadgeTone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium', tones[tone], className)}>
      {children}
    </span>
  );
}

export function Avatar({ src, name, size = 40 }: { src?: string | null; name: string; size?: number }) {
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        style={{ width: size, height: size }}
        className="rounded-full object-cover border border-surface-200"
      />
    );
  }
  return (
    <div
      style={{ width: size, height: size }}
      className="flex items-center justify-center rounded-full bg-accent-100 text-accent-700 font-semibold border border-surface-200"
    >
      {initials || '?'}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-lg bg-surface-200', className)} />;
}

/**
 * Shared "this query blew up" banner. Firestore query errors (most commonly
 * a missing composite index) fail loudly with a useful message, but if a
 * screen only checks `!data || data.length === 0` that message never
 * reaches the user — it just looks like an empty list. Surface it instead.
 */
export function ErrorState({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
      <p className="font-medium">Couldn't load this.</p>
      <p className="mt-1 break-all text-xs text-red-600">{error instanceof Error ? error.message : String(error)}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-3 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100"
      >
        Retry
      </button>
    </div>
  );
}
