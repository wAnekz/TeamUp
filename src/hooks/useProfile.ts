import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import imageCompression from 'browser-image-compression';
import { db } from '@/lib/firebase';
import type { UserContacts, UserProfile } from '@/types';
import { getT } from '@/i18n';

export function useUpdateProfile(uid: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<UserProfile>) => {
      if (!uid) throw new Error('Not signed in');
      await updateDoc(doc(db, 'users', uid), { ...patch, updatedAt: serverTimestamp() });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['profile', uid] }),
  });
}

/** Read-only fetch of someone else's profile — used for public profile pages
 *  and for revealing contacts once an application is accepted. */
export function usePublicProfile(uid: string | undefined) {
  return useQuery({
    queryKey: ['profile', 'public', uid],
    enabled: !!uid,
    queryFn: async () => {
      const snap = await getDoc(doc(db, 'users', uid!));
      if (!snap.exists()) throw new Error('User not found');
      return snap.data() as UserProfile;
    },
  });
}

/**
 * Uploads to ImgBB instead of Firebase Storage — avoids requiring the Blaze
 * billing plan just for a handful of small avatar images. Needs
 * VITE_IMGBB_API_KEY in .env (free key from https://api.imgbb.com/).
 */
export async function uploadAvatar(_uid: string, file: File): Promise<string> {
  const compressed = await imageCompression(file, {
    maxSizeMB: 0.4,
    maxWidthOrHeight: 512,
    useWebWorker: true,
  });

  const apiKey = import.meta.env.VITE_IMGBB_API_KEY;
  if (!apiKey) throw new Error('Missing VITE_IMGBB_API_KEY in .env');

  const formData = new FormData();
  formData.append('image', compressed);

  const res = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) throw new Error(getT().errors.uploadFailed);
  const data = await res.json();
  if (!data.success) throw new Error(data.error?.message ?? getT().errors.uploadFailed);

  return data.data.url as string;
}


/**
 * Contacts live in users/{uid}/private/contacts, readable only by the owner
 * and people they share a team with (firestore.rules + functions/src/contacts.ts).
 * Returns null — not an error — when the viewer isn't allowed to see them.
 */
export function useContacts(uid: string | undefined) {
  return useQuery({
    queryKey: ['contacts', uid],
    enabled: !!uid,
    retry: false,
    queryFn: async (): Promise<UserContacts | null> => {
      try {
        const snap = await getDoc(doc(db, 'users', uid!, 'private', 'contacts'));
        return (snap.data()?.contacts as UserContacts | undefined) ?? null;
      } catch {
        return null; // permission-denied: not a teammate
      }
    },
  });
}

export async function saveContacts(uid: string, contacts: UserContacts) {
  // merge: never touch `visibleTo`, which only the server maintains.
  await setDoc(doc(db, 'users', uid, 'private', 'contacts'), { contacts }, { merge: true });
}
