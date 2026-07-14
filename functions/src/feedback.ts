import { getFirestore } from 'firebase-admin/firestore';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { defineString } from 'firebase-functions/params';
import { logger } from 'firebase-functions/v2';
import { sendEmail, emailShell, escapeHtml, GMAIL_APP_PASSWORD } from './notifications';

/**
 * `feedback/{feedbackId}` is write-only from the client (see
 * firestore.rules) — there's no in-app inbox for it, no queue to check.
 * The moment someone submits one (via FeedbackButton.tsx, either from the
 * profile page or straight off a crash screen via ErrorBoundary), this
 * emails it directly to the developer. Reuses the same Gmail transporter
 * as notifications.ts, so no extra secret setup beyond what's already
 * configured for application emails.
 *
 * ADMIN_EMAIL defaults to GMAIL_USER (the sending address) — set it
 * separately in functions/.env only if feedback should land somewhere
 * other than the account that sends the mail.
 */
const ADMIN_EMAIL = defineString('ADMIN_EMAIL', { default: '' });
const GMAIL_USER = defineString('GMAIL_USER', { default: 'you@gmail.com' });

export const notifyNewFeedback = onDocumentCreated(
  { document: 'feedback/{feedbackId}', secrets: [GMAIL_APP_PASSWORD] },
  async (event) => {
    const feedback = event.data?.data();
    if (!feedback) return;

    const to = ADMIN_EMAIL.value() || GMAIL_USER.value();

    // Best-effort context on who sent it — not required for the email to
    // go out, just makes it easier to follow up if the bug needs more
    // detail from them.
    let reporterLabel = feedback.reporterId as string;
    try {
      const userSnap = await getFirestore().doc(`users/${feedback.reporterId}`).get();
      const name = userSnap.data()?.name;
      if (name) reporterLabel = `${name} (${feedback.reporterId})`;
    } catch (err) {
      logger.warn('notifyNewFeedback: could not look up reporter name', err);
    }

    await sendEmail({
      to,
      subject: `TeamUp feedback: ${String(feedback.message).slice(0, 60)}`,
      html: emailShell(`
        <p style="font-size: 15px; line-height: 1.5;">
          <strong>${escapeHtml(reporterLabel)}</strong> sent feedback from
          <code>${escapeHtml(feedback.page)}</code>:
        </p>
        <p style="font-size: 15px; line-height: 1.5; background: #F4F4F5; border-radius: 12px; padding: 12px 16px; white-space: pre-wrap;">
          ${escapeHtml(feedback.message)}
        </p>
      `),
    });
  },
);