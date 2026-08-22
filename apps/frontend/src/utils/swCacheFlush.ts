/**
 * Service Worker Cache Management & Purge Utilities
 * Ensures stored caches (pages, assets, api) are cleanly wiped on updates or logout.
 */

const CURRENT_SW_PATTERN = /\/sw-v4\.js(?:[?#].*)?$/;

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

  // 2. Unregister ALL legacy service workers — keep only the current sw-v4.js
  if ("serviceWorker" in navigator && navigator.serviceWorker) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const reg of registrations) {
        const scriptUrl =
          reg.active?.scriptURL ||
          reg.waiting?.scriptURL ||
          reg.installing?.scriptURL ||
          "";

        if (scriptUrl && !CURRENT_SW_PATTERN.test(scriptUrl)) {
          console.warn("[SW-Flush] Unregistering legacy service worker:", scriptUrl);
          await reg.unregister().catch(() => false);
          continue;
        }

        // For the current SW, tell it to skip waiting if it's in waiting state
        if (reg.waiting) {
          reg.waiting.postMessage("SKIP_WAITING");
        } else if (reg.active) {
          reg.active.postMessage("SKIP_WAITING");
        }
      }
    } catch (error) {
      console.warn("[SW-Flush] Error notifying service worker:", error);
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
