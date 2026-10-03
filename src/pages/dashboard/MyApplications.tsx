import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/useAuth';
import { useMyApplications } from '@/hooks/useApplications';
import { useContacts } from '@/hooks/useProfile';
import { ContactLinks } from '@/components/profile/ContactLinks';
import { Card, Badge, Skeleton, ErrorState } from '@/components/ui/primitives';
import { useT } from '@/i18n';

export default function MyApplications() {
  const { user } = useAuth();
  const { data, isLoading, isError, error, refetch } = useMyApplications(user?.uid);
  const t = useT();

  if (isLoading) return <Skeleton className="h-40" />;
  if (isError) return <ErrorState error={error} onRetry={() => refetch()} />;
  if (!data || data.length === 0) return <p className="text-sm text-surface-500">{t.dashboard.noApplications}</p>;

  return (
    <div className="space-y-3">
      {data.map((app) => (
        <Card key={app.id} className="space-y-3">
          <Link to={`/projects/${app.projectId}`} className="flex items-center justify-between gap-4">
            <div>
              <p className="font-medium text-surface-900 hover:underline">{app.projectTitle}</p>
              <p className="text-xs text-surface-500">{t.project.role(app.roleTitle)}</p>
            </div>
            <Badge tone={app.status === 'accepted' ? 'green' : app.status === 'rejected' ? 'red' : 'yellow'}>
              {t.status[app.status]}
            </Badge>
          </Link>
          {app.status === 'accepted' && (
            <div className="border-t border-surface-100 pt-3">
              <p className="mb-1.5 text-xs font-medium text-surface-500">{t.dashboard.youreIn}</p>
              <OwnerContact uid={app.ownerId} />
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}

function OwnerContact({ uid }: { uid: string }) {
  const { data: contacts, isLoading } = useContacts(uid);
  const t = useT();
  if (isLoading) return <p className="text-xs text-surface-400">{t.project.loadingContacts}</p>;
  return <ContactLinks contacts={contacts ?? undefined} />;
}
