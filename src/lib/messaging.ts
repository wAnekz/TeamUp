import { getMessaging, getToken, isSupported, onMessage, type Messaging } from 'firebase/messaging';
import { doc, setDoc, arrayUnion, arrayRemove, serverTimestamp } from 'firebase/firestore';
import { app, db } from '@/lib/firebase';

/**
 * Push notifications (FCM), separate from the existing email notifications
 * in functions/src/notifications.ts — this only handles getting a device
 * token and keeping it in sync in Firestore; the Cloud Functions side reads
 * those tokens and does the actual sending.
 *
 * Requires:
 *   - VITE_FIREBASE_VAPID_KEY in .env — generate one in the Firebase console
 *     under Project settings → Cloud Messaging → Web configuration →
 *     "Generate key pair". Without it, requestPushPermission() resolves to
 *     null and the UI should treat that as "not available" rather than error.
 *   - public/firebase-messaging-sw.js kept in sync with the firebaseConfig
 *     values below (it can't read import.meta.env — it's served as a static
 *     file, not built by Vite).
 */

let messagingPromise: Promise<Messaging | null> | null = null;

// Lazy + guarded: getMessaging() throws in browsers/contexts without Push
// API support (e.g. Safari < 16, or any non-secure origin), and this file
// gets imported from React components that render on every platform.
function getMessagingLazy(): Promise<Messaging | null> {
  if (!messagingPromise) {
    messagingPromise = isSupported().then((supported) => (supported ? getMessaging(app) : null));
  }
  return messagingPromise;
}

export async function isPushSupported(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  return (await getMessagingLazy()) !== null;
}

// Requests browser permission (if not already decided), fetches an FCM
// token, and stores it on users/{uid}/private/notifications so a Cloud
// Function can look it up later. Returns the token, or null if permission
// was denied / push isn't supported / VAPID key is missing.
export async function requestPushPermission(uid: string): Promise<string | null> {
  const messaging = await getMessagingLazy();
  if (!messaging) return null;

  const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
  if (!vapidKey) {
    console.warn('VITE_FIREBASE_VAPID_KEY is not set — cannot request an FCM token.');
    return null;
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return null;

  const registration = await navigator.serviceWorker.ready;
  const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration });
  if (!token) return null;

  await setDoc(
    doc(db, 'users', uid, 'private', 'notifications'),
    { tokens: arrayUnion(token), updatedAt: serverTimestamp() },
    { merge: true },
  );
  localStorage.setItem('teamup_push_token', token);

  return token;
}

// Called on sign-out so a shared/borrowed device stops receiving another
// person's notifications. Best-effort — never blocks sign-out on failure.
export async function forgetPushTokenOnSignOut(uid: string) {
  const token = localStorage.getItem('teamup_push_token');
  if (!token) return;
  try {
    await setDoc(doc(db, 'users', uid, 'private', 'notifications'), { tokens: arrayRemove(token) }, { merge: true });
    localStorage.removeItem('teamup_push_token');
  } catch {
    // Non-critical — the token will just go stale and get pruned server-side.
  }
}

// Foreground messages (app open in an active tab) don't trigger a system
// notification automatically — the caller is expected to show a toast.
export async function onForegroundPush(callback: (title: string, body: string, url?: string) => void) {
  const messaging = await getMessagingLazy();
  if (!messaging) return () => {};
  return onMessage(messaging, (payload) => {
    callback(payload.notification?.title ?? 'TeamUp', payload.notification?.body ?? '', payload.data?.url);
  });
}
