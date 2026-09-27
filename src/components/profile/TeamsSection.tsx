import { Link } from 'react-router-dom';
import { BadgeCheck, Crown, Users } from 'lucide-react';
import { Card, Badge, Skeleton } from '@/components/ui/primitives';
import { useAuthorProjects, useMemberProjects } from '@/hooks/useProjects';
import { displayStatusLabel, DISPLAY_STATUS_TONE, formatMembers, getDisplayStatus } from '@/utils/projectStatus';
import { formatDeadline } from '@/utils/dates';
import type { Project } from '@/types';
import { useT } from '@/i18n';

interface TeamEntry {
  project: Project;
  role: string;
  isOwner: boolean;
}

/**
 * Every team this person is on: projects they started plus ones they were
 * accepted onto. Membership entries carry a "confirmed" mark — they only
 * exist because the project's captain accepted this person.
 */
export function TeamsSection({ uid, emptyText }: { uid: string; emptyText: string }) {
  const { data: owned, isLoading: loadingOwned } = useAuthorProjects(uid);
  const { data: joined, isLoading: loadingJoined } = useMemberProjects(uid);
  const tAll = useT();
  const t = tAll.teams;

  if (loadingOwned || loadingJoined) return <Skeleton className="h-28" />;

  const entries: TeamEntry[] = [
    ...(owned ?? []).map((project) => ({ project, role: t.lead, isOwner: true })),
    ...(joined ?? []).map((project) => ({ project, role: project.memberRoles?.[uid] ?? t.member, isOwner: false })),
  ].sort((a, b) => (b.project.createdAt?.toMillis() ?? 0) - (a.project.createdAt?.toMillis() ?? 0));

  return (
    <Card className="print:break-inside-avoid print:shadow-none">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-surface-700">{t.title}</p>
        {entries.length > 0 && <span className="text-xs text-surface-400">{t.total(entries.length)}</span>}
      </div>
      {entries.length === 0 && <p className="text-xs text-surface-400">{emptyText}</p>}
      <div className="space-y-2.5">
        {entries.map(({ project, role, isOwner }) => {
          const status = getDisplayStatus(project);
          return (
            <Link
              key={project.id}
              to={`/projects/${project.id}`}
              className="flex items-start gap-3 rounded-xl border border-surface-100 p-3 transition-colors hover:border-accent-200 hover:bg-accent-50/40"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-100 text-surface-500">
                {isOwner ? <Crown size={16} /> : <Users size={16} />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-surface-900">{project.title}</p>
                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-surface-500">
                  <Badge tone="accent">{role}</Badge>
                  {!isOwner && (
                    <span className="inline-flex items-center gap-1 text-emerald-700" title={t.confirmedTitle}>
                      <BadgeCheck size={12} /> {t.confirmed}
                    </span>
                  )}
                  <span>{tAll.common.members(formatMembers(project))}</span>
                  {project.deadline && <span>· {formatDeadline(project.deadline)}</span>}
                </div>
              </div>
              <Badge tone={DISPLAY_STATUS_TONE[status]} className="shrink-0 print:hidden">
                {displayStatusLabel(status)}
              </Badge>
            </Link>
          );
        })}
      </div>
    </Card>
  );
}
