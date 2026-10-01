import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  collection,
  query,
  where,
  limit,
  orderBy,
  getDocs,
  getDoc,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  increment,
  deleteField,
  serverTimestamp,
  type QueryConstraint,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Project, ProjectFilters } from '@/types';

const PAGE_SIZE = 12;
// Cap on how many open, non-draft projects we ever pull down for the feed in
// one go. Sorting/pagination happens client-side (see comment below), so
// this is the ceiling on how far back the feed reaches — plenty for a
// school-hackathon-scale app; revisit with a real paginated query if the
// projects collection grows past a few thousand open listings.
const FEED_POOL_CAP = 300;

/**
 * Builds the feed query: newest first, so a fresh project always makes the
 * pool no matter how many exist. Each filter combination has a composite
 * index in firestore.indexes.json. Firestore allows one array-contains-any
 * per query, so skills filter server-side and interests in JS below.
 */
// Signed-out visitors read the anonymized mirror (functions/src/publicProjects.ts)
// — same shape minus names/avatars/members, so every card/detail component
// works unchanged and just renders a generic author.
function projectsCollection(guest: boolean) {
  return collection(db, guest ? 'publicProjects' : 'projects');
}

function buildFeedQuery(filters: ProjectFilters, guest: boolean) {
  const constraints: QueryConstraint[] = [where('isDraft', '==', false), where('status', '==', 'open')];
  if (filters.type) constraints.push(where('type', '==', filters.type));
  if (filters.skills.length) constraints.push(where('skills', 'array-contains-any', filters.skills.slice(0, 10)));
  constraints.push(orderBy('createdAt', 'desc'), limit(FEED_POOL_CAP));

  return query(projectsCollection(guest), ...constraints);
}

export function useProjectFeed(filters: ProjectFilters, guest = false) {
  return useInfiniteQuery({
    queryKey: ['projects', 'feed', filters, guest],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const snap = await getDocs(buildFeedQuery(filters, guest));
      let items = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Project);

      if (filters.interests.length) {
        items = items.filter((p) => p.interests?.some((i) => filters.interests.includes(i)));
      }
      if (filters.search) {
        const term = filters.search.toLowerCase();
        items = items.filter((p) => p.title.toLowerCase().includes(term));
      }
      if (filters.onlyOpenSlots) {
        items = items.filter((p) => p.roles.some((r) => r.slotsFilled < r.slotsTotal));
      }
      if (filters.deadlineBefore) {
        items = items.filter((p) => !p.deadline || p.deadline.toDate() <= filters.deadlineBefore!);
      }

      items.sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0));

      const start = pageParam * PAGE_SIZE;
      const page = items.slice(start, start + PAGE_SIZE);
      return { items: page, nextPage: pageParam + 1, hasMore: start + PAGE_SIZE < items.length };
    },
    getNextPageParam: (last) => (last.hasMore ? last.nextPage : undefined),
  });
}

/** Wider, unfiltered pool of open projects used for client-side match scoring. */
export function useRecommendationPool(guest = false) {
  return useQuery({
    queryKey: ['projects', 'recommendationPool', guest],
    queryFn: async () => {
      const snap = await getDocs(
        query(
          projectsCollection(guest),
          where('isDraft', '==', false),
          where('status', '==', 'open'),
          orderBy('createdAt', 'desc'),
          limit(FEED_POOL_CAP),
        ),
      );
      return snap.docs
        .map((d) => ({ id: d.id, ...d.data() }) as Project)
        .sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0))
        .slice(0, 50);
    },
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'teamSizeCurrent' | 'skills' | 'viewCount' | 'members'>) => {
      const ref = await addDoc(collection(db, 'projects'), {
        ...input,
        skills: [...new Set(input.roles.flatMap((r) => r.requiredSkills))],
        teamSizeCurrent: input.roles.reduce((sum, r) => sum + r.slotsFilled, 0),
        members: [],
        viewCount: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return ref.id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  });
}

export function useUpdateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: Partial<{ [K in keyof Project]: Project[K] | ReturnType<typeof deleteField> }>;
    }) => {
      const derivedSkills = patch.roles ? { skills: [...new Set((patch.roles as Project['roles']).flatMap((r) => r.requiredSkills))] } : {};
      await updateDoc(doc(db, 'projects', id), { ...patch, ...derivedSkills, updatedAt: serverTimestamp() });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  });
}

