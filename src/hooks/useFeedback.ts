import { useMutation } from '@tanstack/react-query';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

/**
 * Write-only, like reports originally were: there's no in-app queue for
 * this. functions/src/feedback.ts emails the developer directly the moment
 * a doc lands here, so nothing needs to read it back client-side.
 */
export function useSubmitFeedback() {
  return useMutation({
    mutationFn: async (input: { reporterId: string; message: string; page: string }) => {
      await addDoc(collection(db, 'feedback'), {
        reporterId: input.reporterId,
        message: input.message,
        page: input.page,
        createdAt: serverTimestamp(),
      });
    },
  });
}