const RECOVERY_ATTEMPT_KEY = "maxp:chunk-load-recovery:last-attempt";
const RECOVERY_SOURCE_KEY = "maxp:chunk-load-recovery:last-source";
const RECOVERY_GUARD_WINDOW_MS = 15_000;

const CHUNK_LOAD_ERROR_PATTERNS = [
  "failed to fetch dynamically imported module",
  "error loading dynamically imported module",
  "importing a module script failed",
  "failed to load module script",
  "unable to preload css",
  "loading chunk",
  "chunkloaderror",
  "vite:preloaderror",
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

  markRecoveryAttempt(source, now);

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
