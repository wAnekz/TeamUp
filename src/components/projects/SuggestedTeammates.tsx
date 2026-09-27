import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, UserPlus, Check } from 'lucide-react';
import { Card, Badge, Avatar } from '@/components/ui/primitives';
import { Button } from '@/components/ui/Button';
import { useLookingForTeamFeed } from '@/hooks/useLookingForTeam';
import { useInviteUserToProject } from '@/hooks/useInvites';
import { suggestTeammates } from '@/utils/match';
import { LevelPill } from '@/components/gamification/Gamification';
import { toast, errorToMessage } from '@/lib/toast';
import { skillLabel, useT } from '@/i18n';
import type { Application, Project } from '@/types';

/**
 * Owner-only: people from "Looking for a team" whose skills fit an open
 * role. "Invite" notifies them (push / Telegram / email) with this
 * project's invite link — so the owner can recruit instead of just waiting
 * for applications.
 */
export function SuggestedTeammates({ project, applications }: { project: Project; applications?: Application[] }) {
  const { data: posts } = useLookingForTeamFeed();
  const tAll = useT();
  const t = tAll.suggestions;
  const invite = useInviteUserToProject();
  const [invited, setInvited] = useState<Set<string>>(new Set());

  const suggestions = useMemo(() => {
    const exclude = new Set([project.authorId, ...(project.members ?? []), ...(applications ?? []).map((a) => a.applicantId)]);
    return suggestTeammates(project, posts ?? [], exclude);
  }, [project, posts, applications]);

  if (suggestions.length === 0) return null;

  return (
    <div>
      <h2 className="mb-1 flex items-center gap-1.5 text-lg font-semibold text-surface-900">
        <Sparkles size={16} className="text-accent-600" /> {t.title}
      </h2>
      <p className="mb-3 text-sm text-surface-500">{t.text}</p>
      <div className="space-y-3">
        {suggestions.map(({ post, role, matchedSkills, score }) => {
          const done = invited.has(post.authorId);
          return (
            <Card key={post.id} className="flex items-start gap-3">
              <Link to={`/users/${post.authorId}`}>
                <Avatar src={post.authorAvatarUrl} name={post.authorName} size={36} />
              </Link>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link to={`/users/${post.authorId}`} className="font-medium text-surface-900 hover:underline">
                    {post.authorName}
                  </Link>
                  <LevelPill uid={post.authorId} />
                  <Badge tone="green">{t.fit(score)}</Badge>
                </div>
                <p className="mt-0.5 text-xs text-surface-500">
                  {t.forRole} <strong>{role.title}</strong> · {matchedSkills.map((s) => skillLabel(tAll, s)).join(', ')}
                </p>
                <p className="mt-1 line-clamp-2 text-sm text-surface-600">{post.description}</p>
              </div>
              <Button
                size="sm"
                variant={done ? 'secondary' : 'primary'}
                disabled={done}
                loading={invite.isPending && invite.variables?.targetUid === post.authorId}
                onClick={async () => {
                  try {
                    await invite.mutateAsync({ projectId: project.id, roleId: role.id, targetUid: post.authorId });
                    setInvited((s) => new Set(s).add(post.authorId));
                    toast.success(t.sent(post.authorName));
                  } catch (e) {
                    toast.error(errorToMessage(e));
                  }
                }}
              >
                {done ? <Check size={14} /> : <UserPlus size={14} />}
                {done ? t.invited : t.invite}
              </Button>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
