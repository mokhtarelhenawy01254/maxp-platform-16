import { clearAllSWCaches } from "./swCacheFlush";

const RECOVERY_ATTEMPT_KEY = "maxp:chunk-load-recovery:last-attempt";
const RECOVERY_SOURCE_KEY = "maxp:chunk-load-recovery:last-source";
const RECOVERY_COUNT_KEY = "maxp:chunk-load-recovery:count";
const RECOVERY_GUARD_WINDOW_MS = 15_000;
// One automatic reload per failure episode. If the page fails again after a
// recovery reload (e.g. assets are mid-deploy), stop auto-reloading and let
// the error surface instead of looping forever. resetChunkLoadRecovery()
// re-arms the budget after every healthy boot.
const RECOVERY_MAX_AUTO_RELOADS = 1;

const CHUNK_LOAD_ERROR_PATTERNS = [
  "failed to fetch dynamically imported module",
  "error loading dynamically imported module",
  "importing a module script failed",
  "failed to load module script",
  "unable to preload css",
  "loading chunk",
  "chunkloaderror",
  "vite:preloaderror",
  "err_cache_read_failure",
  "node_modules/.vite/deps/chunk-",
  // 🛡️ Vite / React lazy failure when dynamic import resolves to undefined or chunk 404s
  "cannot read properties of undefined (reading 'default')",
  "cannot read property 'default' of undefined",
  "cannot read properties of null (reading 'default')",
  "undefined (reading 'default')",
  "failed to load lazy",
  "failed to load chunk",
];

type RecoverSource =
  | "bootstrap"
  | "error-boundary"
  | "unhandled-rejection"
  | "vite-preload";

type VitePreloadErrorEvent = Event & {
  payload?: unknown;
  reason?: unknown;
  error?: unknown;
  message?: string;
  detail?: unknown;
};

type ChunkRecoveryWindow = Window &
  typeof globalThis & {
    __MAXP_CHUNK_LOAD_RECOVERY_UNINSTALL__?: () => void;
  };

const stringifyError = (error: unknown): string => {
  if (error instanceof Error) {
    return [error.name, error.message, error.stack].filter(Boolean).join(" ");
  }

  if (typeof error === "string") {
    return error;
  }

  if (error && typeof error === "object") {
    const maybeMessage = "message" in error ? String(error.message) : "";
    const maybeName = "name" in error ? String(error.name) : "";

    return [maybeName, maybeMessage].filter(Boolean).join(" ");
  }

  return "";
};

export const isChunkLoadError = (error: unknown): boolean => {
  const normalizedMessage = stringifyError(error).toLowerCase();

  return CHUNK_LOAD_ERROR_PATTERNS.some((pattern) =>
    normalizedMessage.includes(pattern),
  );
};

const hasRecentRecoveryAttempt = (now: number): boolean => {
  try {
    const lastAttempt = window.sessionStorage.getItem(RECOVERY_ATTEMPT_KEY);
    const lastAttemptAt = lastAttempt ? Number(lastAttempt) : 0;

    return (
      Number.isFinite(lastAttemptAt) &&
      now - lastAttemptAt < RECOVERY_GUARD_WINDOW_MS
    );
  } catch {
    return false;
  }
};

const markRecoveryAttempt = (source: RecoverSource, now: number): void => {
  try {
    window.sessionStorage.setItem(RECOVERY_ATTEMPT_KEY, String(now));
    window.sessionStorage.setItem(RECOVERY_SOURCE_KEY, source);
  } catch {
    // Session storage can be unavailable in private or locked-down browsers.
  }
};

// In-page mirror so storage-disabled browsers still cap repeated storms
// within a single page lifetime.
let inMemoryRecoveryCount = 0;

const readRecoveryCount = (): number => {
  try {
    const count = window.sessionStorage.getItem(RECOVERY_COUNT_KEY);
    const parsed = count ? Number(count) : 0;
    if (Number.isFinite(parsed) && parsed > 0) {
      return Math.max(parsed, inMemoryRecoveryCount);
    }
  } catch {
    // Session storage can be unavailable in private or locked-down browsers.
  }
  return inMemoryRecoveryCount;
};

const incrementRecoveryCount = (): void => {
  inMemoryRecoveryCount += 1;
  try {
    window.sessionStorage.setItem(RECOVERY_COUNT_KEY, String(inMemoryRecoveryCount));
  } catch {
    // Session storage can be unavailable in private or locked-down browsers.
  }
};

export const resetChunkLoadRecovery = (): void => {
  inMemoryRecoveryCount = 0;
  try {
    window.sessionStorage.removeItem(RECOVERY_COUNT_KEY);
    window.sessionStorage.removeItem(RECOVERY_ATTEMPT_KEY);
  } catch {
    // Ignore storage failures; the count simply stays stale.
  }
};

