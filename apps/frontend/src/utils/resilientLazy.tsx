import React from "react";
import {
  performPurgeAndReload,
  emergencyPurgeAndHardReload,
  isChunkLoadError,
} from "./chunkLoadRecovery";
import errorTracking from "../services/errorTracking";

const CHUNK_RELOAD_PREFIX = "maxp:resilient-lazy:reloaded:";
const RETRY_DELAY_MS = 350;
const inMemoryReloadedChunks = new Set<string>();

/**
 * Extract human-readable chunk or component name from import function or string
 */
export const extractChunkName = (importer: unknown): string => {
  if (typeof importer === "string" && importer.trim()) {
    return importer.trim();
  }

  if (typeof importer === "function") {
    const fnStr = importer.toString();
    // Match dynamic import("./path/to/ChunkName") or require("./path/to/ChunkName")
    const match = fnStr.match(/(?:import|require)\s*\(\s*['"]([^'"]+)['"]\s*\)/);
    if (match && match[1]) {
      const parts = match[1].split("/");
      const lastPart = parts[parts.length - 1] || match[1];
      return lastPart.replace(/\.[jt]sx?$/, "");
    }

    const ignoredNames = new Set(["importer", "factory", "anonymous", ""]);
    if (importer.name && !ignoredNames.has(importer.name)) {
      return importer.name;
    }
  }

  return "unknown-chunk";
};

const hasAttemptedReload = (chunkName: string): boolean => {
  if (inMemoryReloadedChunks.has(chunkName)) {
    return true;
  }
  try {
    if (typeof window === "undefined" || !window.sessionStorage) return false;
    return window.sessionStorage.getItem(CHUNK_RELOAD_PREFIX + chunkName) === "1";
  } catch {
    return false;
  }
};

const markAttemptedReload = (chunkName: string): void => {
  inMemoryReloadedChunks.add(chunkName);
  try {
    if (typeof window !== "undefined" && window.sessionStorage) {
      window.sessionStorage.setItem(CHUNK_RELOAD_PREFIX + chunkName, "1");
    }
  } catch {}
};

export const clearChunkReloadFlag = (chunkName: string): void => {
  inMemoryReloadedChunks.delete(chunkName);
  try {
    if (typeof window !== "undefined" && window.sessionStorage) {
      window.sessionStorage.removeItem(CHUNK_RELOAD_PREFIX + chunkName);
    }
  } catch {}
};

/**
 * Validates that the loaded module object contains a valid default export component
 */
const isValidModule = <T,>(mod: unknown): mod is { default: T } => {
  return Boolean(
    mod &&
      typeof mod === "object" &&
      "default" in (mod as Record<string, unknown>) &&
      Boolean((mod as Record<string, unknown>).default)
  );
};

/**
 * Fallback UI component displayed ONLY if automatic page reload was already attempted
 * and the chunk still failed to load (e.g. offline or server outage).
 */
