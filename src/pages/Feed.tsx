import { useEffect, useRef, useState } from 'react';
import { useProjectFeed, useRecommendationPool } from '@/hooks/useProjects';
import { useSavedProjectsFeed } from '@/hooks/useSavedProjects';
import { ProjectCard } from '@/components/projects/ProjectCard';
import { ProjectFilterPanel } from '@/components/projects/ProjectFilterPanel';
import { ErrorState, Skeleton } from '@/components/ui/primitives';
import { useAuth } from '@/contexts/AuthContext';
import { rankByMatch } from '@/utils/match';
import { cn } from '@/utils/cn';
import type { FeedView, ProjectFilters } from '@/types';

const EMPTY_FILTERS: ProjectFilters = { skills: [], interests: [] };

const VIEW_TABS: { key: FeedView; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'recommended', label: 'Recommended for you' },
  { key: 'saved', label: 'Saved' },
];

export default function Feed() {
  const { user, profile } = useAuth();
  const [view, setView] = useState<FeedView>('all');
  const [filters, setFilters] = useState<ProjectFilters>(EMPTY_FILTERS);
  const { data, isLoading, isError, error, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } = useProjectFeed(filters);
  const { data: pool, isLoading: loadingPool, isError: poolError, error: poolErrorObj, refetch: refetchPool } = useRecommendationPool();
  const {
    data: saved,
    isLoading: loadingSaved,
    isError: savedError,
    error: savedErrorObj,
    refetch: refetchSaved,
  } = useSavedProjectsFeed(user?.uid);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || view !== 'all') return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage) fetchNextPage();
      },
      { rootMargin: '400px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, fetchNextPage, view]);

  const projects = data?.pages.flatMap((p) => p.items) ?? [];
  const recommendations = profile && pool ? rankByMatch(profile, pool, 12) : [];

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <ProjectFilterPanel filters={filters} onChange={setFilters} />
      </aside>

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-surface-900">Projects & teams</h1>
        </div>

        <div className="mb-4 flex gap-1 overflow-x-auto rounded-xl bg-surface-100 p-1 scrollbar-none">
          {VIEW_TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setView(t.key)}
              className={cn(
                'whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-medium transition-colors',
                view === t.key ? 'bg-white text-accent-700 shadow-soft' : 'text-surface-500 hover:text-surface-700',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {view === 'all' && (
          <>
            {isError && <ErrorState error={error} onRetry={() => refetch()} />}

            {isLoading && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-44" />
                ))}
              </div>
            )}

            {!isLoading && !isError && projects.length === 0 && (
              <div className="rounded-2xl border border-dashed border-surface-300 py-16 text-center text-surface-500">
                No projects match yet. Try widening your filters, or be the first to post one.
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {projects.map((p) => (
                <ProjectCard key={p.id} project={p} />
              ))}
            </div>

            <div ref={sentinelRef} className="h-10" />
            {isFetchingNextPage && <p className="text-center text-sm text-surface-400">Loading more...</p>}
          </>
        )}

        {view === 'recommended' && (
          <>
            {poolError && <ErrorState error={poolErrorObj} onRetry={() => refetchPool()} />}
            {loadingPool && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-44" />
                ))}
              </div>
            )}
            {!loadingPool && !poolError && recommendations.length === 0 && (
              <div className="rounded-2xl border border-dashed border-surface-300 py-16 text-center text-surface-500">
                No strong matches yet — add more skills and interests to your profile to improve recommendations.
              </div>
            )}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {recommendations.map(({ project, match }) => (
                <ProjectCard key={project.id} project={project} matchScore={match.score} />
              ))}
            </div>
          </>
        )}

        {view === 'saved' && (
          <>
            {savedError && <ErrorState error={savedErrorObj} onRetry={() => refetchSaved()} />}
            {loadingSaved && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-44" />
                ))}
              </div>
            )}
            {!loadingSaved && !savedError && (!saved || saved.length === 0) && (
              <div className="rounded-2xl border border-dashed border-surface-300 py-16 text-center text-surface-500">
                You haven't saved any projects yet. Tap the star on a project to save it here.
              </div>
            )}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {saved?.map((p) => (
                <ProjectCard key={p.id} project={p} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
