import { getFirestore } from 'firebase-admin/firestore';
import { onDocumentDeleted } from 'firebase-functions/v2/firestore';

/**
 * Deleting a project doesn't delete its subcollections, so the team chat
 * (messages between minors) and view markers would outlive it with no way
 * to read or remove them. Wipe both when the project goes.
 */
export const cleanupDeletedProject = onDocumentDeleted('projects/{projectId}', async (event) => {
  const db = getFirestore();
  const base = `projects/${event.params.projectId as string}`;
  await Promise.all([
    db.recursiveDelete(db.collection(`${base}/messages`)),
    db.recursiveDelete(db.collection(`${base}/viewers`)),
  ]);
});