export const ResilientUpdateFallback: React.FC<{
  chunkName?: string;
  error?: Error | null;
}> = ({ chunkName, error }) => {
  const handleReload = () => {
    void emergencyPurgeAndHardReload();
  };

  const handleHome = () => {
    window.location.href = "/";
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm text-center">
        <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center">
          <svg
            className="w-6 h-6 animate-spin-reverse"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </div>

        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
          تم تحديث النظام
        </h3>

        <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
          تم نشر تحديث جديد للمنصة أو حدث انقطاع مؤقت في الاتصال بالشبكة. يرجى إعادة تحميل الصفحة لتطبيق أحدث نسخة فوراً.
        </p>

        {chunkName && chunkName !== "unknown-chunk" && (
          <div className="mb-6 px-3 py-1.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg text-xs font-mono text-slate-500 dark:text-slate-400 inline-block">
            {chunkName}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2.5 justify-center">
          <button
            type="button"
            onClick={handleReload}
            className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white text-sm font-semibold shadow-sm transition-all cursor-pointer"
          >
            تحديث الصفحة الآن
          </button>

          <button
            type="button"
            onClick={handleHome}
            className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-semibold transition-all cursor-pointer"
          >
            الرئيسية
          </button>
        </div>

        {Boolean(
          typeof process !== "undefined" && process.env?.NODE_ENV !== "production"
        ) && error && (
          <pre className="mt-4 text-[11px] text-left overflow-auto max-h-32 p-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded">
            {error.message}
          </pre>
        )}
      </div>
    </div>
  );
};

/**
 * Placeholder shown during the automatic reload transition
 */
const ReloadingPlaceholder: React.FC<{ chunkName?: string }> = ({ chunkName }) => (
  <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center">
    <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
      جاري تحديث الصفحة لتطبيق أحدث نسخة...
    </p>
    {chunkName && chunkName !== "unknown-chunk" && (
      <span className="mt-1 text-xs text-slate-400 font-mono">{chunkName}</span>
    )}
  </div>
);

/**
 * Resilient import runner with retry and single-shot reload recovery
 */
export async function resilientImport<T extends React.ComponentType<any>>(
  importer: () => Promise<{ default: T } | any>,
  chunkName?: string
): Promise<{ default: T }> {
  const name = chunkName || extractChunkName(importer);

  // Attempt 1
  try {
    const mod = await importer();
    if (isValidModule<T>(mod)) {
      clearChunkReloadFlag(name);
      return mod;
    }
    console.warn(`[resilientLazy] First attempt returned invalid module for '${name}':`, mod);
  } catch (err) {
    console.warn(`[resilientLazy] First attempt threw for '${name}':`, err);
  }

  // Backoff before retry
  await new Promise((res) => setTimeout(res, RETRY_DELAY_MS));

  // Attempt 2 (Retry)
  try {
    const mod = await importer();
    if (isValidModule<T>(mod)) {
      clearChunkReloadFlag(name);
      return mod;
    }
    throw new Error(`Module '${name}' resolved without default export on retry.`);
  } catch (retryError) {
    const err = retryError instanceof Error ? retryError : new Error(String(retryError));
    (err as any).chunkName = name;

    const alreadyReloaded = hasAttemptedReload(name);

    if (!alreadyReloaded) {
      console.warn(`[resilientLazy] Chunk '${name}' failed on retry. Initiating single-shot recovery reload...`);
      markAttemptedReload(name);

      // Report to telemetry so backend error logs capture the exact chunk and failure
      try {
        errorTracking.logError(`ResilientLazy chunk reload triggered: ${name}`, err, {
          chunkName: name,
          isChunkLoadError: isChunkLoadError(err),
          url: typeof window !== "undefined" ? window.location.href : "",
          pathname: typeof window !== "undefined" ? window.location.pathname : "",
        });
      } catch {}

      // Trigger automatic CacheStorage purge and page reload
      void performPurgeAndReload();

      // Return smooth reloading placeholder so React does not crash during page reload
      return {
        default: (() => <ReloadingPlaceholder chunkName={name} />) as unknown as T,
      };
    }

    // Already attempted reload once: report to backend and present graceful fallback UI
    console.error(`[resilientLazy] Chunk '${name}' failed after reload. Presenting graceful fallback.`, err);
    try {
      errorTracking.logError(`ResilientLazy chunk persistent failure: ${name}`, err, {
        chunkName: name,
        persistent: true,
        url: typeof window !== "undefined" ? window.location.href : "",
        pathname: typeof window !== "undefined" ? window.location.pathname : "",
      });
    } catch {}

    return {
      default: (() => <ResilientUpdateFallback chunkName={name} error={err} />) as unknown as T,
    };
  }
}

/**
 * Drop-in replacement for React.lazy that guarantees fault tolerance
 */
export function resilientLazy<T extends React.ComponentType<any>>(
  importer: () => Promise<{ default: T } | any>,
  chunkName?: string
): React.LazyExoticComponent<T> {
  const name = chunkName || extractChunkName(importer);
  return React.lazy(() => resilientImport<T>(importer, name));
}

/**
 * Globally patches React.lazy so every lazy-loaded route across the entire platform
 * automatically benefits from retry, auto-reload, and graceful fallback.
 */
export function installResilientLazy(): void {
  if (typeof React === "undefined") {
    return;
  }

  const reactAny = React as any;
  if (reactAny.__RESILIENT_LAZY_INSTALLED__) {
    return;
  }

  const originalLazy = React.lazy.bind(React);

  reactAny.lazy = function patchedReactLazy<T extends React.ComponentType<any>>(
    factory: () => Promise<{ default: T } | any>
  ): React.LazyExoticComponent<T> {
    const chunkName = extractChunkName(factory);
    return originalLazy(() => resilientImport<T>(factory, chunkName));
  };

  reactAny.__RESILIENT_LAZY_INSTALLED__ = true;
  console.log("[resilientLazy] Global React.lazy resilience installed.");
}
