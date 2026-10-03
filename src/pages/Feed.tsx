import { useEffect, useRef, useState } from 'react';
import { useProjectFeed, useRecommendationPool } from '@/hooks/useProjects';
import { useSavedProjectsFeed } from '@/hooks/useSavedProjects';
import { ProjectCard } from '@/components/projects/ProjectCard';
import { ProjectFilterPanel } from '@/components/projects/ProjectFilterPanel';
import { ErrorState, Skeleton } from '@/components/ui/primitives';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/useAuth';
import { GettingStarted } from '@/components/onboarding/GettingStarted';
import { Button } from '@/components/ui/Button';
import { useT } from '@/i18n';
import { rankByMatch } from '@/utils/match';
import { cn } from '@/utils/cn';
import type { FeedView, ProjectFilters } from '@/types';

const EMPTY_FILTERS: ProjectFilters = { skills: [], interests: [] };


export default function Feed() {
  const { user, profile } = useAuth();
  const [view, setView] = useState<FeedView>('all');
  const [filters, setFilters] = useState<ProjectFilters>(EMPTY_FILTERS);
  const isGuest = !user;
  const t = useT().feed;
  const VIEW_TABS: { key: FeedView; label: string }[] = [
    { key: 'all', label: t.tabAll },
    { key: 'recommended', label: t.tabRecommended },
    { key: 'saved', label: t.tabSaved },
  ];
  const { data, isLoading, isError, error, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } = useProjectFeed(
    filters,
    isGuest,
  );
  const {
    data: pool,
    isLoading: loadingPool,
    isError: poolError,
    error: poolErrorObj,
    refetch: refetchPool,
  } = useRecommendationPool(isGuest);
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
        {!isGuest && <GettingStarted />}

        <div className="mb-4 flex items-center justify-between gap-3">
          <h1 className="text-xl font-bold text-surface-900">{t.title}</h1>
          {!isGuest && (
            <Link to="/projects/new">
              <Button size="sm">{t.startProject}</Button>
            </Link>
          )}
        </div>

        {isGuest && (
          <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-accent-200 bg-accent-50 p-4 sm:flex-row sm:items-center">
            <p className="flex-1 text-sm text-accent-900">{t.guestBanner}</p>
            <Link to="/login?mode=signup" className="shrink-0">
              <Button size="sm">{t.signUpFree}</Button>
            </Link>
          </div>
        )}

        <div
          className={cn('mb-4 flex gap-1 overflow-x-auto rounded-xl bg-surface-100 p-1 scrollbar-none', isGuest && 'hidden')}
        >
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
                <p>{t.empty}</p>
                {!isGuest && (
                  <Link to="/projects/new" className="mt-4 inline-block">
                    <Button size="sm">{t.startProject}</Button>
                  </Link>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {projects.map((p) => (
                <ProjectCard key={p.id} project={p} />
              ))}
            </div>

            <div ref={sentinelRef} className="h-10" />
            {isFetchingNextPage && <p className="text-center text-sm text-surface-400">{t.loadingMore}</p>}
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
                {t.noMatches}
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
                {t.noSaved}
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
