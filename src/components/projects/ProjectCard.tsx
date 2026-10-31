import { Link } from 'react-router-dom';
import { Clock, Eye, Star, Users } from 'lucide-react';
import { Card, Badge, Avatar } from '@/components/ui/primitives';
import { formatDeadline, isDeadlinePassed, timeAgo } from '@/utils/dates';
import { displayStatusLabel, DISPLAY_STATUS_TONE, formatMembers, getDisplayStatus } from '@/utils/projectStatus';
import { useAuth } from '@/contexts/useAuth';
import { useSavedProjectIds, useToggleSaveProject } from '@/hooks/useSavedProjects';
import { useAuthGate } from '@/hooks/useAuthGate';
import { interestLabel, useT } from '@/i18n';
import { cn } from '@/utils/cn';
import type { Project } from '@/types';

export function ProjectCard({ project, matchScore }: { project: Project; matchScore?: number }) {
  const { user } = useAuth();
  const { requireAccount } = useAuthGate();
  const t = useT();
  // Guests read the anonymized mirror (no authorName/authorId).
  const authorName = project.authorName ?? t.card.student;
  const openSlots = project.roles.reduce((sum, r) => sum + Math.max(0, r.slotsTotal - r.slotsFilled), 0);
  const deadlineSoon = project.deadline && !isDeadlinePassed(project.deadline);
  const displayStatus = getDisplayStatus(project);

  const { data: savedIds } = useSavedProjectIds(user?.uid);
  const toggleSave = useToggleSaveProject(user?.uid);
  const isSaved = savedIds?.has(project.id) ?? false;

  return (
    // Stretched link: the title's ::after covers the card, so the whole card
    // opens the project while the star and the author link stay real
    // controls beside it (a <button> nested in an <a> is invalid HTML and
    // reads badly in screen readers). z-10 lifts those two above the overlay.
    <Card className="relative h-full transition-shadow hover:shadow-popover">
      <button
        type="button"
        aria-label={isSaved ? t.card.unsave : t.card.save}
        aria-pressed={isSaved}
        onClick={() => {
          if (user) toggleSave.mutate({ projectId: project.id, save: !isSaved });
          else requireAccount();
        }}
        className="absolute right-3 top-3 z-10 rounded-lg p-1.5 text-surface-400 after:absolute after:-inset-2 after:content-[''] hover:bg-surface-100 hover:text-amber-500"
      >
        <Star size={16} className={cn(isSaved && 'fill-amber-400 text-amber-500')} />
      </button>

      <div className="flex items-start justify-between gap-3 pr-7">
        <h3 className="line-clamp-2 text-base font-semibold text-surface-900">
          <Link
            to={`/projects/${project.id}`}
            className="after:absolute after:inset-0 after:rounded-2xl after:content-['']"
          >
            {project.title}
          </Link>
        </h3>
        <Badge tone={project.type === 'event' ? 'accent' : 'gray'}>{project.type === 'event' ? t.status.event : t.status.ongoing}</Badge>
      </div>

      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        <Badge tone={DISPLAY_STATUS_TONE[displayStatus]}>{displayStatusLabel(displayStatus)}</Badge>
        {matchScore !== undefined && <Badge tone="accent">{t.card.match(matchScore)}</Badge>}
      </div>

      <p className="mt-2 line-clamp-2 text-sm text-surface-500">{project.description}</p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {project.interests.slice(0, 3).map((i) => (
          <Badge key={i} tone="gray">
            {interestLabel(t, i)}
          </Badge>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-surface-100 pt-3.5">
        {/* Guests read the anonymized mirror, which has no authorId, so
            for them the author is plain text rather than a link. */}
        {project.authorId ? (
          <Link
            to={`/users/${project.authorId}`}
            className="relative z-10 flex min-w-0 items-center gap-2 hover:underline"
          >
            <Avatar src={project.authorAvatarUrl} name={authorName} size={24} />
            <span className="truncate text-xs text-surface-500">{authorName}</span>
          </Link>
        ) : (
          <span className="flex min-w-0 items-center gap-2">
            <Avatar src={project.authorAvatarUrl} name={authorName} size={24} />
            <span className="truncate text-xs text-surface-500">{authorName}</span>
          </span>
        )}
        <div className="flex items-center gap-3 text-xs text-surface-500">
          <span className="flex items-center gap-1">
            <Users size={13} />
            {formatMembers(project)}
          </span>
          {deadlineSoon && (
            <span className="flex items-center gap-1">
              <Clock size={13} />
              {formatDeadline(project.deadline)}
            </span>
          )}
        </div>
      </div>

      <div className="mt-2.5 flex items-center justify-between text-[11px] text-surface-400">
        <span className="flex items-center gap-1">
          <Eye size={12} />
          {t.common.views(project.viewCount ?? 0)}
        </span>
        <span>{timeAgo(project.updatedAt)}</span>
      </div>

      {openSlots > 0 && (
        <div className="mt-2">
          <Badge tone="green">{t.card.openSlots(openSlots)}</Badge>
        </div>
      )}
    </Card>
  );
}
