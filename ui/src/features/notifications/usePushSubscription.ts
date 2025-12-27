'use client';

import { useCallback } from 'react';
import { urlBase64ToUint8Array } from '@/lib/vapid';
import { useRegisterPushSubscriptionMutation } from '@/features/api/apiSlice';
import { registerServiceWorker } from '@/lib/service-worker';

const canUsePush = (): boolean =>
  typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;

const EXPIRATION_BUFFER_MS = 24 * 60 * 60 * 1000;

const isExpiringSoon = (subscription: PushSubscription) => {
  const expiration = subscription.expirationTime;
  if (!expiration) {
    return false;
  }
  return expiration <= Date.now() + EXPIRATION_BUFFER_MS;
};

const toSubscriptionPayload = (subscription: PushSubscription) => {
  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    throw new Error('Invalid subscription payload.');
  }
  return {
    endpoint: json.endpoint,
    p256dh: json.keys.p256dh,
    auth: json.keys.auth,
  };
};

export function usePushSubscription() {
  const [registerSub, { isLoading }] = useRegisterPushSubscriptionMutation();

  const syncSubscription = useCallback(
    async (options?: { force?: boolean }) => {
      if (!canUsePush()) {
        throw new Error('Push is not supported in this browser.');
      }
      if (Notification.permission !== 'granted') {
        return;
      }
      const reg = await registerServiceWorker();
      if (!reg) {
        throw new Error('Service worker is not available.');
      }
      await navigator.serviceWorker.ready;
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        throw new Error('VAPID public key is missing.');
      }
      const applicationServerKey: ArrayBuffer = urlBase64ToUint8Array(vapidPublicKey).buffer as ArrayBuffer;
      const existing = await reg.pushManager.getSubscription();
      const shouldResubscribe = options?.force || !existing || isExpiringSoon(existing);

      if (shouldResubscribe) {
        if (existing) {
          await existing.unsubscribe().catch(() => undefined);
        }
        const subscription = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey,
        });
        const payload = toSubscriptionPayload(subscription);
        await registerSub(payload).unwrap();
        return;
      }

      const payload = toSubscriptionPayload(existing);
      await registerSub(payload).unwrap();
    },
    [registerSub],
  );

  const subscribe = useCallback(async () => {
    if (!canUsePush()) {
      throw new Error('Push is not supported in this browser.');
    }
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      throw new Error('Notification permission denied.');
    }
    await syncSubscription({ force: true });
  }, [syncSubscription]);

  return { subscribe, syncSubscription, isLoading, supported: canUsePush() };
}
