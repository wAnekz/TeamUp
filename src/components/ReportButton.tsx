import { useState } from 'react';
import { Flag } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/useAuth';
import { useCreateReport } from '@/hooks/useReports';
import { useT } from '@/i18n';
import type { ReportTargetType } from '@/types';


export function ReportButton({ targetType, targetId }: { targetType: ReportTargetType; targetId: string }) {
  const { user } = useAuth();
  const t = useT().report;
  const target = t.targets[targetType];
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [sent, setSent] = useState(false);
  const { mutateAsync, isPending } = useCreateReport();

  if (!user || user.uid === targetId) return null;

  const submit = async () => {
    if (!reason) return;
    await mutateAsync({ targetType, targetId, reporterId: user.uid, reason });
    setSent(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-surface-400 hover:text-red-600"
      >
        <Flag size={13} />
        {t.report}
      </button>
      <Modal
        open={open}
        onClose={() => {
          setOpen(false);
          setSent(false);
          setReason('');
        }}
        title={sent ? t.sent : t.title(target)}
      >
        {sent ? (
          <p className="text-sm text-surface-600">{t.thanks(target)}</p>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1.5">
              {t.reasons.map((r) => (
                <label key={r} className="flex cursor-pointer items-center gap-2 rounded-lg border border-surface-200 px-3 py-2 text-sm has-[:checked]:border-accent-400 has-[:checked]:bg-accent-50">
                  <input type="radio" name="reason" value={r} checked={reason === r} onChange={() => setReason(r)} />
                  {r}
                </label>
              ))}
            </div>
            <Button needsNetwork className="w-full" onClick={submit} disabled={!reason} loading={isPending}>
              {t.send}
            </Button>
          </div>
        )}
      </Modal>
    </>
  );
}
