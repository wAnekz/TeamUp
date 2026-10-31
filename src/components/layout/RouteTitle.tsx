import { matchPath, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/useAuth';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useT } from '@/i18n';

// Project and event pages are left out on purpose: they title the tab with
// the project/event name themselves once it has loaded (see ProjectDetail /
// EventDetail). A parent effect runs after its children's, so titling them
// here as well would overwrite that name.
const SELF_TITLED = ['/projects/:id', '/events/:id'];

export function RouteTitle() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const t = useT();

  const titles: [string, string][] = [
    ['/feed', t.nav.projects],
    ['/projects/new', t.nav.create],
    ['/projects/:id/edit', t.nav.create],
    ['/events', t.nav.events],
    ['/schools', t.nav.schools],
    ['/looking-for-team', t.nav.teammates],
    ['/dashboard', t.nav.dashboard],
    ['/moderation/*', t.nav.moderation],
    ['/users/:id', t.pageTitle.user],
    ['/invite/:code', t.pageTitle.invite],
    ['/login', t.pageTitle.login],
    ['/complete-profile', t.pageTitle.completeProfile],
    ['/privacy', t.profile.privacy],
    ['/terms', t.pageTitle.terms],
  ];

  const isHome = pathname === '/';
  const selfTitled = SELF_TITLED.some((p) => matchPath(p, pathname));
  const title = isHome
    ? user
      ? t.nav.projects
      : t.pageTitle.home
    : selfTitled
      ? undefined
      : (titles.find(([p]) => matchPath(p, pathname))?.[1] ?? t.errors.notFound);

  usePageTitle(title, isHome && !user);
  return null;
}
