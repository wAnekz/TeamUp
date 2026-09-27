import { Link, useNavigate, useParams } from 'react-router-dom';
import { Users } from 'lucide-react';
import { Card, Badge, Avatar, Skeleton } from '@/components/ui/primitives';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { useInvite, useJoinByInvite } from '@/hooks/useInvites';
import { useProject } from '@/hooks/useProjects';
import { formatMembers } from '@/utils/projectStatus';
import { toast, errorToMessage } from '@/lib/toast';
import { useAuthGate } from '@/hooks/useAuthGate';
import { skillLabel, useT } from '@/i18n';

export default function InvitePage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { user, emailVerified } = useAuth();
  const { isGuest, requireAccount } = useAuthGate();
  const { data: invite, isLoading: loadingInvite } = useInvite(code);
  const { data: project, isLoading: loadingProject } = useProject(invite?.projectId, isGuest);
  const join = useJoinByInvite();
  const tAll = useT();
  const t = tAll.invite;

  if (loadingInvite || (invite && loadingProject)) return <Skeleton className="mx-auto h-64 max-w-xl" />;

  if (!invite || !invite.active || !project) {
    return (
      <Card className="mx-auto max-w-md text-center">
        <p className="font-medium text-surface-900">{t.dead}</p>
        <p className="mt-1 text-sm text-surface-500">{t.deadText}</p>
        <Link to="/feed" className="mt-4 inline-block">
          <Button variant="secondary">{t.browse}</Button>
        </Link>
      </Card>
    );
  }

  const isOwner = user?.uid === project.authorId;
  const isMember = isOwner || (project.members ?? []).includes(user?.uid ?? '');
  const openRoles = project.roles.filter((r) => r.slotsFilled < r.slotsTotal);

  const joinRole = async (roleId: string) => {
    if (!code || !requireAccount()) return;
    try {
      await join.mutateAsync({ code, roleId });
      toast.success(t.welcome(project.title));
      navigate(`/projects/${project.id}`);
    } catch (e) {
      toast.error(errorToMessage(e));
    }
  };

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <Card>
        <p className="text-xs font-medium uppercase tracking-wide text-accent-600">{t.youreInvited}</p>
        <h1 className="mt-1 text-xl font-bold text-surface-900">{project.title}</h1>
        {!isGuest && (
          <div className="mt-2 flex items-center gap-2">
            <Avatar src={project.authorAvatarUrl} name={project.authorName} size={26} />
            <span className="text-sm text-surface-500">{t.isLead(project.authorName)}</span>
          </div>
        )}
        <p className="mt-3 line-clamp-4 whitespace-pre-wrap text-sm text-surface-700">{project.description}</p>
        <p className="mt-3 flex items-center gap-1.5 text-xs text-surface-500">
          <Users size={12} /> {tAll.common.members(formatMembers(project))}
        </p>
      </Card>

      {isMember ? (
        <Card className="text-center">
          <p className="text-sm text-surface-700">{t.alreadyMember}</p>
          <Link to={`/projects/${project.id}`} className="mt-3 inline-block">
            <Button>{t.openProject}</Button>
          </Link>
        </Card>
      ) : openRoles.length === 0 ? (
        <Card className="text-center text-sm text-surface-500">{t.allFilled}</Card>
      ) : (
        <div className="space-y-3">
          <p className="text-sm font-medium text-surface-700">{t.pickRole}</p>
          {isGuest && (
            <p className="rounded-xl bg-accent-50 px-3.5 py-2.5 text-xs text-accent-800">
              {t.guestNote}
            </p>
          )}
          {!isGuest && !emailVerified && (
            <p className="rounded-xl bg-amber-50 px-3.5 py-2.5 text-xs text-amber-800">
              {t.verifyFirst}
            </p>
          )}
          {openRoles.map((role) => (
            <Card key={role.id} className="flex items-center justify-between gap-3">
              <div>
                <p className="font-medium text-surface-900">{role.title}</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {role.requiredSkills.map((s) => (
                    <Badge key={s} tone="accent">
                      {skillLabel(tAll, s)}
                    </Badge>
                  ))}
                </div>
                <p className="mt-1 text-xs text-surface-500">
                  {t.spotsOpen(role.slotsTotal - role.slotsFilled, role.slotsTotal)}
                </p>
              </div>
              <Button
                size="sm"
                disabled={!isGuest && !emailVerified}
                loading={join.isPending && join.variables?.roleId === role.id}
                onClick={() => joinRole(role.id)}
              >
                {isGuest ? t.signUpJoin : t.join}
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
