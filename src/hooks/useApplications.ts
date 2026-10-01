import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { collection, query, where, getDocs, doc, runTransaction, serverTimestamp, arrayUnion } from 'firebase/firestore';
import { db } from '@/lib/firebase';
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
 * Accepting an application must, atomically:
 *  1. flip the application status to "accepted"
 *  2. bump slotsFilled on the matching role (never exceeding slotsTotal)
 *  3. leave contacts revealed implicitly — the UI checks application status,
 *     not a separate flag, so there's nothing else to keep in sync.
 * Rejecting is a plain status update and doesn't touch slots.
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
      const appRef = doc(db, 'applications', application.id);
      const projectRef = doc(db, 'projects', application.projectId);

      await runTransaction(db, async (tx) => {
        const projectSnap = await tx.get(projectRef);
        if (!projectSnap.exists()) throw new Error(getT().errors.projectGone);
        const project = projectSnap.data() as Project;

        if (decision === 'accepted') {
          const roles = project.roles.map((r) =>
            r.id === application.roleId && r.slotsFilled < r.slotsTotal
              ? { ...r, slotsFilled: r.slotsFilled + 1 }
              : r,
          );
          const teamSizeCurrent = roles.reduce((sum, r) => sum + r.slotsFilled, 0);
          tx.update(projectRef, {
            roles,
            teamSizeCurrent,
            members: arrayUnion(application.applicantId),
            [`memberRoles.${application.applicantId}`]: application.roleTitle,
            // firestore.rules only lets members grow with an application
            // accepted in this same transaction — this tells it which one.
            acceptedApplicationId: application.id,
            updatedAt: serverTimestamp(),
          });
        }

        tx.update(appRef, { status: decision, updatedAt: serverTimestamp() });
      });
    },
    onSuccess: (_r, vars) => {
      qc.invalidateQueries({ queryKey: ['applications', 'project', vars.application.projectId] });
      qc.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}
