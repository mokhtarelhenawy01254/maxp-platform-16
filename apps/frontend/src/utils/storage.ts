/**
 * 💾 Storage Utilities
 * Safe local storage operations with type safety and error handling
 */

import { logError } from "./errorHandler";

// Storage quota limit warning threshold (in bytes)
const QUOTA_WARNING_THRESHOLD = 5 * 1024 * 1024; // 5MB

/**
 * Check if localStorage is available
 */
export function isStorageAvailable(): boolean {
  try {
    const testKey = "__storage_test__";
    localStorage.setItem(testKey, testKey);
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get storage usage estimate
 */
export function getStorageUsage(): {
  used: number;
  available: number;
  percentage: number;
} {
  let used = 0;

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      used += (localStorage.getItem(key)?.length || 0) * 2; // UTF-16 uses 2 bytes per character
    }
  }

  // localStorage typically has 5MB limit
  const available = 5 * 1024 * 1024;

  return {
    used,
    available,
    percentage: Math.round((used / available) * 100),
  };
}

let lastStorageWarningTimestamp = 0;
const STORAGE_WARNING_COOLDOWN_MS = 60 * 1000;

/**
 * Warn if storage is getting full (throttled to at most once per 60s)
 * and proactively evict expired items to prevent quota exhaustion.
 */
export function checkStorageQuota(): void {
  const now = Date.now();
  if (now - lastStorageWarningTimestamp < STORAGE_WARNING_COOLDOWN_MS) {
    return;
  }

  // Proactively evict expired items when checking quota
  clearExpiredItems();

  const usage = getStorageUsage();

  if (usage.percentage > 85) {
    lastStorageWarningTimestamp = now;
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        `⚠️ LocalStorage usage is at ${usage.percentage}%. Consider clearing unused data.`,
      );
    }
  }
}

/**
 * Safe get item from localStorage
 */
export function getItem<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);

    if (item === null) {
      return defaultValue;
    }

    // Handle JSON parsing with error recovery
    try {
      return JSON.parse(item, (k, v) => {
        // Handle special values
        if (v === "undefined") return undefined;
        if (v === "null") return null;
        return v;
      });
    } catch {
      // If JSON parsing fails, return the raw string
      return item as unknown as T;
    }
  } catch (error) {
    logError(error, { component: "storage", operation: "getItem", key });
    return defaultValue;
  }
}

/**
 * Safe set item in localStorage
 */
export function setItem<T>(key: string, value: T): boolean {
  try {
    // Check quota before writing
    checkStorageQuota();

    const serialized = JSON.stringify(value);

    // Check if this would exceed quota
    const currentUsage = getStorageUsage();
    const newUsage = currentUsage.used + serialized.length * 2;

    if (newUsage > QUOTA_WARNING_THRESHOLD) {
      clearExpiredItems();
      const updatedUsage = getStorageUsage();
      if (updatedUsage.used + serialized.length * 2 > QUOTA_WARNING_THRESHOLD) {
        const now = Date.now();
        if (now - lastStorageWarningTimestamp >= STORAGE_WARNING_COOLDOWN_MS) {
          lastStorageWarningTimestamp = now;
          if (process.env.NODE_ENV !== "production") {
            console.warn(`⚠️ Writing "${key}" may exceed storage quota.`);
          }
        }
      }
    }

    localStorage.setItem(key, serialized);
    return true;
  } catch (error) {
    if (error instanceof DOMException && error.name === "QuotaExceededError") {
      console.error("❌ LocalStorage quota exceeded!");

      // Try to clear expired items
      clearExpiredItems();

      // Try again after clearing
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch {
        console.error("❌ Failed to write even after clearing expired items.");
      }
    }

    logError(error, { component: "storage", operation: "setItem", key });
    return false;
  }
}

/**
 * Safe remove item from localStorage
 */
export function removeItem(key: string): boolean {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    logError(error, { component: "storage", operation: "removeItem", key });
    return false;
  }
}

/**
 * Clear all items with optional prefix
 */
export function clear(prefix?: string): boolean {
  try {
    if (prefix) {
      const keysToRemove: string[] = [];

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(prefix)) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach((key) => localStorage.removeItem(key));
    } else {
      localStorage.clear();
    }

    return true;
  } catch (error) {
    logError(error, {
      component: "storage",
      operation: "clear",
      prefix: prefix || "all",
    });
    return false;
  }
}

/**
 * Get all keys matching a pattern
 */
export function getKeys(pattern?: RegExp): string[] {
  const keys: string[] = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (!pattern || pattern.test(key))) {
      keys.push(key);
    }
  }

  return keys;
}

/**
 * Get multiple items at once
 */
export function getMultiple<T extends Record<string, unknown>>(
  keys: Record<keyof T, string>,
): T {
  const result = {} as T;

  for (const [key, storageKey] of Object.entries(keys)) {
    result[key as keyof T] = getItem(storageKey, null);
  }

  return result;
}

/**
 * Set multiple items at once
 */
