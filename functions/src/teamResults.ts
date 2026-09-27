import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { logger } from 'firebase-functions/v2';
import { sendPush } from './notifications';
import { sendTelegram, TELEGRAM_BOT_TOKEN } from './telegram';

/**
 * Team lead records a result on the project (project.result) → every
 * member (and the lead) gets it as an achievement in their portfolio:
 * users/{uid}/achievements/team_<projectId>. The deterministic id means
 * editing the result updates everyone's entry instead of duplicating it.
 *
 * These carry `fromProjectId`, which clients can't set themselves
 * (firestore.rules), so on a profile they read as confirmed by the team
 * rather than self-reported. XP for them comes via xpOnAchievement.
 */

interface ProjectResult {
  text: string;
  eventName: string;
  date?: FirebaseFirestore.Timestamp | null;
  link?: string | null;
}

function sameResult(a: ProjectResult | null | undefined, b: ProjectResult | null | undefined) {
  return (
    (a?.text ?? null) === (b?.text ?? null) &&
    (a?.eventName ?? null) === (b?.eventName ?? null) &&
    (a?.link ?? null) === (b?.link ?? null) &&
    (a?.date?.toMillis() ?? null) === (b?.date?.toMillis() ?? null)
  );
}

export const syncTeamResult = onDocumentUpdated(
  { document: 'projects/{projectId}', secrets: [TELEGRAM_BOT_TOKEN] },
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    const result = after?.result as ProjectResult | null | undefined;
    if (!after || !result?.text || sameResult(before?.result, result)) return;

    const projectId = event.params.projectId as string;
    const db = getFirestore();
    const team: string[] = [...new Set([after.authorId as string, ...((after.members as string[]) ?? [])])];
    const roles = (after.memberRoles ?? {}) as Record<string, string>;
    const isFirstTime = !before?.result?.text;

    const batch = db.batch();
    for (const uid of team) {
      batch.set(
        db.doc(`users/${uid}/achievements/team_${projectId}`),
        {
          uid,
          title: result.eventName,
          type: 'hackathon',
          result: result.text,
          date: result.date ?? null,
          description: after.title,
          role: uid === after.authorId ? 'lead' : (roles[uid] ?? null),
          link: result.link ?? null,
          fileUrl: null,
          fromProjectId: projectId,
          createdAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    }
    await batch.commit();

    if (isFirstTime) {
      const note = {
        title: `🏆 ${result.eventName}: ${result.text}`,
        body: `Итог команды «${after.title}» добавлен в твоё портфолио.`,
        url: `/projects/${projectId}`,
      };
      await Promise.all(
        team
          .filter((uid) => uid !== after.authorId)
          .map((uid) => Promise.all([sendPush(uid, note), sendTelegram(uid, { ...note, button: 'Открыть' })])),
      );
    }
    logger.info(`syncTeamResult: ${team.length} achievement(s) for ${projectId}`);
  },
);
