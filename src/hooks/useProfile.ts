import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import imageCompression from 'browser-image-compression';
import { db } from '@/lib/firebase';
import type { UserProfile } from '@/types';
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