/**
 * Shared purge and reload routine.
 * Flushes CacheStorage and triggers reload.
 */
export const performPurgeAndReload = async (): Promise<void> => {
  try {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem("maxp:sw_migrated");
      } catch {}

      if ("serviceWorker" in navigator && navigator.serviceWorker) {
        try {
          const registrations = await navigator.serviceWorker.getRegistrations();
          await Promise.all(
            registrations.map((reg) => reg.unregister().catch(() => false)),
          );
        } catch {}
      }

      await clearAllSWCaches().catch(() => false);

      const url = new URL(window.location.href);
      url.searchParams.set("_v", String(Date.now()));

      if (typeof window.location.replace === "function" && window.location.replace !== window.location.reload) {
        try {
          window.location.replace(url.toString());
          return;
        } catch {}
      }

      if (typeof window.location.reload === "function") {
        window.location.reload();
        return;
      }
    }
  } catch {
    // Fallback if URL parsing or window APIs throw
  }

  if (typeof window !== "undefined" && typeof window.location.reload === "function") {
    window.location.reload();
  }
};

/**
 * Emergency purge routine for manual user-initiated retries:
 * Resets the budget, clears session storage, and performs a full hard purge.
 */
export const emergencyPurgeAndHardReload = async (): Promise<void> => {
  resetChunkLoadRecovery();
  try {
    if (typeof window !== "undefined") {
      window.sessionStorage.clear();
    }
  } catch {}
  await performPurgeAndReload();
};

export const recoverFromChunkLoadError = (
  error: unknown,
  source: RecoverSource,
): boolean => {
  if (typeof window === "undefined" || !isChunkLoadError(error)) {
    return false;
  }

  const now = Date.now();

  if (hasRecentRecoveryAttempt(now)) {
    return false;
  }

  if (readRecoveryCount() >= RECOVERY_MAX_AUTO_RELOADS) {
    return false;
  }

  markRecoveryAttempt(source, now);
  incrementRecoveryCount();

  // Async flush and cache-bust redirect
  void performPurgeAndReload();

  return true;
};

const resolvePreloadError = (event: VitePreloadErrorEvent): unknown =>
  event.payload ?? event.reason ?? event.error ?? event.detail ?? event.message;

export const installChunkLoadRecovery = (): (() => void) => {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const recoveryWindow = window as ChunkRecoveryWindow;

  if (recoveryWindow.__MAXP_CHUNK_LOAD_RECOVERY_UNINSTALL__) {
    return recoveryWindow.__MAXP_CHUNK_LOAD_RECOVERY_UNINSTALL__;
  }

  const handleVitePreloadError = (event: Event): void => {
    const error = resolvePreloadError(event as VitePreloadErrorEvent);
    const normalized = stringifyError(error).toLowerCase();

    // 🛡️ CSS preloading failure should never crash the JavaScript application.
    if (normalized.includes("unable to preload css")) {
      console.warn("[vite:preloadError] Suppressed non-fatal CSS preload failure:", error);
      event.preventDefault();
      return;
    }

    if (recoverFromChunkLoadError(error ?? event, "vite-preload")) {
      event.preventDefault();
    }
  };

  const handleUnhandledRejection = (event: PromiseRejectionEvent): void => {
    const normalized = stringifyError(event.reason).toLowerCase();

    // 🛡️ CSS preload rejections should never crash the frontend.
    if (normalized.includes("unable to preload css")) {
      console.warn("[unhandledrejection] Suppressed non-fatal CSS preload rejection:", event.reason);
      event.preventDefault();
      return;
    }

    // 🛡️ Benign View Transition abort errors (e.g. rapid navigation / cancelled transitions)
    if (
      (event.reason as any)?.name === "AbortError" ||
      normalized.includes("transition was skipped")
    ) {
      event.preventDefault();
      return;
    }

    if (recoverFromChunkLoadError(event.reason, "unhandled-rejection")) {
      event.preventDefault();
    }
  };

  window.addEventListener("vite:preloadError", handleVitePreloadError);
  window.addEventListener("unhandledrejection", handleUnhandledRejection);

  const uninstall = (): void => {
    window.removeEventListener("vite:preloadError", handleVitePreloadError);
    window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    delete recoveryWindow.__MAXP_CHUNK_LOAD_RECOVERY_UNINSTALL__;
  };

  recoveryWindow.__MAXP_CHUNK_LOAD_RECOVERY_UNINSTALL__ = uninstall;

  return uninstall;
};
