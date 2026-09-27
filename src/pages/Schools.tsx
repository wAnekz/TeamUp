import { Link } from 'react-router-dom';
import { School, Trophy } from 'lucide-react';
import { Card, Skeleton } from '@/components/ui/primitives';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { mySchoolKey, useSchoolStats } from '@/hooks/useSchoolStats';
import { useSeasonChampions } from '@/hooks/useGamification';
import { currentSeason, daysLeftInSeason, formatSeason } from '@/constants/gamification';
import { timeAgo } from '@/utils/dates';
import { cn } from '@/utils/cn';
import { useT } from '@/i18n';

const MEDAL = ['text-amber-500', 'text-surface-400', 'text-orange-400'];

export default function Schools() {
  const { profile } = useAuth();
  const { data: stats, isLoading } = useSchoolStats();
  const { data: champions } = useSeasonChampions();
  const t = useT().schools;
  const myKey = mySchoolKey(profile);
  const season = currentSeason();
  // Until the first daily run of a new season, the stored ranking is last
  // season's — don't present it as this season's standings.
  const schools = stats?.season === season ? stats.schools : [];
  const myIndex = myKey ? schools.findIndex((s) => s.key === myKey) : -1;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-xl font-bold text-surface-900">{t.title}</h1>
          <span className="text-sm font-medium text-accent-700">{t.season(formatSeason(season), daysLeftInSeason())}</span>
        </div>
        <p className="mt-1 text-sm text-surface-500">{t.subtitle}</p>
      </div>

      {!profile ? (
        <Card className="flex items-center justify-between gap-3 border-accent-200 bg-accent-50">
          <p className="text-sm text-accent-800">{t.guestPrompt}</p>
          <Link to="/login?mode=signup">
            <Button size="sm">{t.signUp}</Button>
          </Link>
        </Card>
      ) : (
        !profile.school && (
          <Card className="flex items-center justify-between gap-3 border-accent-200 bg-accent-50">
            <p className="text-sm text-accent-800">{t.addPrompt}</p>
            <Link to="/dashboard?tab=profile">
              <Button size="sm">{t.addSchool}</Button>
            </Link>
          </Card>
        )
      )}

      {myIndex >= 0 && (
        <Card className="flex items-center gap-3">
          <School size={20} className="shrink-0 text-accent-600" />
          <p className="text-sm text-surface-700">
            {t.yourRank(schools[myIndex].name, myIndex + 1, schools[myIndex].score)}
            {myIndex > 0 && t.behind(schools[myIndex - 1].score - schools[myIndex].score + 1, myIndex)}
          </p>
        </Card>
      )}

      {isLoading && <Skeleton className="h-64" />}

      {!isLoading && schools.length === 0 && (
        <p className="rounded-2xl border border-dashed border-surface-300 py-12 text-center text-sm text-surface-500">
          {t.empty}
        </p>
      )}

      {schools.length > 0 && (
        <Card className="p-0">
          <div className="grid grid-cols-[2rem_1fr_4rem] gap-2 border-b border-surface-100 px-4 py-2.5 text-[11px] font-medium uppercase tracking-wide text-surface-400 sm:grid-cols-[2.5rem_1fr_4rem_4rem_4.5rem]">
            <span>#</span>
            <span>{t.colSchool}</span>
            <span className="hidden text-right sm:block">{t.colStudents}</span>
            <span className="hidden text-right sm:block">{t.colActive}</span>
            <span className="text-right">XP</span>
          </div>
          {schools.slice(0, 50).map((s, i) => (
            <div
              key={s.key}
              className={cn(
                'grid grid-cols-[2rem_1fr_4rem] items-center gap-2 border-b border-surface-50 px-4 py-2.5 text-sm last:border-0 sm:grid-cols-[2.5rem_1fr_4rem_4rem_4.5rem]',
                s.key === myKey && 'bg-accent-50',
              )}
            >
              <span className="flex items-center font-semibold text-surface-500">
                {i < 3 && s.score > 0 ? <Trophy size={16} className={MEDAL[i]} /> : i + 1}
              </span>
              <span className="min-w-0">
                <span className="block truncate font-medium text-surface-900">{s.name}</span>
                {s.city && <span className="block truncate text-xs text-surface-400">{s.city}</span>}
              </span>
              <span className="hidden text-right tabular-nums text-surface-600 sm:block">{s.students}</span>
              <span className="hidden text-right tabular-nums text-surface-600 sm:block">{s.active}</span>
              <span className="text-right font-semibold tabular-nums text-surface-900">{s.score}</span>
            </div>
          ))}
        </Card>
      )}

      {stats?.updatedAt && stats.season === season && (
        <p className="text-center text-xs text-surface-400">{timeAgo(stats.updatedAt)}</p>
      )}

      {champions && champions.length > 0 && (
        <Card>
          <p className="mb-2 text-sm font-medium text-surface-700">{t.pastChampions}</p>
          <div className="space-y-1.5">
            {champions.map((c) => (
              <div key={c.season} className="flex items-center justify-between gap-3 text-sm">
                <span className="flex min-w-0 items-center gap-2">
                  <span>🏆</span>
                  <span className="truncate font-medium text-surface-800">{c.name}</span>
                  {c.city && <span className="hidden text-xs text-surface-400 sm:inline">{c.city}</span>}
                </span>
                <span className="shrink-0 text-xs text-surface-500">
                  {formatSeason(c.season)} · {c.score} XP
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
