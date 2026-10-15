import React from "react";
import { createRoot, type Root } from "react-dom/client";
import "./components/merchant-copilot/copilotLinkUtils";
import { shouldBootstrapStorefront } from "./bootstrap/requestTarget";

import {
  emergencyPurgeAndHardReload,
  installChunkLoadRecovery,
  recoverFromChunkLoadError,
  resetChunkLoadRecovery,
} from "./utils/chunkLoadRecovery";
import { installResilientLazy } from "./utils/resilientLazy";
import { clearAllSWCaches } from "./utils/swCacheFlush";

// Proactively unregister any active or legacy Service Workers, wipe CacheStorage, and purge manifest
if (typeof window !== "undefined") {
  try {
    void clearAllSWCaches();
    const existingManifest = document.querySelector('link[rel="manifest"]');
    if (existingManifest) {
      existingManifest.remove();
    }
  } catch {
    // Ignore environments with restricted storage or workers
  }
}

// No controllerchange auto-reload: an unconditional reload here turned SW
// updates/migrations into an infinite refresh loop (reload races the
// "maxp:sw_migrated" flag, so every boot re-triggers SKIP_WAITING -> claim).
// New service workers now activate silently; the next navigation picks them up.
const OPTIONAL_GOOGLE_FONTS_ID = "optional-google-fonts";
const OPTIONAL_GOOGLE_FONTS_HREF =
  "https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700;800&family=Montserrat:wght@300;400;500;600&family=Cinzel:wght@400;700&display=swap";
const ADMIN_CRITICAL_GOOGLE_FONTS_ID = "admin-critical-google-fonts";
const ADMIN_CRITICAL_GOOGLE_FONTS_HREF =
  "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&family=Playfair+Display:wght@400;500;600;700;800;900&display=swap";

type RootWindow = Window & typeof globalThis & { __MAXP_APP_ROOT__?: Root; __SW_UPDATE_PENDING__?: boolean };

// Get root element
const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found");
}

const rootWindow = window as RootWindow;
installChunkLoadRecovery();
installResilientLazy();

// Preserve a single React root across HMR re-evaluations to avoid remounting
// the entire app into the same container more than once in development.
const root = rootWindow.__MAXP_APP_ROOT__ ?? createRoot(rootElement);
rootWindow.__MAXP_APP_ROOT__ = root;


const ensureGoogleFontsPreconnect = (): void => {
  if (!document.querySelector('link[rel="preconnect"][href="https://fonts.googleapis.com"]')) {
    const googleApisPreconnect = document.createElement("link");
    googleApisPreconnect.rel = "preconnect";
    googleApisPreconnect.href = "https://fonts.googleapis.com";
    document.head.appendChild(googleApisPreconnect);
  }

  if (!document.querySelector('link[rel="preconnect"][href="https://fonts.gstatic.com"]')) {
    const googleStaticPreconnect = document.createElement("link");
    googleStaticPreconnect.rel = "preconnect";
    googleStaticPreconnect.href = "https://fonts.gstatic.com";
    googleStaticPreconnect.crossOrigin = "anonymous";
    document.head.appendChild(googleStaticPreconnect);
  }
};

const loadAdminCriticalGoogleFonts = (): void => {
  if (document.getElementById(ADMIN_CRITICAL_GOOGLE_FONTS_ID)) {
    return;
  }

  ensureGoogleFontsPreconnect();

  const fontLink = document.createElement("link");
  fontLink.id = ADMIN_CRITICAL_GOOGLE_FONTS_ID;
  fontLink.rel = "preload";
  fontLink.as = "style";
  fontLink.media = "print";
  fontLink.onload = () => {
    fontLink.rel = "stylesheet";
    fontLink.media = "all";
  };
  fontLink.href = ADMIN_CRITICAL_GOOGLE_FONTS_HREF;
  document.head.appendChild(fontLink);
};

const loadOptionalGoogleFonts = (): void => {
  if (document.getElementById(OPTIONAL_GOOGLE_FONTS_ID)) {
    return;
  }

  ensureGoogleFontsPreconnect();

  const fontLink = document.createElement("link");
  fontLink.id = OPTIONAL_GOOGLE_FONTS_ID;
  fontLink.rel = "stylesheet";
  fontLink.href = OPTIONAL_GOOGLE_FONTS_HREF;
  document.head.appendChild(fontLink);
};

const scheduleOptionalGoogleFonts = (): void => {
  const idleWindow = window as Window & {
    requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
    cancelIdleCallback?: (id: number) => void;
  };

  if (typeof idleWindow.requestIdleCallback === "function") {
    idleWindow.requestIdleCallback(loadOptionalGoogleFonts, { timeout: 1500 });
    return;
  }

  window.setTimeout(loadOptionalGoogleFonts, 1200);
};

