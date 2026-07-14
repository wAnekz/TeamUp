import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { logger } from 'firebase-functions/v2';

/**
 * README "What's stubbed / next steps" flagged this as a follow-up:
 * projects should archive themselves once their deadline passes, or once
 * they've sat inactive for a while, instead of lingering in the feed
 * forever. This runs once a day and covers both cases:
 *
 *   1. type === 'event' projects whose `deadline` is in the past.
 *   2. Any non-draft, non-archived project that hasn't been touched
 *      (updatedAt) in INACTIVE_DAYS days — covers ongoing/pet projects,
 *      which don't have a deadline to key off of.
 *
 * Drafts (isDraft === true) are never touched — an unfinished draft
 * shouldn't silently flip to "archived" just because it's been sitting in
 * MyProjects/Drafts for a while.
 *
 * Batched writes (not one .update() per doc) since a run could plausibly
 * touch a few hundred projects at once as the userbase grows; Firestore
 * caps a single batch at 500 writes, so BATCH_SIZE stays safely under that.
 */

const INACTIVE_DAYS = 60;
const BATCH_SIZE = 400;

async function archiveInBatches(db: FirebaseFirestore.Firestore, refs: FirebaseFirestore.DocumentReference[]) {
  for (let i = 0; i < refs.length; i += BATCH_SIZE) {
    const chunk = refs.slice(i, i + BATCH_SIZE);
    const batch = db.batch();
    for (const ref of chunk) {
      batch.update(ref, { status: 'archived', updatedAt: Timestamp.now() });
    }
    await batch.commit();
  }
}

export const autoArchiveProjects = onSchedule('every 24 hours', async () => {
  const db = getFirestore();
  const now = Timestamp.now();
  const inactiveSince = Timestamp.fromMillis(Date.now() - INACTIVE_DAYS * 24 * 60 * 60 * 1000);

  const toArchive = new Map<string, FirebaseFirestore.DocumentReference>();

  // 1. Past-deadline event projects.
  const expiredEvents = await db
    .collection('projects')
    .where('type', '==', 'event')
    .where('status', 'in', ['open', 'closed'])
    .where('isDraft', '==', false)
    .where('deadline', '<=', now)
    .get();
  expiredEvents.docs.forEach((doc) => toArchive.set(doc.id, doc.ref));

  // 2. Stale projects of any type, regardless of deadline.
  const stale = await db
    .collection('projects')
    .where('status', 'in', ['open', 'closed'])
    .where('isDraft', '==', false)
    .where('updatedAt', '<=', inactiveSince)
    .get();
  stale.docs.forEach((doc) => toArchive.set(doc.id, doc.ref));

  if (toArchive.size === 0) {
    logger.info('autoArchiveProjects: nothing to archive.');
    return;
  }

  await archiveInBatches(db, Array.from(toArchive.values()));
  logger.info(`autoArchiveProjects: archived ${toArchive.size} project(s).`);
});