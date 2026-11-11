/**
 * Service Worker Cache Management & Purge Utilities
 * Ensures stored caches (pages, assets, api) are cleanly wiped on updates or logout,
 * while preserving the scoped portal shell cache and `/sw-portal.js` registration on portal routes.
 */

export const PORTAL_SHELL_CACHE_NAME = "maxp-portal-shell-v1";
export const PORTAL_SW_SCRIPT_PATH = "/sw-portal.js";

function isPortalServiceWorkerRegistration(reg: ServiceWorkerRegistration): boolean {
  const scriptUrl =
    reg.active?.scriptURL || reg.waiting?.scriptURL || reg.installing?.scriptURL || "";
  if (!scriptUrl) return false;
  try {
    const origin =
      typeof window !== "undefined" && window.location?.origin
        ? window.location.origin
        : "http://localhost";
    const parsed = new URL(scriptUrl, origin);
    return parsed.pathname === PORTAL_SW_SCRIPT_PATH;
  } catch {
    return scriptUrl.endsWith(PORTAL_SW_SCRIPT_PATH);
  }
}

/**
 * Clears all entries in window.caches (CacheStorage API)
 * and unregisters ALL Service Workers permanently.
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
 * Clears legacy/non-portal caches and unregisters legacy Service Workers
 * while keeping the scoped `/sw-portal.js` registration and `maxp-portal-shell-v1` cache.
 */
export async function clearNonPortalSWCaches(): Promise<boolean> {
  if (typeof window === "undefined") {
    return false;
  }

  let cacheCleared = false;

  if ("caches" in window && window.caches) {
    try {
      const keys = await window.caches.keys();
      await Promise.all(
        keys
          .filter((key) => key !== PORTAL_SHELL_CACHE_NAME)
          .map((key) =>
            window.caches.delete(key).catch((err) => {
              console.warn(`[SW-Flush] Failed to delete non-portal cache "${key}":`, err);
            }),
          ),
      );
      cacheCleared = true;
    } catch (error) {
      console.error("[SW-Flush] Error while clearing non-portal caches:", error);
    }
  }

  if ("serviceWorker" in navigator && navigator.serviceWorker) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(
        registrations
          .filter((reg) => !isPortalServiceWorkerRegistration(reg))
          .map(async (reg) => {
            try {
              await reg.unregister();
            } catch {
              // Ignore unregister errors
            }
          }),
      );
    } catch (error) {
      console.warn("[SW-Flush] Error unregistering legacy service workers:", error);
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
