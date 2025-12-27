/* Minimal service worker to enable push notifications when next-pwa output is unavailable. */
self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }
  event.respondWith(fetch(event.request));
});

try {
  importScripts('/push-sw.js');
} catch (error) {
  // Keep the worker alive even if the push helper fails to load.
  console.warn('Failed to load push-sw.js', error);
}
