// Note: firebase-admin's initializeApp() is called once in moderation.ts,
// which index.ts imports before this file — no need to call it again here.
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { defineSecret, defineString } from 'firebase-functions/params';
import { logger } from 'firebase-functions/v2';
import nodemailer from 'nodemailer';

/**
 * Email notifications for the application flow:
 *   1. New application → email the project owner.
 *   2. Application accepted/rejected → email the applicant.
 *
 * Provider: Gmail SMTP, sent from GMAIL_USER using an App Password (not the
 * regular account password — see README "Email notifications"). No custom
 * domain required, works from a plain @gmail.com address, ~500 emails/day
 * limit which is far more than this app needs.
 *
 * Two things need to be configured before these actually send anything:
 *
 *   - GMAIL_USER          — the sending Gmail address, set via
 *       functions/.env: GMAIL_USER=you@gmail.com  (not sensitive, it's public
 *       once an email lands in someone's inbox anyway)
 *   - GMAIL_APP_PASSWORD   — a secret, set with:
 *       firebase functions:secrets:set GMAIL_APP_PASSWORD
 *     Generate this at myaccount.google.com → Security → 2-Step Verification
 *     → App passwords (requires 2-Step Verification to be turned on first).
 *
 * Until GMAIL_APP_PASSWORD is set, these functions log a warning and return
 * without throwing — so an unconfigured deployment doesn't error out, it
 * just silently doesn't email anyone yet.
 *
 * We don't use Firebase Auth's `getUser(uid).email` here because the app
 * already denormalizes `email` onto `users/{uid}/private/info` at signup
 * (see AuthContext.tsx `ensureUserDoc`) — one Firestore read instead of an
 * Admin Auth API call. It's kept in a private subcollection rather than on
 * the main `users/{uid}` doc because that doc is readable by any signed-in
 * user (see firestore.rules); the Admin SDK used here bypasses security
 * rules either way, so the subcollection split doesn't cost this file
 * anything.
 */

export const GMAIL_APP_PASSWORD = defineSecret('GMAIL_APP_PASSWORD');
const GMAIL_USER = defineString('GMAIL_USER', { default: 'you@gmail.com' });
const APP_URL = defineString('APP_URL', { default: 'https://your-app.web.app' });

export async function sendEmail(opts: { to: string; subject: string; html: string }) {
  const appPassword = GMAIL_APP_PASSWORD.value();
  if (!appPassword) {
    logger.warn('GMAIL_APP_PASSWORD not set — skipping email', { to: opts.to, subject: opts.subject });
    return;
  }
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: GMAIL_USER.value(), pass: appPassword },
  });
  try {
    await transporter.sendMail({
      from: `TeamUp <${GMAIL_USER.value()}>`,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    });
  } catch (err) {
    // Never throw from a notification failure — a bounced/misconfigured
    // email should not roll back the Firestore write that triggered it.
    logger.error('Gmail send failed', { error: err instanceof Error ? err.message : String(err), to: opts.to });
  }
}

/**
 * Push notifications (FCM), alongside the email ones above. Reads device
 * tokens from users/{uid}/private/notifications.tokens — written client-side
 * by src/lib/messaging.ts when someone taps "Enable" in Settings. A user
 * with no tokens on file (never enabled push, or on a browser that doesn't
 * support it) just gets skipped here — email still goes out either way.
 */
export async function sendPush(uid: string, opts: { title: string; body: string; url: string }) {
  try {
    const snap = await getFirestore().doc(`users/${uid}/private/notifications`).get();
    const tokens: string[] = snap.data()?.tokens ?? [];
    if (tokens.length === 0) return;

    const response = await getMessaging().sendEachForMulticast({
      tokens,
      notification: { title: opts.title, body: opts.body },
      data: { url: opts.url },
      webpush: { fcmOptions: { link: opts.url } },
    });

    // Prune tokens FCM reports as no longer valid (uninstalled/expired/revoked)
    // so this list doesn't grow forever with dead entries.
    const staleTokens = response.responses
      .map((r, i) => (!r.success && isUnregisteredError(r.error?.code) ? tokens[i] : null))
      .filter((t): t is string => t !== null);
    if (staleTokens.length > 0) {
      await getFirestore()
        .doc(`users/${uid}/private/notifications`)
        .update({ tokens: FieldValue.arrayRemove(...staleTokens) });
    }
  } catch (err) {
    // Never throw from a notification failure — same reasoning as sendEmail:
    // a push-send hiccup should not roll back the Firestore write that
    // triggered it.
    logger.error('Push send failed', { error: err instanceof Error ? err.message : String(err), uid });
  }
}

function isUnregisteredError(code: string | undefined) {
  return code === 'messaging/registration-token-not-registered' || code === 'messaging/invalid-registration-token';
}

