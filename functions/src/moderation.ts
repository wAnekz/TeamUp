import { initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { TRIGGER_REGION } from './region';

initializeApp();

/**
 * Client-side throttling (see TeamChat.tsx / useApplyToRole / ReportButton)
 * covers the well-behaved-app case for free. This file is the real backstop
 * for anyone hitting the Firestore API directly and ignoring the app UI —
 * something Firestore security rules alone can't enforce (rules can't count
 * "how many docs has this user created in the last N seconds").
 *
 * Pattern: after a doc is created, count how many the same author created
 * in the trailing window. Over the limit → delete the doc that just
 * triggered this function. The author sees their message/report/application
 * silently disappear rather than a hard error, which is an intentional
 * trade-off to keep this simple; a nicer version would write a
 * `rateLimited: true` marker the client listens for instead of a bare delete.
 *
 * Requires the Blaze (pay-as-you-go) plan, same as every other Cloud
 * Function in this project. See README "What's stubbed" for the rest.
 */

async function enforceLimit(opts: {
  collectionPath: string;
  isCollectionGroup: boolean;
  authorField: string;
  createdAtField: string;
  windowMs: number;
  maxInWindow: number;
  authorId: string;
  docRefPath: string;
}) {
  const db = getFirestore();
  const since = Timestamp.fromMillis(Date.now() - opts.windowMs);
  const base = opts.isCollectionGroup ? db.collectionGroup(opts.collectionPath) : db.collection(opts.collectionPath);
  const recent = await base
    .where(opts.authorField, '==', opts.authorId)
    .where(opts.createdAtField, '>=', since)
    .get();

  if (recent.size > opts.maxInWindow) {
    await db.doc(opts.docRefPath).delete();
  }
}

// projects/{projectId}/messages/{messageId} — max 8 messages per 10s per user.
export const rateLimitMessages = onDocumentCreated({ document: 'projects/{projectId}/messages/{messageId}', region: TRIGGER_REGION }, async (event) => {
  const data = event.data?.data();
  if (!data) return;
  await enforceLimit({
    collectionPath: 'messages',
    isCollectionGroup: true,
    authorField: 'authorId',
    createdAtField: 'createdAt',
    windowMs: 10_000,
    maxInWindow: 8,
    authorId: data.authorId,
    docRefPath: event.data!.ref.path,
  });
});

// reports/{reportId} — max 5 reports per 10 minutes per user (reports are
// low-frequency by nature; this mainly stops report-spam used to harass
// someone by flooding the moderation queue).
export const rateLimitReports = onDocumentCreated({ document: 'reports/{reportId}', region: TRIGGER_REGION }, async (event) => {
  const data = event.data?.data();
  if (!data) return;
  await enforceLimit({
    collectionPath: 'reports',
    isCollectionGroup: false,
    authorField: 'reporterId',
    createdAtField: 'createdAt',
    windowMs: 10 * 60_000,
    maxInWindow: 5,
    authorId: data.reporterId,
    docRefPath: event.data!.ref.path,
  });
});

// applications/{applicationId} — max 15 applications per hour per user.
export const rateLimitApplications = onDocumentCreated({ document: 'applications/{applicationId}', region: TRIGGER_REGION }, async (event) => {
  const data = event.data?.data();
  if (!data) return;
  await enforceLimit({
    collectionPath: 'applications',
    isCollectionGroup: false,
    authorField: 'applicantId',
    createdAtField: 'createdAt',
    windowMs: 60 * 60_000,
    maxInWindow: 15,
    authorId: data.applicantId,
    docRefPath: event.data!.ref.path,
  });
});
