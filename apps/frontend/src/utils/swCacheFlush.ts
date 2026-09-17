/**
 * Service Worker Cache Management & Purge Utilities
 * Ensures stored caches (pages, assets, api) are cleanly wiped on updates or logout.
 */

/**
 * Clears all entries in window.caches (CacheStorage API)
 * and unregisters orphaned or obsolete Service Workers if needed.
 */
export async function clearAllSWCaches(): Promise<boolean> {
  if (typeof window === "undefined") {
    return false;
  }

  let cacheCleared = false;

  // 1. Wipe CacheStorage
  if ("caches" in window && window.caches) {
    try {
      const keys = await window.caches.keys();
      await Promise.all(
        keys.map((key) =>
          window.caches.delete(key).catch((err) => {
            console.warn(`[SW-Flush] Failed to delete cache key "${key}":`, err);
          }),
        ),
      );
      cacheCleared = true;
    } catch (error) {
      console.error("[SW-Flush] Error while clearing caches:", error);
    }
  }

  // 2. Unregister ALL Service Workers permanently
  if ("serviceWorker" in navigator && navigator.serviceWorker) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(
        registrations.map(async (reg) => {
          try {
            await reg.unregister();
          } catch {
            // Ignore unregister errors
          }
        }),
      );
    } catch (error) {
      console.warn("[SW-Flush] Error unregistering service workers:", error);
    }
  }

  return cacheCleared;
}

/**
 * Purges all SW caches and reloads the current browser page.
 */
export async function flushSWCacheAndReload(): Promise<void> {
  try {
    await clearAllSWCaches();
  } catch (error) {
    console.error("[SW-Flush] Flush before reload failed:", error);
  } finally {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  }
}
