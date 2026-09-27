import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { nanoid } from '@/utils/id';
import { getT } from '@/i18n';

export const TELEGRAM_BOT_USERNAME = import.meta.env.VITE_TELEGRAM_BOT_USERNAME as string | undefined;

export interface TelegramLinkState {
  linked: boolean;
  username?: string | null;
  digest: boolean;
}

// users/{uid}/private/telegram is written by the bot webhook (Admin SDK)
// once the user presses Start in Telegram — see functions/src/telegram.ts.
export function useTelegramLink(uid: string | undefined) {
  return useQuery({
    queryKey: ['telegram', uid],
    enabled: !!uid,
    queryFn: async (): Promise<TelegramLinkState> => {
      const snap = await getDoc(doc(db, 'users', uid!, 'private', 'telegram'));
      const data = snap.data();
      return { linked: !!data?.chatId, username: data?.username ?? null, digest: data?.digest !== false };
    },
  });
}

/**
 * One-time token → deep link `t.me/<bot>?start=<token>`. The bot looks the
 * token up in telegramLinks/{token} to learn which uid is connecting, so
 * the user never has to type anything in the chat.
 */
export function useStartTelegramLink(uid: string | undefined) {
  return useMutation({
    mutationFn: async () => {
      if (!uid) throw new Error('Not signed in');
      if (!TELEGRAM_BOT_USERNAME) throw new Error(getT().telegram.notConfigured);
      const token = nanoid(24);
      await setDoc(doc(db, 'telegramLinks', token), { uid, createdAt: serverTimestamp() });
      return `https://t.me/${TELEGRAM_BOT_USERNAME}?start=${token}`;
    },
  });
}

export function useUpdateTelegram(uid: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: { chatId?: null; digest?: boolean }) => {
      if (!uid) throw new Error('Not signed in');
      await updateDoc(doc(db, 'users', uid, 'private', 'telegram'), patch);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['telegram', uid] }),
  });
}
