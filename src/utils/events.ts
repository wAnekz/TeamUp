import type { Lang } from '@/lib/lang';
import type { EventItem } from '@/types';

/** The short RU/KZ/EN blurb when there is one, else the stored description. */
export function eventDescription(ev: Pick<EventItem, 'description' | 'descriptionI18n'>, lang: Lang): string {
  return ev.descriptionI18n?.[lang] || ev.description;
}

/** Hidden events (failed the audience check) are for moderators only. */
export function visibleEvents(events: EventItem[], isModerator = false): EventItem[] {
  return isModerator ? events : events.filter((e) => !e.hidden);
}

export const isKazakhstan = (e: Pick<EventItem, 'country'>) => e.country === 'KZ';

/** Kazakhstani events first, each group soonest first. */
export function kazakhstanFirst(events: EventItem[]): EventItem[] {
  return [...events].sort(
    (a, b) => Number(isKazakhstan(b)) - Number(isKazakhstan(a)) || (a.date?.toMillis() ?? 0) - (b.date?.toMillis() ?? 0),
  );
}
