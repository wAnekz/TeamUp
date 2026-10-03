import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Eye, Pencil, Share2, Star } from 'lucide-react';
import { Card, Badge, Avatar, ErrorState } from '@/components/ui/primitives';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/primitives';
import { ApplyModal } from '@/components/projects/ApplyModal';
import { TeamChat } from '@/components/projects/TeamChat';
import { InviteLinkCard } from '@/components/projects/InviteLinkCard';
import { TeamResultCard } from '@/components/projects/TeamResultCard';
import { SuggestedTeammates } from '@/components/projects/SuggestedTeammates';
import { LevelPill } from '@/components/gamification/Gamification';
import { useAuthGate } from '@/hooks/useAuthGate';
import { interestLabel, skillLabel, useT } from '@/i18n';
import { useApplyToRole, useProjectApplications, useReviewApplication } from '@/hooks/useApplications';
import { useDeleteProject, useIncrementProjectView, useProject, useUpdateProject } from '@/hooks/useProjects';
import { useSavedProjectIds, useToggleSaveProject } from '@/hooks/useSavedProjects';
import { useContacts } from '@/hooks/useProfile';
import { ContactLinks } from '@/components/profile/ContactLinks';
import { ReportButton } from '@/components/ReportButton';
import { formatDeadline, isDeadlinePassed, timeAgo } from '@/utils/dates';
import { displayStatusLabel, DISPLAY_STATUS_TONE, formatMembers, getApplyBlockedReason, getDisplayStatus, hasAppliedToRole } from '@/utils/projectStatus';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/utils/cn';
import { toast } from '@/lib/toast';
import type { ProjectRole } from '@/types';

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { isGuest, requireAccount } = useAuthGate();
  const t = useT();
  const tp = t.project;
  const { data: project, isLoading, refetch } = useProject(id, isGuest);
  const [applyRole, setApplyRole] = useState<ProjectRole | null>(null);

  const applyMutation = useApplyToRole();
  const isOwner = project && user?.uid === project.authorId;
  const isMember = !!project && !!user && (!!isOwner || (project.members ?? []).includes(user.uid));
  const {
    data: applications,
    isError: applicationsError,
    error: applicationsErrorDetail,
    refetch: refetchApplications,
  } = useProjectApplications(isOwner ? project?.id : undefined, isOwner ? user?.uid : undefined);
  const reviewMutation = useReviewApplication();
  const updateMutation = useUpdateProject();
  const deleteMutation = useDeleteProject();
  const incrementView = useIncrementProjectView();

  const { data: savedIds } = useSavedProjectIds(user?.uid);
  const toggleSave = useToggleSaveProject(user?.uid);
  const isSaved = savedIds?.has(id ?? '') ?? false;

  useEffect(() => {
    // Guests can't write (rules) — and the mirror isn't the counted doc anyway.
    if (id && user) incrementView.mutate(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  if (!project) return <p className="text-center text-surface-500">{tp.notFound}</p>;

  const deadlinePassed = isDeadlinePassed(project.deadline);
  const displayStatus = getDisplayStatus(project);

  const share = async () => {
    const url = `${window.location.origin}/projects/${project.id}`;
    const shareData = { title: project.title, text: tp.joinText(project.title), url };
    // Most students on this platform share links via Telegram/Instagram chats
    // rather than posting publicly — the native share sheet (or clipboard
    // fallback on desktop) is the lowest-friction path to that.
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // user cancelled — no-op
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success(tp.linkCopied);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Card>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-surface-900">{project.title}</h1>
            {isGuest ? (
              <p className="mt-2 text-sm text-surface-500">
                {tp.postedByStudent}{' '}
                <button type="button" onClick={requireAccount} className="font-medium text-accent-600 hover:underline">
                  {tp.signUpToSeeTeam}
                </button>
              </p>
            ) : (
              <Link to={`/users/${project.authorId}`} className="mt-2 flex items-center gap-2 hover:underline">
                <Avatar src={project.authorAvatarUrl} name={project.authorName} size={28} />
                <span className="text-sm text-surface-500">{project.authorName}</span>
              </Link>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label={tp.share}
              onClick={share}
              className="relative rounded-lg border border-surface-200 p-2 text-surface-400 after:absolute after:-inset-1.5 after:content-[''] hover:bg-surface-100 hover:text-accent-600"
            >
              <Share2 size={16} />
            </button>
            <button
              type="button"
              aria-label={isSaved ? t.card.unsave : t.card.save}
              onClick={() => requireAccount() && toggleSave.mutate({ projectId: project.id, save: !isSaved })}
              className="rounded-lg border border-surface-200 p-2 text-surface-400 hover:bg-surface-100 hover:text-amber-500"
            >
              <Star size={16} className={cn(isSaved && 'fill-amber-400 text-amber-500')} />
            </button>
            <Badge tone={project.type === 'event' ? 'accent' : 'gray'}>{project.type === 'event' ? t.status.event : t.status.ongoing}</Badge>
          </div>
        </div>

        <p className="mt-4 whitespace-pre-wrap text-sm text-surface-700">{project.description}</p>

        {project.additionalRequirements && (
          <div className="mt-4 rounded-xl bg-surface-50 p-3.5">
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-surface-500">{tp.additionalRequirements}</p>
            <p className="whitespace-pre-wrap text-sm text-surface-700">{project.additionalRequirements}</p>
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-1.5">
          {project.interests.map((i) => (
            <Badge key={i} tone="gray">
              {interestLabel(t, i)}
            </Badge>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-surface-100 pt-4 text-sm text-surface-500">
          <span>{tp.team(formatMembers(project))}</span>
          {project.deadline && (
            <span className={deadlinePassed ? 'text-red-600' : ''}>
              {tp.deadline} {formatDeadline(project.deadline)} {deadlinePassed && tp.passed}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Eye size={14} />
            {t.common.views(project.viewCount ?? 0)}
          </span>
          <span>{timeAgo(project.updatedAt)}</span>
          <Badge tone={DISPLAY_STATUS_TONE[displayStatus]}>{displayStatusLabel(displayStatus)}</Badge>
          {!isOwner && !isGuest && (
            <span className="ml-auto">
              <ReportButton targetType="project" targetId={project.id} />
            </span>
          )}
        </div>

        {isOwner && (
          <div className="mt-4 flex flex-wrap gap-2 border-t border-surface-100 pt-4">
            <Button size="sm" variant="secondary" onClick={() => navigate(`/projects/${project.id}/edit`)}>
              <Pencil size={14} /> {t.common.edit}
            </Button>
            {project.status === 'open' && (
              <Button
                size="sm"
                variant="secondary"
                loading={updateMutation.isPending}
                onClick={() =>
                  updateMutation.mutate(
                    { id: project.id, patch: { status: 'closed' } },
                    { onSuccess: () => toast.success(tp.recruitmentClosed) },
                  )
                }
              >
                {tp.closeRecruitment}
              </Button>
            )}
            {project.status === 'closed' && (
              <Button
                size="sm"
                variant="secondary"
                loading={updateMutation.isPending}
                onClick={() =>
                  updateMutation.mutate(
                    { id: project.id, patch: { status: 'open' } },
                    { onSuccess: () => toast.success(tp.recruitmentReopened) },
                  )
                }
              >
                {tp.reopenRecruitment}
              </Button>
            )}
            {project.status !== 'archived' ? (
              <Button
                size="sm"
                variant="secondary"
                loading={updateMutation.isPending}
                onClick={() =>
                  updateMutation.mutate(
                    { id: project.id, patch: { status: 'archived' } },
                    { onSuccess: () => toast.success(tp.archived) },
                  )
                }
              >
                {tp.archive}
              </Button>
            ) : (
              <Button
                size="sm"
                variant="secondary"
                loading={updateMutation.isPending}
                onClick={() =>
                  updateMutation.mutate(
                    { id: project.id, patch: { status: 'open' } },
                    { onSuccess: () => toast.success(tp.unarchived) },
                  )
                }
              >
                {tp.unarchive}
              </Button>
            )}
            <Button
              size="sm"
              variant="danger"
              loading={deleteMutation.isPending}
              onClick={() => {
                if (confirm(tp.confirmDelete)) {
                  deleteMutation.mutate(project.id, {
                    onSuccess: () => {
                      toast.success(tp.deleted);
                      navigate('/dashboard?tab=projects');
                    },
                  });
                }
              }}
            >
              {t.common.delete}
            </Button>
          </div>
        )}
      </Card>

      <TeamResultCard project={project} isOwner={!!isOwner} />

      <div>
        <h2 className="mb-3 text-lg font-semibold text-surface-900">{tp.roles}</h2>
        <div className="space-y-3">
          {project.roles.map((role) => {
            const alreadyApplied = hasAppliedToRole(applications, role.id, user?.uid);
            const blockedReason = getApplyBlockedReason(project, role, !!isOwner, alreadyApplied);
            return (
              <Card key={role.id} className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-surface-900">{role.title}</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {role.requiredSkills.map((s) => (
                      <Badge key={s} tone="accent">
                        {skillLabel(t, s)}
                      </Badge>
                    ))}
                  </div>
                  <p className="mt-1.5 text-xs text-surface-500">
                    {tp.filled(role.slotsFilled, role.slotsTotal)}
                  </p>
                </div>
                {!isOwner && (
                  <Button size="sm" disabled={!!blockedReason} onClick={() => requireAccount() && setApplyRole(role)}>
                    {blockedReason ?? (isGuest ? tp.signUpToApply : tp.apply)}
                  </Button>
                )}
              </Card>
            );
          })}
        </div>
      </div>

      {isGuest && (
        <Card className="flex flex-col items-center gap-3 border-accent-200 bg-accent-50 text-center sm:flex-row sm:text-left">
          <div className="flex-1">
            <p className="font-semibold text-surface-900">{tp.wantToJoin}</p>
            <p className="text-sm text-surface-600">{tp.wantToJoinText}</p>
          </div>
          <Button onClick={requireAccount}>{tp.createAccount}</Button>
        </Card>
      )}

      {isOwner && project.status === 'open' && !project.isDraft && <InviteLinkCard project={project} />}

      {isMember && <TeamChat projectId={project.id} enabled={isMember} />}

      {isOwner && project.status === 'open' && !project.isDraft && (
        <SuggestedTeammates project={project} applications={applications} />
      )}

      {isOwner && (
        <div>
          <h2 className="mb-3 text-lg font-semibold text-surface-900">{tp.applications}</h2>
          {applicationsError ? (
            <ErrorState error={applicationsErrorDetail} onRetry={() => refetchApplications()} />
          ) : !applications || applications.length === 0 ? (
            <p className="text-sm text-surface-500">{tp.noApplications}</p>
          ) : (
            <div className="space-y-3">
              {applications.map((app) => (
                <Card key={app.id} className="space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <Avatar src={app.applicantAvatarUrl} name={app.applicantName} size={36} />
                      <div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Link to={`/users/${app.applicantId}`} className="font-medium text-surface-900 hover:underline">
                            {app.applicantName}
                          </Link>
                          <LevelPill uid={app.applicantId} />
                        </div>
                        <p className="text-xs text-surface-500">{tp.role(app.roleTitle)}</p>
                        <p className="mt-1 text-sm text-surface-600">{app.message}</p>
                      </div>
                    </div>
                    {app.status === 'pending' ? (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          loading={reviewMutation.isPending}
                          onClick={() =>
                            reviewMutation.mutate(
                              { application: app, decision: 'rejected' },
                              { onSuccess: () => toast.info(tp.rejectedToast(app.applicantName)) },
                            )
                          }
                        >
                          {tp.reject}
                        </Button>
                        <Button
                          size="sm"
                          loading={reviewMutation.isPending}
                          onClick={() =>
                            reviewMutation.mutate(
                              { application: app, decision: 'accepted' },
                              { onSuccess: () => toast.success(tp.acceptedToast(app.applicantName)) },
                            )
                          }
                        >
                          {tp.accept}
                        </Button>
                      </div>
                    ) : (
                      <Badge tone={app.status === 'accepted' ? 'green' : 'red'}>{t.status[app.status]}</Badge>
                    )}
                  </div>
                  {app.status === 'accepted' && (
                    <div className="border-t border-surface-100 pt-3">
                      <p className="mb-1.5 text-xs font-medium text-surface-500">{tp.contact(app.applicantName)}</p>
                      <AcceptedContact uid={app.applicantId} />
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {applyRole && (
        <ApplyModal
          open={!!applyRole}
          onClose={() => setApplyRole(null)}
          roleTitle={applyRole.title}
          submitting={applyMutation.isPending}
          onSubmit={async (values) => {
            if (!user || !profile) return;
            await applyMutation.mutateAsync({
              project,
              roleId: applyRole.id,
              applicantId: user.uid,
              applicantName: profile.name,
              applicantAvatarUrl: profile.avatarUrl,
              message: values.message,
            });
            toast.success(tp.applicationSent);
            setApplyRole(null);
            refetch();
          }}
        />
      )}
    </div>
  );
}

/** Small subcomponent so hooks (usePublicProfile) can run once per accepted
 *  applicant inside the .map() above without breaking the rules of hooks. */
function AcceptedContact({ uid }: { uid: string }) {
  const { data: contacts, isLoading } = useContacts(uid);
  const t = useT();
  if (isLoading) return <p className="text-xs text-surface-400">{t.project.loadingContacts}</p>;
  return <ContactLinks contacts={contacts ?? undefined} />;
}
