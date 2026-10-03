import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Send, Globe, X } from 'lucide-react';
import { Card, Badge, Skeleton } from '@/components/ui/primitives';
import { Button } from '@/components/ui/Button';
import { EventFormModal } from '@/components/events/EventFormModal';
import { useAuth } from '@/contexts/useAuth';
import { useIsModerator } from '@/hooks/useReports';
import {
  useEventSources,
  usePendingEventDrafts,
  useSaveEventSources,
  useSetEventDraftStatus,
  type EventInput,
} from '@/hooks/useEvents';
import { formatDeadline, timeAgo } from '@/utils/dates';
import { toast } from '@/lib/toast';
import type { EventDraft } from '@/types';
import { useT } from '@/i18n';
import { safeUrl } from '@/utils/safeUrl';

function toDateInput(ts: EventDraft['date']) {
  return ts ? ts.toDate().toISOString().slice(0, 10) : '';
}

function draftToInput(d: EventDraft): Partial<EventInput> {
  return {
    title: d.title,
    description: d.description.slice(0, 800),
    competitionTag: d.title,
    date: toDateInput(d.date),
    format: d.format ?? 'online',
    location: d.location ?? '',
    organizer: d.organizer ?? '',
    registrationUrl: d.registrationUrl ?? d.sourceUrl,
    registrationDeadline: toDateInput(d.registrationDeadline),
    prizePool: d.prizePool ?? '',
    imageUrl: d.imageUrl ?? '',
    sourceUrl: d.sourceUrl,
    country: d.country ?? (d.source === 'telegram' ? 'KZ' : null),
    descriptionI18n: d.descriptionI18n ?? null,
  };
}

/**
 * Review queue for events the collectEvents function found on its own
 * (Devpost, public Telegram channels and organizer websites). Nothing reaches /events without a
 * moderator opening it here — the extractor is good, not trustworthy.
 */
