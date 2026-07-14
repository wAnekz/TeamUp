import { onMessagePublished } from 'firebase-functions/v2/pubsub';
import { logger } from 'firebase-functions/v2';
import { projectID } from 'firebase-functions/params';
import { CloudBillingClient } from '@google-cloud/billing';
/**
 * Emergency stop for runaway Blaze spend. Budget alerts on their own are
 * just email — they don't cap anything. This function is the actual stop:
 * a Cloud Billing budget publishes to the Pub/Sub topic below at regular
 * intervals (roughly every 20-30 min, regardless of whether a threshold
 * was crossed), this function reads the reported cost, and once it's past
 * THRESHOLD_FRACTION of the budget, disconnects the billing account from
 * the project entirely.
 *
 * That's a nuclear option on purpose: disconnecting billing immediately
 * stops ALL paid usage in the project — Cloud Functions (including this one
 * — it can't fire twice), Firestore beyond the free quota, everything.
 * Hosting/Auth/Firestore free-tier reads still work. Re-enabling billing
 * afterwards is a manual step in the Google Cloud Console.
 *
 * THRESHOLD_FRACTION is 0.85, not 1.0: budget cost data has a reporting
 * delay, so acting at 100% risks the actual spend already being well past
 * it by the time this runs.
 */

const THRESHOLD_FRACTION = 0.85;

interface BudgetNotification {
  costAmount: number;
  budgetAmount: number;
  budgetDisplayName?: string;
}

const billing = new CloudBillingClient();

export const billingKillswitch = onMessagePublished('billing-killswitch', async (event) => {
  const raw = event.data.message.json as BudgetNotification | undefined;
  if (!raw || typeof raw.costAmount !== 'number' || typeof raw.budgetAmount !== 'number') {
    logger.warn('billingKillswitch: unrecognized Pub/Sub payload, ignoring', { raw });
    return;
  }

  const { costAmount, budgetAmount, budgetDisplayName } = raw;
  const ratio = budgetAmount > 0 ? costAmount / budgetAmount : 0;

  logger.info(`billingKillswitch: budget "${budgetDisplayName ?? 'unknown'}" at $${costAmount} of $${budgetAmount}`);

  if (ratio < THRESHOLD_FRACTION) {
    logger.info(`billingKillswitch: ${(ratio * 100).toFixed(0)}% of budget — under the ${THRESHOLD_FRACTION * 100}% action threshold, no action.`);
    return;
  }

    const projectId = projectID.value();
  if (!projectId) {
    logger.error('billingKillswitch: could not resolve project ID, cannot identify which project to disable.');
    return;
  }
  const projectName = `projects/${projectId}`;
  try {
    const [billingInfo] = await billing.getProjectBillingInfo({ name: projectName });
    if (!billingInfo.billingEnabled) {
      logger.info('billingKillswitch: billing already disabled, nothing to do.');
      return;
    }

    logger.warn(`billingKillswitch: THRESHOLD EXCEEDED (${(ratio * 100).toFixed(0)}%) — disabling billing for ${projectName}.`);
    await billing.updateProjectBillingInfo({
      name: projectName,
      projectBillingInfo: { billingAccountName: '' }, // empty = detach
    });
    logger.warn('billingKillswitch: billing disabled. Re-enable manually in Google Cloud Console when ready.');
  } catch (err) {
    logger.error('billingKillswitch: failed to disable billing — check the service account has Billing Account Administrator on the billing account.', err);
  }
});