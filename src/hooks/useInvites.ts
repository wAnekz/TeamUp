import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { doc, getDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db } from '@/lib/firebase';
import { functions } from '@/lib/firebaseFunctions';
import { nanoid } from '@/utils/id';
import type { Invite, Project } from '@/types';

export function inviteUrl(code: string) {
  return `${window.location.origin}/invite/${code}`;
}

export function useInvite(code: string | undefined) {
  return useQuery({
    queryKey: ['invites', code],
    enabled: !!code,
    retry: false,
    queryFn: async () => {
      const snap = await getDoc(doc(db, 'invites', code!));
      return snap.exists() ? ({ code: snap.id, ...snap.data() } as Invite) : null;
    },
  });
}

/**
 * Creates (or rotates) the project's invite link. Rotating deactivates the
 * previous code, so an owner who shared a link in the wrong chat can cut it
 * off by generating a new one. One batch so project.inviteCode never points
 * at an invite doc that failed to write.
 */
export function useCreateInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (project: Project) => {
      const code = nanoid(10);
      const batch = writeBatch(db);
      if (project.inviteCode) batch.update(doc(db, 'invites', project.inviteCode), { active: false });
      batch.set(doc(db, 'invites', code), {
        projectId: project.id,
        projectTitle: project.title,
        ownerId: project.authorId,
        active: true,
        createdAt: serverTimestamp(),
      });
      batch.update(doc(db, 'projects', project.id), { inviteCode: code, updatedAt: serverTimestamp() });
      await batch.commit();
      return code;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  });
}

export function useDisableInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (project: Project) => {
      if (!project.inviteCode) return;
      const batch = writeBatch(db);
      batch.update(doc(db, 'invites', project.inviteCode), { active: false });
      batch.update(doc(db, 'projects', project.id), { inviteCode: null, updatedAt: serverTimestamp() });
      await batch.commit();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  });
}

/**
 * Joining goes through a Cloud Function, not a client write: it has to add
 * the caller to someone else's project (members + slot count) atomically,
 * which firestore.rules only lets the owner do. See functions/src/invites.ts.
 */
export function useJoinByInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ code, roleId }: { code: string; roleId: string }) => {
      const call = httpsCallable<{ code: string; roleId: string }, { projectId: string }>(functions, 'joinByInvite');
      const res = await call({ code, roleId });
      return res.data.projectId;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] });
      qc.invalidateQueries({ queryKey: ['applications'] });
    },
  });
}

/** Owner → a suggested teammate: sends them the invite link via push/Telegram/email. */
export function useInviteUserToProject() {
  return useMutation({
    mutationFn: async (input: { projectId: string; roleId: string; targetUid: string }) => {
      const call = httpsCallable<typeof input, { ok: true }>(functions, 'inviteToProject');
      await call(input);
    },
  });
}
