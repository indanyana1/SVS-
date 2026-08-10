/* Minimal service worker so the app is installable as a PWA.
   Uses a network-first passthrough with an offline cache fallback for
   navigation requests. Intentionally lightweight — no precaching of the
   hashed build assets (CRA handles cache-busting via file names). */

// ─── VERSION ────────────────────────────────────────────────────────────────
// Auto-stamped by scripts/version-sw.js at build time (git hash + date).
// DO NOT edit manually — every `npm run build` overwrites this automatically.
const APP_VERSION = '2026-08-10-ba08646';
const CACHE_NAME = `svs-pwa-${APP_VERSION}`;
// ────────────────────────────────────────────────────────────────────────────

const OFFLINE_URLS = ['/', '/index.html', '/manifest.json'];

self.addEventListener('message', (event) => {
  const data = event.data || {};

  // User confirmed the update prompt — activate the waiting service worker
  // immediately so the app reloads with new code without needing a tab close.
  if (data.type === 'SVS_SKIP_WAITING') {
    self.skipWaiting();
    return;
  }

  // Show an OS-level notification when the page posts SVS_SHOW_NOTIFICATION.
  // Surfaces in-app alerts when the tab is hidden or the screen is off (Android PWA).
  if (data.type === 'SVS_SHOW_NOTIFICATION') {
    const badgeCount = Number(data.badgeCount) || 1;
    event.waitUntil(
      Promise.all([
        self.registration.showNotification(data.title || 'SVS', {
          body: data.body || '',
          icon: '/images/biznisdil-icon.png',
          badge: '/images/biznisdil-icon.png',
          tag: data.tag || 'svs-notification',
          renotify: true,
          data: { url: data.url || '/' },
        }),
        // Update the home-screen icon badge so the count is visible even
        // while the app tab is in the background.
        self.registration.setAppBadge
          ? self.registration.setAppBadge(badgeCount).catch(() => {})
          : Promise.resolve(),
      ]),
    );
  }
});

// Deep-link the user to the relevant screen when they tap an OS notification.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  // Clear the badge — the app will re-set the exact count once it opens.
  if (self.registration.clearAppBadge) {
    self.registration.clearAppBadge().catch(() => {});
  }
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

self.addEventListener('install', (event) => {
  // Do NOT call skipWaiting() here — we want the new SW to wait so the app
  // can show the user an "Update available" prompt before taking control.
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(OFFLINE_URLS)).catch(() => undefined),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)),
    )),
  );
  // Claim all open clients immediately after activation so the new version
  // is live without requiring a navigation. The React app listens for
  // 'controllerchange' and reloads automatically at this point.
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
