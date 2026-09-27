import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { EventDraft, EventItem, EventResource, EventSubscription } from '@/types';

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

export interface EventInput {
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
  resources?: EventResource[];
  sourceUrl?: string | null;
}

function eventFields(input: EventInput) {
  return {
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
    resources: (input.resources ?? []).filter((r) => r.title.trim() && r.url.trim()),
    sourceUrl: input.sourceUrl ?? null,
  };
}

export function useCreateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: EventInput) => {
      const ref = await addDoc(collection(db, 'events'), {
        ...eventFields(input),
        interestedCount: 0,
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return ref.id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['events'] }),
  });
}

export function useUpdateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: EventInput }) => {
      await updateDoc(doc(db, 'events', id), { ...eventFields(input), updatedAt: serverTimestamp() });
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

// ---------------- "I'm interested" subscriptions ----------------

/** Everyone interested in one event — the "who's going" list + reminder recipients. */
export function useEventSubscribers(eventId: string | undefined) {
  return useQuery({
    queryKey: ['eventSubscriptions', 'event', eventId],
    enabled: !!eventId,
    queryFn: async () => {
      const snap = await getDocs(query(collection(db, 'eventSubscriptions'), where('eventId', '==', eventId)));
      return snap.docs
        .map((d) => ({ id: d.id, ...d.data() }) as EventSubscription)
        .sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0));
    },
  });
}

/** Event ids the signed-in user is subscribed to — powers the "Interested" badge/filter. */
export function useMyEventSubscriptions(uid: string | undefined) {
  return useQuery({
    queryKey: ['eventSubscriptions', 'mine', uid],
    enabled: !!uid,
    queryFn: async () => {
      const snap = await getDocs(query(collection(db, 'eventSubscriptions'), where('uid', '==', uid)));
      return new Set(snap.docs.map((d) => d.data().eventId as string));
    },
  });
}

export function useToggleEventSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      eventId: string;
      uid: string;
      userName: string;
      userAvatarUrl?: string | null;
      lookingForTeam: boolean;
      subscribe: boolean;
      alreadySubscribed?: boolean;
    }) => {
      // Deterministic id — same trick as savedProjects: no duplicates, and
      // unsubscribing doesn't need a lookup query first.
      const ref = doc(db, 'eventSubscriptions', `${input.uid}_${input.eventId}`);
      if (!input.subscribe) {
        await deleteDoc(ref);
        return;
      }
      // Only flip the flag on an existing subscription — a full setDoc
      // would wipe remindersSent and re-send reminders already delivered.
      if (input.alreadySubscribed) {
        await updateDoc(ref, { lookingForTeam: input.lookingForTeam });
        return;
      }
      await setDoc(ref, {
        uid: input.uid,
        eventId: input.eventId,
        userName: input.userName,
        userAvatarUrl: input.userAvatarUrl ?? null,
        lookingForTeam: input.lookingForTeam,
        createdAt: serverTimestamp(),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['eventSubscriptions'] });
      // interestedCount is bumped server-side a moment later; refetch so it
      // doesn't look stale for long.
      setTimeout(() => qc.invalidateQueries({ queryKey: ['events'] }), 1500);
    },
  });
}

// ---------------- auto-collected drafts (moderators) ----------------

export function usePendingEventDrafts(enabled: boolean) {
  return useQuery({
    queryKey: ['eventDrafts', 'pending'],
    enabled,
    queryFn: async () => {
      const snap = await getDocs(query(collection(db, 'eventDrafts'), where('status', '==', 'pending')));
      return snap.docs
        .map((d) => ({ id: d.id, ...d.data() }) as EventDraft)
        // Ones the extractor thinks fit school students first, then soonest.
        .sort(
          (a, b) =>
            Number(b.forSchoolStudents === true) - Number(a.forSchoolStudents === true) ||
            (a.date?.toMillis() ?? Infinity) - (b.date?.toMillis() ?? Infinity),
        );
    },
  });
}

export function useSetEventDraftStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'approved' | 'rejected' }) => {
      await updateDoc(doc(db, 'eventDrafts', id), { status });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['eventDrafts'] }),
  });
}

export interface EventSources {
  telegramChannels: string[];
  devpost: boolean;
}

export function useEventSources(enabled: boolean) {
  return useQuery({
    queryKey: ['eventSources'],
    enabled,
    queryFn: async (): Promise<EventSources> => {
      const snap = await getDoc(doc(db, 'eventSources', 'config'));
      const data = snap.data();
      return { telegramChannels: data?.telegramChannels ?? [], devpost: data?.devpost ?? true };
    },
  });
}

export function useSaveEventSources() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (sources: EventSources) => {
      await setDoc(doc(db, 'eventSources', 'config'), { ...sources, updatedAt: serverTimestamp() });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['eventSources'] }),
  });
}
