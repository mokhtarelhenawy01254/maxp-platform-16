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
  } catch {
    // Ignore storage failures; the count simply stays stale.
  }
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

  // Purge SW caches to prevent reloading stale or corrupt SW entries
  void clearAllSWCaches();

  // Purge SW caches to prevent reloading stale or corrupt SW entries
  void clearAllSWCaches();

  window.setTimeout(() => {
    window.location.reload();
  }, 0);

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

    if (recoverFromChunkLoadError(error ?? event, "vite-preload")) {
      event.preventDefault();
    }
  };

  const handleUnhandledRejection = (event: PromiseRejectionEvent): void => {
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
