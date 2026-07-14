import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  collection,
  query,
  where,
  limit,
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
 * Builds the feed query. Deliberately has NO orderBy(): combining an
 * orderBy() on a different field with where() equality filters requires a
 * composite Firestore index to be manually created/deployed first, and a
 * missing index makes the query fail outright (empty-looking feed, no
 * visible error unless you check devtools). Equality + array-contains-any
 * filters alone are covered by Firestore's automatic indexes, so we fetch a
 * capped, unsorted pool here and do sorting/pagination/search in JS below.
 */
function buildFeedQuery(filters: ProjectFilters) {
  const constraints: QueryConstraint[] = [where('isDraft', '==', false), where('status', '==', 'open')];
  if (filters.type) constraints.push(where('type', '==', filters.type));
  if (filters.skills.length) constraints.push(where('skills', 'array-contains-any', filters.skills.slice(0, 10)));
  if (filters.interests.length)
    constraints.push(where('interests', 'array-contains-any', filters.interests.slice(0, 10)));
  constraints.push(limit(FEED_POOL_CAP));

  return query(collection(db, 'projects'), ...constraints);
}

export function useProjectFeed(filters: ProjectFilters) {
  return useInfiniteQuery({
    queryKey: ['projects', 'feed', filters],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const snap = await getDocs(buildFeedQuery(filters));
      let items = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Project);

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
export function useRecommendationPool() {
  return useQuery({
    queryKey: ['projects', 'recommendationPool'],
    queryFn: async () => {
      // Same reasoning as buildFeedQuery above: no orderBy server-side.
      const snap = await getDocs(
        query(collection(db, 'projects'), where('isDraft', '==', false), where('status', '==', 'open'), limit(FEED_POOL_CAP)),
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

export function useProject(id: string | undefined) {
  return useQuery({
    queryKey: ['projects', 'detail', id],
    enabled: !!id,
    queryFn: async () => {
      const snap = await getDoc(doc(db, 'projects', id!));
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
