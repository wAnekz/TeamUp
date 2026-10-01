import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, GoogleAuthProvider } from 'firebase/auth';
import { connectFirestoreEmulator, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { connectStorageEmulator, getStorage } from 'firebase/storage';
import { connectFunctionsEmulator, getFunctions } from 'firebase/functions';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Multi-tab persistent cache. This is the modern replacement for the old
// enablePersistence() call — no need to wrap every query in .finally() to
// dodge the "already enabled in another tab" race, the SDK handles it.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});

// Avatars (src/hooks/useProfile.ts) and achievement files — diplomas,
// certificate PDFs (src/hooks/useAchievements.ts). The project is already on
// Blaze for Cloud Functions, so Storage's free tier covers this; see
// storage.rules for the size/type caps.
export const storage = getStorage(app);

// Callable functions (joinByInvite, inviteToProject) — see functions/src/invites.ts.
export const functions = getFunctions(app);

// Local end-to-end runs against the Firebase emulators (never set in production builds).
if (import.meta.env.VITE_USE_EMULATORS === 'true') {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  connectStorageEmulator(storage, '127.0.0.1', 9199);
  connectFunctionsEmulator(functions, '127.0.0.1', 5001);
}
