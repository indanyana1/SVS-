/* Minimal service worker so the app is installable as a PWA.
   Uses a network-first passthrough with an offline cache fallback for
   navigation requests. Intentionally lightweight — no precaching of the
   hashed build assets (CRA handles cache-busting via file names). */

// Show an OS-level notification when the page posts SVS_SHOW_NOTIFICATION.
// Surfaces in-app alerts when the tab is hidden or the screen is off (Android PWA).
self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type !== 'SVS_SHOW_NOTIFICATION') return;
  event.waitUntil(
    self.registration.showNotification(data.title || 'SVS', {
      body: data.body || '',
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: data.tag || 'svs-notification',
      renotify: true,
      data: { url: data.url || '/' },
    }),
  );
});

// Deep-link the user to the relevant screen when they tap an OS notification.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetPath = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        const existing = clientList.find((c) => c.url.startsWith(self.location.origin));
        if (existing) {
          existing.focus();
          // Tell the running React app to navigate to the notification's page.
          existing.postMessage({ type: 'SVS_NAVIGATE', url: targetPath });
          return undefined;
        }
        // No open window — launch the app at the correct URL.
        return self.clients.openWindow(self.location.origin + targetPath);
      }),
  );
});

const CACHE_NAME = 'svs-pwa-v1';
const OFFLINE_URLS = ['/', '/index.html', '/manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(OFFLINE_URLS)).catch(() => undefined),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)),
    )),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  // For page navigations, try the network first then fall back to cache.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => undefined);
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match('/index.html'))),
    );
    return;
  }

  // For other GETs, serve from cache when available, else fetch.
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request)),
  );
});
