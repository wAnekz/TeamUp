import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/useAuth';
import { rememberReturnTo } from '@/lib/returnTo';

/**
 * For actions a guest can see but not do. Returns `requireAccount()`:
 * true when signed in; otherwise remembers the current page, sends them to
 * sign-up, and returns false so the caller just stops.
 */
export function useAuthGate() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const requireAccount = useCallback(() => {
    if (user) return true;
    rememberReturnTo(location.pathname + location.search);
    navigate('/login?mode=signup');
    return false;
  }, [user, navigate, location.pathname, location.search]);

  return { isGuest: !user, requireAccount };
}
