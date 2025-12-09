'use client';

import type { NotificationItem } from '@/types/notifications';

const FALLBACK_ICON = '/icons/icon-192x192.png';

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

  const url =
    item.post.permalink ??
    `${typeof window !== 'undefined' ? window.location.origin : ''}/dashboard/posts/${item.post.id}`;

  return { title, body, url, icon: item.post.previewImageUrl ?? FALLBACK_ICON };
};

export const showNativeNotificationIfPermitted = async (item: NotificationItem): Promise<void> => {
  if (getNotificationPermission() !== 'granted') {
    return;
  }
  if (!canUseNativeNotifications()) {
    return;
  }

  const { title, body, url, icon } = buildNotificationData(item);
  const options: NotificationOptions = {
    body,
    icon,
    data: { url },
    tag: item.id,
  };

  try {
    const reg = await navigator.serviceWorker.ready;
    if (reg?.showNotification) {
      await reg.showNotification(title, options);
      return;
    }
  } catch {
    // Fall back to plain Notification below
  }

  try {
    new Notification(title, options);
  } catch {
    // silently ignore if browser blocks the call
  }
};
