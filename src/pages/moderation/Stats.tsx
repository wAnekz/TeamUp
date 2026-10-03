import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { doc, getDoc, type Timestamp } from 'firebase/firestore';
import { ArrowLeft } from 'lucide-react';
import { db } from '@/lib/firebase';
import { Card, Skeleton } from '@/components/ui/primitives';
import { useAuth } from '@/contexts/useAuth';
import { useIsModerator } from '@/hooks/useReports';
import { formatDeadline } from '@/utils/dates';
import { useT } from '@/i18n';

// Mirrors MetricsSnapshot in functions/src/metrics.ts.
interface Snapshot {
  date: string;
  users: number;
  profiles: number;
  activated: number;
  onTeam: number;
  new7d: number;
  active1d: number;
  active7d: number;
  active30d: number;
  openProjects: number;
  applications7d: number;
  accepted7d: number;
  telegramLinked: number;
  eventInterests: number;
}

function useMetrics(enabled: boolean) {
  return useQuery({
    queryKey: ['metrics'],
    enabled,
    queryFn: async () => {
      const snap = await getDoc(doc(db, 'config', 'metrics'));
      return snap.exists()
        ? (snap.data() as { current: Snapshot; history: Snapshot[]; updatedAt: Timestamp })
        : null;
    },
  });
}

const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);

/** Moderator-only product numbers (config/metrics, computed nightly by computeMetrics). */
export default function Stats() {
  const { user } = useAuth();
  const { data: isModerator, isLoading: checking } = useIsModerator(user?.uid);
  const { data, isLoading } = useMetrics(!!isModerator);
  const tAll = useT();
  const t = tAll.metrics;

  if (checking) return <Skeleton className="h-40" />;
  if (!isModerator) {
    return <p className="mx-auto max-w-md text-center text-sm text-surface-500">{tAll.errors.moderatorsOnly}</p>;
  }

  const m = data?.current;
  const funnel = m
    ? [
        { label: t.fSignedUp, value: m.users },
        { label: t.fProfile, value: m.profiles },
        { label: t.fActed, value: m.activated },
        { label: t.fTeam, value: m.onTeam },
      ]
    : [];
  const history = data?.history ?? [];
  const maxActive = Math.max(1, ...history.map((h) => h.active7d));

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link to="/moderation/reports" className="inline-flex items-center gap-1 text-sm text-surface-500 hover:text-surface-700">
        <ArrowLeft size={14} /> {tAll.moderation.openReports}
      </Link>
      <div>
        <h1 className="text-xl font-bold text-surface-900">{t.title}</h1>
        <p className="mt-1 text-sm text-surface-500">{t.subtitle}</p>
      </div>

      {isLoading && <Skeleton className="h-64" />}
      {!isLoading && !m && (
        <p className="rounded-2xl border border-dashed border-surface-300 py-12 text-center text-sm text-surface-500">{t.empty}</p>
      )}

      {m && (
        <>
          <Card>
            <p className="mb-3 text-sm font-medium text-surface-700">{t.active}</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: t.today, value: m.active1d },
                { label: t.week, value: m.active7d },
                { label: t.month, value: m.active30d },
                { label: t.stickiness, value: `${pct(m.active7d, m.active30d)}%`, hint: t.stickinessHint },
              ].map((k) => (
                <div key={k.label} title={k.hint} className="rounded-xl bg-surface-50 p-3">
                  <p className="text-2xl font-bold tabular-nums text-surface-900">{k.value}</p>
                  <p className="text-xs text-surface-500">{k.label}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <p className="mb-3 text-sm font-medium text-surface-700">{t.funnel}</p>
            <div className="space-y-2.5">
              {funnel.map((step, i) => (
                <div key={step.label}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="text-surface-700">{step.label}</span>
                    <span className="tabular-nums text-surface-900">
                      <strong>{step.value}</strong>
                      {i > 0 && (
                        <span className="ml-2 text-xs text-surface-500">{pct(step.value, funnel[i - 1].value)}%</span>
                      )}
                    </span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface-100">
                    <div className="h-full rounded-full bg-accent-600" style={{ width: `${pct(step.value, funnel[0].value)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <p className="mb-3 text-sm font-medium text-surface-700">{t.thisWeek}</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
              {[
                [t.newUsers, m.new7d],
                [t.applications, m.applications7d],
                [t.accepted, m.accepted7d],
                [t.openProjects, m.openProjects],
                [t.telegram, m.telegramLinked],
                [t.interests, m.eventInterests],
              ].map(([label, value]) => (
                <div key={label as string} className="flex items-baseline justify-between gap-2 border-b border-surface-50 py-1">
                  <span className="text-surface-600">{label}</span>
                  <strong className="tabular-nums text-surface-900">{value}</strong>
                </div>
              ))}
            </div>
          </Card>

          {history.length > 1 && (
            <Card>
              <p className="mb-3 text-sm font-medium text-surface-700">{t.trend}</p>
              <div className="flex h-24 items-end gap-1">
                {history.map((h) => (
                  <div
                    key={h.date}
                    title={`${h.date}: ${h.active7d}`}
                    className="flex-1 rounded-t bg-accent-500"
                    style={{ height: `${Math.max(4, (h.active7d / maxActive) * 100)}%` }}
                  />
                ))}
              </div>
            </Card>
          )}

          {data?.updatedAt && <p className="text-center text-xs text-surface-400">{t.updated(formatDeadline(data.updatedAt))}</p>}
        </>
      )}
    </div>
  );
}
