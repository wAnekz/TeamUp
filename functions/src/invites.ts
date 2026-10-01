import { randomBytes } from 'node:crypto';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions/v2';
import { emailShell, escapeHtml, GMAIL_APP_PASSWORD, sendEmail, sendPush, APP_URL } from './notifications';
import { sendTelegram, TELEGRAM_BOT_TOKEN } from './telegram';

/**
 * Team invites. Both are callables rather than client writes because they
 * touch data the caller can't write under firestore.rules: joining adds
 * the caller to someone else's project, and inviting notifies another user.
 */

interface ProjectRole {
  id: string;
  title: string;
  slotsTotal: number;
  slotsFilled: number;
}

const DAILY_INVITE_CAP = 20;

// Same alphabet/length as the client's nanoid(10) — invite codes are
// bearer tokens, so they come from a CSPRNG, not Math.random.
function randomCode(size = 10) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from(randomBytes(size), (b) => alphabet[b % alphabet.length]).join('');
}

export async function requireCompleteProfile(uid: string) {
  const snap = await getFirestore().doc(`users/${uid}`).get();
  const user = snap.data();
  if (!user?.profileComplete) throw new HttpsError('failed-precondition', 'Сначала заполни профиль.');
  if (user.banned) throw new HttpsError('permission-denied', 'Этот аккаунт заблокирован.');
  return user as { name: string; avatarUrl?: string | null };
}

/**
 * Joins an open role through an invite link. Same effect as the owner
 * accepting an application (see useReviewApplication on the client): slot
 * count, members, memberRoles, and an accepted application doc so the join
 * shows up in "My applications" and the owner's list like any other.
 */
