import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, MapPin, Calendar, Globe, Users, Inbox, Heart, Clock } from 'lucide-react';
import { useAuth } from '@/contexts/useAuth';
import { useIsModerator } from '@/hooks/useReports';
import { useEventsList, useMyEventSubscriptions } from '@/hooks/useEvents';
import { Card, Skeleton, ErrorState, Badge } from '@/components/ui/primitives';
import { Button } from '@/components/ui/Button';
import { EventFormModal } from '@/components/events/EventFormModal';
import { formatDeadline } from '@/utils/dates';
import { cn } from '@/utils/cn';
import { useT } from '@/i18n';
import { useLang } from '@/lib/lang';
import { eventDescription, isKazakhstan, kazakhstanFirst, visibleEvents } from '@/utils/events';
import type { EventFormat, EventItem } from '@/types';
import { EventImage } from '@/components/events/EventImage';

const FORMAT_ICON: Record<EventFormat, typeof Globe> = { online: Globe, offline: MapPin, hybrid: Globe };
const DAY = 24 * 60 * 60 * 1000;

type View = 'upcoming' | 'mine';
type Region = 'all' | 'kz' | 'online';

export default function Events() {
  const { user } = useAuth();
  const { data: isModerator } = useIsModerator(user?.uid);
  const { data: events, isLoading, isError, error, refetch } = useEventsList();
  const { data: mySubs } = useMyEventSubscriptions(user?.uid);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>('upcoming');
  const [region, setRegion] = useState<Region>('all');
  const t = useT().events;

  // Past events stay active (moderators hide them manually) but shouldn't
  // crowd the list — keep anything whose date is at most a day behind.
  const upcoming = kazakhstanFirst(
    visibleEvents(events ?? [], !!isModerator).filter((e) => (e.date?.toMillis() ?? 0) > Date.now() - DAY),
  );
  const inRegion = upcoming.filter((e) =>
    region === 'kz' ? isKazakhstan(e) : region === 'online' ? (e.format ?? 'offline') === 'online' : true,
  );
  const shown = view === 'mine' ? inRegion.filter((e) => mySubs?.has(e.id)) : inRegion;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-1 flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold text-surface-900">{t.title}</h1>
        {isModerator && (
          <div className="flex gap-2">
            <Link to="/moderation/events">
              <Button size="sm" variant="secondary">
                <Inbox size={14} /> {t.foundAuto}
              </Button>
            </Link>
            <Button size="sm" onClick={() => setOpen(true)}>
              <Plus size={14} /> {t.add}
            </Button>
          </div>
        )}
      </div>
      <p className="mb-4 text-sm text-surface-500">{t.subtitle}</p>

      <div className={cn('mb-4 flex gap-1 rounded-xl bg-surface-100 p-1', !user && 'hidden')}>
        {(
          [
            { key: 'upcoming', label: t.upcoming },
            { key: 'mine', label: t.mine(mySubs?.size ?? 0) },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            onClick={() => setView(t.key)}
            className={cn(
              'flex-1 whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-medium transition-colors',
              view === t.key ? 'bg-white text-accent-700 shadow-soft' : 'text-surface-500 hover:text-surface-700',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div role="group" aria-label={t.regionLabel} className="mb-4 flex flex-wrap gap-2">
        {(
          [
            { key: 'all', label: t.regionAll },
            { key: 'kz', label: t.regionKz },
            { key: 'online', label: t.regionOnline },
          ] as const
        ).map((r) => (
          <button
            key={r.key}
            type="button"
            aria-pressed={region === r.key}
            onClick={() => setRegion(r.key)}
            className={cn(
              'min-h-11 rounded-full border px-4 text-sm font-medium transition-colors',
              region === r.key
                ? 'border-accent-600 bg-accent-600 text-white'
                : 'border-surface-200 bg-white text-surface-700 hover:border-accent-300',
            )}
          >
            {r.label}
          </button>
        ))}
      </div>

      {isError && <ErrorState error={error} onRetry={() => refetch()} />}

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      )}

      {!isLoading && !isError && shown.length === 0 && (
        <div className="rounded-2xl border border-dashed border-surface-300 px-4 py-16 text-center text-surface-500">
          {view === 'mine' ? t.emptyMine : region === 'kz' ? t.emptyKz : region === 'online' ? t.emptyOnline : t.empty}
          {view === 'upcoming' && region !== 'all' && (
            <button type="button" onClick={() => setRegion('all')} className="mt-2 block w-full text-sm font-medium text-accent-600 hover:underline">
              {t.showAll}
            </button>
          )}
        </div>
      )}

      <div className="space-y-3">
        {shown.map((ev) => (
          <EventRow key={ev.id} event={ev} interested={!!mySubs?.has(ev.id)} />
        ))}
      </div>

      {isModerator && <EventFormModal open={open} onClose={() => setOpen(false)} />}
    </div>
  );
}

function EventRow({ event: ev, interested }: { event: EventItem; interested: boolean }) {
  const tAll = useT();
  const t = tAll.events;
  const lang = useLang();
  const format = ev.format ?? 'offline';
  const FormatIcon = FORMAT_ICON[format];
  const regDaysLeft = ev.registrationDeadline
    ? Math.ceil((ev.registrationDeadline.toMillis() - Date.now()) / DAY)
    : null;

  return (
    <Link to={`/events/${ev.id}`} className="block">
      <Card className="flex gap-3 transition-colors hover:border-accent-300">
        <EventImage src={ev.imageUrl} className="h-20 w-20 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h2 className="min-w-0 break-words font-semibold text-surface-900">{ev.title}</h2>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <Badge tone={format === 'online' ? 'accent' : format === 'hybrid' ? 'yellow' : 'gray'}>
                {tAll.format[format]}
              </Badge>
              {ev.hidden && <Badge tone="yellow">{t.hiddenBadge}</Badge>}
            </div>
          </div>
          <p className="mt-1 line-clamp-2 text-sm text-surface-500">{eventDescription(ev, lang)}</p>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-surface-500">
            <span className="flex items-center gap-1">
              <Calendar size={12} /> {formatDeadline(ev.date)}
            </span>
            {format !== 'online' && ev.location && (
              <span className="flex items-center gap-1">
                <FormatIcon size={12} /> {ev.location}
              </span>
            )}
            {ev.organizer && (
              <span className="flex items-center gap-1">
                <Users size={12} /> {ev.organizer}
              </span>
            )}
            {(ev.interestedCount ?? 0) > 0 && (
              <span className={cn('flex items-center gap-1', interested && 'text-rose-500')}>
                <Heart size={12} className={cn(interested && 'fill-rose-500')} /> {t.interestedCount(ev.interestedCount ?? 0)}
              </span>
            )}
            {regDaysLeft !== null && regDaysLeft >= 0 && regDaysLeft <= 7 && (
              <span className="flex items-center gap-1 font-medium text-amber-700">
                <Clock size={12} /> {t.regCloses(regDaysLeft === 0 ? tAll.dates.today : tAll.dates.inDays(regDaysLeft))}
              </span>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}
