import { useRef, useState } from 'react';
import { Award, ExternalLink, FileText, Medal, Paperclip, Pencil, Plus, Trash2, Trophy } from 'lucide-react';
import { Card, Badge, Skeleton } from '@/components/ui/primitives';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input, Textarea } from '@/components/ui/Input';
import {
  ACHIEVEMENT_ACCEPT,
  ACHIEVEMENT_MAX_FILE_MB,
  useAchievements,
  useDeleteAchievement,
  useSaveAchievement,
} from '@/hooks/useAchievements';
import { ACHIEVEMENT_TYPE_OPTIONS } from '@/constants/options';
import { formatDeadline } from '@/utils/dates';
import { toast, errorToMessage } from '@/lib/toast';
import { useT } from '@/i18n';
import type { Achievement, AchievementType } from '@/types';
import { safeUrl } from '@/utils/safeUrl';

const TYPE_ICON: Record<AchievementType, typeof Trophy> = {
  hackathon: Trophy,
  olympiad: Medal,
  certificate: Award,
  project: FileText,
  other: Award,
};

/**
 * Portfolio block shared by the public profile (read-only) and My Profile
 * (editable). Files are shown inline for images and as a link for PDFs so a
 * university admissions reader can open the actual diploma.
 */
export function AchievementsSection({ uid, editable = false }: { uid: string; editable?: boolean }) {
  const { data: achievements, isLoading } = useAchievements(uid);
  const deleteMutation = useDeleteAchievement(uid);
  const [editing, setEditing] = useState<Achievement | 'new' | null>(null);
  const tAll = useT();
  const t = tAll.achievements;

  if (!editable && !isLoading && (!achievements || achievements.length === 0)) return null;

  return (
    <Card className="print:break-inside-avoid print:shadow-none">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-surface-700">{t.title}</p>
        {editable && (
          <Button size="sm" variant="secondary" onClick={() => setEditing('new')} className="print:hidden">
            <Plus size={14} /> {t.add}
          </Button>
        )}
      </div>

      {isLoading && <Skeleton className="h-16" />}

      {!isLoading && achievements?.length === 0 && <p className="text-xs text-surface-400">{t.emptyHint}</p>}

      <div className="space-y-3">
        {achievements?.map((a) => {
          const Icon = TYPE_ICON[a.type] ?? Award;
          const isImage = a.fileType?.startsWith('image/');
          return (
            <div key={a.id} className="flex gap-3 border-t border-surface-100 pt-3 first:border-0 first:pt-0">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-50 text-accent-600">
                <Icon size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-surface-900">{a.title}</p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-surface-500">
                      <Badge tone="gray">{t.types[a.type]}</Badge>
                      {a.result && <Badge tone="yellow">{a.result}</Badge>}
                      {a.fromProjectId && <Badge tone="green">✓ {tAll.teamResult.confirmedByTeam}</Badge>}
                      {a.date && <span>{formatDeadline(a.date)}</span>}
                    </div>
                  </div>
                  {editable && (
                    <div className="flex shrink-0 gap-1 print:hidden">
                      {!a.fromProjectId && (
                        <button
                          type="button"
                          aria-label={t.edit}
                          onClick={() => setEditing(a)}
                          className="rounded-lg p-1.5 text-surface-400 hover:bg-surface-100 hover:text-surface-700"
                        >
                          <Pencil size={14} />
                        </button>
                      )}
                      <button
                        type="button"
                        aria-label={t.deleteLabel}
                        onClick={() => {
                          if (confirm(t.confirmDelete(a.title))) {
                            deleteMutation.mutate(a, { onSuccess: () => toast.success(t.deleted) });
                          }
                        }}
                        className="rounded-lg p-1.5 text-surface-400 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
                {a.description && (
                  <p className="mt-1.5 whitespace-pre-wrap text-sm text-surface-600">{a.description}</p>
                )}
                {a.role && (
                  <p className="mt-0.5 text-xs text-surface-500">
                    {tAll.teamResult.asRole(a.role === 'lead' ? tAll.teams.lead : a.role)}
                  </p>
                )}
                {safeUrl(a.fileUrl) && isImage && (
                  <a href={safeUrl(a.fileUrl)} target="_blank" rel="noopener noreferrer" className="mt-2 block">
                    <img
                      src={safeUrl(a.fileUrl)}
                      alt={a.fileName ?? a.title}
                      className="max-h-48 rounded-xl border border-surface-200 object-contain"
                    />
                  </a>
                )}
                <div className="mt-1.5 flex flex-wrap gap-3 text-xs">
                  {safeUrl(a.fileUrl) && !isImage && (
                    <a
                      href={safeUrl(a.fileUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-accent-600 hover:underline"
                    >
                      <Paperclip size={12} /> {a.fileName ?? t.openFile}
                    </a>
                  )}
                  {a.link && safeUrl(a.link) && (
                    <a
                      href={safeUrl(a.link)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-accent-600 hover:underline"
                    >
                      <ExternalLink size={12} /> {a.link.replace(/^https?:\/\//, '').slice(0, 40)}
                    </a>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {editable && editing && (
        <AchievementModal
          uid={uid}
          existing={editing === 'new' ? undefined : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </Card>
  );
}

function AchievementModal({ uid, existing, onClose }: { uid: string; existing?: Achievement; onClose: () => void }) {
  const saveMutation = useSaveAchievement(uid);
  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState(existing?.title ?? '');
  const [type, setType] = useState<AchievementType>(existing?.type ?? 'hackathon');
  const [result, setResult] = useState(existing?.result ?? '');
  const [date, setDate] = useState(existing?.date ? existing.date.toDate().toISOString().slice(0, 10) : '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [link, setLink] = useState(existing?.link ?? '');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const tAll = useT();
  const t = tAll.achievements;

  const submit = async () => {
    setError(null);
    if (!title.trim()) return setError(t.needTitle);
    if (link.trim() && !safeUrl(link)) return setError(t.linkHttps);
    try {
      await saveMutation.mutateAsync({
        id: existing?.id,
        existing,
        input: { title, type, result, date, description, link, file },
      });
      toast.success(existing ? t.updated : t.added);
      onClose();
    } catch (e) {
      setError(errorToMessage(e));
    }
  };

  return (
    <Modal open onClose={onClose} title={existing ? t.edit : t.addTitle}>
      <div className="space-y-4">
        <Input
          label={t.titleLabel}
          placeholder="Astana Hub Hackathon 2026"
          maxLength={100}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-surface-700">{t.type}</span>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as AchievementType)}
              className="w-full rounded-xl border border-surface-200 bg-white px-3.5 py-2.5 text-sm focus:border-accent-500"
            >
              {ACHIEVEMENT_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {t.types[o.value]}
                </option>
              ))}
            </select>
          </label>
          <Input label={t.date} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <Input
          label={t.result}
          placeholder={t.resultPlaceholder}
          maxLength={60}
          value={result}
          onChange={(e) => setResult(e.target.value)}
        />
        <Textarea
          label={t.what}
          placeholder={t.whatPlaceholder}
          maxLength={400}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <Input label={t.link} placeholder={t.linkPlaceholder} value={link} onChange={(e) => setLink(e.target.value)} />

        <div>
          <span className="mb-1.5 block text-sm font-medium text-surface-700">{t.file}</span>
          <input
            ref={fileRef}
            type="file"
            accept={ACHIEVEMENT_ACCEPT}
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <Button type="button" variant="secondary" className="w-full" onClick={() => fileRef.current?.click()}>
            <Paperclip size={14} />
            {file ? file.name : existing?.fileName ? t.replace(existing.fileName) : t.attach}
          </Button>
          <p className="mt-1 text-xs text-surface-400">{t.fileHint(ACHIEVEMENT_MAX_FILE_MB)}</p>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <Button className="w-full" onClick={submit} loading={saveMutation.isPending}>
          {existing ? tAll.common.save : t.addTitle}
        </Button>
      </div>
    </Modal>
  );
}
