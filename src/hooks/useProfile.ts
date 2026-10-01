import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { deleteObject, getDownloadURL, listAll, ref, uploadBytes } from 'firebase/storage';
import imageCompression from 'browser-image-compression';
import { db, storage } from '@/lib/firebase';
import type { UserContacts, UserProfile } from '@/types';
import { getT } from '@/i18n';
import { normalizeHttpUrl } from '@/utils/safeUrl';

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

// Mirrored in storage.rules — keep both in sync.
const AVATAR_MAX_MB = 1;

/**
 * Uploads to Firebase Storage under avatars/{uid}/. Each upload gets a new
 * file name so the CacheFirst image cache in the service worker never serves
 * the old picture; previous avatars are deleted afterwards.
 */
export async function uploadAvatar(uid: string, file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error(getT().errors.uploadFailed);
  const compressed = await imageCompression(file, {
    maxSizeMB: 0.4,
    maxWidthOrHeight: 512,
    useWebWorker: true,
  });
  if (compressed.size > AVATAR_MAX_MB * 1024 * 1024) throw new Error(getT().errors.uploadFailed);

  const fileRef = ref(storage, `avatars/${uid}/${Date.now()}`);
  await uploadBytes(fileRef, compressed, { contentType: compressed.type || file.type });
  const url = await getDownloadURL(fileRef);

  // Best-effort cleanup — a leftover old avatar is harmless, a failed upload isn't.
  const { items } = await listAll(ref(storage, `avatars/${uid}`)).catch(() => ({ items: [] }));
  await Promise.all(
    items.filter((item) => item.fullPath !== fileRef.fullPath).map((item) => deleteObject(item).catch(() => {})),
  );

  return url;
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
  // firestore.rules accept only http(s) links; "mysite.dev" becomes "https://mysite.dev".
  const normalized = { ...contacts, portfolio: normalizeHttpUrl(contacts.portfolio) };
  // merge: never touch `visibleTo`, which only the server maintains.
  await setDoc(doc(db, 'users', uid, 'private', 'contacts'), { contacts: normalized }, { merge: true });
}
