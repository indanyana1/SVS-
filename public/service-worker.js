/* Minimal service worker so the app is installable as a PWA.
   Uses a network-first passthrough with an offline cache fallback for
   navigation requests. Intentionally lightweight — no precaching of the
   hashed build assets (CRA handles cache-busting via file names). */
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
