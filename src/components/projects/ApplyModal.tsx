import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal } from '@/components/ui/Modal';
import { Textarea } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { applicationSchema, type ApplicationFormValues } from '@/utils/validation';

export function ApplyModal({
  open,
  onClose,
  roleTitle,
  onSubmit,
  submitting,
}: {
  open: boolean;
  onClose: () => void;
  roleTitle: string;
  onSubmit: (values: ApplicationFormValues) => Promise<void>;
  submitting: boolean;
}) {
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<ApplicationFormValues>({ resolver: zodResolver(applicationSchema) });
  const message = watch('message') ?? '';

  const submit = async (values: ApplicationFormValues) => {
    await onSubmit(values);
    reset();
  };

  return (
    <Modal open={open} onClose={onClose} title={`Apply — ${roleTitle}`}>
      <form onSubmit={handleSubmit(submit)} className="space-y-4">
        <Textarea
          label="Short message"
          placeholder="Why are you a good fit for this role?"
          maxLength={200}
          value={message}
          {...register('message')}
          error={errors.message?.message}
        />
        <Button type="submit" className="w-full" loading={submitting}>
          Send application
        </Button>
      </form>
    </Modal>
  );
}
