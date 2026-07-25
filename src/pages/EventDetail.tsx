import { useParams, Link } from 'react-router-dom';
import { Calendar, MapPin, Users, ArrowLeft, Globe, Trophy, ExternalLink, Clock } from 'lucide-react';
import { useEvent } from '@/hooks/useEvents';
import { Card, Skeleton, Badge } from '@/components/ui/primitives';
import { Button } from '@/components/ui/Button';
import { formatDeadline, isDeadlinePassed } from '@/utils/dates';
import type { EventFormat } from '@/types';

const FORMAT_LABEL: Record<EventFormat, string> = { online: 'Online', offline: 'Offline', hybrid: 'Hybrid' };

export default function EventDetail() {
  const { id } = useParams();
  const { data: event, isLoading } = useEvent(id);

  if (isLoading) return <Skeleton className="mx-auto h-64 max-w-xl" />;

  if (!event) {
    return <p className="mx-auto max-w-xl text-center text-sm text-surface-500">Event not found.</p>;
  }

  const format = event.format ?? 'offline';
  const registrationClosed = event.registrationDeadline ? isDeadlinePassed(event.registrationDeadline) : false;

  return (
    <div className="mx-auto max-w-xl">
      <Link to="/events" className="mb-4 inline-flex items-center gap-1 text-sm text-surface-500 hover:text-surface-700">
        <ArrowLeft size={14} /> All events
      </Link>

      <Card>
        {event.imageUrl && <img src={event.imageUrl} alt="" className="mb-4 h-40 w-full rounded-xl object-cover" />}

        <div className="flex items-start justify-between gap-3">
          <h1 className="text-xl font-bold text-surface-900">{event.title}</h1>
          <Badge tone={format === 'online' ? 'accent' : format === 'hybrid' ? 'yellow' : 'gray'}>
            {FORMAT_LABEL[format]}
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
              <Globe size={14} /> Held online
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
            {registrationClosed ? 'Registration closed' : `Register by ${formatDeadline(event.registrationDeadline)}`}
          </p>
        )}

        <div className="mt-4 space-y-2">
          {event.registrationUrl && (
            <a href={event.registrationUrl} target="_blank" rel="noopener noreferrer" className="block">
              <Button variant="secondary" className="w-full" disabled={registrationClosed}>
                <ExternalLink size={16} /> {registrationClosed ? 'Registration closed' : 'Register for this event'}
              </Button>
            </a>
          )}

          <Link to={`/looking-for-team?event=${encodeURIComponent(event.competitionTag)}`} className="block">
            <Button className="w-full">
              <Users size={16} /> Find a team for this event
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
