import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  collection,
  doc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Project } from '@/types';

function savedId(uid: string, projectId: string) {
  return `${uid}_${projectId}`;
}

/** All saved project ids for a user — used to render the star as filled/empty. */
export function useSavedProjectIds(uid: string | undefined) {
  return useQuery({
    queryKey: ['savedProjects', 'ids', uid],
    enabled: !!uid,
    queryFn: async () => {
      const snap = await getDocs(query(collection(db, 'savedProjects'), where('uid', '==', uid)));
      return new Set(snap.docs.map((d) => d.data().projectId as string));
    },
  });
}

/** Full project docs behind a user's saved list, for the "Saved" feed tab. */
export function useSavedProjectsFeed(uid: string | undefined) {
  return useQuery({
    queryKey: ['savedProjects', 'feed', uid],
    enabled: !!uid,
    queryFn: async () => {
      const snap = await getDocs(query(collection(db, 'savedProjects'), where('uid', '==', uid)));
      const projectIds = snap.docs.map((d) => d.data().projectId as string);
      const projects = await Promise.all(
        projectIds.map(async (id) => {
          const pSnap = await getDoc(doc(db, 'projects', id));
          return pSnap.exists() ? ({ id: pSnap.id, ...pSnap.data() } as Project) : null;
        }),
      );
      return projects.filter((p): p is Project => p !== null);
    },
  });
}

export function useToggleSaveProject(uid: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, save }: { projectId: string; save: boolean }) => {
      if (!uid) throw new Error('Not signed in');
      const ref = doc(db, 'savedProjects', savedId(uid, projectId));
      if (save) {
        await setDoc(ref, { uid, projectId, createdAt: serverTimestamp() });
      } else {
        await deleteDoc(ref);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['savedProjects'] });
    },
  });
}
