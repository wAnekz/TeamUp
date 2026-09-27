import { useState } from 'react';
import { Check, Link2, RefreshCw, Share2 } from 'lucide-react';
import { Card } from '@/components/ui/primitives';
import { Button } from '@/components/ui/Button';
import { inviteUrl, useCreateInvite, useDisableInvite } from '@/hooks/useInvites';
import { toast, errorToMessage } from '@/lib/toast';
import { useT } from '@/i18n';
import type { Project } from '@/types';

// Owner-only. A link friends can open to join an open role directly —
// skipping the apply/accept round trip, since the owner is the one who
// chose to send it to them.
export function InviteLinkCard({ project }: { project: Project }) {
  const tAll = useT();
  const t = tAll.invite;
  const create = useCreateInvite();
  const disable = useDisableInvite();
  const [copied, setCopied] = useState(false);
  const [code, setCode] = useState(project.inviteCode ?? null);
  const hasOpenRole = project.roles.some((r) => r.slotsFilled < r.slotsTotal);

  if (!hasOpenRole && !code) return null;

  const generate = async () => {
    try {
      setCode(await create.mutateAsync({ ...project, inviteCode: code }));
    } catch (e) {
      toast.error(errorToMessage(e));
    }
  };

  const copy = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(inviteUrl(code));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t.copyFailed);
    }
  };

  const share = async () => {
    if (!code) return;
    const url = inviteUrl(code);
    if (navigator.share) {
      try {
        await navigator.share({ title: project.title, text: t.shareText(project.title), url });
      } catch {
        // cancelled
      }
    } else {
      copy();
    }
  };

  return (
    <Card>
      <p className="text-sm font-medium text-surface-700">{t.title}</p>
      <p className="mt-0.5 text-xs text-surface-500">{t.text}</p>
      {code ? (
        <>
          <div className="mt-3 truncate rounded-xl bg-surface-100 px-3.5 py-2.5 font-mono text-xs text-surface-700">
            {inviteUrl(code)}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" onClick={share}>
              <Share2 size={14} /> {tAll.common.share}
            </Button>
            <Button size="sm" variant="secondary" onClick={copy}>
              {copied ? <Check size={14} /> : <Link2 size={14} />} {copied ? tAll.common.copied : tAll.common.copy}
            </Button>
            <Button size="sm" variant="ghost" onClick={generate} loading={create.isPending} title={t.oldStops}>
              <RefreshCw size={14} /> {t.newLink}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              loading={disable.isPending}
              onClick={() =>
                disable.mutate({ ...project, inviteCode: code }, { onSuccess: () => setCode(null) })
              }
            >
              {t.turnOff}
            </Button>
          </div>
        </>
      ) : (
        <Button size="sm" className="mt-3" onClick={generate} loading={create.isPending}>
          <Link2 size={14} /> {t.create}
        </Button>
      )}
    </Card>
  );
}
