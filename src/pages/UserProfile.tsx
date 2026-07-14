import { useParams } from 'react-router-dom';
import { Card, Badge, Avatar, Skeleton } from '@/components/ui/primitives';
import { ProjectCard } from '@/components/projects/ProjectCard';
import { useAuthorProjects } from '@/hooks/useProjects';
import { usePublicProfile } from '@/hooks/useProfile';
import { lastActiveLabel } from '@/utils/dates';
import { ReportButton } from '@/components/ReportButton';
import { ContactLinks } from '@/components/profile/ContactLinks';

export default function UserProfile() {
  const { id } = useParams<{ id: string }>();
  const { data: profile, isLoading } = usePublicProfile(id);
  const { data: projects, isLoading: loadingProjects } = useAuthorProjects(id);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-20" />
      </div>
    );
  }

  if (!profile) return <p className="text-center text-surface-500">User not found.</p>;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Card>
        <div className="flex items-center gap-4">
          <Avatar src={profile.avatarUrl} name={profile.name} size={72} />
          <div>
            <h1 className="text-lg font-semibold text-surface-900">{profile.name}</h1>
            <p className="text-sm text-surface-500">
              {profile.city} · Grade {profile.grade}
            </p>
            <p className="text-xs text-surface-400">{lastActiveLabel(profile.lastActiveAt)}</p>
          </div>
        </div>
        {profile.bio && <p className="mt-4 whitespace-pre-wrap text-sm text-surface-700">{profile.bio}</p>}
        <div className="mt-4 border-t border-surface-100 pt-3">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-surface-400">Contact</p>
          <ContactLinks contacts={profile.contacts} />
        </div>
        <div className="mt-3 flex justify-end">
          <ReportButton targetType="profile" targetId={profile.uid} />
        </div>
      </Card>

      {profile.skills.length > 0 && (
        <Card>
          <p className="mb-2 text-sm font-medium text-surface-700">Skills</p>
          <div className="flex flex-wrap gap-1.5">
            {profile.skills.map((s) => (
              <Badge key={s.skill} tone="accent">
                {s.skill} · {s.level}
              </Badge>
            ))}
          </div>
        </Card>
      )}

      {profile.interests.length > 0 && (
        <Card>
          <p className="mb-2 text-sm font-medium text-surface-700">Interests</p>
          <div className="flex flex-wrap gap-1.5">
            {profile.interests.map((i) => (
              <Badge key={i} tone="gray">
                {i}
              </Badge>
            ))}
          </div>
        </Card>
      )}

      <div>
        <h2 className="mb-3 text-lg font-semibold text-surface-900">Projects</h2>
        {loadingProjects && <Skeleton className="h-32" />}
        {!loadingProjects && (!projects || projects.length === 0) && (
          <p className="text-sm text-surface-500">No published projects yet.</p>
        )}
        {projects && projects.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {projects.map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
