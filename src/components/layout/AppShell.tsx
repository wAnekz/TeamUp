import type { ReactNode } from 'react';
import { Navbar } from './Navbar';
import { EmailVerificationBanner } from './EmailVerificationBanner';

// The privacy policy link used to live here, in a footer shown on every
// authenticated page. Moved to Settings (see MyProfile.tsx) — it only needs
// to be reachable, not repeated on every screen, and Login.tsx already links
// it for people who haven't signed up yet.
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-surface-50">
      <Navbar />
      <EmailVerificationBanner />
      <main className="mx-auto max-w-6xl px-4 pb-24 pt-6 sm:px-6 sm:pb-10">{children}</main>
    </div>
  );
}
