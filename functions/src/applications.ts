import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { requireCompleteProfile } from './invites';

/**
 * Accepting an application adds the applicant to the team, which also opens
 * both sides' contacts to each other (contacts.ts). firestore.rules don't
 * let clients touch `members`, so this is the only way in besides
 * joinByInvite. XP for the join is granted by xpOnApplication when the
 * application flips to accepted.
 */

interface ProjectRole {
  id: string;
  title: string;
  slotsTotal: number;
  slotsFilled: number;
}

export const acceptApplication = onCall<{ applicationId?: string }>(async (req) => {
  const uid = req.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Сначала войди в аккаунт.');
  const applicationId = req.data?.applicationId;
  if (!applicationId) throw new HttpsError('invalid-argument', 'Не указана заявка.');

  await requireCompleteProfile(uid);
  const db = getFirestore();
  const applicationRef = db.doc(`applications/${applicationId}`);

  await db.runTransaction(async (tx) => {
    const application = (await tx.get(applicationRef)).data();
    if (!application) throw new HttpsError('not-found', 'Заявка не найдена.', { reason: 'applicationGone' });
    if (application.status !== 'pending') throw new HttpsError('failed-precondition', 'Эту заявку уже рассмотрели.', { reason: 'alreadyReviewed' });

    const projectRef = db.doc(`projects/${application.projectId}`);
    const project = (await tx.get(projectRef)).data();
    if (!project) throw new HttpsError('not-found', 'Этого проекта больше нет.', { reason: 'projectGone' });
    if (project.isDraft || project.status !== 'open') {
      throw new HttpsError('failed-precondition', 'Набор в эту команду закрыт.', { reason: 'notRecruiting' });
    }
    if (project.authorId !== uid || application.ownerId !== uid) {
      throw new HttpsError('permission-denied', 'Принимать заявки может только лидер команды.', { reason: 'notOwner' });
    }
    if (applicationId !== `${application.projectId}_${application.roleId}_${application.applicantId}`) {
      throw new HttpsError('failed-precondition', 'Заявка не относится к этому проекту.', { reason: 'applicationGone' });
    }

    const applicant = (await tx.get(db.doc(`users/${application.applicantId}`))).data();
    if (!applicant || applicant.banned) throw new HttpsError('failed-precondition', 'Этого участника нельзя добавить.', { reason: 'cannotAdd' });
    if ((project.members ?? []).includes(application.applicantId)) {
      throw new HttpsError('already-exists', 'Уже в твоей команде.', { reason: 'alreadyMember' });
    }

    const roles = (project.roles ?? []) as ProjectRole[];
    const role = roles.find((r) => r.id === application.roleId);
    if (!role) throw new HttpsError('not-found', 'Этой роли больше нет.', { reason: 'roleGone' });
    if (role.slotsFilled >= role.slotsTotal) throw new HttpsError('resource-exhausted', 'На этой роли нет мест.', { reason: 'roleFull' });

    const nextRoles = roles.map((r) => (r.id === role.id ? { ...r, slotsFilled: r.slotsFilled + 1 } : r));
    tx.update(projectRef, {
      roles: nextRoles,
      teamSizeCurrent: nextRoles.reduce((sum, r) => sum + r.slotsFilled, 0),
      members: FieldValue.arrayUnion(application.applicantId),
      [`memberRoles.${application.applicantId}`]: role.title,
      updatedAt: FieldValue.serverTimestamp(),
    });
    tx.update(applicationRef, { status: 'accepted', updatedAt: FieldValue.serverTimestamp() });
  });

  return { ok: true };
});
