import { lazy, Suspense } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Compass, Users, LayoutGrid, PlusCircle, User, ShieldAlert, Calendar, Trophy, LogIn } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar } from '@/components/ui/primitives';
import { useIsModerator } from '@/hooks/useReports';
import { cn } from '@/utils/cn';
import { useLang, type Lang } from '@/lib/lang';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { useT } from '@/i18n';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

// Lazy: its modal pulls in the form libraries, which the
// first screen (landing) doesn't need.
const FeedbackButton = lazy(() => import('@/components/FeedbackButton').then((m) => ({ default: m.FeedbackButton })));


// Signed-out visitors: only the pages they can actually browse. Labels
// follow the visitor language (src/lib/lang.ts) like the landing page.
const GUEST_T: Record<Lang, { projects: string; events: string; schools: string; login: string; signup: string }> = {
  ru: { projects: 'Проекты', events: 'События', schools: 'Школы', login: 'Войти', signup: 'Регистрация' },
  kz: { projects: 'Жобалар', events: 'Іс-шаралар', schools: 'Мектептер', login: 'Кіру', signup: 'Тіркелу' },
  en: { projects: 'Projects', events: 'Events', schools: 'Schools', login: 'Log in', signup: 'Sign up' },
};

export function Navbar() {
  const { user, profile } = useAuth();
  const { data: isModerator } = useIsModerator(user?.uid);
  const t = useT();
  if (!user) return <GuestNavbar />;
  const navItems = [
    { to: '/feed', label: t.nav.projects, icon: Compass },
    { to: '/events', label: t.nav.events, icon: Calendar },
    { to: '/looking-for-team', label: t.nav.teammates, icon: Users },
    { to: '/projects/new', label: t.nav.create, icon: PlusCircle },
    { to: '/dashboard', label: t.nav.dashboard, icon: LayoutGrid },
  ];
  return (
    <>
      {/* Desktop top bar */}
      <header className="sticky top-0 z-40 hidden border-b border-surface-200 bg-white/95 backdrop-saturate-150 sm:block print:!hidden">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <NavLink to="/feed" className="text-lg font-bold tracking-tight text-surface-900">
            Team<span className="text-accent-600">Up</span>
          </NavLink>
          <nav className="flex items-center gap-1">
            {navItems.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-medium transition-colors',
                    isActive ? 'bg-accent-50 text-accent-700' : 'text-surface-600 hover:bg-surface-100',
                  )
                }
              >
                <Icon size={16} />
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Suspense fallback={null}>
              <FeedbackButton variant="icon" />
            </Suspense>
            {isModerator && (
              <NavLink
                to="/moderation/reports"
                title={t.nav.moderation}
                className={({ isActive }) =>
                  cn('rounded-lg p-2', isActive ? 'bg-accent-50 text-accent-700' : 'text-surface-400 hover:bg-surface-100')
                }
              >
                <ShieldAlert size={18} />
              </NavLink>
            )}
            <NavLink to="/dashboard?tab=profile" className="flex items-center gap-2">
              <Avatar src={profile?.avatarUrl} name={profile?.name ?? '?'} size={32} />
            </NavLink>
          </div>
        </div>
      </header>

      {/* Mobile bottom tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-surface-200 bg-white/95 pb-[env(safe-area-inset-bottom)] sm:hidden print:!hidden">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium',
                isActive ? 'text-accent-600' : 'text-surface-500',
              )
            }
          >
            <Icon size={20} />
            {label}
          </NavLink>
        ))}
        <NavLink
          to="/dashboard?tab=profile"
          className={({ isActive }) =>
            cn('flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium', isActive ? 'text-accent-600' : 'text-surface-500')
          }
        >
          <User size={20} />
          {t.nav.profile}
        </NavLink>
      </nav>
    </>
  );
}
function GuestNavbar() {
  const t = GUEST_T[useLang()];
  const guestNavItems = [
    { to: '/feed', label: t.projects, icon: Compass },
    { to: '/events', label: t.events, icon: Calendar },
    { to: '/schools', label: t.schools, icon: Trophy },
  ];
  const tabClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-medium transition-colors',
      isActive ? 'bg-accent-50 text-accent-700' : 'text-surface-600 hover:bg-surface-100',
    );
  return (
    <>
      <header className="sticky top-0 z-40 border-b border-surface-200 bg-white/95 backdrop-saturate-150 print:!hidden">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:h-16 sm:px-6">
          <Link to="/" className="text-lg font-bold tracking-tight text-surface-900">
            Team<span className="text-accent-600">Up</span>
          </Link>
          <nav className="hidden items-center gap-1 sm:flex">
            {guestNavItems.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} className={tabClass}>
                <Icon size={16} />
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <LanguageSwitcher compact className="hidden md:flex" />
            <ThemeToggle />
            <Link
              to="/login"
              className="inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-sm font-medium text-surface-700 hover:bg-surface-100"
            >
              <LogIn size={15} className="hidden sm:block" />
              {t.login}
            </Link>
            <Link
              to="/login?mode=signup"
              className="inline-flex h-9 items-center rounded-xl bg-accent-600 px-3.5 text-sm font-medium text-white shadow-soft hover:bg-accent-700"
            >
              {t.signup}
            </Link>
          </div>
        </div>
      </header>

      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-surface-200 bg-white/95 pb-[env(safe-area-inset-bottom)] sm:hidden print:!hidden">
        {guestNavItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn('flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium', isActive ? 'text-accent-600' : 'text-surface-500')
            }
          >
            <Icon size={20} />
            {label}
          </NavLink>
        ))}
      </nav>
    </>
  );
}
