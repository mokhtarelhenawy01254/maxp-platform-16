/* MaxP service worker killer.
 * Automatically wipes CacheStorage and unregisters itself immediately.
 */
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      try {
        if ('caches' in self) {
          const keys = await caches.keys();
          await Promise.all(keys.map((k) => caches.delete(k)));
        }
      } catch (err) {
        // Ignore cache deletion errors
      }
      try {
        await self.registration.unregister();
      } catch (err) {
        // Ignore unregister errors
      }
      try {
        await self.clients.claim();
      } catch (err) {
        // Ignore clients claim errors
      }
    })()
  );
});