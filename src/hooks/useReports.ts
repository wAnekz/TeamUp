import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Report, ReportTargetType } from '@/types';

export function useCreateReport() {
  return useMutation({
    mutationFn: async (input: { targetType: ReportTargetType; targetId: string; reporterId: string; reason: string }) => {
      await addDoc(collection(db, 'reports'), {
        targetType: input.targetType,
        targetId: input.targetId,
        reporterId: input.reporterId,
        reason: input.reason,
        status: 'open',
        createdAt: serverTimestamp(),
      });
    },
  });
}

// Best-effort client check: config/moderators is only readable (per Firestore
// rules) by uids already listed in it, so this either resolves to "yes, and
// here's proof" or fails with permission-denied, which we read as "no". This
// is just for showing/hiding the "Moderation" nav link — the rules are the
// actual enforcement, not this hook.
export function useIsModerator(uid: string | undefined) {
  return useQuery({
    queryKey: ['isModerator', uid],
    enabled: !!uid,
    queryFn: async () => {
      try {
        const snap = await getDoc(doc(db, 'config', 'moderators'));
        const uids: string[] = snap.exists() ? (snap.data().uids ?? []) : [];
        return !!uid && uids.includes(uid);
      } catch {
        return false;
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}

export function useOpenReports(enabled: boolean) {
  return useQuery({
    queryKey: ['reports', 'open'],
    enabled,
    queryFn: async () => {
      const snap = await getDocs(query(collection(db, 'reports'), where('status', '==', 'open')));
      return snap.docs
        .map((d) => ({ id: d.id, ...d.data() }) as Report)
        .sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0));
    },
  });
}

export function useMarkReportReviewed() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (reportId: string) => {
      await updateDoc(doc(db, 'reports', reportId), { status: 'reviewed' });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reports', 'open'] }),
  });
}

/**
 * Deletes the project a report points at, straight from the moderation
 * queue. Enforced server-side: firestore.rules only lets this succeed for
 * uids listed in config/moderators, same as everything else moderator-gated
 * — a non-moderator calling this would just get permission-denied back.
 * Only handles targetType 'project': profiles aren't deletable content,
 * they're banned instead (see useBanReportedUser below).
 */
export function useDeleteReportedProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (projectId: string) => {
      await deleteDoc(doc(db, 'projects', projectId));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] });
      qc.invalidateQueries({ queryKey: ['reports', 'open'] });
    },
  });
}

/**
 * Blocks a reported user from the app by setting `banned: true` on their
 * profile doc. Doesn't touch Firebase Auth (that still needs the Console —
 * see MODERATION_GUIDE.md — until this MVP has Admin SDK wired up), but it
 * does immediately stop them from using TeamUp: guards.tsx checks this flag
 * on every authenticated route. Reversible by any moderator re-running this
 * with `false`.
 */
export function useSetUserBanned() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, banned }: { userId: string; banned: boolean }) => {
      await updateDoc(doc(db, 'users', userId), { banned, updatedAt: serverTimestamp() });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reports', 'open'] }),
  });
}