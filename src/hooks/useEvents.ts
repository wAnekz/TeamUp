import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { collection, query, where, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { EventItem } from '@/types';

// Public list — everyone signed in sees active events, soonest first.
export function useEventsList() {
  return useQuery({
    queryKey: ['events', 'list'],
    queryFn: async () => {
      // No orderBy() in the query itself for the same reason as
      // lookingForTeam: where + orderBy on a different field needs a
      // composite index deployed first. Sorted in JS instead — this
      // collection is small (curated, not user-generated).
      const snap = await getDocs(query(collection(db, 'events'), where('isActive', '==', true)));
      return snap.docs
        .map((d) => ({ id: d.id, ...d.data() }) as EventItem)
        .sort((a, b) => (a.date?.toMillis() ?? 0) - (b.date?.toMillis() ?? 0));
    },
  });
}

export function useEvent(id: string | undefined) {
  return useQuery({
    queryKey: ['events', 'detail', id],
    enabled: !!id,
    queryFn: async () => {
      const snap = await getDoc(doc(db, 'events', id!));
      if (!snap.exists()) return null;
      return { id: snap.id, ...snap.data() } as EventItem;
    },
  });
}

export function useCreateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      title: string;
      description: string;
      competitionTag: string;
      date: string; // yyyy-mm-dd from a date input
      format?: EventItem['format'];
      location?: string;
      organizer?: string;
      registrationUrl?: string;
      registrationDeadline?: string; // yyyy-mm-dd from a date input
      prizePool?: string;
      teamSizeHint?: string;
      imageUrl?: string | null;
    }) => {
      await addDoc(collection(db, 'events'), {
        title: input.title,
        description: input.description,
        competitionTag: input.competitionTag,
        date: Timestamp.fromDate(new Date(input.date)),
        format: input.format || 'offline',
        location: input.location || null,
        organizer: input.organizer || null,
        registrationUrl: input.registrationUrl || null,
        registrationDeadline: input.registrationDeadline ? Timestamp.fromDate(new Date(input.registrationDeadline)) : null,
        prizePool: input.prizePool || null,
        teamSizeHint: input.teamSizeHint || null,
        imageUrl: input.imageUrl || null,
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['events'] }),
  });
}

export function useDeactivateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await updateDoc(doc(db, 'events', id), { isActive: false, updatedAt: serverTimestamp() });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['events'] }),
  });
}

// Permanent delete — firestore.rules already allows this for moderators
// (allow delete: if isModerator()), the UI just never had a button wired
// up to it. Prefer useDeactivateEvent for a past event you might want to
// keep around for reference; use this when it shouldn't exist at all.
export function useDeleteEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await deleteDoc(doc(db, 'events', id));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['events'] }),
  });
}