export function setMultiple<T extends Record<string, unknown>>(
  items: T,
): Record<keyof T, boolean> {
  const results = {} as Record<keyof T, boolean>;

  for (const [key, value] of Object.entries(items)) {
    results[key as keyof T] = setItem(key, value);
  }

  return results;
}

/**
 * Check if key exists
 */
export function hasItem(key: string): boolean {
  try {
    return localStorage.getItem(key) !== null;
  } catch {
    return false;
  }
}

/**
 * Get remaining space estimate
 */
export function getRemainingSpace(): number {
  const usage = getStorageUsage();
  return usage.available - usage.used;
}

/**
 * Session storage wrapper with similar API
 */
export const sessionStorageWrapper = {
  getItem<T>(key: string, defaultValue: T): T {
    try {
      const item = sessionStorage.getItem(key);
      if (item === null) return defaultValue;
      return JSON.parse(item, (_, v) => (v === "undefined" ? undefined : v));
    } catch {
      return defaultValue;
    }
  },

  setItem<T>(key: string, value: T): boolean {
    try {
      sessionStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  },

  removeItem(key: string): boolean {
    try {
      sessionStorage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  },

  clear(): boolean {
    try {
      sessionStorage.clear();
      return true;
    } catch {
      return false;
    }
  },
};

/**
 * Clear expired cache items based on timestamp
 */
export function clearExpiredItems(): void {
  const now = Date.now();
  const EXPIRY_PREFIX = "__expiry__";

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);

    if (key?.startsWith(EXPIRY_PREFIX)) {
      try {
        const metadata = JSON.parse(localStorage.getItem(key) || "{}");

        if (metadata.expires && metadata.expires < now) {
          const dataKey = key.replace(EXPIRY_PREFIX, "");
          localStorage.removeItem(key);
          localStorage.removeItem(dataKey);
        }
      } catch {
        // If parsing fails, remove the item
        localStorage.removeItem(key);
      }
    }
  }
}

/**
 * Set item with expiry time
 * If the key has a namespace (e.g. orders-overview-dashboard-v3:), evicts older keys with
 * that same namespace to prevent unbounded cache accumulation in localStorage.
 */
export function setWithExpiry<T>(
  key: string,
  value: T,
  ttlMs: number,
): boolean {
  const colonIdx = key.indexOf(":");
  if (colonIdx > 0) {
    const prefix = key.slice(0, colonIdx + 1);
    const EXPIRY_PREFIX = "__expiry__";
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const existingKey = localStorage.key(i);
        if (existingKey && existingKey.startsWith(prefix) && existingKey !== key) {
          localStorage.removeItem(existingKey);
          localStorage.removeItem(`${EXPIRY_PREFIX}${existingKey}`);
        }
      }
    } catch {
      // non-blocking
    }
  }

  const expiry = Date.now() + ttlMs;

  const data = {
    value,
    expiry,
    created: Date.now(),
  };

  const metadataKey = `__expiry__${key}`;

  return setItem(key, data) && setItem(metadataKey, { expires: expiry });
}

/**
 * Get item if not expired
 */
export function getWithExpiry<T>(key: string): T | null {
  const data = getItem<{ value: T; expiry: number } | null>(key, null);

  if (!data) return null;

  if (Date.now() > data.expiry) {
    // Item has expired, clean up
    removeItem(key);
    removeItem(`__expiry__${key}`);
    return null;
  }

  return data.value;
}

/**
 * Generate storage key with namespace
 */
export function createStorageKey(namespace: string, id: string): string {
  return `${namespace}:${id}`;
}

/**
 * Create namespaced storage wrapper
 */
export function createNamespacedStorage<T extends Record<string, unknown>>(
  namespace: string,
) {
  return {
    get<K extends keyof T>(key: K, defaultValue: T[K]): T[K] {
      return getItem<T[K]>(
        createStorageKey(namespace, String(key)),
        defaultValue,
      );
    },

    set<K extends keyof T>(key: K, value: T[K]): boolean {
      return setItem(createStorageKey(namespace, String(key)), value);
    },

    remove(key: keyof T): boolean {
      return removeItem(createStorageKey(namespace, String(key)));
    },

    clear(): boolean {
      return clear(`${namespace}:`);
    },

    has(key: keyof T): boolean {
      return hasItem(createStorageKey(namespace, String(key)));
    },

    setWithExpiry<K extends keyof T>(
      key: K,
      value: T[K],
      ttlMs: number,
    ): boolean {
      return setWithExpiry(
        createStorageKey(namespace, String(key)),
        value,
        ttlMs,
      );
    },

    getWithExpiry<K extends keyof T>(key: K): T[K] | null {
      return getWithExpiry<T[K]>(createStorageKey(namespace, String(key)));
    },
  };
}

// Export commonly used namespaces (flexible types for any namespace)
export const wooCommerceStorage = createNamespacedStorage<{
  settings: unknown;
  importProgress: unknown;
  lastSync: string;
  products: unknown[];
  orders: unknown[];
  importOptions: Record<string, unknown>;
}>("woocommerce");

export const appSettingsStorage = createNamespacedStorage<{
  theme: string;
  language: string;
  sidebarCollapsed: boolean;
  preferences: Record<string, unknown>;
}>("app");
