import { useState } from 'react';
import { Flag } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { useCreateReport } from '@/hooks/useReports';
import type { ReportTargetType } from '@/types';

const REASONS = [
  'Inappropriate or offensive content',
  'Fake profile or project',
  'Harassment or unsafe behavior',
  'Spam',
  'Something else',
];

export function ReportButton({ targetType, targetId }: { targetType: ReportTargetType; targetId: string }) {
  const { user } = useAuth();
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
        Report
      </button>
      <Modal
        open={open}
        onClose={() => {
          setOpen(false);
          setSent(false);
          setReason('');
        }}
        title={sent ? 'Report sent' : `Report this ${targetType}`}
      >
        {sent ? (
          <p className="text-sm text-surface-600">
            Thanks - a moderator will look into it. This isn't public and the {targetType} owner won't be notified.
          </p>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1.5">
              {REASONS.map((r) => (
                <label key={r} className="flex cursor-pointer items-center gap-2 rounded-lg border border-surface-200 px-3 py-2 text-sm has-[:checked]:border-accent-400 has-[:checked]:bg-accent-50">
                  <input type="radio" name="reason" value={r} checked={reason === r} onChange={() => setReason(r)} />
                  {r}
                </label>
              ))}
            </div>
            <Button className="w-full" onClick={submit} disabled={!reason} loading={isPending}>
              Send report
            </Button>
          </div>
        )}
      </Modal>
    </>
  );
}
