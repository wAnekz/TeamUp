import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // We register the SW ourselves in main.tsx (via virtual:pwa-register)
      // so we can force a reload the moment a new SW takes control — the
      // default injected script doesn't do that reliably for tabs that were
      // already open before a deploy.
      injectRegister: false,
      includeAssets: ['icons/icon-192.png', 'icons/icon-512.png'],
      manifest: {
        name: 'TeamUp',
        short_name: 'TeamUp',
        description: 'Команды для хакатонов, олимпиад и проектов для школьников 14-18 лет.',
        lang: 'ru',
        theme_color: '#4F46E5',
        background_color: '#FFFFFF',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Cache built static assets (JS/CSS/images/fonts). Firestore/Auth calls are
        // never cached here — the app is offline-tolerant for the shell only.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        // Social-preview image: only crawlers need it, not worth precaching.
        globIgnores: ['og.png'],
        // Pulls the FCM background-message handler into this same service
        // worker (see public/firebase-messaging-sw.js) instead of registering
        // a second SW — only one SW can control "/" at a time.
        importScripts: ['firebase-messaging-sw.js'],
        // Without these, a new SW sits in "waiting" until every open tab is
        // fully closed (not just backgrounded) — on mobile/PWA that can mean
        // days of the old JS bundle still being served from precache, which
        // is exactly how a stale addDoc()-based build kept running against
        // security rules built for the new deterministic-id write.
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'CacheFirst',
            options: {
              cacheName: 'teamup-images',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
    }),
  ],
  server: { port: 5173 },
  build: {
    // No source maps in production: anything in dist/ is deployed and
    // publicly downloadable, including .map files with the original source.
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          'firebase-storage': ['firebase/storage'],
          'firebase-functions': ['firebase/functions'],
          vendor: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
});
