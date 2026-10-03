import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input, Textarea } from '@/components/ui/Input';
import { EVENT_FORMAT_OPTIONS } from '@/constants/options';
import { useCreateEvent, useUpdateEvent, type EventInput } from '@/hooks/useEvents';
import { toast, errorToMessage } from '@/lib/toast';
import { useT } from '@/i18n';
import type { EventFormat, EventResource } from '@/types';

function emptyInput(): EventInput {
  return {
    title: '',
    description: '',
    competitionTag: '',
    date: '',
    format: 'offline',
    location: '',
    organizer: '',
    registrationUrl: '',
    registrationDeadline: '',
    prizePool: '',
    teamSizeHint: '',
    imageUrl: '',
    resources: [],
    sourceUrl: null,
  };
}

/**
 * Moderator-only create/edit form. `eventId` set → edit that event;
 * otherwise creates one. `initial` prefills either mode — the drafts queue
 * uses it to open an auto-collected event for review before publishing.
 */
export function EventFormModal({
  open,
  onClose,
  eventId,
  initial,
  title,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  eventId?: string;
  initial?: Partial<EventInput>;
  title?: string;
  onSaved?: (id: string) => void;
}) {
  const tAll = useT();
  const t = tAll.eventForm;
  const createMutation = useCreateEvent();
  const updateMutation = useUpdateEvent();
  const [form, setForm] = useState<EventInput>(() => ({ ...emptyInput(), ...initial }));
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof EventInput>(key: K, value: EventInput[K]) => setForm((f) => ({ ...f, [key]: value }));
  const resources = form.resources ?? [];

  const setResource = (i: number, patch: Partial<EventResource>) =>
    set(
      'resources',
      resources.map((r, idx) => (idx === i ? { ...r, ...patch } : r)),
    );

  const submit = async () => {
    setError(null);
    if (!form.title.trim() || !form.description.trim() || !form.date) {
      return setError(t.required);
    }
    // The tag is how "Find a team" links people up — default it to the
    // title so a moderator approving a draft doesn't have to think about it.
    const input = { ...form, competitionTag: form.competitionTag.trim() || form.title.trim() };
    try {
      if (eventId) {
        await updateMutation.mutateAsync({ id: eventId, input });
        onSaved?.(eventId);
      } else {
        const id = await createMutation.mutateAsync(input);
        onSaved?.(id);
      }
      toast.success(eventId ? t.updated : t.published);
      if (!eventId) setForm(emptyInput());
      onClose();
    } catch (e) {
      setError(errorToMessage(e));
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={title ?? t.addTitle}>
      <div className="space-y-4">
        <Input label={t.title} placeholder="AI Hackathon 2026" value={form.title} onChange={(e) => set('title', e.target.value)} />
        <Textarea
          label={t.description}
          placeholder={t.descPlaceholder}
          maxLength={800}
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
        />
        <Input
          label={t.tag}
          placeholder={t.tagPlaceholder}
          value={form.competitionTag}
          onChange={(e) => set('competitionTag', e.target.value)}
        />
        <p className="-mt-3 text-xs text-surface-400">{t.tagHint}</p>

        <div className="grid grid-cols-2 gap-3">
          <Input label={t.date} type="date" value={form.date} onChange={(e) => set('date', e.target.value)} />
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-surface-700">{t.format}</span>
            <select
              value={form.format}
              onChange={(e) => set('format', e.target.value as EventFormat)}
              className="w-full rounded-xl border border-surface-400 bg-white px-3.5 py-2.5 text-sm focus:border-accent-500"
            >
              {EVENT_FORMAT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {tAll.format[opt.value]}
                </option>
              ))}
            </select>
          </label>
        </div>

        {form.format !== 'online' && (
          <Input
            label={t.location}
            placeholder={t.locationPlaceholder}
            value={form.location}
            onChange={(e) => set('location', e.target.value)}
          />
        )}

        <Input
          label={t.organizer}
          placeholder="NIS Almaty, Astana Hub..."
          value={form.organizer}
          onChange={(e) => set('organizer', e.target.value)}
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label={t.regLink}
            placeholder="https://..."
            value={form.registrationUrl}
            onChange={(e) => set('registrationUrl', e.target.value)}
          />
          <Input
            label={t.regDeadline}
            type="date"
            value={form.registrationDeadline}
            onChange={(e) => set('registrationDeadline', e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label={t.prize}
            placeholder="500 000 KZT"
            value={form.prizePool}
            onChange={(e) => set('prizePool', e.target.value)}
          />
          <Input
            label={t.teamSize}
            placeholder="Teams of 2-4"
            value={form.teamSizeHint}
            onChange={(e) => set('teamSizeHint', e.target.value)}
          />
        </div>

        <Input
          label={t.image}
          placeholder="https://..."
          value={form.imageUrl ?? ''}
          onChange={(e) => set('imageUrl', e.target.value)}
        />

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-sm font-medium text-surface-700">{t.materials}</span>
            <button
              type="button"
              onClick={() => set('resources', [...resources, { title: '', url: '' }])}
              className="inline-flex items-center gap-1 text-xs font-medium text-accent-600 hover:underline"
            >
              <Plus size={12} /> {t.addLink}
            </button>
          </div>
          <p className="mb-2 text-xs text-surface-400">{t.materialsHint}</p>
          <div className="space-y-2">
            {resources.map((r, i) => (
              <div key={i} className="flex gap-2">
                <input
                  value={r.title}
                  onChange={(e) => setResource(i, { title: e.target.value })}
                  placeholder={t.materialTitle}
                  className="w-2/5 rounded-xl border border-surface-400 px-3 py-2 text-sm focus:border-accent-500"
                />
                <input
                  value={r.url}
                  onChange={(e) => setResource(i, { url: e.target.value })}
                  placeholder="https://..."
                  className="min-w-0 flex-1 rounded-xl border border-surface-400 px-3 py-2 text-sm focus:border-accent-500"
                />
                <button
                  type="button"
                  aria-label="Remove link"
                  onClick={() => set('resources', resources.filter((_, idx) => idx !== i))}
                  className="rounded-lg p-2 text-surface-400 hover:bg-surface-100"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <Button className="w-full" onClick={submit} loading={createMutation.isPending || updateMutation.isPending}>
          {eventId ? tAll.common.saveChanges : t.publish}
        </Button>
      </div>
    </Modal>
  );
}
