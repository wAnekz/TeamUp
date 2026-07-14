import { Link } from 'react-router-dom';
import { Card, Badge, Skeleton } from '@/components/ui/primitives';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import {
  useDeleteReportedProject,
  useIsModerator,
  useMarkReportReviewed,
  useOpenReports,
  useSetUserBanned,
} from '@/hooks/useReports';
import { usePublicProfile } from '@/hooks/useProfile';
import { timeAgo } from '@/utils/dates';
import { toast } from '@/lib/toast';
import type { Report } from '@/types';

export default function ModerationReports() {
  const { user } = useAuth();
  const { data: isModerator, isLoading: checkingModerator } = useIsModerator(user?.uid);
  // Only fetch once we know the check passed — an unauthorized fetch would
  // just be rejected by Firestore rules anyway, this just avoids the noise.
  const { data: reports, isLoading } = useOpenReports(!!isModerator);
  const markReviewed = useMarkReportReviewed();

  if (checkingModerator) return <Skeleton className="h-40" />;

  if (!isModerator) {
    return (
      <p className="mx-auto max-w-md text-center text-sm text-surface-500">
        This page is only visible to moderators.
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-xl font-bold text-surface-900">Open reports</h1>
      {isLoading && <Skeleton className="h-24" />}
      {!isLoading && reports?.length === 0 && <p className="text-sm text-surface-500">Nothing open — you're caught up.</p>}
      {reports?.map((r) => (
        <ReportCard
          key={r.id}
          report={r}
          onMarkReviewed={() =>
            markReviewed.mutate(r.id, { onSuccess: () => toast.success('Marked reviewed') })
          }
          markingReviewed={markReviewed.isPending}
        />
      ))}
    </div>
  );
}

function ReportCard({
  report,
  onMarkReviewed,
  markingReviewed,
}: {
  report: Report;
  onMarkReviewed: () => void;
  markingReviewed: boolean;
}) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <Badge tone="gray">{report.targetType}</Badge>
          <p className="mt-2 text-sm text-surface-800">{report.reason}</p>
          <Link
            to={report.targetType === 'profile' ? `/users/${report.targetId}` : `/projects/${report.targetId}`}
            className="mt-1 inline-block text-xs text-accent-600 hover:underline"
          >
            View {report.targetType} →
          </Link>
          <p className="mt-1 text-xs text-surface-400">{timeAgo(report.createdAt)}</p>
        </div>
        <Button size="sm" variant="secondary" onClick={onMarkReviewed} loading={markingReviewed}>
          Mark reviewed
        </Button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-surface-100 pt-3">
        {report.targetType === 'project' ? (
          <DeleteProjectAction projectId={report.targetId} />
        ) : (
          <BanUserAction userId={report.targetId} />
        )}
      </div>
    </Card>
  );
}

/**
 * Deletes the reported project directly, no Firebase Console trip required.
 * Confirms first — this is permanent and, unlike marking a report reviewed,
 * can't be undone by re-running the action.
 */
function DeleteProjectAction({ projectId }: { projectId: string }) {
  const deleteMutation = useDeleteReportedProject();

  if (deleteMutation.isSuccess) {
    return <span className="text-xs font-medium text-surface-400">Project deleted.</span>;
  }

  return (
    <Button
      size="sm"
      variant="danger"
      loading={deleteMutation.isPending}
      onClick={() => {
        if (confirm('Delete this project permanently? This removes it for everyone and cannot be undone.')) {
          deleteMutation.mutate(projectId, { onSuccess: () => toast.success('Project deleted') });
        }
      }}
    >
      Delete project
    </Button>
  );
}

/**
 * Bans or unbans the reported user. Reads their current `banned` state first
 * so the button label always reflects reality, rather than assuming every
 * report is against a not-yet-banned user (a moderator revisiting an old
 * report, or two reports against the same person, would otherwise show a
 * stale "Ban user" after they're already banned).
 */
function BanUserAction({ userId }: { userId: string }) {
  const { data: profile, isLoading } = usePublicProfile(userId);
  const setBanned = useSetUserBanned();

  if (isLoading) return <span className="text-xs text-surface-400">Checking user...</span>;

  const isBanned = !!profile?.banned;

  if (isBanned) {
    return (
      <Button
        size="sm"
        variant="secondary"
        loading={setBanned.isPending}
        onClick={() =>
          setBanned.mutate(
            { userId, banned: false },
            { onSuccess: () => toast.success('User unbanned') },
          )
        }
      >
        Unban user
      </Button>
    );
  }

  return (
    <Button
      size="sm"
      variant="danger"
      loading={setBanned.isPending}
      onClick={() => {
        if (confirm("Ban this user? They'll be signed out and blocked from using TeamUp until unbanned.")) {
          setBanned.mutate({ userId, banned: true }, { onSuccess: () => toast.success('User banned') });
        }
      }}
    >
      Ban user
    </Button>
  );
}
