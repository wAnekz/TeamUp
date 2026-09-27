import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { Check, ChevronRight, X } from 'lucide-react';
import { Card } from '@/components/ui/primitives';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useMyEventSubscriptions } from '@/hooks/useEvents';
import { useAuthorProjects, useMemberProjects } from '@/hooks/useProjects';
import { useAchievements } from '@/hooks/useAchievements';
import { TELEGRAM_BOT_USERNAME, useTelegramLink } from '@/hooks/useTelegram';
import { cn } from '@/utils/cn';
import { useT } from '@/i18n';

function useHasLookingForTeamPost(uid: string | undefined) {
  return useQuery({
    queryKey: ['lookingForTeam', 'mine', uid],
    enabled: !!uid,
    queryFn: async () => {
      const snap = await getDocs(
        query(collection(db, 'lookingForTeam'), where('authorId', '==', uid), where('active', '==', true)),
      );
      return !snap.empty;
    },
  });
}

interface Step {
  key: string;
  title: string;
  hint: string;
  to: string;
  xp?: number;
  done: boolean;
}

/**
 * First-run checklist at the top of the feed. Every step is derived from
 * real data (not "clicked the tip"), so it ticks itself off as they go, and
 * disappears once everything's done — or when dismissed.
 */
export function GettingStarted() {
  const { user, profile } = useAuth();
  const uid = user?.uid;
  const dismissKey = `teamup:gettingStartedDismissed:${uid}`;
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(dismissKey) === '1';
    } catch {
      return false;
    }
  });

  const { data: subs, isLoading: l1 } = useMyEventSubscriptions(uid);
  const { data: owned, isLoading: l2 } = useAuthorProjects(uid);
  const { data: joined, isLoading: l3 } = useMemberProjects(uid);
  const { data: hasPost, isLoading: l4 } = useHasLookingForTeamPost(uid);
  const { data: achievements, isLoading: l5 } = useAchievements(uid);
  const { data: telegram } = useTelegramLink(uid);
  const t = useT().onboarding;

  if (!profile || dismissed || l1 || l2 || l3 || l4 || l5) return null;

  const steps: Step[] = [
    {
      key: 'team',
      title: t.team,
      hint: t.teamHint,
      to: '/looking-for-team',
      xp: 50,
      done: (owned?.length ?? 0) > 0 || (joined?.length ?? 0) > 0 || !!hasPost,
    },
    {
      key: 'event',
      title: t.event,
      hint: t.eventHint,
      to: '/events',
      xp: 5,
      done: (subs?.size ?? 0) > 0,
    },
    {
      key: 'school',
      title: t.school,
      hint: t.schoolHint,
      to: '/dashboard?tab=profile',
      done: !!profile.school,
    },
    {
      key: 'achievement',
      title: t.achievement,
      hint: t.achievementHint,
      to: '/dashboard?tab=profile',
      xp: 40,
      done: (achievements?.length ?? 0) > 0,
    },
    ...(TELEGRAM_BOT_USERNAME
      ? [
          {
            key: 'telegram',
            title: t.telegram,
            hint: t.telegramHint,
            to: '/dashboard?tab=profile',
            done: !!telegram?.linked,
          },
        ]
      : []),
  ];

  const doneCount = steps.filter((s) => s.done).length;
  if (doneCount === steps.length) return null;
  const firstName = profile.name.split(' ')[0];

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(dismissKey, '1');
    } catch {
      // fine — it just comes back next visit
    }
  };

  return (
    <Card className="mb-5 border-accent-200">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-surface-900">
            {doneCount === 0 ? t.welcome(firstName) : t.keepGoing(firstName)}
          </p>
          <p className="text-xs text-surface-500">{t.progress(doneCount, steps.length)}</p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label={t.hide}
          className="rounded-lg p-1 text-surface-400 hover:bg-surface-100 hover:text-surface-600"
        >
          <X size={16} />
        </button>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-100">
        <div className="h-full rounded-full bg-accent-600 transition-all" style={{ width: `${(doneCount / steps.length) * 100}%` }} />
      </div>
      <div className="mt-3 divide-y divide-surface-100">
        {steps.map((step) => (
          <Link
            key={step.key}
            to={step.to}
            className={cn('flex items-center gap-3 py-2.5', step.done && 'pointer-events-none')}
          >
            <span
              className={cn(
                'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border',
                step.done ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-surface-300',
              )}
            >
              {step.done && <Check size={14} />}
            </span>
            <span className="min-w-0 flex-1">
              <span className={cn('block text-sm font-medium', step.done ? 'text-surface-400 line-through' : 'text-surface-900')}>
                {step.title}
              </span>
              {!step.done && <span className="block text-xs text-surface-500">{step.hint}</span>}
            </span>
            {!step.done && step.xp && (
              <span className="shrink-0 rounded-full bg-accent-50 px-2 py-0.5 text-[11px] font-semibold text-accent-700">
                +{step.xp} XP
              </span>
            )}
            {!step.done && <ChevronRight size={16} className="shrink-0 text-surface-300" />}
          </Link>
        ))}
      </div>
    </Card>
  );
}
