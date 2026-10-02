import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { collection, doc, getDoc, getDocs, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { normalizeSchool, schoolDocId } from '@/utils/schoolSearch';
import type { SchoolItem, SchoolStats, UserProfile } from '@/types';
import { getT } from '@/i18n';

// Precomputed daily by functions/src/schoolStats.ts — ranking every user
// client-side would mean downloading the whole users collection.
export function useSchoolStats() {
  return useQuery({
    queryKey: ['stats', 'schools'],
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const snap = await getDoc(doc(db, 'stats', 'schools'));
      return snap.exists() ? (snap.data() as SchoolStats) : null;
    },
  });
}

/** Leaderboard rows are keyed by school doc id. */
export function mySchoolKey(profile: UserProfile | null | undefined) {
  return profile?.schoolId ?? null;
}

/**
 * The whole directory, once per session. Small enough (hundreds to a few
 * thousand short docs) that client-side fuzzy search beats any server
 * query Firestore can do — it has no text search at all.
 */
export function useSchools() {
  return useQuery({
    queryKey: ['schools'],
    staleTime: 30 * 60 * 1000,
    queryFn: async () => {
      // The full Almaty list ships with the app (same file the server seeds
      // from), so every school is findable even before its doc exists.
      const [snap, almaty] = await Promise.all([
        getDocs(collection(db, 'schools')),
        import('../../functions/src/data/schools-almaty.json').then((m) => m.default as { name: string; aliases: string[] }[]),
      ]);
      const byId = new Map<string, SchoolItem>();
      for (const s of almaty) {
        const id = schoolDocId(s.name, ALMATY);
        byId.set(id, { id, name: s.name, city: ALMATY, key: normalizeSchool(s.name), aliases: s.aliases, verified: true });
      }
      for (const d of snap.docs) byId.set(d.id, { id: d.id, ...d.data() } as SchoolItem);
      return [...byId.values()];
    },
  });
}

const ALMATY = 'Алматы';

export function useAddSchool() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, city, uid }: { name: string; city: string; uid: string }): Promise<SchoolItem> => {
      const cleanName = name.trim().replace(/\s+/g, ' ');
      const cleanCity = city.trim();
      const id = schoolDocId(cleanName, cleanCity);
      const item: SchoolItem = { id, name: cleanName, city: cleanCity || null, key: normalizeSchool(cleanName), verified: false };
      try {
        await setDoc(doc(db, 'schools', id), {
          name: item.name,
          city: item.city,
          key: item.key,
          aliases: [],
          verified: false,
          createdBy: uid,
          createdAt: serverTimestamp(),
        });
      } catch {
        // Someone already added this exact school (same id → rules reject the
        // overwrite). That's the dedupe working — just use theirs.
        const existing = await getDoc(doc(db, 'schools', id));
        if (!existing.exists()) throw new Error(getT().school.couldNotAdd);
        return { id, ...existing.data() } as SchoolItem;
      }
      return item;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['schools'] }),
  });
}
