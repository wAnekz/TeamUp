import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { collection, query, where, getDocs, addDoc, doc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { LookingForTeamPost } from '@/types';

export function useLookingForTeamFeed() {
  return useQuery({
    queryKey: ['lookingForTeam', 'feed'],
    queryFn: async () => {
      // No orderBy() — where('active','==',true) + orderBy on a different
      // field needs a composite index deployed first. Sorted in JS instead.
      const snap = await getDocs(query(collection(db, 'lookingForTeam'), where('active', '==', true)));
      return snap.docs
        .map((d) => ({ id: d.id, ...d.data() }) as LookingForTeamPost)
        .sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0));
    },
  });
}

export function useCreateLookingForTeamPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      input: Omit<LookingForTeamPost, 'id' | 'createdAt' | 'updatedAt' | 'active' | 'availableUntil'> & {
        availableUntil?: string;
      },
    ) => {
      const { availableUntil, ...rest } = input;
      await addDoc(collection(db, 'lookingForTeam'), {
        ...rest,
        availableUntil: availableUntil ? Timestamp.fromDate(new Date(availableUntil)) : null,
        active: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lookingForTeam'] }),
  });
}

export function useDeactivateLookingForTeamPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await updateDoc(doc(db, 'lookingForTeam', id), { active: false, updatedAt: serverTimestamp() });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lookingForTeam'] }),
  });
}
