import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { NetworkFirst } from 'workbox-strategies';
import { registerRoute } from 'workbox-routing';
import { ExpirationPlugin } from 'workbox-expiration';

const CACHE_PREFIX = 'maxp-v4';

// Register runtime routes BEFORE the precache so navigations and assets are
// served network-first. Otherwise the OLD precached index.html would be served
// cache-first by the service worker, leaving users stuck on a stale build.
registerRoute(
  ({ request }) => request.mode === 'navigate',
  new NetworkFirst({
    cacheName: `${CACHE_PREFIX}-pages`,
    networkTimeoutSeconds: 3,
    plugins: [
      new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 24 * 60 * 60 }),
    ],
  }),
);

// Note: Broad /api/ route caching removed to prevent caching sensitive user/tenant data in SW CacheStorage.
// API state management is safely handled in-memory by React Query.

registerRoute(
  ({ request }) => request.destination === 'style' || request.destination === 'script' || request.destination === 'font',
  new NetworkFirst({
    cacheName: `${CACHE_PREFIX}-assets`,
    networkTimeoutSeconds: 5,
    plugins: [
      new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 24 * 60 * 60 }),
    ],
  }),
);

precacheAndRoute(self.__WB_MANIFEST);

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    cleanupOutdatedCaches();
    // Delete any old caches that don't match our prefix
    const cacheKeys = await caches.keys();
    await Promise.all(
      cacheKeys
        .filter((key) => !key.startsWith(CACHE_PREFIX) && !key.startsWith('workbox'))
        .map((key) => caches.delete(key))
    );
    await self.clients.claim();
    if (self.registration.navigationPreload) {
      await self.registration.navigationPreload.enable();
    }
  })());
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
    self.clients.claim();
  }
});

self.addEventListener('push', (event) => {
  const payload = (() => {
    try {
      return event.data ? event.data.json() : {};
    } catch (error) {
      return {};
    }
  })();

  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });

      const hasVisibleClient = clients.some(
        (client) => client.visibilityState === 'visible',
      );
      const forceVisibleNotification =
        payload.forceVisibleNotification === true ||
        payload.data?.forceVisibleNotification === true;

      if (hasVisibleClient && !forceVisibleNotification) {
        for (const client of clients) {
          client.postMessage({
            type: 'browser-push-received',
            payload,
          });
        }
        return;
      }

      const title = payload.title || 'إشعار جديد';
      await self.registration.showNotification(title, {
        body: payload.body || '',
        icon: payload.icon || '/favicon.ico',
        badge: payload.badge || '/favicon.ico',
        tag: payload.tag || 'maxp-browser-push',
        data: payload.data || { url: payload.url || '/' },
        requireInteraction: payload.requireInteraction === true,
      });
    })(),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl =
    event.notification.data?.url ||
    event.notification.data?.data?.url ||
    '/';

  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });

      for (const client of clients) {
        if ('focus' in client) {
          await client.focus();
          if ('navigate' in client && targetUrl) {
            try {
              await client.navigate(targetUrl);
            } catch (error) {
            }
          }
          return;
        }
      }

      if (self.clients.openWindow) {
        await self.clients.openWindow(targetUrl);
      }
    })(),
  );
});
