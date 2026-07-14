import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { registerSW } from 'virtual:pwa-register';
import { queryClient } from '@/lib/queryClient';
import { AuthProvider } from '@/contexts/AuthContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ToastViewport } from '@/components/ui/ToastViewport';
import App from './App';
import './index.css';

// Without this, a new deploy's SW installs and (thanks to skipWaiting +
// clientsClaim in vite.config) takes control of the page in the background —
// but any tab that was already open keeps running the OLD JS already loaded
// in memory until it's manually reloaded. That's exactly what was causing
// applications to still write with the old addDoc()-shaped code (random doc
// id) even after a fresh deploy: the tab under test was open before the
// deploy landed. This forces an immediate one-time reload the moment a new
// SW takes over, so "already open" can never again mean "running stale code".
registerSW({
  immediate: true,
  onRegisteredSW(_url, registration) {
    if (!registration) return;
    // Poll for a newer SW every 60s so long-lived open tabs (PWA on a phone
    // that's rarely fully closed) don't wait indefinitely to notice a deploy.
    setInterval(() => registration.update(), 60_000);
  },
});

let hasReloaded = false;
navigator.serviceWorker?.addEventListener('controllerchange', () => {
  if (hasReloaded) return;
  hasReloaded = true;
  window.location.reload();
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <App />
            <ToastViewport />
          </AuthProvider>
        </QueryClientProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>,
);
