/* Lightweight push + notification click handler imported by the generated service worker.
   This file must remain in /public so Workbox can import it via importScripts.
*/
self.addEventListener('push', (event) => {
  if (!event.data) return;
  let payload = {};
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'Notification', body: event.data.text() };
  }

  const { title, body, url, icon, tag } = payload;
  const options = {
    body,
    icon: icon ?? '/icons/icon-192x192.png',
    data: { url },
    tag,
  };

  event.waitUntil(self.registration.showNotification(title || 'Notification', options));
});

self.addEventListener('notificationclick', (event) => {
  const targetUrl = event.notification?.data?.url;
  event.notification.close();

  if (!targetUrl) {
    return;
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus();
        }
        if ('navigate' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      return self.clients.openWindow ? self.clients.openWindow(targetUrl) : undefined;
    }),
  );
});
