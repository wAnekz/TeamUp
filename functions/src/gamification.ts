import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { onDocumentCreated, onDocumentUpdated, onDocumentWritten } from 'firebase-functions/v2/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions/v2';

/**
 * XP, levels, badges, seasons. No currency on purpose — nothing here can be
 * spent, so there's nothing worth farming beyond status.
 *
 * XP is only ever granted for things someone else confirmed (a captain
 * accepting you, a friend actually joining) or that carry evidence (an
 * achievement with a file). It lives in gamification/{uid} — read-only for
 * clients (firestore.rules) — never on users/{uid}, which the owner can edit.
 *
 * Every grant goes through awardXp with a deterministic key recorded in
 * xpEvents/{key}, so retries, duplicate triggers and the backfill are all
 * idempotent: the same thing never pays twice.
 *
 * Keep LEVELS / BADGES in sync with src/constants/gamification.ts.
 */

export const XP = {
  acceptedOntoTeam: 50,
  firstMemberRecruited: 20,
  teamComplete: 30,
  achievementWithFile: 40,
  friendJoinedViaInvite: 20,
  eventInterestDaily: 5,
};

// Achievements are self-reported; cap how many can earn XP so a pile of
// uploads can't outrun actually being on teams.
const MAX_REWARDED_ACHIEVEMENTS = 10;

export const LEVELS = [
  { level: 1, name: 'Newbie', minXp: 0 },
  { level: 2, name: 'Teammate', minXp: 100 },
  { level: 3, name: 'Builder', minXp: 300 },
  { level: 4, name: 'Captain', minXp: 700 },
  { level: 5, name: 'Legend', minXp: 1500 },
];

export function levelFor(xp: number) {
  return [...LEVELS].reverse().find((l) => xp >= l.minXp)!.level;
}

type Counter =
  | 'teamsJoined'
  | 'teamsLed'
  | 'teamsCompleted'
  | 'achievements'
  | 'olympiadAchievements'
  | 'friendsInvited'
  | 'eventsInterested';

// Badge id → counter threshold. Season-champion badges ("champion:2026-Q3")
// are handed out separately by schoolStats.ts.
const BADGE_RULES: { id: string; counter: Counter; min: number }[] = [
  { id: 'first_team', counter: 'teamsJoined', min: 1 },
  { id: 'team_player', counter: 'teamsJoined', min: 3 },
  { id: 'first_captain', counter: 'teamsLed', min: 1 },
  { id: 'captain_3', counter: 'teamsLed', min: 3 },
  { id: 'full_squad', counter: 'teamsCompleted', min: 1 },
  { id: 'portfolio', counter: 'achievements', min: 3 },
  { id: 'olympiad', counter: 'olympiadAchievements', min: 1 },
  { id: 'recruiter', counter: 'friendsInvited', min: 5 },
  { id: 'explorer', counter: 'eventsInterested', min: 5 },
];

/** Calendar quarter in Almaty time (UTC+5): "2026-Q3". */
export function seasonId(date = new Date()) {
  const local = new Date(date.getTime() + 5 * 60 * 60 * 1000);
  return `${local.getUTCFullYear()}-Q${Math.floor(local.getUTCMonth() / 3) + 1}`;
}

/**
 * Grants `points` XP (may be 0) and bumps `counter`, once per `key`.
 * Recomputes level and badges in the same transaction.
 */
