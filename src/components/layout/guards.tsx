import { useEffect, type ReactNode } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { rememberReturnTo, takeReturnTo } from '@/lib/returnTo';
import { useT } from '@/i18n';

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, profile, loading, signOut } = useAuth();
  const location = useLocation();

  if (loading) return <FullScreenLoader />;
  if (!user) {
    rememberReturnTo(location.pathname + location.search);
    return <Navigate to="/login" replace />;
  }
  // Checked before profileComplete/routing — a banned user shouldn't be able
  // to reach complete-profile or any other route just because their profile
  // happens to be incomplete. See useSetUserBanned / Reports.tsx for how
  // this gets set; it's reversible, not an account deletion.
  if (profile?.banned) return <BannedScreen onSignOut={signOut} />;
  if (!profile?.profileComplete && location.pathname !== '/complete-profile') {
    return <Navigate to="/complete-profile" replace />;
  }
  return (
    <>
      {profile?.profileComplete && <ReturnToRedirect />}
      {children}
    </>
  );
}

/**
 * Public pages (landing, projects, events, schools, invites): anyone can
 * look. A signed-in user still has to finish onboarding first, and a
 * banned one still gets the banned screen — same as RequireAuth.
 */
export function AllowGuest({ children }: { children: ReactNode }) {
  const { user, profile, loading, signOut } = useAuth();
  const location = useLocation();

  if (loading) return <FullScreenLoader />;
  if (user && profile?.banned) return <BannedScreen onSignOut={signOut} />;
  if (user && !profile?.profileComplete) {
    rememberReturnTo(location.pathname + location.search, { keepExisting: true });
    return <Navigate to="/complete-profile" replace />;
  }
  return (
    <>
      {user && profile?.profileComplete && <ReturnToRedirect />}
      {children}
    </>
  );
}

/** After login → onboarding, sends the person back to where they started. */
function ReturnToRedirect() {
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => {
    const path = takeReturnTo();
    if (path && path !== location.pathname + location.search) navigate(path, { replace: true });
  }, [navigate, location.pathname, location.search]);
  return null;
}

export function RequireGuest({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <FullScreenLoader />;
  if (user) return <Navigate to="/feed" replace />;
  return <>{children}</>;
}

export function FullScreenLoader() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-surface-50">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-600 border-t-transparent" />
    </div>
  );
}

function BannedScreen({ onSignOut }: { onSignOut: () => void }) {
  const t = useT();
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-surface-50 px-6 text-center">
      <div className="max-w-sm space-y-3 rounded-2xl border border-surface-200 bg-white p-7 shadow-card">
        <h1 className="text-lg font-semibold text-surface-900">{t.errors.suspended}</h1>
        <p className="text-sm text-surface-500">
          {t.errors.suspendedText}{' '}
          <a href="mailto:dilanabkanov@gmail.com" className="text-accent-600 hover:underline">
            dilanabkanov@gmail.com
          </a>
          .
        </p>
        <button
          type="button"
          onClick={onSignOut}
          className="mt-2 inline-flex h-10 w-full items-center justify-center rounded-xl border border-surface-200 bg-white px-4 text-sm font-medium text-surface-700 transition-colors hover:bg-surface-100"
        >
          {t.common.signOut}
        </button>
      </div>
    </div>
  );
}
