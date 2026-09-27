import { getFirestore } from 'firebase-admin/firestore';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { logger } from 'firebase-functions/v2';

/**
 * publicProjects/{id} — what signed-out visitors can read. The privacy
 * policy promises names/profiles are visible to registered users only, and
 * Firestore rules can't hide single fields of a document, so guests get a
 * separate copy with every personal field stripped (author name, avatar,
 * member uids/roles, invite code). Only published, non-archived projects are
 * mirrored; anything else is removed from the mirror.
 */

const PUBLIC_FIELDS = [
  'title',
  'description',
  'additionalRequirements',
  'type',
  'deadline',
  'roles',
  'teamSizeMax',
  'teamSizeCurrent',
  'interests',
  'skills',
  'status',
  'viewCount',
  'result', // competition + placing only, no names
  'createdAt',
  'updatedAt',
] as const;

function toPublic(data: FirebaseFirestore.DocumentData) {
  const out: Record<string, unknown> = { isDraft: false, public: true };
  for (const key of PUBLIC_FIELDS) if (data[key] !== undefined) out[key] = data[key];
  return out;
}

function isPublishable(data: FirebaseFirestore.DocumentData | undefined) {
  return !!data && data.isDraft === false && (data.status === 'open' || data.status === 'closed');
}

export const syncPublicProject = onDocumentWritten('projects/{projectId}', async (event) => {
  const after = event.data?.after.data();
  const ref = getFirestore().doc(`publicProjects/${event.params.projectId}`);
  if (isPublishable(after)) await ref.set(toPublic(after!));
  else await ref.delete();
});

/** Daily full reconcile — also how projects from before this existed get mirrored. */
export const reconcilePublicProjects = onSchedule({ schedule: 'every day 03:30', timeZone: 'Asia/Almaty' }, async () => {
  const db = getFirestore();
  const [projects, mirrors] = await Promise.all([db.collection('projects').get(), db.collection('publicProjects').select().get()]);
  const keep = new Set<string>();
  let batch = db.batch();
  let ops = 0;
  const flush = async () => {
    if (ops > 0) await batch.commit();
    batch = db.batch();
    ops = 0;
  };
  for (const p of projects.docs) {
    if (!isPublishable(p.data())) continue;
    keep.add(p.id);
    batch.set(db.doc(`publicProjects/${p.id}`), toPublic(p.data()));
    if (++ops >= 400) await flush();
  }
  for (const m of mirrors.docs) {
    if (keep.has(m.id)) continue;
    batch.delete(m.ref);
    if (++ops >= 400) await flush();
  }
  await flush();
  logger.info(`reconcilePublicProjects: ${keep.size} public project(s)`);
});
