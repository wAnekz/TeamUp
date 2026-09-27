import { useEffect, useState } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { TELEGRAM_BOT_USERNAME, useStartTelegramLink, useTelegramLink, useUpdateTelegram } from '@/hooks/useTelegram';
import { toast, errorToMessage } from '@/lib/toast';
import { useT } from '@/i18n';

// Settings row in MyProfile. Most students here live in Telegram and rarely
// open email, so this is the channel reminders and invites actually reach.
export function TelegramSettingsRow({ uid }: { uid: string }) {
  const { data: link, refetch } = useTelegramLink(uid);
  const startLink = useStartTelegramLink(uid);
  const update = useUpdateTelegram(uid);
  const [waiting, setWaiting] = useState(false);
  const t = useT().telegram;

  // After opening the bot, poll briefly so the row flips to "Connected"
  // once they press Start, without needing a manual refresh.
  useEffect(() => {
    if (!waiting) return;
    if (link?.linked) {
      setWaiting(false);
      toast.success(t.connected);
      return;
    }
    const timer = setInterval(() => refetch(), 3000);
    const stop = setTimeout(() => setWaiting(false), 3 * 60_000);
    return () => {
      clearInterval(timer);
      clearTimeout(stop);
    };
  }, [waiting, link?.linked, refetch, t]);

  if (!TELEGRAM_BOT_USERNAME) return null;

  const connect = async () => {
    // Open the tab synchronously (inside the click) so popup blockers allow
    // it, then point it at the deep link once the token is written.
    const tab = window.open('', '_blank');
    try {
      const url = await startLink.mutateAsync();
      if (tab) tab.location.href = url;
      else window.location.href = url;
      setWaiting(true);
    } catch (e) {
      tab?.close();
      toast.error(errorToMessage(e));
    }
  };

  return (
    <div className="mt-4 border-t border-surface-100 pt-3.5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <Send size={16} className="mt-0.5 shrink-0 text-surface-400" />
          <div>
            <p className="text-sm text-surface-800">{t.title}</p>
            <p className="text-xs text-surface-400">
              {link?.linked ? t.connectedAs(link.username) : waiting ? t.pressStart : t.pitch}
            </p>
          </div>
        </div>
        {link?.linked ? (
          <Button
            size="sm"
            variant="secondary"
            loading={update.isPending}
            onClick={() => update.mutate({ chatId: null }, { onSuccess: () => toast.info(t.disconnected) })}
          >
            {t.disconnect}
          </Button>
        ) : (
          <Button size="sm" variant="secondary" onClick={connect} loading={startLink.isPending}>
            {t.connect}
          </Button>
        )}
      </div>
      {link?.linked && (
        <label className="mt-2.5 flex items-center gap-2 pl-6 text-xs text-surface-600">
          <input
            type="checkbox"
            checked={link.digest}
            onChange={(e) => update.mutate({ digest: e.target.checked })}
            className="rounded border-surface-300 text-accent-600"
          />
          {t.digest}
        </label>
      )}
    </div>
  );
}
