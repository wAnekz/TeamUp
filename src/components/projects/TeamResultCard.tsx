import { useState } from 'react';
import { Trophy, ExternalLink } from 'lucide-react';
import { Timestamp, serverTimestamp } from 'firebase/firestore';
import { Card } from '@/components/ui/primitives';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useUpdateProject } from '@/hooks/useProjects';
import { formatDeadline, isDeadlinePassed } from '@/utils/dates';
import { toast, errorToMessage } from '@/lib/toast';
import { useT } from '@/i18n';
import type { Project } from '@/types';
import { safeUrl } from '@/utils/safeUrl';

/**
 * Closing the loop after an event: the lead records how it went, and
 * functions/src/teamResults.ts copies it into every teammate's portfolio.
 * Everyone else just sees the result banner.
 */
export function TeamResultCard({ project, isOwner }: { project: Project; isOwner: boolean }) {
  const t = useT().teamResult;
  const update = useUpdateProject();
  const result = project.result;
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(result?.text ?? '');
  const [eventName, setEventName] = useState(result?.eventName ?? project.title);
  const [date, setDate] = useState(
    (result?.date ?? project.deadline)?.toDate().toISOString().slice(0, 10) ?? new Date().toISOString().slice(0, 10),
  );
  const [link, setLink] = useState(result?.link ?? '');
  const [error, setError] = useState<string | null>(null);

  // Worth asking once the event is over (deadline passed) or the team has
  // stopped recruiting; before that it's just noise on the page.
  const eventOver = isDeadlinePassed(project.deadline) || project.status !== 'open';
  if (!result && !(isOwner && eventOver)) return null;

  const save = async () => {
    setError(null);
    if (!text.trim() || !eventName.trim()) return setError(t.needFields);
    try {
      await update.mutateAsync({
        id: project.id,
        patch: {
          result: {
            text: text.trim().slice(0, 60),
            eventName: eventName.trim().slice(0, 100),
            date: date ? Timestamp.fromDate(new Date(date)) : null,
            link: /^https?:\/\//.test(link.trim()) ? link.trim() : null,
            recordedAt: serverTimestamp() as unknown as Timestamp,
          },
        },
      });
      toast.success(t.saved);
      setEditing(false);
    } catch (e) {
      setError(errorToMessage(e));
    }
  };

  if (result && !editing) {
    return (
      <Card className="flex items-start gap-3 border-amber-200 bg-amber-50">
        <Trophy size={22} className="mt-0.5 shrink-0 text-amber-500" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-amber-700">{t.title}</p>
          <p className="font-semibold text-surface-900">
            {result.text} · {result.eventName}
          </p>
          <div className="mt-0.5 flex flex-wrap gap-3 text-xs text-surface-500">
            {result.date && <span>{formatDeadline(result.date)}</span>}
            {safeUrl(result.link) && (
              <a
                href={safeUrl(result.link)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-accent-600 hover:underline"
              >
                <ExternalLink size={11} /> {t.link.replace(/\s*\(.*\)$/, '')}
              </a>
            )}
          </div>
        </div>
        {isOwner && (
          <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
            {t.edit}
          </Button>
        )}
      </Card>
    );
  }

  return (
    <Card className="border-amber-200">
      <p className="flex items-center gap-1.5 font-semibold text-surface-900">
        <Trophy size={16} className="text-amber-500" /> {t.title}
      </p>
      <p className="mt-1 text-sm text-surface-500">{t.prompt}</p>
      <div className="mt-4 space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input
            label={t.result}
            placeholder={t.resultPlaceholder}
            maxLength={60}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <Input label={t.eventName} maxLength={100} value={eventName} onChange={(e) => setEventName(e.target.value)} />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input label={t.date} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <Input label={t.link} placeholder="https://" value={link} onChange={(e) => setLink(e.target.value)} />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button onClick={save} loading={update.isPending}>
          {t.save}
        </Button>
      </div>
    </Card>
  );
}
