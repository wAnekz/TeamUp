import type { ReactNode } from 'react';
import { Navbar } from './Navbar';
import { EmailVerificationBanner } from './EmailVerificationBanner';
import { useAuth } from '@/contexts/AuthContext';
import { useXpToasts } from '@/hooks/useGamification';
import { useOnline } from '@/hooks/useOnline';
import { useT } from '@/i18n';

// The privacy policy link used to live here, in a footer shown on every
// authenticated page. Moved to Settings (see MyProfile.tsx) — it only needs
// to be reachable, not repeated on every screen, and Login.tsx already links
// it for people who haven't signed up yet.
export function AppShell({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  useXpToasts(user?.uid);
  const online = useOnline();
  const t = useT();
  return (
    <div className="min-h-dvh bg-surface-50 print:bg-white">
      <Navbar />
      <EmailVerificationBanner />
      {!online && (
        <div role="status" className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-sm text-amber-800 print:hidden">
          {t.common.offline}
        </div>
      )}
      <main className="mx-auto max-w-6xl px-4 pb-24 pt-6 sm:px-6 sm:pb-10 print:p-0">{children}</main>
    </div>
  );
}