export default function EventDrafts() {
  const { user } = useAuth();
  const { data: isModerator, isLoading: checking } = useIsModerator(user?.uid);
  const { data: drafts, isLoading } = usePendingEventDrafts(!!isModerator);
  const setStatus = useSetEventDraftStatus();
  const [reviewing, setReviewing] = useState<EventDraft | null>(null);
  const tAll = useT();
  const t = tAll.eventDrafts;

  if (checking) return <Skeleton className="h-40" />;
  if (!isModerator) {
    return <p className="mx-auto max-w-md text-center text-sm text-surface-500">{tAll.errors.moderatorsOnly}</p>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link to="/events" className="inline-flex items-center gap-1 text-sm text-surface-500 hover:text-surface-700">
        <ArrowLeft size={14} /> {tAll.nav.events}
      </Link>
      <div>
        <h1 className="text-xl font-bold text-surface-900">{t.title}</h1>
        <p className="mt-1 text-sm text-surface-500">{t.subtitle}</p>
      </div>

      <SourcesCard />

      {isLoading && <Skeleton className="h-28" />}
      {!isLoading && drafts?.length === 0 && (
        <p className="rounded-2xl border border-dashed border-surface-300 py-12 text-center text-sm text-surface-500">
          {t.empty}
        </p>
      )}

      {drafts?.map((d) => (
        <Card key={d.id}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge tone="gray">
                  {d.source === 'telegram' ? <Send size={10} className="mr-1" /> : <Globe size={10} className="mr-1" />}
                  {d.source}
                </Badge>
                {d.forSchoolStudents === true && <Badge tone="green">{t.fits}</Badge>}
                {d.forSchoolStudents === false && <Badge tone="red">{t.notFits}</Badge>}
                <span className="text-xs text-surface-400">{timeAgo(d.createdAt, 'Created')}</span>
              </div>
              <p className="mt-2 font-medium text-surface-900">{d.title}</p>
              <p className="mt-1 line-clamp-3 text-sm text-surface-600">{d.description}</p>
              <div className="mt-2 flex flex-wrap gap-3 text-xs text-surface-500">
                {d.date && <span>{t.date(formatDeadline(d.date))}</span>}
                {d.registrationDeadline && <span>{tAll.events.registerBy(formatDeadline(d.registrationDeadline))}</span>}
                {d.organizer && <span>{d.organizer}</span>}
                <a
                  href={safeUrl(d.sourceUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-accent-600 hover:underline"
                >
                  <ExternalLink size={11} /> {t.source}
                </a>
              </div>
            </div>
          </div>
          <div className="mt-3 flex gap-2 border-t border-surface-100 pt-3">
            <Button size="sm" onClick={() => setReviewing(d)}>
              {t.review}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              loading={setStatus.isPending && setStatus.variables?.id === d.id}
              onClick={() => setStatus.mutate({ id: d.id, status: 'rejected' }, { onSuccess: () => toast.info(t.rejected) })}
            >
              {t.reject}
            </Button>
          </div>
        </Card>
      ))}

      {reviewing && (
        <EventFormModal
          open
          key={reviewing.id}
          title={tAll.eventForm.reviewTitle}
          initial={draftToInput(reviewing)}
          onClose={() => setReviewing(null)}
          onSaved={() => setStatus.mutate({ id: reviewing.id, status: 'approved' })}
        />
      )}
    </div>
  );
}

function SourcesCard() {
  const { data: sources } = useEventSources(true);
  const save = useSaveEventSources();
  const [channels, setChannels] = useState<string[]>([]);
  const [websites, setWebsites] = useState<string[]>([]);
  const [devpost, setDevpost] = useState(true);
  const [input, setInput] = useState('');
  const [siteInput, setSiteInput] = useState('');
  const tAll = useT();
  const t = tAll.eventDrafts;

  useEffect(() => {
    if (!sources) return;
    setChannels(sources.telegramChannels);
    setWebsites(sources.websites);
    setDevpost(sources.devpost);
  }, [sources]);

  const add = () => {
    // Accept "@name", "t.me/name" or "https://t.me/s/name" — store the bare handle.
    const handle = input
      .trim()
      .replace(/^https?:\/\/t\.me\/(s\/)?/i, '')
      .replace(/^@/, '')
      .split(/[/?]/)[0];
    if (!/^[A-Za-z0-9_]{4,64}$/.test(handle) || channels.includes(handle)) return;
    setChannels([...channels, handle]);
    setInput('');
  };

  const addSite = () => {
    let url: URL;
    try {
      url = new URL(/^https?:\/\//i.test(siteInput.trim()) ? siteInput.trim() : `https://${siteInput.trim()}`);
    } catch {
      return;
    }
    if (!/^https?:$/.test(url.protocol) || !url.hostname.includes('.') || websites.includes(url.href)) return;
    if (websites.length >= 20) return; // the collector reads at most 20
    setWebsites([...websites, url.href]);
    setSiteInput('');
  };

  const dirty =
    !!sources &&
    (devpost !== sources.devpost ||
      channels.join(',') !== sources.telegramChannels.join(',') ||
      websites.join(',') !== sources.websites.join(','));

  return (
    <Card>
      <p className="text-sm font-medium text-surface-700">{t.sources}</p>
      <label className="mt-2 flex items-center gap-2 text-sm text-surface-700">
        <input type="checkbox" checked={devpost} onChange={(e) => setDevpost(e.target.checked)} className="rounded" />
        {t.devpost}
      </label>
      <p className="mt-3 text-xs text-surface-500">{t.tgChannels}</p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {channels.map((c) => (
          <span key={c} className="inline-flex items-center gap-1 rounded-full bg-surface-100 px-2.5 py-1 text-xs text-surface-700">
            @{c}
            <button type="button" aria-label={`Remove ${c}`} onClick={() => setChannels(channels.filter((x) => x !== c))}>
              <X size={11} />
            </button>
          </span>
        ))}
        {channels.length === 0 && <span className="text-xs text-surface-400">{t.none}</span>}
      </div>
      <div className="mt-2 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), add())}
          placeholder="@channel or t.me/channel"
          className="min-w-0 flex-1 rounded-xl border border-surface-400 px-3 py-2 text-sm focus:border-accent-500"
        />
        <Button size="sm" variant="secondary" onClick={add} type="button">
          {tAll.common.add}
        </Button>
      </div>
      <p className="mt-4 text-xs text-surface-500">{t.websites}</p>
      <ul className="mt-1.5 space-y-1">
        {websites.map((w) => (
          <li key={w} className="flex items-center gap-2 text-xs text-surface-700">
            <span className="min-w-0 flex-1 truncate">{w}</span>
            <button
              type="button"
              aria-label={`Remove ${w}`}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg hover:bg-surface-100"
              onClick={() => setWebsites(websites.filter((x) => x !== w))}
            >
              <X size={12} />
            </button>
          </li>
        ))}
        {websites.length === 0 && <li className="text-xs text-surface-400">{t.none}</li>}
      </ul>
      <div className="mt-2 flex gap-2">
        <input
          value={siteInput}
          onChange={(e) => setSiteInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSite())}
          placeholder="https://example.kz/events"
          inputMode="url"
          aria-label={t.websites}
          className="min-w-0 flex-1 rounded-xl border border-surface-400 px-3 py-2 text-sm focus:border-accent-500"
        />
        <Button size="sm" variant="secondary" onClick={addSite} type="button">
          {tAll.common.add}
        </Button>
      </div>
      {dirty && (
        <Button
          size="sm"
          className="mt-3"
          loading={save.isPending}
          onClick={() => save.mutate({ telegramChannels: channels, websites, devpost }, { onSuccess: () => toast.success(t.sourcesSaved) })}
        >
          {t.saveSources}
        </Button>
      )}
    </Card>
  );
}
