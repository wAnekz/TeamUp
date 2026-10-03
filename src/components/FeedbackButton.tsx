import { useState } from 'react';
import { MessageCircleWarning } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { useSubmitFeedback } from '@/hooks/useFeedback';
import { toast, errorToMessage } from '@/lib/toast';
import { cn } from '@/utils/cn';
import { useT } from '@/i18n';

/**
 * Global "tell the developer something's wrong" entry point — separate from
 * ReportButton (which is for reporting another user/project to moderators).
 * This is one-directional: no in-app inbox, it emails the developer
 * directly (see functions/src/feedback.ts). `initialMessage` lets callers
 * (e.g. ErrorBoundary) pre-fill it with error context instead of asking the
 * person to describe what happened from scratch.
 */
export function FeedbackButton({
  initialMessage = '',
  label,
  variant = 'ghost',
  className,
}: {
  initialMessage?: string;
  label?: string;
  variant?: 'ghost' | 'secondary' | 'icon';
  className?: string;
}) {
  const { user } = useAuth();
  const tAll = useT();
  const t = tAll.feedback;
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState(initialMessage);
  const [sent, setSent] = useState(false);
  const { mutateAsync, isPending } = useSubmitFeedback();

  if (!user) return null;

  const submit = async () => {
    if (!message.trim()) return;
    try {
      await mutateAsync({ reporterId: user.uid, message: message.trim(), page: window.location.pathname });
      setSent(true);
    } catch (err) {
      toast.error(errorToMessage(err));
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={variant === 'icon' ? t.label : undefined}
        className={cn(
          variant === 'secondary'
            ? 'inline-flex items-center justify-center gap-1.5 rounded-xl border border-surface-200 bg-white px-3 py-2 text-sm font-medium text-surface-700 hover:bg-surface-100'
            : variant === 'icon'
              ? 'rounded-lg p-2 text-surface-400 hover:bg-surface-100'
              : 'inline-flex items-center gap-1.5 text-xs font-medium text-surface-400 hover:text-accent-600',
          className,
        )}
      >
        <MessageCircleWarning size={variant === 'secondary' ? 16 : variant === 'icon' ? 18 : 13} />
        {variant !== 'icon' && (label ?? t.label)}
      </button>
      <Modal
        open={open}
        onClose={() => {
          setOpen(false);
          setSent(false);
          setMessage(initialMessage);
        }}
        title={sent ? t.thanks : t.label}
      >
        {sent ? (
          <p className="text-sm text-surface-600">{t.sent}</p>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-surface-500">{t.text}</p>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              maxLength={2000}
              placeholder={t.placeholder}
              className="w-full resize-none rounded-xl border border-surface-400 p-3 text-sm text-surface-900 outline-none focus:border-accent-400"
            />
            <Button className="w-full" onClick={submit} disabled={!message.trim()} loading={isPending}>
              {tAll.common.send}
            </Button>
          </div>
        )}
      </Modal>
    </>
  );
}