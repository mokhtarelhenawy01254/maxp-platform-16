/* MaxP service worker (Web Push Notifications & PWA Installability).
 *
 * Designed to satisfy browser PWA installability criteria without
 * caching that could cause stale chunks or deploy errors:
 * - Pass-through fetch handler enables Chrome/Edge PWA install prompt.
 * - Zero cache writes -> zero stale-chunk errors.
 * - Handles web push notifications and routes clicks to active tabs.
 */

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // Claim clients immediately so the new SW takes control
    await self.clients.claim();
  })());
});

// Pass-through fetch event handler: satisfies browser PWA installability requirements
// while allowing all network traffic to flow directly without stale cache risks.
self.addEventListener('fetch', (event) => {
  // Pass-through: do not intercept or cache, allow natural network fetching
  return;
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
      const isMessage =
        payload.typeId === 'customer_message' ||
        payload.data?.typeId === 'customer_message' ||
        payload.tag?.includes('message');

      await self.registration.showNotification(title, {
        body: payload.body || '',
        icon: payload.icon || '/favicon.ico',
        badge: payload.badge || '/favicon.ico',
        tag: payload.tag || (isOrder ? `order-${Date.now()}` : isMessage ? `msg-${Date.now()}` : 'maxp-browser-push'),
        data: payload.data || { url: payload.url || '/' },
        requireInteraction:
          payload.requireInteraction === true || isOrder === true || isMessage === true,
        vibrate: [250, 100, 250, 100, 250],
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