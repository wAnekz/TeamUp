import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Navbar } from './Navbar';
import { EmailVerificationBanner } from './EmailVerificationBanner';

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-surface-50">
      <Navbar />
      <EmailVerificationBanner />
      <main className="mx-auto max-w-6xl px-4 pb-24 pt-6 sm:px-6 sm:pb-10">{children}</main>
      <footer className="mx-auto max-w-6xl px-4 pb-28 pt-2 text-center sm:px-6 sm:pb-6">
        <Link to="/privacy" className="text-xs text-surface-400 hover:text-surface-600 hover:underline">
          Политика конфиденциальности
        </Link>
      </footer>
    </div>
  );
}
