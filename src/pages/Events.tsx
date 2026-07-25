import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, MapPin, Calendar, Globe, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useIsModerator } from '@/hooks/useReports';
import { useCreateEvent, useEventsList } from '@/hooks/useEvents';
import { Card, Skeleton, ErrorState, Badge } from '@/components/ui/primitives';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input, Textarea } from '@/components/ui/Input';
import { EVENT_FORMAT_OPTIONS } from '@/constants/options';
import { formatDeadline } from '@/utils/dates';
import type { EventFormat } from '@/types';

const FORMAT_LABEL: Record<EventFormat, string> = { online: 'Online', offline: 'Offline', hybrid: 'Hybrid' };
const FORMAT_ICON: Record<EventFormat, typeof Globe> = { online: Globe, offline: MapPin, hybrid: Globe };

export default function Events() {
  const { user } = useAuth();
  const { data: isModerator } = useIsModerator(user?.uid);
  const { data: events, isLoading, isError, error, refetch } = useEventsList();
  const [open, setOpen] = useState(false);

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-1 flex items-center justify-between">
        <h1 className="text-xl font-bold text-surface-900">Events</h1>
        {isModerator && (
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus size={14} /> Add event
          </Button>
        )}
      </div>
      <p className="mb-4 text-sm text-surface-500">
        Hackathons and olympiads TeamUp is at - tap one to find teammates for it specifically.
      </p>

      {isError && <ErrorState error={error} onRetry={() => refetch()} />}

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      )}

      {!isLoading && !isError && events?.length === 0 && (
        <div className="rounded-2xl border border-dashed border-surface-300 py-16 text-center text-surface-500">
          No events posted yet - check back soon.
        </div>
      )}

      <div className="space-y-3">
        {events?.map((ev) => {
          const format = ev.format ?? 'offline';
          const FormatIcon = FORMAT_ICON[format];
          return (
            <Link key={ev.id} to={`/events/${ev.id}`}>
              <Card className="flex gap-3 transition-colors hover:border-accent-300">
                {ev.imageUrl && (
                  <img src={ev.imageUrl} alt="" className="h-20 w-20 shrink-0 rounded-xl object-cover" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="font-semibold text-surface-900">{ev.title}</h2>
                    <Badge tone={format === 'online' ? 'accent' : format === 'hybrid' ? 'yellow' : 'gray'}>
                      {FORMAT_LABEL[format]}
                    </Badge>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-surface-500">{ev.description}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-surface-400">
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
                  </div>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>

      {isModerator && <CreateEventModal open={open} onClose={() => setOpen(false)} />}
    </div>
  );
}

function CreateEventModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const createMutation = useCreateEvent();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [competitionTag, setCompetitionTag] = useState('');
  const [date, setDate] = useState('');
  const [format, setFormat] = useState<EventFormat>('offline');
  const [location, setLocation] = useState('');
  const [organizer, setOrganizer] = useState('');
  const [registrationUrl, setRegistrationUrl] = useState('');
  const [registrationDeadline, setRegistrationDeadline] = useState('');
  const [prizePool, setPrizePool] = useState('');
  const [teamSizeHint, setTeamSizeHint] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!title.trim() || !description.trim() || !competitionTag.trim() || !date) return;
    setSubmitting(true);
    try {
      await createMutation.mutateAsync({
        title,
        description,
        competitionTag,
        date,
        format,
        location,
        organizer,
        registrationUrl,
        registrationDeadline,
        prizePool,
        teamSizeHint,
        imageUrl,
      });
      setTitle('');
      setDescription('');
      setCompetitionTag('');
      setDate('');
      setFormat('offline');
      setLocation('');
      setOrganizer('');
      setRegistrationUrl('');
      setRegistrationDeadline('');
      setPrizePool('');
      setTeamSizeHint('');
      setImageUrl('');
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Add an event">
      <div className="space-y-4">
        <Input label="Title" placeholder="AI Hackathon 2026" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Textarea
          label="Description"
          placeholder="What it is, who it's for, why teammates matter here..."
          maxLength={800}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <Input
          label="Competition tag"
          placeholder="AI Hackathon 2026"
          value={competitionTag}
          onChange={(e) => setCompetitionTag(e.target.value)}
        />
        <p className="-mt-3 text-xs text-surface-400">
          Should match what people type under "Desired competitions" on Looking for team - this is how "Find a team"
          filters the feed.
        </p>

        <div className="grid grid-cols-2 gap-3">
          <Input label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-surface-700">Format</span>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value as EventFormat)}
              className="w-full rounded-xl border border-surface-200 bg-white px-3.5 py-2.5 text-sm focus:border-accent-500"
            >
              {EVENT_FORMAT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {format !== 'online' && (
          <Input
            label="Location"
            placeholder="Almaty, or the venue address"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        )}

        <Input
          label="Organizer (optional)"
          placeholder="NIS Almaty, Astana Hub..."
          value={organizer}
          onChange={(e) => setOrganizer(e.target.value)}
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Registration link (optional)"
            placeholder="https://..."
            value={registrationUrl}
            onChange={(e) => setRegistrationUrl(e.target.value)}
          />
          <Input
            label="Registration deadline (optional)"
            type="date"
            value={registrationDeadline}
            onChange={(e) => setRegistrationDeadline(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Prize pool (optional)"
            placeholder="500 000 KZT"
            value={prizePool}
            onChange={(e) => setPrizePool(e.target.value)}
          />
          <Input
            label="Team size (optional)"
            placeholder="Teams of 2-4"
            value={teamSizeHint}
            onChange={(e) => setTeamSizeHint(e.target.value)}
          />
        </div>

        <Input label="Image URL (optional)" placeholder="https://..." value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
        <Button className="w-full" onClick={submit} loading={submitting}>
          Publish event
        </Button>
      </div>
    </Modal>
  );
}