export function useProject(id: string | undefined, guest = false) {
  return useQuery({
    queryKey: ['projects', 'detail', id, guest],
    enabled: !!id,
    queryFn: async () => {
      const snap = await getDoc(doc(db, guest ? 'publicProjects' : 'projects', id!));
      if (!snap.exists()) throw new Error('Project not found');
      return { id: snap.id, ...snap.data() } as Project;
    },
  });
}

/**
 * Fire-and-forget view counter. Guarded by sessionStorage so refreshing or
 * re-opening the same project in one browser session doesn't inflate the
 * count — this is a lightweight signal, not an analytics-grade unique count.
 */
export function useIncrementProjectView() {
  return useMutation({
    mutationFn: async (id: string) => {
      const key = `viewed:${id}`;
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
      await updateDoc(doc(db, 'projects', id), { viewCount: increment(1) });
    },
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await deleteDoc(doc(db, 'projects', id));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  });
}

/** Projects for a given author, used both by "My Projects" and public profiles. */
export function useAuthorProjects(authorId: string | undefined) {
  return useQuery({
    queryKey: ['projects', 'byAuthor', authorId],
    enabled: !!authorId,
    queryFn: async () => {
      // No orderBy() — see the comment in MyProjects.tsx for why: this keeps
      // the query to pure equality filters so it works without a composite
      // index having to be deployed first.
      const snap = await getDocs(
        query(collection(db, 'projects'), where('authorId', '==', authorId), where('isDraft', '==', false)),
      );
      return snap.docs
        .map((d) => ({ id: d.id, ...d.data() }) as Project)
        .sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0));
    },
  });
}

export interface UpcomingDeadline {
  project: Project;
  daysLeft: number;
  pendingApplications: number;
}

/**
 * Powers the "Upcoming deadlines" dashboard widget: the caller's own
 * event-type, open, non-draft projects with a deadline still in the
 * future, each annotated with how many applications are still pending —
 * the two things that make a deadline actually urgent to act on (a
 * deadline with zero open applications needs no attention).
 */
export function useUpcomingDeadlines(uid: string | undefined) {
  return useQuery({
    queryKey: ['projects', 'upcomingDeadlines', uid],
    enabled: !!uid,
    queryFn: async (): Promise<UpcomingDeadline[]> => {
      const [projectsSnap, applicationsSnap] = await Promise.all([
        getDocs(
          query(
            collection(db, 'projects'),
            where('authorId', '==', uid),
            where('isDraft', '==', false),
            where('type', '==', 'event'),
            where('status', '==', 'open'),
          ),
        ),
        getDocs(query(collection(db, 'applications'), where('ownerId', '==', uid), where('status', '==', 'pending'))),
      ]);

      const pendingByProject = new Map<string, number>();
      for (const d of applicationsSnap.docs) {
        const projectId = d.data().projectId as string;
        pendingByProject.set(projectId, (pendingByProject.get(projectId) ?? 0) + 1);
      }

      const now = Date.now();
      return projectsSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }) as Project)
        .filter((p) => p.deadline && p.deadline.toMillis() > now)
        .map((project) => ({
          project,
          daysLeft: Math.ceil((project.deadline!.toMillis() - now) / (1000 * 60 * 60 * 24)),
          pendingApplications: pendingByProject.get(project.id) ?? 0,
        }))
        .sort((a, b) => a.daysLeft - b.daysLeft);
    },
  });
}

/**
 * Projects someone was accepted onto (not ones they own) — the "Teams" part
 * of a public profile. Every entry here went through the owner's accept
 * step, so it doubles as confirmation that this person really was on the
 * team. array-contains alone (drafts filtered in JS) so no composite index
 * is needed.
 */
export function useMemberProjects(uid: string | undefined) {
  return useQuery({
    queryKey: ['projects', 'byMember', uid],
    enabled: !!uid,
    queryFn: async () => {
      const snap = await getDocs(query(collection(db, 'projects'), where('members', 'array-contains', uid)));
      return snap.docs
        .map((d) => ({ id: d.id, ...d.data() }) as Project)
        .filter((p) => !p.isDraft)
        .sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0));
    },
  });
}