const isStorefrontRequest = (): boolean => {
  return shouldBootstrapStorefront(
    window.location.hostname,
    window.location.pathname || "",
  );
};

// Remove initial loading screen
const removeLoadingScreen = (instant = false): void => {
  const loadingElement = document.getElementById("initial-loading");
  if (loadingElement) {
    if (instant) {
      loadingElement.remove();
      document.body.classList.add("app-ready");
      return;
    }
    loadingElement.style.opacity = "0";
    loadingElement.style.transition = "opacity 0.2s ease-out";
    setTimeout(() => {
      loadingElement.remove();
      document.body.classList.add("app-ready");
    }, 200);
  }
};

// Expose loader dismissal to the React app so it can trigger smooth handoff on real mount
(window as unknown as Record<string, unknown>).__MAXP_REMOVE_INITIAL_LOADER__ = removeLoadingScreen;

const renderBootstrapError = (error: unknown): void => {
  console.error("[bootstrap] Failed to start frontend application.", error);
  removeLoadingScreen();

  const details =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "Unexpected bootstrap error";

  root.render(
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-lg w-full rounded-2xl border border-red-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900">تعذر تشغيل التطبيق</h1>
        <p className="mt-3 text-sm leading-6 text-gray-600">
          حدث خطأ أثناء تحميل الواجهة. راجع Console وملفات البناء قبل إعادة
          النشر.
        </p>
        <button
          type="button"
          onClick={() => {
            void emergencyPurgeAndHardReload();
          }}
          className="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors cursor-pointer"
        >
          إعادة المحاولة
        </button>
        {import.meta.env.DEV && (
          <pre className="mt-4 overflow-auto rounded-xl bg-red-50 p-3 text-xs text-red-700">
            {details}
          </pre>
        )}
      </div>
    </div>,
  );
};

// Render the application
const bootstrapApp = async (): Promise<void> => {
  if (isStorefrontRequest()) {
    void import("./storefront/StorefrontShell");
    const [{ default: StorefrontBootstrap, prefetchStorefrontBootstrapData }] =
      await Promise.all([
        import("./storefront/StorefrontBootstrap"),
        // Use lightweight storefront CSS instead of full admin index.css
        import("./styles/storefront.css"),
      ]);

    void prefetchStorefrontBootstrapData();
    root.render(<StorefrontBootstrap />);
    return;
  }

  // Google fonts are preloaded in index.html; avoid redundant blocking injections here
  const { default: AdminAppBootstrap } = await import(
    "./bootstrap/AdminAppBootstrap"
  );
  root.render(<AdminAppBootstrap />);
  scheduleOptionalGoogleFonts();

};

void bootstrapApp()
  .then(() => {
    // Healthy boot: re-arm one-shot chunk recovery for future deploy cycles.
    resetChunkLoadRecovery();

    // Clean up cache-busting timestamp parameter if present
    if (typeof window !== "undefined" && window.location.search) {
      try {
        const cleanUrl = new URL(window.location.href);
        if (cleanUrl.searchParams.has("_v") || cleanUrl.searchParams.has("__maxp_cache_recovery")) {
          cleanUrl.searchParams.delete("_v");
          cleanUrl.searchParams.delete("__maxp_cache_recovery");
          window.history.replaceState(
            {},
            document.title,
            cleanUrl.pathname + (cleanUrl.search ? cleanUrl.search : "") + cleanUrl.hash,
          );
        }
      } catch {}
    }

    if (isStorefrontRequest()) {
      removeLoadingScreen(true);
    } else {
      // Safety fallback: if App hasn't dismissed the loader within 4 seconds, remove it anyway
      setTimeout(() => removeLoadingScreen(false), 4000);
    }
  })
  .catch((error) => {
    const errorMsg = String(error instanceof Error ? error.message : error || "").toLowerCase();
    if (errorMsg.includes("unable to preload css")) {
      console.warn("[bootstrap] Suppressed non-fatal CSS preload error during bootstrap:", error);
      removeLoadingScreen();
      return;
    }

    if (recoverFromChunkLoadError(error, "bootstrap")) {
      return;
    }

    renderBootstrapError(error);
  });

// Unregister all Service Workers permanently across the entire application
if (typeof window !== "undefined" && "serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    regs.forEach((r) => r.unregister().catch(() => false));
  }).catch(() => {});
}

// Hot Module Replacement (HMR) for development
if (import.meta.hot) {
  import.meta.hot.accept();
}
