import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { logger } from 'firebase-functions/v2';
import { seasonId } from './gamification';
import { ensureSeedSchools, linkFreeTextSchools } from './schools';

/**
 * Daily school leaderboard → stats/schools, scored by season XP.
 *
 * A school's score is the sum of its students' XP earned this season
 * (calendar quarter, see seasonId in gamification.ts). XP only comes from
 * confirmed actions, so a school can't climb by mass-registering accounts.
 * Seasons reset the race so newer schools can actually catch up.
 *
 * On the first run of a new season, yesterday's snapshot is the final
 * standing of the season that just ended: its #1 is recorded in
 * stats/seasons and every student of that school gets a
 * "champion:<season>" badge for their portfolio.
 */

const TOP_N = 200;
// Gamification launched days before the end of 2026-Q3 — crowning a
// champion off a few days plus the backfill wouldn't be fair, so the first
// season that awards a title is Q4. Seasons compare as strings ("2026-Q4").
const FIRST_RANKED_SEASON = '2026-Q4';

interface Bucket {
  students: number;
  active: number;
  score: number;
  totalXp: number;
}

interface SchoolRow {
  key: string;
  name: string;
  city: string | null;
  students: number;
  active: number;
  score: number;
  totalXp: number;
}

async function crownChampion(db: FirebaseFirestore.Firestore, season: string, champion: SchoolRow) {
  const seasonsRef = db.doc('stats/seasons');
  const already = ((await seasonsRef.get()).data()?.champions ?? []) as { season: string }[];
  if (already.some((c) => c.season === season)) return;

  await seasonsRef.set(
    {
      champions: FieldValue.arrayUnion({
        season,
        key: champion.key,
        name: champion.name,
        city: champion.city,
        score: champion.score,
      }),
    },
    { merge: true },
  );

  const winners = (await db.collection('users').where('schoolId', '==', champion.key).select().get()).docs;
  for (let i = 0; i < winners.length; i += 400) {
    const batch = db.batch();
    for (const u of winners.slice(i, i + 400)) {
      batch.set(db.doc(`gamification/${u.id}`), { uid: u.id, badges: FieldValue.arrayUnion(`champion:${season}`) }, { merge: true });
    }
    await batch.commit();
  }
  logger.info(`Season ${season} champion: ${champion.name} (${winners.length} student badge(s))`);
}

export const computeSchoolStats = onSchedule(
  { schedule: 'every day 04:00', timeZone: 'Asia/Almaty', timeoutSeconds: 300 },
  async () => {
    const db = getFirestore();
    const season = seasonId();
    const statsRef = db.doc('stats/schools');

    const previous = (await statsRef.get()).data() as { season?: string; schools?: SchoolRow[] } | undefined;
    if (
      previous?.season &&
      previous.season !== season &&
      previous.season >= FIRST_RANKED_SEASON &&
      previous.schools?.[0]?.score
    ) {
      await crownChampion(db, previous.season, previous.schools[0]);
    }

    // Directory housekeeping first, so everyone who typed a school counts today.
    await ensureSeedSchools();
    await linkFreeTextSchools();

    const [users, gamification, schoolDocs] = await Promise.all([
      db.collection('users').where('profileComplete', '==', true).select('schoolId', 'banned').get(),
      db.collection('gamification').select('xp', 'season', 'seasonXp').get(),
      db.collection('schools').select('name', 'city').get(),
    ]);
    const schoolInfo = new Map(
      schoolDocs.docs.map((d) => [d.id, d.data() as { name: string; city?: string | null }]),
    );
    const xpOf = new Map(
      gamification.docs.map((g) => {
        const d = g.data() as { xp?: number; season?: string; seasonXp?: number };
        return [g.id, { total: d.xp ?? 0, season: d.season === season ? (d.seasonXp ?? 0) : 0 }];
      }),
    );

    const buckets = new Map<string, Bucket>();
    for (const u of users.docs) {
      const { schoolId: key, banned } = u.data() as { schoolId?: string | null; banned?: boolean };
      if (!key || banned || !schoolInfo.has(key)) continue;
      const b = buckets.get(key) ?? { students: 0, active: 0, score: 0, totalXp: 0 };
      const xp = xpOf.get(u.id) ?? { total: 0, season: 0 };
      b.students++;
      b.score += xp.season;
      b.totalXp += xp.total;
      if (xp.season > 0) b.active++;
      buckets.set(key, b);
    }

    const schools: SchoolRow[] = [...buckets.entries()]
      .map(([key, b]) => ({
        key,
        name: schoolInfo.get(key)!.name,
        city: schoolInfo.get(key)!.city ?? null,
        students: b.students,
        active: b.active,
        score: b.score,
        totalXp: b.totalXp,
      }))
      .sort((a, b) => b.score - a.score || b.totalXp - a.totalXp || b.students - a.students)
      .slice(0, TOP_N);

    await statsRef.set({ season, schools, updatedAt: FieldValue.serverTimestamp() });
    logger.info(`computeSchoolStats: ranked ${schools.length} school(s) for ${season}`);
  },
);
