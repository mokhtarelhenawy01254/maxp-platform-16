/* MaxP push-notification service worker.
 *
 * NOT a PWA installer and NOT a cache worker:
 * - No precache, no fetch interception, no CacheStorage writes -> no cache
 *   timestamps, no IDB transactions, no "Cache.put() network error" noise.
 * - The web app manifest is gone, so browsers no longer offer "install app".
 * - This worker exists only to receive web push notifications and route
 *   notification clicks back to the right tab.
 */

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // Claim clients immediately so the new SW takes control
    await self.clients.claim();
  })());
  // Note: CacheStorage is not managed by this SW (it is NOT a cache worker).
  // Cache clearing is handled once during SW migration in main.tsx via localStorage flag.
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
      const isOrder =
        payload.typeId === 'order_created' ||
        payload.data?.typeId === 'order_created' ||
        payload.tag?.includes('order');

      await self.registration.showNotification(title, {
        body: payload.body || '',
        icon: payload.icon || '/favicon.ico',
        badge: payload.badge || '/favicon.ico',
        tag: payload.tag || 'maxp-browser-push',
        data: payload.data || { url: payload.url || '/' },
        requireInteraction:
          payload.requireInteraction === true || isOrder === true,
        vibrate: [200, 100, 200],
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
          client.postMessage({
            type: 'play-order-sound',
            data: event.notification.data,
          });
          if ('navigate' in client && targetUrl) {
            try {
              await client.navigate(targetUrl);
            } catch (error) {
              // Ignore navigation failures and keep the focused client.
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