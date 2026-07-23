// Handles push notifications that arrive while the app isn't in an active
// foreground tab. This file is NOT built by Vite (public/ is copied as-is),
// so it can't read import.meta.env — the config below is duplicated from
// .env and must be kept in sync if the Firebase project ever changes.
// (These are the public web SDK config values, not secrets — same ones
// already visible in every network request the app makes.)
//
// It's pulled into the app's main service worker via
// workbox.importScripts in vite.config.ts, rather than registered as its
// own service worker, so there's only ever one SW controlling the page —
// two SWs both claiming "/" would fight over which one answers fetch/push
// events.

importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyAzURpwt34BRXq5N25doIWtDE1_eQ4vsd4',
  authDomain: 'teamup-6a054.firebaseapp.com',
  projectId: 'teamup-6a054',
  storageBucket: 'teamup-6a054.firebasestorage.app',
  messagingSenderId: '171664850080',
  appId: '1:171664850080:web:b6bfd229bb969715ca9dc5',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title ?? 'TeamUp';
  const options = {
    body: payload.notification?.body ?? '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: { url: payload.data?.url ?? '/' },
  };
  self.registration.showNotification(title, options);
});

// Clicking the system notification focuses an existing TeamUp tab if one is
// open, or opens a new one, landing on the relevant page.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url ?? '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      return self.clients.openWindow(targetUrl);
    }),
  );
});
