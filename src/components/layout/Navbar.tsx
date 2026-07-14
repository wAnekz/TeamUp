import { NavLink } from 'react-router-dom';
import { Compass, Users, LayoutGrid, PlusCircle, User, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar } from '@/components/ui/primitives';
import { useIsModerator } from '@/hooks/useReports';
import { FeedbackButton } from '@/components/FeedbackButton';
import { cn } from '@/utils/cn';

const navItems = [
  { to: '/feed', label: 'Projects', icon: Compass },
  { to: '/looking-for-team', label: 'Teammates', icon: Users },
  { to: '/projects/new', label: 'Create', icon: PlusCircle },
  { to: '/dashboard', label: 'Dashboard', icon: LayoutGrid },
];

export function Navbar() {
  const { user, profile } = useAuth();
  const { data: isModerator } = useIsModerator(user?.uid);
  return (
    <>
      {/* Desktop top bar */}
      <header className="sticky top-0 z-40 hidden border-b border-surface-200 bg-white/95 backdrop-saturate-150 sm:block">
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
            <FeedbackButton variant="icon" />
            {isModerator && (
              <NavLink
                to="/moderation/reports"
                title="Moderation queue"
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
      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-surface-200 bg-white/95 pb-[env(safe-area-inset-bottom)] sm:hidden">
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
          Profile
        </NavLink>
      </nav>
    </>
  );
}