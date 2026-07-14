import { useQuery } from '@tanstack/react-query';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, Skeleton } from '@/components/ui/primitives';
import { Button } from '@/components/ui/Button';
import { useUpdateProject } from '@/hooks/useProjects';
import type { Project } from '@/types';

export default function Drafts() {
  const { user } = useAuth();
  const updateMutation = useUpdateProject();
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['projects', 'drafts', user?.uid],
    enabled: !!user,
    queryFn: async () => {
      const snap = await getDocs(
        query(
          collection(db, 'projects'),
          where('authorId', '==', user!.uid),
          where('isDraft', '==', true),
          orderBy('createdAt', 'desc'),
        ),
      );
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Project);
    },
  });

  if (isLoading) return <Skeleton className="h-40" />;
  if (!data || data.length === 0) return <p className="text-sm text-surface-500">No drafts saved.</p>;

  return (
    <div className="space-y-3">
      {data.map((draft) => (
        <Card key={draft.id} className="flex items-center justify-between">
          <div>
            <p className="font-medium text-surface-900">{draft.title || 'Untitled draft'}</p>
            <p className="line-clamp-1 text-xs text-surface-500">{draft.description}</p>
          </div>
          <Button
            size="sm"
            onClick={async () => {
              await updateMutation.mutateAsync({ id: draft.id, patch: { isDraft: false, status: 'open' } });
              refetch();
            }}
          >
            Publish
          </Button>
        </Card>
      ))}
    </div>
  );
}
