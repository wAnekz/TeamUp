import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { logger } from 'firebase-functions/v2';

/**
 * Daily product numbers → config/metrics (moderator-readable only, see
 * firestore.rules). Aggregates computed from data that already exists — no
 * per-user tracking, no analytics SDK, nothing to disclose to parents.
 *
 * The funnel is the one that matters for this app:
 *   signed up → finished profile → did something (applied / posted a
 *   project / "looking for team") → actually on a team.
 */

const DAY = 24 * 60 * 60 * 1000;
const HISTORY_DAYS = 30;

export interface MetricsSnapshot {
  date: string; // yyyy-mm-dd, Almaty
  users: number;
  profiles: number;
  activated: number;
  onTeam: number;
  new7d: number;
  active1d: number;
  active7d: number;
  active30d: number;
  openProjects: number;
  applications7d: number;
  accepted7d: number;
  telegramLinked: number;
  eventInterests: number;
}

export const computeMetrics = onSchedule(
  { schedule: 'every day 05:00', timeZone: 'Asia/Almaty', timeoutSeconds: 300 },
  async () => {
    const db = getFirestore();
    const now = Date.now();
    const since = (days: number) => now - days * DAY;
    const ms = (t?: Timestamp) => t?.toMillis() ?? 0;

    const [users, projects, applications, lft, telegram, subs] = await Promise.all([
      db.collection('users').select('profileComplete', 'createdAt', 'lastActiveAt').get(),
      db.collection('projects').where('isDraft', '==', false).select('authorId', 'members', 'status').get(),
      db.collection('applications').select('applicantId', 'status', 'createdAt', 'updatedAt').get(),
      db.collection('lookingForTeam').select('authorId').get(),
      db.collectionGroup('private').where('chatId', '>', 0).select().get(),
      db.collection('eventSubscriptions').count().get(),
    ]);

    const onTeam = new Set<string>();
    const acted = new Set<string>();
    let openProjects = 0;
    for (const p of projects.docs) {
      const d = p.data() as { authorId: string; members?: string[]; status: string };
      acted.add(d.authorId);
      if (d.status === 'open') openProjects++;
      if ((d.members ?? []).length > 0) onTeam.add(d.authorId);
      (d.members ?? []).forEach((m) => onTeam.add(m));
    }
    let applications7d = 0;
    let accepted7d = 0;
    for (const a of applications.docs) {
      const d = a.data() as { applicantId: string; status: string; createdAt?: Timestamp; updatedAt?: Timestamp };
      acted.add(d.applicantId);
      if (ms(d.createdAt) > since(7)) applications7d++;
      if (d.status === 'accepted' && ms(d.updatedAt) > since(7)) accepted7d++;
    }
    lft.docs.forEach((l) => acted.add(l.data().authorId as string));

    const profiles = users.docs.filter((u) => u.data().profileComplete === true);
    const profileIds = new Set(profiles.map((u) => u.id));
    const lastActive = profiles.map((u) => ms(u.data().lastActiveAt as Timestamp | undefined));

    const local = new Date(now + 5 * 60 * 60 * 1000);
    const snapshot: MetricsSnapshot = {
      date: local.toISOString().slice(0, 10),
      users: users.size,
      profiles: profiles.length,
      activated: [...acted].filter((uid) => profileIds.has(uid)).length,
      onTeam: [...onTeam].filter((uid) => profileIds.has(uid)).length,
      new7d: users.docs.filter((u) => ms(u.data().createdAt as Timestamp | undefined) > since(7)).length,
      active1d: lastActive.filter((t) => t > since(1)).length,
      active7d: lastActive.filter((t) => t > since(7)).length,
      active30d: lastActive.filter((t) => t > since(30)).length,
      openProjects,
      applications7d,
      accepted7d,
      telegramLinked: telegram.size,
      eventInterests: subs.data().count,
    };

    const ref = db.doc('config/metrics');
    const history = ((await ref.get()).data()?.history ?? []) as MetricsSnapshot[];
    const nextHistory = [...history.filter((h) => h.date !== snapshot.date), snapshot].slice(-HISTORY_DAYS);
    await ref.set({ current: snapshot, history: nextHistory, updatedAt: Timestamp.now() });
    logger.info('computeMetrics', snapshot);
  },
);
