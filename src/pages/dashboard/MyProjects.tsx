import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Pencil } from 'lucide-react';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, Badge, Skeleton, ErrorState } from '@/components/ui/primitives';
import { Button } from '@/components/ui/Button';
import { useDeleteProject, useUpdateProject } from '@/hooks/useProjects';
import { DISPLAY_STATUS_LABEL, DISPLAY_STATUS_TONE, formatMembers, getDisplayStatus } from '@/utils/projectStatus';
import { timeAgo } from '@/utils/dates';
import type { Project } from '@/types';

export default function MyProjects() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const updateMutation = useUpdateProject();
  const deleteMutation = useDeleteProject();
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['projects', 'mine', user?.uid],
    enabled: !!user,
    queryFn: async () => {
      // Deliberately no orderBy() here: combining it with the two where()
      // equality filters below would need a composite Firestore index to be
      // deployed. This list is small and owner-scoped, so we just sort in
      // JS after fetching instead of depending on an index existing.
      const snap = await getDocs(
        query(collection(db, 'projects'), where('authorId', '==', user!.uid), where('isDraft', '==', false)),
      );
      return snap.docs
        .map((d) => ({ id: d.id, ...d.data() }) as Project)
        .sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0));
    },
  });

  if (isLoading) return <Skeleton className="h-40" />;

  if (isError) {
    return <ErrorState error={error} onRetry={() => refetch()} />;
  }

  if (!data || data.length === 0)
    return <p className="text-sm text-surface-500">You haven't published any projects yet.</p>;

  return (
    <div className="space-y-3">
      {data.map((project) => {
        const displayStatus = getDisplayStatus(project);
        return (
          <Card key={project.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <Link to={`/projects/${project.id}`} className="font-medium text-surface-900 hover:underline">
                  {project.title}
                </Link>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-surface-500">
                  <Badge tone={DISPLAY_STATUS_TONE[displayStatus]}>{DISPLAY_STATUS_LABEL[displayStatus]}</Badge>
                  <span>{formatMembers(project)} members</span>
                  <span>{project.viewCount ?? 0} views</span>
                  <span>{timeAgo(project.updatedAt)}</span>
                </div>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2 border-t border-surface-100 pt-3">
              <Button size="sm" variant="secondary" onClick={() => navigate(`/projects/${project.id}/edit`)}>
                <Pencil size={14} /> Edit
              </Button>
              {project.status === 'open' && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={async () => {
                    await updateMutation.mutateAsync({ id: project.id, patch: { status: 'closed' } });
                    refetch();
                  }}
                >
                  Close recruitment
                </Button>
              )}
              {project.status === 'closed' && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={async () => {
                    await updateMutation.mutateAsync({ id: project.id, patch: { status: 'open' } });
                    refetch();
                  }}
                >
                  Reopen
                </Button>
              )}
              {project.status !== 'archived' ? (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={async () => {
                    await updateMutation.mutateAsync({ id: project.id, patch: { status: 'archived' } });
                    refetch();
                  }}
                >
                  Archive
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={async () => {
                    await updateMutation.mutateAsync({ id: project.id, patch: { status: 'open' } });
                    refetch();
                  }}
                >
                  Unarchive
                </Button>
              )}
              <Button
                size="sm"
                variant="danger"
                onClick={async () => {
                  if (confirm('Delete this project permanently? This cannot be undone.')) {
                    await deleteMutation.mutateAsync(project.id);
                    refetch();
                  }
                }}
              >
                Delete
              </Button>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
