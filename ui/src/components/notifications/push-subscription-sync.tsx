'use client';

import { useEffect } from 'react';
import { usePushSubscription } from '@/features/notifications/usePushSubscription';
import { useAppSelector } from '@/lib/hooks';
import { useNotificationPreferences } from '@/features/notifications/useNotificationPreferences';

export function PushSubscriptionSync() {
  const { syncSubscription, supported } = usePushSubscription();
  const accessToken = useAppSelector((state) => state.auth.accessToken);
  const { pushEnabled } = useNotificationPreferences();

  useEffect(() => {
    if (!accessToken || !supported || !pushEnabled) {
      return;
    }
    void syncSubscription().catch((error) => {
      console.warn('Push subscription sync failed', error);
    });
  }, [accessToken, pushEnabled, supported, syncSubscription]);

  return null;
}
