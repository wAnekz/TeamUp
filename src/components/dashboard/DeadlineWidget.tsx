import { Link } from 'react-router-dom';
import { AlarmClock, CalendarClock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useUpcomingDeadlines } from '@/hooks/useProjects';
import { useEventsList } from '@/hooks/useEvents';
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

  const urgent = (deadlines ?? []).filter((d) => d.daysLeft <= URGENT_DAYS);
  const soonEvents = (events ?? []).filter((e) => {
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
                Closes {daysLeft <= 0 ? 'today' : `in ${daysLeft}d`}
                {pendingApplications > 0 &&
                  ` · ${pendingApplications} application${pendingApplications === 1 ? '' : 's'} waiting on you`}
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
            <p className="text-sm font-medium text-surface-900">Coming up this week</p>
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
