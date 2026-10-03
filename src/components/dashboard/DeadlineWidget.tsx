import { Link } from 'react-router-dom';
import { AlarmClock, CalendarClock, School } from 'lucide-react';
import { useAuth } from '@/contexts/useAuth';
import { useUpcomingDeadlines } from '@/hooks/useProjects';
import { useEventsList } from '@/hooks/useEvents';
import { visibleEvents } from '@/utils/events';
import { mySchoolKey, useSchoolStats } from '@/hooks/useSchoolStats';
import { currentSeason } from '@/constants/gamification';
import { useT } from '@/i18n';
import { Card, Badge } from '@/components/ui/primitives';
import { formatDeadline } from '@/utils/dates';

const URGENT_DAYS = 3;
const SOON_EVENTS_DAYS = 7;

// Sits above the dashboard tabs so a project owner immediately sees what
// needs action — a closing deadline with applications still pending is
// the single most time-sensitive thing on this whole site. Renders
// nothing if there's nothing worth surfacing, so it never adds clutter
// for someone with no open event projects.
export function DeadlineWidget() {
  const { user } = useAuth();
  const { data: deadlines } = useUpcomingDeadlines(user?.uid);
  const { data: events } = useEventsList();
  const tAll = useT();
  const t = tAll.dashboard;

  const urgent = (deadlines ?? []).filter((d) => d.daysLeft <= URGENT_DAYS);
  const soonEvents = visibleEvents(events ?? []).filter((e) => {
    const days = (e.date.toMillis() - Date.now()) / (1000 * 60 * 60 * 24);
    return days >= 0 && days <= SOON_EVENTS_DAYS;
  });

  if (urgent.length === 0 && soonEvents.length === 0) return null;

  return (
    <div className="mb-5 space-y-2">
      {urgent.map(({ project, daysLeft, pendingApplications }) => (
        <Link key={project.id} to={`/dashboard?tab=projects`}>
          <Card className="flex items-center gap-3 border-amber-200 bg-amber-50 hover:border-amber-300">
            <AlarmClock size={18} className="shrink-0 text-amber-600" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-surface-900">{project.title}</p>
              <p className="text-xs text-surface-600">
                {t.closes(daysLeft <= 0 ? tAll.dates.today : tAll.dates.inDays(daysLeft))}
                {pendingApplications > 0 && ` · ${t.waiting(pendingApplications)}`}
              </p>
            </div>
            {pendingApplications > 0 && <Badge tone="yellow">{pendingApplications}</Badge>}
          </Card>
        </Link>
      ))}

      {soonEvents.length > 0 && (
        <Card className="flex items-start gap-3">
          <CalendarClock size={18} className="mt-0.5 shrink-0 text-accent-600" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-surface-900">{tAll.events.comingThisWeek}</p>
            <div className="mt-1 space-y-1">
              {soonEvents.slice(0, 3).map((ev) => (
                <Link key={ev.id} to={`/events/${ev.id}`} className="block text-xs text-surface-600 hover:text-accent-700">
                  {ev.title} - {formatDeadline(ev.date)}
                </Link>
              ))}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

// Small nudge under the dashboard header: where your school ranks, or a
// prompt to add one. Friendly competition between schools is a big part
// of why students invite classmates.
export function SchoolRankCard() {
  const { profile } = useAuth();
  const { data: stats } = useSchoolStats();
  const t = useT().dashboard;
  const key = mySchoolKey(profile);
  const index = key && stats && stats.season === currentSeason() ? stats.schools.findIndex((s) => s.key === key) : -1;

  return (
    <Link to="/schools" className="mb-5 block">
      <Card className="flex items-center gap-3 py-3.5 hover:border-accent-300">
        <School size={18} className="shrink-0 text-accent-600" />
        <p className="min-w-0 flex-1 truncate text-sm text-surface-700">
          {index >= 0
            ? t.schoolRank(stats!.schools[index].name, index + 1)
            : profile?.school
              ? t.seeLeaderboard
              : t.addSchoolCompete}
        </p>
        <span className="text-xs font-medium text-accent-600">{t.view}</span>
      </Card>
    </Link>
  );
}
