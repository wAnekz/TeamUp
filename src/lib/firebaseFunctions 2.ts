import { connectFunctionsEmulator, getFunctions } from 'firebase/functions';
import { app, useEmulators } from '@/lib/firebase';

// Callable functions (acceptApplication, completeProfile, joinByInvite, …).
// Separate from lib/firebase so the Functions SDK only loads where it's called.
export const functions = getFunctions(app);
if (useEmulators) connectFunctionsEmulator(functions, '127.0.0.1', 5001);
