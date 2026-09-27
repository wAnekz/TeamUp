import { lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { cn } from '@/utils/cn';
import { DeadlineWidget, SchoolRankCard } from '@/components/dashboard/DeadlineWidget';
import { useT } from '@/i18n';

// Only one tab is ever visible at a time, so each is its own chunk rather
// than all four (MyProfile especially — form + validation + avatar upload
// logic) loading up front for whichever tab happens to be default.
const MyProjects = lazy(() => import('./dashboard/MyProjects'));
const MyApplications = lazy(() => import('./dashboard/MyApplications'));
const MyProfile = lazy(() => import('./dashboard/MyProfile'));
const Drafts = lazy(() => import('./dashboard/Drafts'));

function TabLoader() {
  return (
    <div className="flex min-h-[30vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-600 border-t-transparent" />
    </div>
  );
}


export default function Dashboard() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') ?? 'projects';
  const t = useT().dashboard;
  const TABS = [
    { key: 'projects', label: t.tabProjects },
    { key: 'applications', label: t.tabApplications },
    { key: 'profile', label: t.tabProfile },
    { key: 'drafts', label: t.tabDrafts },
  ];

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold text-surface-900">{t.title}</h1>
      <DeadlineWidget />
      <SchoolRankCard />
      <div className="mb-6 flex gap-1 overflow-x-auto rounded-xl bg-surface-100 p-1 scrollbar-none">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setParams({ tab: t.key })}
            className={cn(
              'whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-medium transition-colors',
              tab === t.key ? 'bg-white text-accent-700 shadow-soft' : 'text-surface-500 hover:text-surface-700',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <Suspense fallback={<TabLoader />}>
        {tab === 'projects' && <MyProjects />}
        {tab === 'applications' && <MyApplications />}
        {tab === 'profile' && <MyProfile />}
        {tab === 'drafts' && <Drafts />}
      </Suspense>
    </div>
  );
}