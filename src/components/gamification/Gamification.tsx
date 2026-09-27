import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Sparkles } from 'lucide-react';
import { Card, Skeleton } from '@/components/ui/primitives';
import { useGamification, useXpHistory, seasonXpOf } from '@/hooks/useGamification';
import {
  BADGE_IDS,
  badgeFor,
  daysLeftInSeason,
  formatSeason,
  currentSeason,
  LEVEL_STYLE,
  levelInfo,
  levelName,
  XP_RULE_POINTS,
} from '@/constants/gamification';
import { useT, type Dict } from '@/i18n';
import type { XpEvent } from '@/types';
import { durationAgo } from '@/utils/dates';
import { cn } from '@/utils/cn';

/**
 * The ledger key's prefix says what happened (see awardXp keys in
 * functions/src/gamification.ts); `subject` is the project/achievement
 * title. Older entries have no subject — pull it out of the English log line.
 */
function xpReason(t: Dict['gamification'], e: XpEvent) {
  const kind = e.id.split('_')[0];
  const subject = e.subject ?? e.reason.match(/"([^"]+)"/)?.[1] ?? e.reason.split(': ')[1] ?? '';
  const render = t.reasons[kind];
  return render ? render(subject) : e.reason;
}

/** "Lv 3 · Builder" — shown next to a name wherever you're sizing someone up. */
export function LevelPill({ uid, className }: { uid: string; className?: string }) {
  const { data } = useGamification(uid);
  const t = useT().gamification;
  if (!data) return null;
  const { current } = levelInfo(data.xp ?? 0);
  return (
    <span
      title={`${data.xp ?? 0} XP`}
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold',
        LEVEL_STYLE[current.level],
        className,
      )}
    >
      {t.lv(current.level, levelName(current.level))}
    </span>
  );
}

/** Public badge shelf on a profile. Renders nothing until there's a badge. */
export function BadgesCard({ uid }: { uid: string }) {
  const { data } = useGamification(uid);
  const t = useT().gamification;
  const badges = (data?.badges ?? []).map(badgeFor).filter((b) => b !== null);
  if (badges.length === 0) return null;
  return (
    <Card className="print:break-inside-avoid print:shadow-none">
      <p className="mb-3 text-sm font-medium text-surface-700">{t.badges}</p>
      <div className="flex flex-wrap gap-2">
        {badges.map((b) => (
          <span
            key={b.id}
            title={b.description}
            className="inline-flex items-center gap-1.5 rounded-xl border border-surface-200 bg-surface-50 px-2.5 py-1.5 text-xs font-medium text-surface-700"
          >
            <span className="text-base leading-none">{b.emoji}</span>
            {b.name}
          </span>
        ))}
      </div>
    </Card>
  );
}

/**
 * My Profile: level progress, this season's XP, every badge (earned ones lit,
 * the rest greyed out so there's something to aim for), how XP is earned,
 * and recent grants.
 */
export function XpCard({ uid }: { uid: string }) {
  const { data, isLoading } = useGamification(uid);
  const { data: history } = useXpHistory(uid);
  const [showRules, setShowRules] = useState(false);
  const t = useT().gamification;

  if (isLoading) return <Skeleton className="h-40" />;

  const xp = data?.xp ?? 0;
  const { current, next, progress } = levelInfo(xp);
  const earned = new Set(data?.badges ?? []);
  const champion = [...earned].filter((id) => id.startsWith('champion:')).map(badgeFor).filter((b) => b !== null);

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-surface-400">{t.level(current.level)}</p>
          <p className="text-lg font-bold text-surface-900">{levelName(current.level)}</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold tabular-nums text-accent-700">{xp} XP</p>
          <p className="text-xs text-surface-500">
            {t.thisSeason(seasonXpOf(data), formatSeason(currentSeason()))}
          </p>
        </div>
      </div>

      <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-surface-100">
        <div className="h-full rounded-full bg-accent-600 transition-all" style={{ width: `${Math.round(progress * 100)}%` }} />
      </div>
      <p className="mt-1.5 text-xs text-surface-500">
        {next ? t.toNext(next.minXp - xp, levelName(next.level)) : t.maxLevel}
        {' · '}
        <Link to="/schools" className="text-accent-600 hover:underline">
          {t.seasonEnds(daysLeftInSeason())}
        </Link>
      </p>

      <p className="mb-2 mt-4 text-sm font-medium text-surface-700">
        {t.badges} <span className="font-normal text-surface-400">({earned.size})</span>
      </p>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {[...champion, ...BADGE_IDS.map(badgeFor).filter((b) => b !== null)].map((b) => {
          const has = earned.has(b.id);
          return (
            <div
              key={b.id}
              title={b.description}
              className={cn(
                'flex flex-col items-center gap-1 rounded-xl border p-2 text-center',
                has ? 'border-accent-200 bg-accent-50' : 'border-surface-100 bg-surface-50 opacity-50 grayscale',
              )}
            >
              <span className="text-xl leading-none">{b.emoji}</span>
              <span className="text-[11px] font-medium leading-tight text-surface-700">{b.name}</span>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => setShowRules((v) => !v)}
        className="mt-4 flex w-full items-center justify-between border-t border-surface-100 pt-3 text-sm font-medium text-surface-700"
      >
        <span className="flex items-center gap-1.5">
          <Sparkles size={14} className="text-accent-600" /> {t.howToEarn}
        </span>
        <ChevronDown size={16} className={cn('text-surface-400 transition-transform', showRules && 'rotate-180')} />
      </button>
      {showRules && (
        <div className="mt-2 space-y-1.5">
          {t.rules.map((label, i) => (
            <div key={label} className="flex items-center justify-between gap-3 text-sm">
              <span className="text-surface-600">{label}</span>
              <span className="shrink-0 font-semibold tabular-nums text-accent-700">+{XP_RULE_POINTS[i]}</span>
            </div>
          ))}
          <p className="pt-1 text-xs text-surface-400">{t.noFarm}</p>
        </div>
      )}

      {history && history.length > 0 && (
        <div className="mt-4 border-t border-surface-100 pt-3">
          <p className="mb-2 text-sm font-medium text-surface-700">{t.recent}</p>
          <div className="space-y-1.5">
            {history.map((e) => (
              <div key={e.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="min-w-0 truncate text-surface-600">
                  {xpReason(t, e)}
                  {e.newBadges?.map((id) => (
                    <span key={id} className="ml-1" title={badgeFor(id)?.name}>
                      {badgeFor(id)?.emoji}
                    </span>
                  ))}
                </span>
                <span className="shrink-0 text-xs text-surface-400">
                  {e.points > 0 && <span className="mr-2 font-semibold text-accent-700">+{e.points}</span>}
                  {durationAgo(e.createdAt)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