export async function awardXp(opts: {
  uid: string;
  key: string;
  reason: string;
  points: number;
  counter?: Counter;
  refPath?: string;
  // Project/achievement title — the client builds the translated reason
  // from the key prefix + this; `reason` stays as an English log line.
  subject?: string;
}) {
  const db = getFirestore();
  const eventRef = db.doc(`xpEvents/${opts.key}`);
  const profileRef = db.doc(`gamification/${opts.uid}`);
  const season = seasonId();

  try {
    await db.runTransaction(async (tx) => {
      const [eventSnap, profileSnap] = await Promise.all([tx.get(eventRef), tx.get(profileRef)]);
      if (eventSnap.exists) return;

      const current = profileSnap.data() ?? {};
      const counters: Record<string, number> = { ...(current.counters ?? {}) };
      if (opts.counter) counters[opts.counter] = (counters[opts.counter] ?? 0) + 1;
      const xp = (current.xp ?? 0) + opts.points;
      const seasonXp = current.season === season ? (current.seasonXp ?? 0) + opts.points : opts.points;

      const badges = new Set<string>(current.badges ?? []);
      const newBadges: string[] = [];
      for (const rule of BADGE_RULES) {
        if ((counters[rule.counter] ?? 0) >= rule.min && !badges.has(rule.id)) {
          badges.add(rule.id);
          newBadges.push(rule.id);
        }
      }

      tx.set(eventRef, {
        uid: opts.uid,
        reason: opts.reason,
        points: opts.points,
        season,
        refPath: opts.refPath ?? null,
        subject: opts.subject ?? null,
        newBadges,
        createdAt: FieldValue.serverTimestamp(),
      });
      tx.set(profileRef, {
        uid: opts.uid,
        xp,
        level: levelFor(xp),
        season,
        seasonXp,
        counters,
        badges: [...badges],
        updatedAt: FieldValue.serverTimestamp(),
      });
    });
  } catch (err) {
    // Never let XP bookkeeping break the write that triggered it.
    logger.error('awardXp failed', { key: opts.key, err: err instanceof Error ? err.message : String(err) });
  }
}

// ---------------- award rules ----------------

interface ApplicationDoc {
  projectId: string;
  projectTitle: string;
  applicantId: string;
  ownerId: string;
  status: string;
  viaInvite?: boolean;
}

async function onAccepted(appId: string, app: ApplicationDoc) {
  await awardXp({
    uid: app.applicantId,
    key: `accepted_${appId}`,
    reason: `Joined "${app.projectTitle}"`,
    subject: app.projectTitle,
    points: XP.acceptedOntoTeam,
    counter: 'teamsJoined',
    refPath: `projects/${app.projectId}`,
  });
  // Captain credit once per project — for getting a real team going.
  await awardXp({
    uid: app.ownerId,
    key: `captain_${app.projectId}`,
    reason: `First teammate on "${app.projectTitle}"`,
    subject: app.projectTitle,
    points: XP.firstMemberRecruited,
    counter: 'teamsLed',
    refPath: `projects/${app.projectId}`,
  });
  if (app.viaInvite) {
    await awardXp({
      uid: app.ownerId,
      key: `invite_${appId}`,
      reason: `A friend joined "${app.projectTitle}" via your link`,
      subject: app.projectTitle,
      points: XP.friendJoinedViaInvite,
      counter: 'friendsInvited',
      refPath: `projects/${app.projectId}`,
    });
  }
}

// Covers both paths onto a team: owner accepting (update → accepted) and
// joinByInvite (created already accepted, or pending → accepted).
export const xpOnApplication = onDocumentWritten('applications/{appId}', async (event) => {
  const before = event.data?.before.data() as ApplicationDoc | undefined;
  const after = event.data?.after.data() as ApplicationDoc | undefined;
  if (!after || after.status !== 'accepted' || before?.status === 'accepted') return;
  await onAccepted(event.params.appId, after);
});

interface ProjectDoc {
  title: string;
  authorId: string;
  members?: string[];
  roles?: { slotsTotal: number; slotsFilled: number }[];
}

function isFull(p: ProjectDoc | undefined) {
  return !!p?.roles?.length && p.roles.every((r) => r.slotsFilled >= r.slotsTotal);
}

export const xpOnTeamComplete = onDocumentUpdated('projects/{projectId}', async (event) => {
  const before = event.data?.before.data() as ProjectDoc | undefined;
  const after = event.data?.after.data() as ProjectDoc | undefined;
  if (!after || isFull(before) || !isFull(after)) return;
  const team = [...new Set([after.authorId, ...(after.members ?? [])])];
  // A "team" of just the owner (all roles 0-slot or self-filled) isn't one.
  if (team.length < 2) return;
  for (const uid of team) {
    await awardXp({
      uid,
      key: `full_${event.params.projectId}_${uid}`,
      reason: `"${after.title}" team is complete`,
      subject: after.title,
      points: XP.teamComplete,
      counter: 'teamsCompleted',
      refPath: `projects/${event.params.projectId}`,
    });
  }
});

interface AchievementDoc {
  title: string;
  type: string;
  fileUrl?: string | null;
  fromProjectId?: string | null; // team result recorded by the lead (teamResults.ts)
}

