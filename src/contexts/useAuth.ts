import { createContext, useContext } from 'react';
import type { User } from 'firebase/auth';
import type { UserProfile } from '@/types';

// Context object and hook live apart from AuthProvider (AuthContext.tsx) so
// that file exports only a component, which React Fast Refresh needs.

export interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  // Snapshot of user.emailVerified, kept in its own bit of state because the
  // Firebase User object doesn't itself trigger a re-render when the
  // underlying value changes (e.g. after the user clicks the link in the
  // verification email in another tab, then comes back and hits "I've
  // verified"). Google sign-in accounts are always true here — Google
  // already verified the address.
  emailVerified: boolean;
  signInEmail: (email: string, password: string) => Promise<void>;
  signUpEmail: (email: string, password: string) => Promise<void>;
  signInGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  refreshEmailVerified: () => Promise<boolean>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