export const joinByInvite = onCall<{ code?: string; roleId?: string }>(async (req) => {
  const uid = req.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Сначала войди в аккаунт.');
  // Mirrors the email_verified requirement on applications in firestore.rules.
  if (req.auth?.token.email_verified !== true) throw new HttpsError('failed-precondition', 'Сначала подтверди email.');
  const { code, roleId } = req.data ?? {};
  if (!code || !roleId) throw new HttpsError('invalid-argument', 'Не указан код приглашения или роль.');

  const user = await requireCompleteProfile(uid);
  const db = getFirestore();
  const inviteSnap = await db.doc(`invites/${code}`).get();
  const invite = inviteSnap.data();
  if (!invite?.active) throw new HttpsError('not-found', 'Эта ссылка-приглашение больше не работает.');

  const projectRef = db.doc(`projects/${invite.projectId}`);
  const applicationRef = db.doc(`applications/${invite.projectId}_${roleId}_${uid}`);

  await db.runTransaction(async (tx) => {
    const projectSnap = await tx.get(projectRef);
    const project = projectSnap.data();
    if (!project) throw new HttpsError('not-found', 'Этого проекта больше нет.');
    if (project.inviteCode !== code) throw new HttpsError('not-found', 'Эта ссылка-приглашение больше не работает.');
    if (project.isDraft || project.status !== 'open') throw new HttpsError('failed-precondition', 'Эта команда сейчас не набирает участников.');
    if (project.authorId === uid) throw new HttpsError('failed-precondition', 'Это твой собственный проект.');
    if ((project.members ?? []).includes(uid)) throw new HttpsError('already-exists', 'Ты уже в этой команде.');

    const roles = project.roles as ProjectRole[];
    const role = roles.find((r) => r.id === roleId);
    if (!role) throw new HttpsError('not-found', 'Этой роли больше нет.');
    if (role.slotsFilled >= role.slotsTotal) throw new HttpsError('resource-exhausted', 'Эту роль только что заняли.');

    const nextRoles = roles.map((r) => (r.id === roleId ? { ...r, slotsFilled: r.slotsFilled + 1 } : r));
    tx.update(projectRef, {
      roles: nextRoles,
      teamSizeCurrent: nextRoles.reduce((sum, r) => sum + r.slotsFilled, 0),
      members: FieldValue.arrayUnion(uid),
      [`memberRoles.${uid}`]: role.title,
      updatedAt: FieldValue.serverTimestamp(),
    });
    tx.set(
      applicationRef,
      {
        projectId: invite.projectId,
        projectTitle: project.title,
        roleId,
        roleTitle: role.title,
        applicantId: uid,
        applicantName: user.name,
        applicantAvatarUrl: user.avatarUrl ?? null,
        ownerId: project.authorId,
        message: 'Вступил(а) по ссылке-приглашению',
        status: 'accepted',
        viaInvite: true,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  });

  return { projectId: invite.projectId as string };
});

/**
 * Owner → suggested teammate. Sends the project's invite link (creating
 * one if the owner hasn't yet) over push, Telegram and email. Capped per
 * owner per day, and once per (project, person), so it can't be used to
 * spam someone.
 */
export const inviteToProject = onCall<{ projectId?: string; roleId?: string; targetUid?: string }>(
  { secrets: [GMAIL_APP_PASSWORD, TELEGRAM_BOT_TOKEN] },
  async (req) => {
    const uid = req.auth?.uid;
    if (!uid) throw new HttpsError('unauthenticated', 'Сначала войди в аккаунт.');
    const { projectId, roleId, targetUid } = req.data ?? {};
    if (!projectId || !roleId || !targetUid) throw new HttpsError('invalid-argument', 'Не хватает данных.');
    if (targetUid === uid) throw new HttpsError('invalid-argument', 'Нельзя пригласить самого себя.');

    const owner = await requireCompleteProfile(uid);
    const db = getFirestore();
    const projectRef = db.doc(`projects/${projectId}`);
    const project = (await projectRef.get()).data();
    if (!project || project.authorId !== uid) throw new HttpsError('permission-denied', 'Приглашать может только лидер команды.');
    if (project.status !== 'open' || project.isDraft) throw new HttpsError('failed-precondition', 'Сначала открой набор в команду.');
    if ((project.members ?? []).includes(targetUid)) throw new HttpsError('already-exists', 'Уже в твоей команде.');
    const role = (project.roles as ProjectRole[]).find((r) => r.id === roleId);
    if (!role || role.slotsFilled >= role.slotsTotal) throw new HttpsError('failed-precondition', 'На этой роли нет мест.');

    const target = (await db.doc(`users/${targetUid}`).get()).data();
    if (!target) throw new HttpsError('not-found', 'Пользователь не найден.');

    const day = new Date().toISOString().slice(0, 10);
    const counterRef = db.doc(`inviteCounters/${uid}_${day}`);
    const sentRef = db.doc(`sentInvites/${projectId}_${targetUid}`);

    // Reserve the send (dedupe + daily cap) and make sure an invite code
    // exists, all in one transaction so two quick taps can't double-send.
    const code = await db.runTransaction(async (tx) => {
      const [counter, sent, fresh] = await Promise.all([tx.get(counterRef), tx.get(sentRef), tx.get(projectRef)]);
      if (sent.exists) throw new HttpsError('already-exists', 'Ты уже приглашал(а) этого человека.');
      if ((counter.data()?.count ?? 0) >= DAILY_INVITE_CAP) {
        throw new HttpsError('resource-exhausted', `Можно отправить не больше ${DAILY_INVITE_CAP} приглашений в день.`);
      }
      let inviteCode = fresh.data()?.inviteCode as string | null | undefined;
      if (!inviteCode) {
        inviteCode = randomCode();
        tx.set(db.doc(`invites/${inviteCode}`), {
          projectId,
          projectTitle: project.title,
          ownerId: uid,
          active: true,
          createdAt: FieldValue.serverTimestamp(),
        });
        tx.update(projectRef, { inviteCode });
      }
      tx.set(counterRef, { count: FieldValue.increment(1) }, { merge: true });
      tx.set(sentRef, { ownerId: uid, targetUid, roleId, createdAt: FieldValue.serverTimestamp() });
      return inviteCode;
    });

    const url = `/invite/${code}`;
    const note = {
      title: 'Приглашение в команду',
      body: `${owner.name} зовёт тебя в «${project.title}» на роль ${role.title}`,
      url,
    };
    const email = (await db.doc(`users/${targetUid}/private/info`).get()).data()?.email as string | undefined;
    await Promise.all([
      sendPush(targetUid, note),
      sendTelegram(targetUid, { ...note, button: 'Посмотреть команду' }),
      email
        ? sendEmail({
            to: email,
            subject: `${owner.name} зовёт тебя в команду «${project.title}»`,
            html: emailShell(`
              <p style="font-size: 15px; line-height: 1.5;">
                <strong>${escapeHtml(owner.name)}</strong> увидел(а) твой пост «Ищу команду» и зовёт тебя в
                «<strong>${escapeHtml(project.title)}</strong>» на роль <strong>${escapeHtml(role.title)}</strong>.
              </p>
              <p style="margin-top: 20px;">
                <a href="${APP_URL.value()}${url}" style="display: inline-block; background: #4F46E5; color: #fff; text-decoration: none; padding: 10px 18px; border-radius: 10px; font-size: 14px; font-weight: 600;">
                  Посмотреть команду
                </a>
              </p>
            `),
          })
        : Promise.resolve(),
    ]);
    logger.info('inviteToProject sent', { projectId, targetUid });
    return { ok: true };
  },
);
