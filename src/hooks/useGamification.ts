import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { collection, doc, getDoc, getDocs, limit, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from '@/lib/toast';
import { badgeFor, currentSeason, levelInfo, levelName } from '@/constants/gamification';
import { getT } from '@/i18n';
import type { Gamification, SeasonChampion, XpEvent } from '@/types';

export function useGamification(uid: string | undefined) {
  return useQuery({
    queryKey: ['gamification', uid],
    enabled: !!uid,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const snap = await getDoc(doc(db, 'gamification', uid!));
      return (snap.exists() ? snap.data() : { uid }) as Gamification;
    },
  });
}

/** Season XP only counts if it's from the current season — the doc keeps the last season it saw. */
export function seasonXpOf(g: Gamification | undefined) {
  return g?.season === currentSeason() ? (g.seasonXp ?? 0) : 0;
}

/** Most recent XP grants, for the "how you earned it" list on My Profile. */
export function useXpHistory(uid: string | undefined) {
  return useQuery({
    queryKey: ['xpEvents', uid],
    enabled: !!uid,
    queryFn: async () => {
      // Equality-only query + JS sort: no composite index needed.
      const snap = await getDocs(query(collection(db, 'xpEvents'), where('uid', '==', uid), limit(200)));
      return snap.docs
        .map((d) => ({ id: d.id, ...d.data() }) as XpEvent)
        .filter((e) => e.points > 0 || (e.newBadges?.length ?? 0) > 0)
        .sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0))
        .slice(0, 15);
    },
  });
}

export function useSeasonChampions() {
  return useQuery({
    queryKey: ['stats', 'seasons'],
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const snap = await getDoc(doc(db, 'stats', 'seasons'));
      const champions = (snap.data()?.champions ?? []) as SeasonChampion[];
      return champions.sort((a, b) => b.season.localeCompare(a.season));
    },
  });
}

/**
 * Live listener on your own gamification doc: pops a toast when XP, level
 * or badges go up — the moment of reward is what makes it feel like a
 * game. The last-seen snapshot lives in localStorage so reopening the app
 * shows what you earned while away, once.
 */
export function useXpToasts(uid: string | undefined) {
  useEffect(() => {
    if (!uid) return;
    const key = `teamup:xpSeen:${uid}`;
    const readSeen = (): { xp: number; badges: string[] } | null => {
      try {
        return JSON.parse(localStorage.getItem(key) ?? 'null');
      } catch {
        return null;
      }
    };
    return onSnapshot(
      doc(db, 'gamification', uid),
      (snap) => {
        const data = snap.data() as Gamification | undefined;
        const xp = data?.xp ?? 0;
        const badges = data?.badges ?? [];
        const seen = readSeen();
        try {
          localStorage.setItem(key, JSON.stringify({ xp, badges }));
        } catch {
          // storage blocked — toasts just won't carry over between sessions
        }
        // First ever load on this device: record a baseline silently
        // instead of congratulating someone for all their past XP.
        if (!seen) return;
        const gained = xp - seen.xp;
        const t = getT().gamification;
        if (gained > 0) toast.success(t.gained(gained));
        const oldLevel = levelInfo(seen.xp).current.level;
        const newLevel = data?.level ?? 1;
        if (newLevel > oldLevel) {
          toast.success(t.levelUp(levelName(newLevel)));
        }
        for (const id of badges.filter((b) => !seen.badges.includes(b))) {
          const badge = badgeFor(id);
          if (badge) toast.success(t.newBadge(badge.emoji, badge.name));
        }
      },
      () => {
        // permission/offline errors: gamification is a nice-to-have, stay quiet
      },
    );
  }, [uid]);
}
