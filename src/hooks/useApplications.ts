import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { collection, query, where, getDocs, doc, runTransaction, serverTimestamp, updateDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db } from '@/lib/firebase';
import { functions } from '@/lib/firebaseFunctions';
import type { Application, Project } from '@/types';
import { getT } from '@/i18n';

function sortByCreatedAtDesc(items: Application[]) {
  return items.sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0));
}

export function useMyApplications(uid: string | undefined) {
  return useQuery({
    queryKey: ['applications', 'mine', uid],
    enabled: !!uid,
    queryFn: async () => {
      // No orderBy() — where('applicantId','==',uid) + orderBy on a different
      // field would need a composite index deployed first. Sorted in JS instead.
      const snap = await getDocs(query(collection(db, 'applications'), where('applicantId', '==', uid)));
      return sortByCreatedAtDesc(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Application));
    },
  });
}

export function useProjectApplications(projectId: string | undefined, ownerId: string | undefined) {
  return useQuery({
    queryKey: ['applications', 'project', projectId, ownerId],
    enabled: !!projectId && !!ownerId,
    queryFn: async () => {
      // Firestore security rules can't post-filter query results — the whole
      // query is rejected unless every document it could possibly return is
      // guaranteed to satisfy the read rule. The rule allows reads where
      // ownerId == request.auth.uid, so that same constraint has to be part
      // of the query itself (not just projectId) or Firestore denies the
      // entire request with permission-denied.
      const snap = await getDocs(
        query(collection(db, 'applications'), where('projectId', '==', projectId), where('ownerId', '==', ownerId)),
      );
      return sortByCreatedAtDesc(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Application));
    },
  });
}

export function useApplyToRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      project: Project;
      roleId: string;
      applicantId: string;
      applicantName: string;
      applicantAvatarUrl?: string;
      message: string;
    }) => {
      const { project, roleId, applicantId, applicantName, applicantAvatarUrl, message } = input;
      const role = project.roles.find((r) => r.id === roleId);
      if (!role) throw new Error(getT().errors.roleNotFound);

      // Deterministic doc id (`${projectId}_${roleId}_${applicantId}`) instead
      // of addDoc(). This makes duplicate prevention a server-side guarantee:
      // Firestore rejects a second `create` at the same path outright (it's
      // no longer a "create", it's an "update", which the applications rule
      // doesn't permit for a non-owner). No race window, no client-side
      // pre-check needed.
      const ref = doc(db, 'applications', `${project.id}_${roleId}_${applicantId}`);
      await runTransaction(db, async (tx) => {
        const existing = await tx.get(ref);
        if (existing.exists()) throw new Error(getT().errors.alreadyApplied);
        tx.set(ref, {
          projectId: project.id,
          projectTitle: project.title,
          roleId,
          roleTitle: role.title,
          applicantId,
          applicantName,
          applicantAvatarUrl: applicantAvatarUrl ?? null,
          ownerId: project.authorId,
          message,
          status: 'pending',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      });
      return ref.id;
    },
    onSuccess: (_id, vars) => qc.invalidateQueries({ queryKey: ['applications', 'mine', vars.applicantId] }),
  });
}

/**
 * Accepting runs in the acceptApplication function (functions/src/applications.ts):
 * it adds the student to the team, which clients can't do under
 * firestore.rules. Rejecting is a plain status update on a pending application.
 */
export function useReviewApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      application,
      decision,
    }: {
      application: Application;
      decision: 'accepted' | 'rejected';
    }) => {
      if (decision === 'accepted') {
        await httpsCallable<{ applicationId: string }, { ok: true }>(functions, 'acceptApplication')({ applicationId: application.id });
        return;
      }
      await updateDoc(doc(db, 'applications', application.id), { status: 'rejected', updatedAt: serverTimestamp() });
    },
    onSuccess: (_r, vars) => {
      qc.invalidateQueries({ queryKey: ['applications', 'project', vars.application.projectId] });
      qc.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}
