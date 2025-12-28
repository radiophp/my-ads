'use client';

import type { NotificationItem } from '@/types/notifications';
import { hasSeenNotification, markNotificationSeen } from './notificationDeduper';
import { registerServiceWorker } from '@/lib/service-worker';

const FALLBACK_ICON = '/fav/android-chrome-192x192.png';
const FALLBACK_BADGE = '/fav/favicon-32x32.png';
type NotificationActionLike = {
  action: string;
  title: string;
  icon?: string;
};

type NotificationOptionsWithActions = NotificationOptions & {
  actions?: NotificationActionLike[];
};


export const canUseNativeNotifications = (): boolean =>
  typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator;

export const getNotificationPermission = (): NotificationPermission => {
  if (!canUseNativeNotifications()) {
    return 'denied';
  }
  return Notification.permission;
};

export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (!canUseNativeNotifications()) {
    return 'denied';
  }
  return Notification.requestPermission();
};

const buildNotificationData = (item: NotificationItem) => {
  const title = item.post.title ?? 'New ad matched your filter';
  const parts: string[] = [];
  if (item.filter?.name) {
    parts.push(`Filter: ${item.filter.name}`);
  }
  if (item.post.cityName || item.post.provinceName) {
    parts.push([item.post.cityName, item.post.provinceName].filter(Boolean).join(', '));
  }
  const body = parts.join(' • ') || 'Tap to view the ad details.';

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const url = `${origin}/dashboard/posts/${item.post.id}`;
  const listUrl = `${origin}/dashboard/notifications`;

  return {
    title,
    body,
    url,
    listUrl,
    icon: item.post.previewImageUrl ?? FALLBACK_ICON,
    badge: FALLBACK_BADGE,
  };
};

export const showNativeNotificationIfPermitted = async (item: NotificationItem): Promise<void> => {
  if (hasSeenNotification(item.id)) {
    return;
  }
  if (getNotificationPermission() !== 'granted') {
    return;
  }
  if (!canUseNativeNotifications()) {
    return;
  }

  const { title, body, url, listUrl, icon, badge } = buildNotificationData(item);
  const options: NotificationOptionsWithActions = {
    body,
    icon,
    badge,
    tag: item.id,
    data: { url, listUrl, notificationId: item.id },
  };

  try {
    await registerServiceWorker();
    const reg = await navigator.serviceWorker.ready;
    if (reg?.showNotification) {
      await reg.showNotification(title, options);
      markNotificationSeen(item.id);
      return;
    }
  } catch {
    // Fall back to plain Notification below
  }

  try {
    const fallbackOptions: NotificationOptions = {
      body,
      icon,
      badge,
      tag: item.id,
      data: { url, listUrl, notificationId: item.id },
    };
    const notification = new Notification(title, fallbackOptions);
    notification.onclick = () => {
      window.open(url, '_blank', 'noopener,noreferrer');
    };
    markNotificationSeen(item.id);
  } catch {
    // silently ignore if browser blocks the call
  }
};
