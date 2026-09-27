import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { logger } from 'firebase-functions/v2';

/**
 * Contacts (Telegram, GitHub, portfolio, Instagram) live in
 * users/{uid}/private/contacts, not on the profile doc every signed-in user
 * can read. That doc carries `visibleTo`: the uids of everyone the student
 * shares a team with (as lead or member). firestore.rules lets the owner
 * and exactly those uids read it; only this file writes `visibleTo`.
 *
 * Recomputed whenever a project's team changes, plus a daily reconcile
 * that also migrates any contacts still sitting on old profile docs.
 */

async function teammatesOf(uid: string) {
  const db = getFirestore();
  const [asMember, asLead] = await Promise.all([
    db.collection('projects').where('members', 'array-contains', uid).select('authorId', 'members').get(),
    db.collection('projects').where('authorId', '==', uid).select('authorId', 'members').get(),
  ]);
  const mates = new Set<string>();
  for (const p of [...asMember.docs, ...asLead.docs]) {
    const d = p.data() as { authorId: string; members?: string[] };
    [d.authorId, ...(d.members ?? [])].forEach((m) => mates.add(m));
  }
  mates.delete(uid);
  return [...mates].sort();
}

export async function refreshVisibility(uid: string) {
  const visibleTo = await teammatesOf(uid);
  await getFirestore().doc(`users/${uid}/private/contacts`).set({ visibleTo }, { merge: true });
}

function teamOf(data: FirebaseFirestore.DocumentData | undefined) {
  return data ? [data.authorId as string, ...((data.members as string[]) ?? [])] : [];
}

export const syncContactVisibility = onDocumentWritten('projects/{projectId}', async (event) => {
  const before = teamOf(event.data?.before.data());
  const after = teamOf(event.data?.after.data());
  // Only when the team itself changed (joins, removals, project deleted) —
  // not on every view-count bump.
  const same = before.length === after.length && before.every((u) => after.includes(u));
  if (same) return;
  const affected = [...new Set([...before, ...after])].filter(Boolean);
  await Promise.all(affected.map(refreshVisibility));
  logger.info(`syncContactVisibility: refreshed ${affected.length} user(s)`);
});

export const reconcileContacts = onSchedule({ schedule: 'every day 03:00', timeZone: 'Asia/Almaty' }, async () => {
  const db = getFirestore();
  const users = await db.collection('users').select('contacts').get();
  let migrated = 0;
  for (const u of users.docs) {
    const legacy = u.data().contacts as Record<string, unknown> | undefined;
    if (legacy) {
      // Keep whatever the student has saved privately since; fill gaps from the old doc.
      const current = (await db.doc(`users/${u.id}/private/contacts`).get()).data()?.contacts ?? {};
      await db.doc(`users/${u.id}/private/contacts`).set({ contacts: { ...legacy, ...current } }, { merge: true });
      await u.ref.update({ contacts: FieldValue.delete() });
      migrated++;
    }
    await refreshVisibility(u.id);
  }
  logger.info(`reconcileContacts: ${users.size} user(s), migrated ${migrated}`);
});
