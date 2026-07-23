import { useEffect, useState } from 'react';
import { isPushSupported, requestPushPermission } from '@/lib/messaging';

export type PushStatus = 'unsupported' | 'checking' | 'default' | 'granted' | 'denied' | 'enabling';

// Drives the "push notifications" toggle in Settings (see MyProfile.tsx).
// Deliberately separate from useReports-style Firestore hooks — this reads
// browser Notification.permission, not a Firestore doc, so a plain
// useState/useEffect is simpler than reaching for react-query here.
export function useNotifications(uid: string | undefined) {
  const [status, setStatus] = useState<PushStatus>('checking');

  useEffect(() => {
    let cancelled = false;
    isPushSupported().then((supported) => {
      if (cancelled) return;
      if (!supported) return setStatus('unsupported');
      setStatus(Notification.permission as PushStatus);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const enable = async () => {
    if (!uid) return;
    setStatus('enabling');
    const token = await requestPushPermission(uid);
    setStatus(token ? 'granted' : (Notification.permission as PushStatus));
  };

  return { status, enable };
}
