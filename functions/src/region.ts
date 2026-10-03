/**
 * Region for the callables the app waits on (accept, join, invite, profile).
 * Next to the eur3 Firestore instead of the us-central1 default: saves a
 * transatlantic round trip per call for users in Kazakhstan. Must match
 * getFunctions(app, …) in src/lib/firebaseFunctions.ts.
 */
export const CALLABLE_REGION = 'europe-west1';

// Transitional: the callables are also kept in their old us-central1 home so
// tabs still running the previous build keep working until they reload.
// Drop 'us-central1' once the new frontend is live (README "Deploy").
export const CALLABLE_REGIONS = [CALLABLE_REGION, 'us-central1'];
