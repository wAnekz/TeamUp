import { connectStorageEmulator, getStorage } from 'firebase/storage';
import { app, useEmulators } from '@/lib/firebase';

// Avatars (src/hooks/useProfile.ts) and achievement files (useAchievements.ts);
// see storage.rules for the size/type caps. Separate from lib/firebase so the
// Storage SDK only loads on pages that upload.
export const storage = getStorage(app);
if (useEmulators) connectStorageEmulator(storage, '127.0.0.1', 9199);
