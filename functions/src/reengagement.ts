import { FieldValue, getFirestore, Timestamp } from 'firebase-admin/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { logger } from 'firebase-functions/v2';
import { sendPush } from './notifications';
import { sendTelegram, TELEGRAM_BOT_TOKEN } from './telegram';

/**
 * Brings back people who drifted away — but only with something concrete
 * for *them*, never a generic "we miss you":
 *   1. applications on their project still waiting for an answer
 *      (someone else is blocked on them — the most important one);
 *   2. new teams recruiting for skills they have;
 *   3. new hackathons/olympiads since they were last here.
 * No reason → no message.
 *
 * Pacing, per users/{uid}/private/engagement: at most one nudge a week,
 * at most MAX_STREAK in a row without them coming back (then we stop until
 * they return on their own, which resets the streak). Push + Telegram
 * only — email stays transactional-only, as the email footer promises.
 */

const DAY = 24 * 60 * 60 * 1000;
const INACTIVE_DAYS = 7;
const MIN_GAP_DAYS = 7;
const MAX_STREAK = 3;
const MAX_PER_RUN = 300;

interface UserDoc {
  name?: string;
  profileComplete?: boolean;
  banned?: boolean;
  lastActiveAt?: Timestamp;
  skills?: { skill: string }[];
}

interface Nudge {
  title: string;
  body: string;
  url: string;
  button: string;
  kind: 'applications' | 'projects' | 'events';
}

function ruPlural(n: number, one: string, few: string, many: string) {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

/** Exported for tests: picks the single most useful message, or null. */
export function pickNudge(input: {
  firstName: string;
  pendingApplications: number;
  matchingProjects: { title: string; skill: string }[];
  newEvents: { title: string }[];
}): Nudge | null {
  const { firstName, pendingApplications, matchingProjects, newEvents } = input;
  if (pendingApplications > 0) {
    return {
      kind: 'applications',
      title: `${firstName}, тебя ждут`,
      body: `${pendingApplications} ${ruPlural(pendingApplications, 'заявка', 'заявки', 'заявок')} в твою команду ${ruPlural(pendingApplications, 'ждёт', 'ждут', 'ждут')} ответа. Ребята не могут искать другую команду, пока ты не ответишь.`,
      url: '/dashboard?tab=projects',
      button: 'Ответить',
    };
  }
  if (matchingProjects.length > 0) {
    const skill = matchingProjects[0].skill;
    const n = matchingProjects.length;
    return {
      kind: 'projects',
      title: `Ищут: ${skill}`,
      body:
        n === 1
          ? `Команда «${matchingProjects[0].title}» ищет человека с твоими навыками.`
          : `${n} ${ruPlural(n, 'новая команда ищет', 'новые команды ищут', 'новых команд ищут')} людей с твоими навыками - например, «${matchingProjects[0].title}».`,
      url: '/feed',
      button: 'Посмотреть команды',
    };
  }
  if (newEvents.length > 0) {
    const n = newEvents.length;
    return {
      kind: 'events',
      title: 'Новые хакатоны и олимпиады',
      body:
        n === 1
          ? `Добавили «${newEvents[0].title}». Отметь «Мне интересно» - напомним про дедлайн.`
          : `«${newEvents[0].title}» и ещё ${n - 1} - посмотри, пока регистрация открыта.`,
      url: '/events',
      button: 'Смотреть события',
    };
  }
  return null;
}

export const nudgeInactiveUsers = onSchedule(
  { schedule: 'every day 18:00', timeZone: 'Asia/Almaty', secrets: [TELEGRAM_BOT_TOKEN], timeoutSeconds: 300 },
  async () => {
    const db = getFirestore();
    const now = Date.now();
    const inactiveBefore = Timestamp.fromMillis(now - INACTIVE_DAYS * DAY);

    // Single-field range query (no composite index); the rest is filtered here.
    const [usersSnap, projectsSnap, eventsSnap] = await Promise.all([
      db.collection('users').where('lastActiveAt', '<=', inactiveBefore).limit(2000).get(),
      db.collection('projects').where('status', '==', 'open').where('isDraft', '==', false).get(),
      db.collection('events').where('isActive', '==', true).get(),
    ]);

    const openProjects = projectsSnap.docs.map((d) => d.data() as {
      title: string;
      authorId: string;
      members?: string[];
      createdAt?: Timestamp;
      roles?: { requiredSkills: string[]; slotsFilled: number; slotsTotal: number }[];
    });
    const events = eventsSnap.docs.map((d) => d.data() as { title: string; date?: Timestamp; createdAt?: Timestamp });

    let sent = 0;
    let skipped = 0;
    for (const u of usersSnap.docs) {
      if (sent >= MAX_PER_RUN) break;
      const user = u.data() as UserDoc;
      if (!user.profileComplete || user.banned || !user.lastActiveAt) continue;
      const lastActive = user.lastActiveAt.toMillis();

      const engagementRef = db.doc(`users/${u.id}/private/engagement`);
      const [engagement, telegram, push] = await Promise.all([
        engagementRef.get(),
        db.doc(`users/${u.id}/private/telegram`).get(),
        db.doc(`users/${u.id}/private/notifications`).get(),
      ]);
      const reachable = !!telegram.data()?.chatId || (push.data()?.tokens ?? []).length > 0;
      if (!reachable) continue;

      const e = engagement.data() as { lastNudgeAt?: Timestamp; streak?: number } | undefined;
      const lastNudge = e?.lastNudgeAt?.toMillis() ?? 0;
      // They came back after our last nudge → fresh start.
      const streak = lastNudge && lastActive > lastNudge ? 0 : (e?.streak ?? 0);
      if (streak >= MAX_STREAK || now - lastNudge < MIN_GAP_DAYS * DAY) {
        skipped++;
        continue;
      }

      const pending = await db
        .collection('applications')
        .where('ownerId', '==', u.id)
        .where('status', '==', 'pending')
        .count()
        .get();

      const skills = new Set((user.skills ?? []).map((s) => s.skill));
      const matchingProjects = openProjects
        .filter((p) => p.authorId !== u.id && !(p.members ?? []).includes(u.id))
        .filter((p) => (p.createdAt?.toMillis() ?? 0) > lastActive)
        .map((p) => {
          const skill = (p.roles ?? [])
            .filter((r) => r.slotsFilled < r.slotsTotal)
            .flatMap((r) => r.requiredSkills)
            .find((s) => skills.has(s));
          return skill ? { title: p.title, skill } : null;
        })
        .filter((p): p is { title: string; skill: string } => p !== null);

      const newEvents = events.filter(
        (ev) => (ev.createdAt?.toMillis() ?? 0) > lastActive && (ev.date?.toMillis() ?? 0) > now,
      );

      const nudge = pickNudge({
        firstName: (user.name ?? '').split(' ')[0] || 'Привет',
        pendingApplications: pending.data().count,
        matchingProjects,
        newEvents,
      });
      if (!nudge) continue;

      const note = { title: nudge.title, body: nudge.body, url: nudge.url };
      await Promise.all([sendPush(u.id, note), sendTelegram(u.id, { ...note, button: nudge.button })]);
      await engagementRef.set(
        { lastNudgeAt: FieldValue.serverTimestamp(), streak: streak + 1, lastKind: nudge.kind },
        { merge: true },
      );
      sent++;
    }
    logger.info(`nudgeInactiveUsers: sent ${sent}, paced ${skipped}`);
  },
);
