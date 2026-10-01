import { Link } from 'react-router-dom';
import { BarChart3, Inbox } from 'lucide-react';
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
import { toast, errorToMessage } from '@/lib/toast';
import { useMutation } from '@tanstack/react-query';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebaseFunctions';
import { useT } from '@/i18n';
import type { Report } from '@/types';

export default function ModerationReports() {
  const { user } = useAuth();
  const { data: isModerator, isLoading: checkingModerator } = useIsModerator(user?.uid);
  // Only fetch once we know the check passed — an unauthorized fetch would
  // just be rejected by Firestore rules anyway, this just avoids the noise.
  const { data: reports, isLoading } = useOpenReports(!!isModerator);
  const markReviewed = useMarkReportReviewed();
  const tAll = useT();

  if (checkingModerator) return <Skeleton className="h-40" />;

  if (!isModerator) {
    return (
      <p className="mx-auto max-w-md text-center text-sm text-surface-500">
        {tAll.errors.moderatorsOnly}
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex flex-wrap gap-2">
        <Link to="/moderation/stats">
          <Button size="sm" variant="secondary">
            <BarChart3 size={14} /> {tAll.metrics.link}
          </Button>
        </Link>
        <Link to="/moderation/events">
          <Button size="sm" variant="secondary">
            <Inbox size={14} /> {tAll.events.foundAuto}
          </Button>
        </Link>
      </div>
      <BackfillXpCard />
      <h1 className="text-xl font-bold text-surface-900">{tAll.moderation.openReports}</h1>
      {isLoading && <Skeleton className="h-24" />}
      {!isLoading && reports?.length === 0 && <p className="text-sm text-surface-500">{tAll.moderation.caughtUp}</p>}
      {reports?.map((r) => (
        <ReportCard
          key={r.id}
          report={r}
          onMarkReviewed={() =>
            markReviewed.mutate(r.id, { onSuccess: () => toast.success(tAll.moderation.markedReviewed) })
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
  const tAll = useT();
  const t = tAll.moderation;
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <Badge tone="gray">{tAll.report.targets[report.targetType]}</Badge>
          <p className="mt-2 text-sm text-surface-800">{report.reason}</p>
          <Link
            to={report.targetType === 'profile' ? `/users/${report.targetId}` : `/projects/${report.targetId}`}
            className="mt-1 inline-block text-xs text-accent-600 hover:underline"
          >
            {t.view(report.targetType)}
          </Link>
          <p className="mt-1 text-xs text-surface-400">{timeAgo(report.createdAt)}</p>
        </div>
        <Button size="sm" variant="secondary" onClick={onMarkReviewed} loading={markingReviewed}>
          {t.markReviewed}
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
  const t = useT().moderation;

  if (deleteMutation.isSuccess) {
    return <span className="text-xs font-medium text-surface-400">{t.projectDeleted}</span>;
  }

  return (
    <Button
      size="sm"
      variant="danger"
      loading={deleteMutation.isPending}
      onClick={() => {
        if (confirm(t.confirmDeleteProject)) {
          deleteMutation.mutate(projectId, { onSuccess: () => toast.success(t.projectDeleted) });
        }
      }}
    >
      {t.deleteProject}
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
  const t = useT().moderation;

  if (isLoading) return <span className="text-xs text-surface-400">{t.checkingUser}</span>;

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
            { onSuccess: () => toast.success(t.unbanned) },
          )
        }
      >
        {t.unban}
      </Button>
    );
  }

  return (
    <Button
      size="sm"
      variant="danger"
      loading={setBanned.isPending}
      onClick={() => {
        if (confirm(t.confirmBan)) {
          setBanned.mutate({ userId, banned: true }, { onSuccess: () => toast.success(t.banned) });
        }
      }}
    >
      {t.ban}
    </Button>
  );
}

/**
 * One-off: grants XP/badges for activity from before gamification existed.
 * Idempotent server-side (functions/src/gamification.ts → backfillXp), so
 * pressing it twice is harmless.
 */
function BackfillXpCard() {
  const t = useT().gamification;
  const backfill = useMutation({
    mutationFn: async () => (await httpsCallable<void, { processed: number }>(functions, 'backfillXp')()).data,
  });
  return (
    <Card className="flex items-center justify-between gap-3">
      <div>
        <p className="text-sm font-medium text-surface-800">{t.recalc}</p>
        <p className="text-xs text-surface-500">
          {backfill.data ? t.recalcDone(backfill.data.processed) : t.recalcHint}
        </p>
      </div>
      <Button
        size="sm"
        variant="secondary"
        loading={backfill.isPending}
        onClick={() => backfill.mutate(undefined, { onError: (e) => toast.error(errorToMessage(e)) })}
      >
        {t.run}
      </Button>
    </Card>
  );
}
