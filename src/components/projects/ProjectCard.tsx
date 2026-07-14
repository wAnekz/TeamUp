import { Link, useNavigate } from 'react-router-dom';
import { Clock, Eye, Star, Users } from 'lucide-react';
import { Card, Badge, Avatar } from '@/components/ui/primitives';
import { formatDeadline, isDeadlinePassed, timeAgo } from '@/utils/dates';
import { DISPLAY_STATUS_LABEL, DISPLAY_STATUS_TONE, formatMembers, getDisplayStatus } from '@/utils/projectStatus';
import { useAuth } from '@/contexts/AuthContext';
import { useSavedProjectIds, useToggleSaveProject } from '@/hooks/useSavedProjects';
import { cn } from '@/utils/cn';
import type { Project } from '@/types';

export function ProjectCard({ project, matchScore }: { project: Project; matchScore?: number }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const openSlots = project.roles.reduce((sum, r) => sum + Math.max(0, r.slotsTotal - r.slotsFilled), 0);
  const deadlineSoon = project.deadline && !isDeadlinePassed(project.deadline);
  const displayStatus = getDisplayStatus(project);

  const { data: savedIds } = useSavedProjectIds(user?.uid);
  const toggleSave = useToggleSaveProject(user?.uid);
  const isSaved = savedIds?.has(project.id) ?? false;

  const goToAuthor = (e: React.MouseEvent | React.KeyboardEvent) => {
    // The whole card is already an <a> (see below), and HTML doesn't allow
    // an <a> inside another <a> — so the author bit is a fake link (span +
    // keyboard handling) that stops the click from bubbling to the card's
    // Link instead of being a real nested <Link>.
    e.preventDefault();
    e.stopPropagation();
    navigate(`/users/${project.authorId}`);
  };

  return (
    <Link to={`/projects/${project.id}`}>
      <Card className="relative h-full transition-shadow hover:shadow-popover">
        <button
          type="button"
          aria-label={isSaved ? 'Remove from saved' : 'Save project'}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (user) toggleSave.mutate({ projectId: project.id, save: !isSaved });
          }}
          className="absolute right-4 top-4 rounded-lg p-1 text-surface-300 hover:bg-surface-100 hover:text-amber-500"
        >
          <Star size={16} className={cn(isSaved && 'fill-amber-400 text-amber-500')} />
        </button>

        <div className="flex items-start justify-between gap-3 pr-6">
          <h3 className="line-clamp-2 text-base font-semibold text-surface-900">{project.title}</h3>
          <Badge tone={project.type === 'event' ? 'accent' : 'gray'}>{project.type === 'event' ? 'Event' : 'Ongoing'}</Badge>
        </div>

        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <Badge tone={DISPLAY_STATUS_TONE[displayStatus]}>{DISPLAY_STATUS_LABEL[displayStatus]}</Badge>
          {matchScore !== undefined && <Badge tone="accent">{matchScore}% match</Badge>}
        </div>

        <p className="mt-2 line-clamp-2 text-sm text-surface-500">{project.description}</p>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {project.interests.slice(0, 3).map((i) => (
            <Badge key={i} tone="gray">
              {i}
            </Badge>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-surface-100 pt-3.5">
          <span
            role="link"
            tabIndex={0}
            onClick={goToAuthor}
            onKeyDown={(e) => e.key === 'Enter' && goToAuthor(e)}
            className="flex items-center gap-2 hover:underline"
          >
            <Avatar src={project.authorAvatarUrl} name={project.authorName} size={24} />
            <span className="text-xs text-surface-500">{project.authorName}</span>
          </span>
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
            {project.viewCount ?? 0} views
          </span>
          <span>{timeAgo(project.updatedAt)}</span>
        </div>

        {openSlots > 0 && (
          <div className="mt-2">
            <Badge tone="green">{openSlots} open slot{openSlots > 1 ? 's' : ''}</Badge>
          </div>
        )}
      </Card>
    </Link>
  );
}