export function emailShell(bodyHtml: string) {
  return `
    <div style="font-family: -apple-system, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #18181B;">
      <p style="font-size: 18px; font-weight: 700; margin: 0 0 20px;">
        Team<span style="color: #4F46E5;">Up</span>
      </p>
      ${bodyHtml}
      <p style="margin-top: 32px; font-size: 12px; color: #71717A;">
        You're getting this because of activity on your TeamUp account. This is a transactional email — there's no
        unsubscribe, but you also won't get anything except updates directly about you.
      </p>
    </div>
  `;
}

// applications/{applicationId} created → email the project owner.
export const notifyNewApplication = onDocumentCreated(
  { document: 'applications/{applicationId}', secrets: [GMAIL_APP_PASSWORD] },
  async (event) => {
    const application = event.data?.data();
    if (!application) return;

    const ownerSnap = await getFirestore().doc(`users/${application.ownerId}/private/info`).get();
    const ownerEmail = ownerSnap.data()?.email;
    if (ownerEmail) {
      await sendEmail({
        to: ownerEmail,
        subject: `New application: ${application.applicantName} → ${application.roleTitle}`,
        html: emailShell(`
          <p style="font-size: 15px; line-height: 1.5;">
            <strong>${escapeHtml(application.applicantName)}</strong> applied for
            <strong>${escapeHtml(application.roleTitle)}</strong> on your project
            "<strong>${escapeHtml(application.projectTitle)}</strong>".
          </p>
          <p style="font-size: 15px; line-height: 1.5; background: #F4F4F5; border-radius: 12px; padding: 12px 16px;">
            "${escapeHtml(application.message)}"
          </p>
          <p style="margin-top: 20px;">
            <a href="${APP_URL.value()}/dashboard?tab=projects" style="display: inline-block; background: #4F46E5; color: #fff; text-decoration: none; padding: 10px 18px; border-radius: 10px; font-size: 14px; font-weight: 600;">
              Review application
            </a>
          </p>
        `),
      });
    } else {
      logger.warn('Project owner has no email on file, skipping email notification', { ownerId: application.ownerId });
    }

    await sendPush(application.ownerId, {
      title: 'New application',
      body: `${application.applicantName} applied for ${application.roleTitle} on ${application.projectTitle}`,
      url: '/dashboard?tab=projects',
    });
  },
);

// applications/{applicationId} updated → if status just flipped to
// accepted/rejected, email the applicant.
export const notifyApplicationDecision = onDocumentUpdated(
  { document: 'applications/{applicationId}', secrets: [GMAIL_APP_PASSWORD] },
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after) return;
    if (before.status === after.status) return;
    if (after.status !== 'accepted' && after.status !== 'rejected') return;

    const accepted = after.status === 'accepted';

    const applicantSnap = await getFirestore().doc(`users/${after.applicantId}/private/info`).get();
    const applicantEmail = applicantSnap.data()?.email;
    if (applicantEmail) {
      await sendEmail({
        to: applicantEmail,
        subject: accepted
          ? `You're in! ${after.projectTitle} accepted your application`
          : `Update on your application to ${after.projectTitle}`,
        html: emailShell(
          accepted
            ? `
              <p style="font-size: 15px; line-height: 1.5;">
                Good news — you were accepted for <strong>${escapeHtml(after.roleTitle)}</strong> on
                "<strong>${escapeHtml(after.projectTitle)}</strong>". The team's contact info and chat are now
                unlocked on your dashboard.
              </p>
              <p style="margin-top: 20px;">
                <a href="${APP_URL.value()}/projects/${after.projectId}" style="display: inline-block; background: #4F46E5; color: #fff; text-decoration: none; padding: 10px 18px; border-radius: 10px; font-size: 14px; font-weight: 600;">
                  Open project
                </a>
              </p>
            `
            : `
              <p style="font-size: 15px; line-height: 1.5;">
                Your application for <strong>${escapeHtml(after.roleTitle)}</strong> on
                "<strong>${escapeHtml(after.projectTitle)}</strong>" wasn't accepted this time. Don't worry — there
                are always new projects posting on TeamUp.
              </p>
              <p style="margin-top: 20px;">
                <a href="${APP_URL.value()}/feed" style="display: inline-block; background: #4F46E5; color: #fff; text-decoration: none; padding: 10px 18px; border-radius: 10px; font-size: 14px; font-weight: 600;">
                  Browse projects
                </a>
              </p>
            `,
        ),
      });
    } else {
      logger.warn('Applicant has no email on file, skipping email notification', { applicantId: after.applicantId });
    }

    await sendPush(after.applicantId, {
      title: accepted ? "You're in!" : 'Application update',
      body: accepted
        ? `You were accepted for ${after.roleTitle} on ${after.projectTitle}`
        : `Your application to ${after.projectTitle} wasn't accepted this time`,
      url: accepted ? `/projects/${after.projectId}` : '/feed',
    });
  },
);

export function escapeHtml(value: unknown) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}
