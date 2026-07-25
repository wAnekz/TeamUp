import { differenceInMinutes, differenceInCalendarDays, format, formatDistanceToNowStrict } from 'date-fns';
import type { Timestamp } from 'firebase/firestore';

export function lastActiveLabel(lastActiveAt: Timestamp | undefined): string {
  if (!lastActiveAt) return '';
  const date = lastActiveAt.toDate();
  const mins = differenceInMinutes(new Date(), date);
  if (mins < 5) return 'Online';
  const days = differenceInCalendarDays(new Date(), date);
  if (days <= 0) return 'Last seen today';
  if (days === 1) return 'Last seen yesterday';
  return `Last seen ${days} days ago`;
}

export function formatDeadline(ts: Timestamp | null | undefined): string {
  if (!ts) return '';
  return format(ts.toDate(), 'MMM d, yyyy');
}

export function isDeadlinePassed(ts: Timestamp | null | undefined): boolean {
  if (!ts) return false;
  return ts.toDate().getTime() < Date.now();
}

/** "Updated yesterday" / "Created 3 days ago" style relative label. */
export function timeAgo(ts: Timestamp | undefined, prefix: 'Updated' | 'Created' = 'Updated'): string {
  if (!ts) return '';
  const date = ts.toDate();
  const days = differenceInCalendarDays(new Date(), date);
  if (days <= 0) return `${prefix} today`;
  if (days === 1) return `${prefix} yesterday`;
  return `${prefix} ${formatDistanceToNowStrict(date)} ago`;
}

export function isStale(ts: Timestamp | undefined, staleDays = 30): boolean {
  if (!ts) return false;
  return differenceInCalendarDays(new Date(), ts.toDate()) > staleDays;
}
