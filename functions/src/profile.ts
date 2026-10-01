import { getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

/**
 * Finishes onboarding. The student saves their profile and contacts first
 * (CompleteProfile.tsx); this checks them and sets profileComplete /
 * isStudentConfirmed, which firestore.rules keep out of the client's reach.
 * Same limits as profileSchema in src/utils/validation.ts.
 */

const str = (v: unknown, min: number, max: number) => typeof v === 'string' && v.trim().length >= min && v.length <= max;
const int = (v: unknown, min: number, max: number) => typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;

export function profileProblem(user: Record<string, unknown>, contacts: Record<string, unknown>): string | null {
  if (!str(user.name, 2, 60)) return 'name';
  if (!int(user.age, 13, 19)) return 'age';
  if (!int(user.grade, 9, 12)) return 'grade';
  if (!str(user.city, 2, 60)) return 'city';
  if (!Array.isArray(user.skills) || user.skills.length === 0) return 'skills';
  if (!Array.isArray(user.interests) || user.interests.length === 0) return 'interests';
  // Generous max: saveContacts may prepend https:// to the 120-char form value.
  if (!['telegram', 'github', 'portfolio', 'instagram'].some((k) => str(contacts[k], 1, 300))) return 'contacts';
  return null;
}

export const completeProfile = onCall(async (req) => {
  const uid = req.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Сначала войди в аккаунт.');
  const db = getFirestore();
  const userRef = db.doc(`users/${uid}`);
  const [userSnap, contactsSnap] = await Promise.all([userRef.get(), db.doc(`users/${uid}/private/contacts`).get()]);
  const user = userSnap.data();
  if (!user) throw new HttpsError('not-found', 'Профиль не найден.');
  if (user.banned) throw new HttpsError('permission-denied', 'Этот аккаунт заблокирован.', { reason: 'banned' });

  const problem = profileProblem(user, contactsSnap.data()?.contacts ?? {});
  if (problem) throw new HttpsError('invalid-argument', `Профиль заполнен не полностью (${problem}).`, { reason: 'profileIncomplete', field: problem });

  await userRef.update({ profileComplete: true, isStudentConfirmed: true });
  return { ok: true };
});
