import { useSyncExternalStore } from 'react';

function subscribe(onChange: () => void) {
  window.addEventListener('online', onChange);
  window.addEventListener('offline', onChange);
  return () => {
    window.removeEventListener('online', onChange);
    window.removeEventListener('offline', onChange);
  };
}

/**
 * Browser connectivity. With Firestore's persistent cache, a write made
 * offline doesn't fail, it waits for the network, so a submit button would
 * spin forever and a reload-and-retry would queue a duplicate. Used to show
 * an offline notice and hold submits until the connection is back.
 */
export function useOnline() {
  return useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
}
