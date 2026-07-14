import { useState } from 'react';
import { Mail } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Shown app-wide (mounted in AppShell) whenever a signed-in user's email
 * isn't verified yet. Google sign-ins are always emailVerified=true, so this
 * only ever applies to email/password accounts.
 *
 * Deliberately a nudge, not a hard gate — the UI still works either way, but
 * firestore.rules requires email_verified to *create* a project, a
 * "looking for team" post, or an application. That's where an unverified
 * address would otherwise cause emails (see functions/src/notifications.ts)
 * to bounce or reach nobody, so those three actions are the ones worth
 * blocking on it. Everything else (browsing, chatting once already on a
 * team, reading) stays open.
 */
export function EmailVerificationBanner() {
  const { user, emailVerified, resendVerificationEmail, refreshEmailVerified } = useAuth();
  const [sending, setSending] = useState(false);
  const [checking, setChecking] = useState(false);
  const [justSent, setJustSent] = useState(false);
  const [stillUnverified, setStillUnverified] = useState(false);

  if (!user || emailVerified) return null;

  const handleResend = async () => {
    setSending(true);
    setJustSent(false);
    try {
      await resendVerificationEmail();
      setJustSent(true);
    } finally {
      setSending(false);
    }
  };

  const handleCheck = async () => {
    setChecking(true);
    setStillUnverified(false);
    try {
      const verified = await refreshEmailVerified();
      if (!verified) setStillUnverified(true);
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-2.5 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-2">
        <Mail size={16} className="shrink-0 text-amber-600" />
        <p className="text-sm text-amber-800">
          Подтверди почту <strong>{user.email}</strong> — без этого нельзя опубликовать проект, пост
          «ищу команду» или отклик.
        </p>
        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={handleCheck} loading={checking}>
            Я подтвердил
          </Button>
          <Button size="sm" variant="ghost" onClick={handleResend} loading={sending}>
            Отправить ещё раз
          </Button>
        </div>
        {justSent && <p className="w-full text-xs text-amber-700">Письмо отправлено, проверь почту (и папку "Спам").</p>}
        {stillUnverified && (
          <p className="w-full text-xs text-amber-700">Пока не вижу подтверждения — перейди по ссылке в письме и попробуй снова.</p>
        )}
      </div>
    </div>
  );
}
