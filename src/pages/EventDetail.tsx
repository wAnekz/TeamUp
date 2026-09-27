import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Calendar, MapPin, Users, ArrowLeft, Globe, Trophy, ExternalLink, Clock, Trash2, Heart, Pencil, BookOpen } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useIsModerator } from '@/hooks/useReports';
import { useEvent, useDeleteEvent, useEventSubscribers, useToggleEventSubscription } from '@/hooks/useEvents';
import { Card, Skeleton, Badge, Avatar } from '@/components/ui/primitives';
import { Button } from '@/components/ui/Button';
import { EventFormModal } from '@/components/events/EventFormModal';
import { formatDeadline, isDeadlinePassed } from '@/utils/dates';
import { toast } from '@/lib/toast';
import { useAuthGate } from '@/hooks/useAuthGate';
import { useT } from '@/i18n';
import { cn } from '@/utils/cn';
import type { EventItem } from '@/types';

function toDateInput(ts: EventItem['date'] | null | undefined) {
  return ts ? ts.toDate().toISOString().slice(0, 10) : '';
}


export default function EventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { data: isModerator } = useIsModerator(user?.uid);
  const { data: event, isLoading, refetch } = useEvent(id);
  const deleteMutation = useDeleteEvent();
  const { isGuest, requireAccount } = useAuthGate();
  // Who's-going names are for registered users only (privacy policy).
  const { data: subscribers } = useEventSubscribers(isGuest ? undefined : id);
  const toggleSub = useToggleEventSubscription();
  const [editing, setEditing] = useState(false);
  const tAll = useT();
  const t = tAll.events;

  if (isLoading) return <Skeleton className="mx-auto h-64 max-w-xl" />;

  if (!event) {
    return <p className="mx-auto max-w-xl text-center text-sm text-surface-500">{t.notFound}</p>;
  }

  const format = event.format ?? 'offline';
  const mySub = subscribers?.find((s) => s.uid === user?.uid);
  const lookingCount = subscribers?.filter((s) => s.lookingForTeam).length ?? 0;
  const registrationClosed = event.registrationDeadline ? isDeadlinePassed(event.registrationDeadline) : false;

  const handleDelete = async () => {
    if (!id) return;
    if (!confirm(t.confirmDelete(event.title))) return;
    await deleteMutation.mutateAsync(id);
    navigate('/events');
  };

  const setInterest = (subscribe: boolean, lookingForTeam: boolean) => {
    if (!requireAccount() || !user || !profile || !id) return;
    toggleSub.mutate(
      {
        eventId: id,
        uid: user.uid,
        userName: profile.name,
        userAvatarUrl: profile.avatarUrl ?? null,
        lookingForTeam,
        subscribe,
        alreadySubscribed: !!mySub,
      },
      {
        onSuccess: () =>
          subscribe && !mySub && toast.success(t.savedReminder),
      },
    );
  };

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <div className="mb-4 flex items-center justify-between">
        <Link to="/events" className="inline-flex items-center gap-1 text-sm text-surface-500 hover:text-surface-700">
          <ArrowLeft size={14} /> {t.allEvents}
        </Link>
        {isModerator && (
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
              <Pencil size={14} /> {tAll.common.edit}
            </Button>
            <Button variant="secondary" size="sm" onClick={handleDelete} loading={deleteMutation.isPending}>
              <Trash2 size={14} /> {tAll.common.delete}
            </Button>
          </div>
        )}
      </div>

      <Card>
        {event.imageUrl && <img src={event.imageUrl} alt="" className="mb-4 h-40 w-full rounded-xl object-cover" />}

        <div className="flex items-start justify-between gap-3">
          <h1 className="text-xl font-bold text-surface-900">{event.title}</h1>
          <Badge tone={format === 'online' ? 'accent' : format === 'hybrid' ? 'yellow' : 'gray'}>
            {tAll.format[format]}
          </Badge>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-surface-500">
          <span className="flex items-center gap-1.5">
            <Calendar size={14} /> {formatDeadline(event.date)}
          </span>
          {format !== 'online' && event.location && (
            <span className="flex items-center gap-1.5">
              <MapPin size={14} /> {event.location}
            </span>
          )}
          {format === 'online' && (
            <span className="flex items-center gap-1.5">
              <Globe size={14} /> {t.heldOnline}
            </span>
          )}
          {event.organizer && (
            <span className="flex items-center gap-1.5">
              <Users size={14} /> {event.organizer}
            </span>
          )}
        </div>

        {(event.prizePool || event.teamSizeHint) && (
          <div className="mt-4 flex flex-wrap gap-4 rounded-xl bg-surface-50 p-3 text-sm">
            {event.prizePool && (
              <span className="flex items-center gap-1.5 text-surface-700">
                <Trophy size={14} className="text-accent-600" /> {event.prizePool}
              </span>
            )}
            {event.teamSizeHint && (
              <span className="flex items-center gap-1.5 text-surface-700">
                <Users size={14} className="text-accent-600" /> {event.teamSizeHint}
              </span>
            )}
          </div>
        )}

        <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-surface-700">{event.description}</p>

        {event.registrationDeadline && (
          <p className="mt-4 flex items-center gap-1.5 text-xs text-surface-500">
            <Clock size={12} />
            {registrationClosed ? t.regClosed : t.registerBy(formatDeadline(event.registrationDeadline))}
          </p>
        )}

        <div className="mt-4 space-y-2">
          <Button
            variant={mySub ? 'secondary' : 'primary'}
            className={cn('w-full', mySub && 'border-rose-200 text-rose-600 hover:bg-rose-50')}
            loading={toggleSub.isPending}
            onClick={() => setInterest(!mySub, mySub?.lookingForTeam ?? true)}
          >
            <Heart size={16} className={cn(mySub && 'fill-rose-500')} />
            {mySub ? t.youreInterested : t.interested}
          </Button>
          {mySub && (
            <label className="flex items-center justify-center gap-2 text-xs text-surface-600">
              <input
                type="checkbox"
                checked={mySub.lookingForTeam}
                onChange={(e) => setInterest(true, e.target.checked)}
                className="rounded border-surface-300 text-accent-600"
              />
              {t.showLooking}
            </label>
          )}

          {event.registrationUrl && (
            <a href={event.registrationUrl} target="_blank" rel="noopener noreferrer" className="block">
              <Button variant="secondary" className="w-full" disabled={registrationClosed}>
                <ExternalLink size={16} /> {registrationClosed ? t.regClosed : t.register}
              </Button>
            </a>
          )}

          <Link
            to={`/looking-for-team?event=${encodeURIComponent(event.competitionTag)}`}
            className="block"
            onClick={(e) => !requireAccount() && e.preventDefault()}
          >
            <Button variant="secondary" className="w-full">
              <Users size={16} /> {t.findTeam}
            </Button>
          </Link>
        </div>
      </Card>

      {event.resources && event.resources.length > 0 && (
        <Card>
          <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-surface-700">
            <BookOpen size={14} className="text-accent-600" /> {t.prepare}
          </p>
          <div className="space-y-1.5">
            {event.resources.map((r, i) => (
              <a
                key={i}
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-accent-600 hover:underline"
              >
                <ExternalLink size={12} /> {r.title}
              </a>
            ))}
          </div>
        </Card>
      )}

      {isGuest && (event.interestedCount ?? 0) > 0 && (
        <Card className="flex flex-col items-center gap-3 text-center sm:flex-row sm:text-left">
          <p className="flex-1 text-sm text-surface-700">{t.guestInterested(event.interestedCount ?? 0)}</p>
          <Button size="sm" onClick={requireAccount}>
            {t.signUp}
          </Button>
        </Card>
      )}

      {subscribers && subscribers.length > 0 && (
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium text-surface-700">{t.whoInterested(subscribers.length)}</p>
            {lookingCount > 0 && <span className="text-xs text-surface-400">{t.lookingCount(lookingCount)}</span>}
          </div>
          <div className="space-y-2">
            {subscribers.slice(0, 30).map((s) => (
              <Link key={s.id} to={`/users/${s.uid}`} className="flex items-center gap-2.5 rounded-lg p-1 hover:bg-surface-50">
                <Avatar src={s.userAvatarUrl} name={s.userName} size={30} />
                <span className="flex-1 truncate text-sm text-surface-800">
                  {s.userName}
                  {s.uid === user?.uid && <span className="text-surface-400"> ({tAll.common.you})</span>}
                </span>
                {s.lookingForTeam && <Badge tone="green">{t.lookingBadge}</Badge>}
              </Link>
            ))}
          </div>
        </Card>
      )}

      {isModerator && editing && (
        <EventFormModal
          open
          onClose={() => setEditing(false)}
          eventId={event.id}
          title={t.editEvent}
          onSaved={() => refetch()}
          initial={{
            title: event.title,
            description: event.description,
            competitionTag: event.competitionTag,
            date: toDateInput(event.date),
            format: event.format ?? 'offline',
            location: event.location ?? '',
            organizer: event.organizer ?? '',
            registrationUrl: event.registrationUrl ?? '',
            registrationDeadline: toDateInput(event.registrationDeadline),
            prizePool: event.prizePool ?? '',
            teamSizeHint: event.teamSizeHint ?? '',
            imageUrl: event.imageUrl ?? '',
            resources: event.resources ?? [],
            sourceUrl: event.sourceUrl ?? null,
          }}
        />
      )}
    </div>
  );
}
