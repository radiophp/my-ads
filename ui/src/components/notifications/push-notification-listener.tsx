'use client';

import { useEffect } from 'react';
import { markNotificationSeen } from '@/features/notifications/notificationDeduper';

const canListenForSwMessages = () =>
  typeof window !== 'undefined' && 'serviceWorker' in navigator;

export function PushNotificationListener() {
  useEffect(() => {
    if (!canListenForSwMessages()) {
      return;
    }

    const handleMessage = (event: MessageEvent) => {
      const payload = event.data as { type?: string; id?: string };
      if (payload?.type !== 'push-notification') {
        return;
      }
      if (payload.id) {
        markNotificationSeen(payload.id);
      }
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);

    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage);
    };
  }, []);

  return null;
}
