/**
 * Region for the callables the app waits on (accept, join, invite, profile).
 * Next to the eur3 Firestore instead of the us-central1 default: saves a
 * transatlantic round trip per call for users in Kazakhstan. Must match
 * getFunctions(app, …) in src/lib/firebaseFunctions.ts.
 */
export const CALLABLE_REGION = 'europe-west1';

// While moving a callable to a new region, list the old one here too so tabs
// on the previous build keep working (README "Deploy, backups and rollback").
export const CALLABLE_REGIONS = [CALLABLE_REGION];

/**
 * Firestore triggers run next to the eur3 database. Older triggers were
 * created before firebase-tools picked this region by default and stayed in
 * us-central1 (a cross-region hop per event); naming the region pins them.
 * Not used for the HTTP webhook (its URL would change) or schedules.
 */
export const TRIGGER_REGION = 'europe-west1';
