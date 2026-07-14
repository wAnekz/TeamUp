import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  sendEmailVerification,
  type User,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { auth, googleProvider, db } from '@/lib/firebase';
import type { UserProfile } from '@/types';

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  // Snapshot of user.emailVerified, kept in its own bit of state because the
  // Firebase User object doesn't itself trigger a re-render when the
  // underlying value changes (e.g. after the user clicks the link in the
  // verification email in another tab, then comes back and hits "I've
  // verified"). Google sign-in accounts are always true here — Google
  // already verified the address.
  emailVerified: boolean;
  signInEmail: (email: string, password: string) => Promise<void>;
  signUpEmail: (email: string, password: string) => Promise<void>;
  signInGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  refreshEmailVerified: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [emailVerified, setEmailVerified] = useState(false);

  const loadProfile = async (uid: string) => {
    try {
      const snap = await getDoc(doc(db, 'users', uid));
      if (!snap.exists()) {
        setProfile(null);
        return;
      }
      // email lives in users/{uid}/private/info, not on the main doc (see
      // firestore.rules) — merge it in client-side, in-memory only, since
      // this is always the signed-in user's own profile here. This read is
      // best-effort and must never block the rest of sign-in: if the
      // deployed Firestore rules haven't caught up yet (or any other
      // transient failure happens here), the user should still get into
      // the app with email simply left blank, not stuck on a spinner.
      let email: string | null = null;
      try {
        const privateSnap = await getDoc(doc(db, 'users', uid, 'private', 'info'));
        email = privateSnap.exists() ? ((privateSnap.data().email as string | null) ?? null) : null;
      } catch {
        email = null;
      }
      setProfile({ ...(snap.data() as UserProfile), email });
    } catch {
      // Main profile read failed (e.g. rules mid-deploy, offline). Don't
      // leave `profile` in a stale state, but let auth resolution proceed —
      // RequireAuth/guards.tsx already handle profile === null gracefully.
      setProfile(null);
    }
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setEmailVerified(firebaseUser?.emailVerified ?? false);
      try {
        if (firebaseUser) {
          await loadProfile(firebaseUser.uid);
          // Best-effort presence ping; never blocks auth resolution.
          updateDoc(doc(db, 'users', firebaseUser.uid), { lastActiveAt: serverTimestamp() }).catch(() => {});
        } else {
          setProfile(null);
        }
      } finally {
        setLoading(false);
      }
    });
    return unsub;
  }, []);

  const ensureUserDoc = async (uid: string, email: string | null) => {
    const ref = doc(db, 'users', uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      // Minimal stub; profile completion wizard fills the rest. Note: no
      // `email` field here — it goes on the private subcollection doc
      // below instead, since this document is readable by any signed-in
      // user (see firestore.rules).
      await setDoc(ref, {
        uid,
        name: '',
        skills: [],
        interests: [],
        verified: false,
        isStudentConfirmed: false,
        profileComplete: false,
        lastActiveAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      await setDoc(doc(db, 'users', uid, 'private', 'info'), { email });
    }
  };

  const signInEmail = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signUpEmail = async (email: string, password: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await ensureUserDoc(cred.user.uid, cred.user.email);
    await loadProfile(cred.user.uid);
    // Fire-and-forget: don't block signup on this, and a failure here (rare —
    // usually Firebase's own send-rate-limit) shouldn't stop the user from
    // reaching the app. They can hit "resend" from the banner either way.
    sendEmailVerification(cred.user).catch(() => {});
  };

  const signInGoogle = async () => {
    const cred = await signInWithPopup(auth, googleProvider);
    await ensureUserDoc(cred.user.uid, cred.user.email);
    await loadProfile(cred.user.uid);
  };

  const signOut = async () => firebaseSignOut(auth);

  const refreshProfile = async () => {
    if (user) await loadProfile(user.uid);
  };

  const resendVerificationEmail = async () => {
    if (auth.currentUser) await sendEmailVerification(auth.currentUser);
  };

  // Firebase caches the ID token client-side, so emailVerified can be stale
  // until we force a reload. Returns the fresh value so callers (the
  // banner's "I verified, check again" button) can react immediately without
  // waiting on a re-render.
  const refreshEmailVerified = async () => {
    if (!auth.currentUser) return false;
    await auth.currentUser.reload();
    const verified = auth.currentUser.emailVerified;
    setEmailVerified(verified);
    return verified;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        emailVerified,
        signInEmail,
        signUpEmail,
        signInGoogle,
        signOut,
        refreshProfile,
        resendVerificationEmail,
        refreshEmailVerified,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
