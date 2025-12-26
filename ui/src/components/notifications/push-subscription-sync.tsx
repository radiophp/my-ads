'use client';

import { useEffect } from 'react';
import { usePushSubscription } from '@/features/notifications/usePushSubscription';
import { useAppSelector } from '@/lib/hooks';

export function PushSubscriptionSync() {
  const { syncSubscription, supported } = usePushSubscription();
  const accessToken = useAppSelector((state) => state.auth.accessToken);

  useEffect(() => {
    if (!accessToken || !supported) {
      return;
    }
    void syncSubscription().catch((error) => {
      console.warn('Push subscription sync failed', error);
    });
  }, [accessToken, supported, syncSubscription]);

  return null;
}
