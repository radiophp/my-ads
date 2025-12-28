/* Lightweight push + notification click handler imported by the generated service worker.
   This file must remain in /public so Workbox can import it via importScripts.
*/
const DEFAULT_TITLE = 'Notification';
const DEFAULT_BODY = 'New alert available.';
const DEFAULT_ICON = '/fav/android-chrome-192x192.png';
const DEFAULT_BADGE = '/fav/favicon-32x32.png';
const DEFAULT_URL = '/dashboard/notifications';
const VIEW_ACTIONS = new Set(['view', 'view-ad']);
const LIST_ACTIONS = new Set(['list', 'view-notifications']);

const resolveUrl = (targetUrl) => {
  try {
    return new URL(targetUrl || DEFAULT_URL, self.location.origin).toString();
  } catch {
    return new URL(DEFAULT_URL, self.location.origin).toString();
  }
};

self.addEventListener('push', (event) => {
  event.waitUntil(
    (async () => {
      let payload = {};
      if (event.data) {
        try {
          payload = event.data.json();
        } catch {
          payload = { title: DEFAULT_TITLE, body: event.data.text() };
        }
      }

      const notificationId = payload.notificationId || payload.id || payload.tag || null;
      const title = payload.title || DEFAULT_TITLE;
      const body = payload.body || DEFAULT_BODY;
      const targetUrl = resolveUrl(payload.url);
      const listUrl = resolveUrl(payload.listUrl || DEFAULT_URL);
      const options = {
        body,
        icon: payload.icon || DEFAULT_ICON,
        badge: payload.badge || DEFAULT_BADGE,
        tag: payload.tag || notificationId || undefined,
        renotify: false,
        actions: [],
        data: {
          url: targetUrl,
          listUrl,
          notificationId,
        },
      };

      try {
        await self.registration.showNotification(title, options);
      } catch (error) {
        // Prevent the service worker from crashing if showNotification fails.
        console.warn('Failed to show push notification', error);
      }

      try {
        const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        for (const client of clients) {
          client.postMessage({ type: 'push-notification', id: notificationId, url: targetUrl });
        }
      } catch {
        // ignore postMessage failures
      }
    })(),
  );
});

self.addEventListener('notificationclick', (event) => {
  const data = event.notification?.data || {};
  const action = event.action || '';
  let targetUrl = resolveUrl(data.url);

  if (action) {
    if (VIEW_ACTIONS.has(action)) {
      targetUrl = resolveUrl(data.url);
    } else if (LIST_ACTIONS.has(action)) {
      targetUrl = resolveUrl(data.listUrl || DEFAULT_URL);
    } else {
      targetUrl = resolveUrl(data.listUrl || DEFAULT_URL);
    }
  }

  event.notification.close();

  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of clientList) {
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus();
        }
      }
      for (const client of clientList) {
        if ('navigate' in client) {
          try {
            const navigated = await client.navigate(targetUrl);
            if (navigated && 'focus' in navigated) {
              return navigated.focus();
            }
          } catch {
            // Fall back to opening a new window below.
          }
        }
      }
      return self.clients.openWindow ? self.clients.openWindow(targetUrl) : undefined;
    })(),
  );
});
