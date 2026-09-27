import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';

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

// Avatars still go through ImgBB (see src/hooks/useProfile.ts). Storage is
// used only for achievement files (diplomas, certificate PDFs) — ImgBB
// can't host PDFs. The project is already on Blaze for Cloud Functions, so
// Storage's free tier covers this; see storage.rules for the size/type caps.
export const storage = getStorage(app);

// Callable functions (joinByInvite, inviteToProject) — see functions/src/invites.ts.
export const functions = getFunctions(app);
