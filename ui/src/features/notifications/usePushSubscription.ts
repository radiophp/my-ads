'use client';

import { useCallback } from 'react';
import { urlBase64ToUint8Array } from '@/lib/vapid';
import { useRegisterPushSubscriptionMutation } from '@/features/api/apiSlice';

const canUsePush = (): boolean =>
  typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;

export function usePushSubscription() {
  const [registerSub, { isLoading }] = useRegisterPushSubscriptionMutation();

  const subscribe = useCallback(async () => {
    if (!canUsePush()) {
      throw new Error('Push is not supported in this browser.');
    }
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      throw new Error('Notification permission denied.');
    }
    const reg = await navigator.serviceWorker.ready;
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidPublicKey) {
      throw new Error('VAPID public key is missing.');
    }
    const existing = await reg.pushManager.getSubscription();
    if (existing) {
      await existing.unsubscribe().catch(() => undefined);
    }
    const applicationServerKey: ArrayBuffer = urlBase64ToUint8Array(vapidPublicKey).buffer as ArrayBuffer;
    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    });
    const json = subscription.toJSON();
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
      throw new Error('Invalid subscription payload.');
    }
    await registerSub({
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
    }).unwrap();
  }, [registerSub]);

  return { subscribe, isLoading, supported: canUsePush() };
}