async function onAchievementWithFile(uid: string, achievementId: string, a: AchievementDoc) {
  const profile = (await getFirestore().doc(`gamification/${uid}`).get()).data();
  const rewarded = profile?.counters?.achievements ?? 0;
  await awardXp({
    uid,
    key: `ach_${uid}_${achievementId}`,
    reason: `Achievement: ${a.title}`,
    subject: a.title,
    points: rewarded < MAX_REWARDED_ACHIEVEMENTS ? XP.achievementWithFile : 0,
    counter: 'achievements',
    refPath: `users/${uid}/achievements/${achievementId}`,
  });
  if (a.type === 'olympiad') {
    await awardXp({
      uid,
      key: `olymp_${uid}_${achievementId}`,
      reason: `Olympiad: ${a.title}`,
      points: 0,
      counter: 'olympiadAchievements',
    });
  }
}

// Only counts once there's evidence: a file attached (on create or added
// later by editing), or a team result confirmed by the team lead.
export const xpOnAchievement = onDocumentWritten('users/{uid}/achievements/{achievementId}', async (event) => {
  const after = event.data?.after.data() as AchievementDoc | undefined;
  if (!after?.fileUrl && !after?.fromProjectId) return;
  await onAchievementWithFile(event.params.uid, event.params.achievementId, after);
});

export const xpOnEventInterest = onDocumentCreated('eventSubscriptions/{subId}', async (event) => {
  const sub = event.data?.data() as { uid: string; eventId: string } | undefined;
  if (!sub) return;
  // Counter per distinct event (for the explorer badge); XP at most once a
  // day so tapping "interested" on everything isn't a strategy.
  await awardXp({
    uid: sub.uid,
    key: `sub_${event.params.subId}`,
    reason: 'Interested in an event',
    points: 0,
    counter: 'eventsInterested',
    refPath: `events/${sub.eventId}`,
  });
  await awardXp({
    uid: sub.uid,
    key: `interest_${sub.uid}_${new Date().toISOString().slice(0, 10)}`,
    reason: 'Checked out an event',
    points: XP.eventInterestDaily,
    refPath: `events/${sub.eventId}`,
  });
});

/**
 * Moderator-only, idempotent: grants XP for everything that happened
 * before gamification existed (accepted applications, full teams,
 * achievements with files). Safe to run more than once.
 */
export const backfillXp = onCall({ timeoutSeconds: 540 }, async (req) => {
  const uid = req.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Sign in first.');
  const db = getFirestore();
  const mods = (await db.doc('config/moderators').get()).data()?.uids ?? [];
  if (!mods.includes(uid)) throw new HttpsError('permission-denied', 'Moderators only.');

  let processed = 0;
  const accepted = await db.collection('applications').where('status', '==', 'accepted').get();
  for (const d of accepted.docs) {
    await onAccepted(d.id, d.data() as ApplicationDoc);
    processed++;
  }

  const projects = await db.collection('projects').where('isDraft', '==', false).get();
  for (const d of projects.docs) {
    const p = d.data() as ProjectDoc;
    const team = [...new Set([p.authorId, ...(p.members ?? [])])];
    if (!isFull(p) || team.length < 2) continue;
    for (const member of team) {
      await awardXp({
        uid: member,
        key: `full_${d.id}_${member}`,
        reason: `"${p.title}" team is complete`,
        subject: p.title,
        points: XP.teamComplete,
        counter: 'teamsCompleted',
        refPath: `projects/${d.id}`,
      });
    }
    processed++;
  }

  const achievements = await db.collectionGroup('achievements').get();
  for (const d of achievements.docs) {
    const owner = d.ref.parent.parent?.id;
    const a = d.data() as AchievementDoc;
    if (!owner || (!a.fileUrl && !a.fromProjectId)) continue;
    await onAchievementWithFile(owner, d.id, a);
    processed++;
  }

  const subs = await db.collection('eventSubscriptions').get();
  for (const d of subs.docs) {
    const sub = d.data() as { uid: string; eventId: string };
    await awardXp({ uid: sub.uid, key: `sub_${d.id}`, reason: 'Interested in an event', points: 0, counter: 'eventsInterested' });
    processed++;
  }

  logger.info(`backfillXp: processed ${processed} item(s)`);
  return { processed };
});
