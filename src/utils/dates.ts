import { differenceInMinutes, differenceInCalendarDays, format, formatDistanceToNowStrict } from 'date-fns';
import type { Timestamp } from 'firebase/firestore';
import { dateLocale, getT } from '@/i18n';

// All labels follow the current UI language (src/lib/lang.ts); components
// re-render on a language switch because they read useT() themselves.

export function lastActiveLabel(lastActiveAt: Timestamp | undefined): string {
  if (!lastActiveAt) return '';
  const t = getT().dates;
  const date = lastActiveAt.toDate();
  const mins = differenceInMinutes(new Date(), date);
  if (mins < 5) return t.online;
  const days = differenceInCalendarDays(new Date(), date);
  if (days <= 0) return t.seenToday;
  if (days === 1) return t.seenYesterday;
  return t.seenDaysAgo(days);
}

export function formatDeadline(ts: Timestamp | null | undefined): string {
  if (!ts) return '';
  return format(ts.toDate(), 'd MMM yyyy', { locale: dateLocale() });
}

export function isDeadlinePassed(ts: Timestamp | null | undefined): boolean {
  if (!ts) return false;
  return ts.toDate().getTime() < Date.now();
}

/** "Updated yesterday" / "Created 3 days ago" style relative label. */
export function timeAgo(ts: Timestamp | undefined, prefix: 'Updated' | 'Created' = 'Updated'): string {
  if (!ts) return '';
  const t = getT().dates;
  const date = ts.toDate();
  const days = differenceInCalendarDays(new Date(), date);
  const created = prefix === 'Created';
  if (days <= 0) return created ? t.createdToday : t.updatedToday;
  if (days === 1) return created ? t.createdYesterday : t.updatedYesterday;
  const ago = formatDistanceToNowStrict(date, { locale: dateLocale() });
  return created ? t.createdAgo(ago) : t.updatedAgo(ago);
}

/** Bare relative duration ("3 days"), for places that add their own wording. */
export function durationAgo(ts: Timestamp | undefined): string {
  if (!ts) return '';
  return formatDistanceToNowStrict(ts.toDate(), { locale: dateLocale(), addSuffix: true });
}

export function isStale(ts: Timestamp | undefined, staleDays = 30): boolean {
  if (!ts) return false;
  return differenceInCalendarDays(new Date(), ts.toDate()) > staleDays;
}
