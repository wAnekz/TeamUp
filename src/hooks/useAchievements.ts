import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addDoc, collection, deleteDoc, doc, getDocs, serverTimestamp, Timestamp, updateDoc } from 'firebase/firestore';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import imageCompression from 'browser-image-compression';
import { db, storage } from '@/lib/firebase';
import type { Achievement, AchievementType } from '@/types';
import { getT } from '@/i18n';

// Mirrored in storage.rules — keep both in sync.
export const ACHIEVEMENT_MAX_FILE_MB = 10;
export const ACHIEVEMENT_ACCEPT = 'image/*,application/pdf';

export function useAchievements(uid: string | undefined) {
  return useQuery({
    queryKey: ['achievements', uid],
    enabled: !!uid,
    queryFn: async () => {
      const snap = await getDocs(collection(db, 'users', uid!, 'achievements'));
      // Newest achievement first by its own date, falling back to when it
      // was added — sorted in JS, no index needed for a per-user list.
      return snap.docs
        .map((d) => ({ id: d.id, ...d.data() }) as Achievement)
        .sort(
          (a, b) =>
            (b.date?.toMillis() ?? b.createdAt?.toMillis() ?? 0) - (a.date?.toMillis() ?? a.createdAt?.toMillis() ?? 0),
        );
    },
  });
}

async function uploadAchievementFile(uid: string, file: File) {
  if (file.type !== 'application/pdf' && !file.type.startsWith('image/')) {
    throw new Error(getT().achievements.onlyImagesPdf);
  }
  // Phone photos of diplomas are routinely 5–12MB — shrink images before
  // upload so they fit the cap and load fast on someone else's profile.
  const body = file.type.startsWith('image/')
    ? await imageCompression(file, { maxSizeMB: 1.5, maxWidthOrHeight: 2400, useWebWorker: true })
    : file;
  if (body.size > ACHIEVEMENT_MAX_FILE_MB * 1024 * 1024) {
    throw new Error(getT().achievements.tooLarge(ACHIEVEMENT_MAX_FILE_MB));
  }
  const safeName = file.name.replace(/[^\w.-]+/g, '_').slice(-80);
  const storagePath = `achievements/${uid}/${Date.now()}_${safeName}`;
  const fileRef = ref(storage, storagePath);
  await uploadBytes(fileRef, body, { contentType: file.type });
  return { fileUrl: await getDownloadURL(fileRef), fileName: file.name, fileType: file.type, storagePath };
}

export interface AchievementInput {
  title: string;
  type: AchievementType;
  result?: string;
  date?: string; // yyyy-mm-dd from a date input
  description?: string;
  link?: string;
  file?: File | null;
}

export function useSaveAchievement(uid: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input, existing }: { id?: string; input: AchievementInput; existing?: Achievement }) => {
      if (!uid) throw new Error('Not signed in');
      const upload = input.file ? await uploadAchievementFile(uid, input.file) : null;
      const fields = {
        uid,
        title: input.title.trim(),
        type: input.type,
        result: input.result?.trim() || null,
        date: input.date ? Timestamp.fromDate(new Date(input.date)) : null,
        description: input.description?.trim() || null,
        link: input.link?.trim() || null,
        ...(upload ?? {}),
      };
      if (id) {
        await updateDoc(doc(db, 'users', uid, 'achievements', id), fields);
        // Replaced the file — drop the old one so Storage doesn't accumulate orphans.
        if (upload && existing?.storagePath) await deleteObject(ref(storage, existing.storagePath)).catch(() => {});
      } else {
        await addDoc(collection(db, 'users', uid, 'achievements'), { ...fields, createdAt: serverTimestamp() });
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['achievements', uid] }),
  });
}

export function useDeleteAchievement(uid: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (achievement: Achievement) => {
      if (!uid) throw new Error('Not signed in');
      await deleteDoc(doc(db, 'users', uid, 'achievements', achievement.id));
      if (achievement.storagePath) await deleteObject(ref(storage, achievement.storagePath)).catch(() => {});
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['achievements', uid] }),
  });
}
