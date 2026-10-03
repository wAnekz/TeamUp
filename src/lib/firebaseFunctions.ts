import { connectFunctionsEmulator, getFunctions } from 'firebase/functions';
import { app, useEmulators } from '@/lib/firebase';

// Callable functions (acceptApplication, completeProfile, joinByInvite, …).
// Separate from lib/firebase so the Functions SDK only loads where it's called.
// Region must match CALLABLE_REGION in functions/src/region.ts.
export const functions = getFunctions(app, 'europe-west1');
if (useEmulators) connectFunctionsEmulator(functions, '127.0.0.1', 5001);
