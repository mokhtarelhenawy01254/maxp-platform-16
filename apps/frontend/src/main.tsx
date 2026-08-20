import React from "react";
import { createRoot, type Root } from "react-dom/client";
import { shouldBootstrapStorefront } from "./bootstrap/requestTarget";
import {
  installChunkLoadRecovery,
  recoverFromChunkLoadError,
} from "./utils/chunkLoadRecovery";
import { clearAllSWCaches } from "./utils/swCacheFlush";

// Auto-purge legacy SW caches once for all existing clients
const SW_MIGRATION_VERSION = "maxp_sw_v3_20260729";
if (typeof window !== "undefined") {
  try {
    if (localStorage.getItem("maxp:sw_migrated") !== SW_MIGRATION_VERSION) {
      void clearAllSWCaches().then(() => {
        try {
          localStorage.setItem("maxp:sw_migrated", SW_MIGRATION_VERSION);
        } catch {
          // Ignore storage quota error
        }
      });
    }
  } catch {
    // Ignore private browsing error
  }
}

// Listen for new service worker and auto-refresh when detected
if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    window.location.reload();
  });
}

const OPTIONAL_GOOGLE_FONTS_ID = "optional-google-fonts";
const OPTIONAL_GOOGLE_FONTS_HREF =
  "https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700;800&family=Montserrat:wght@300;400;500;600&family=Cinzel:wght@400;700&display=swap";
const ADMIN_CRITICAL_GOOGLE_FONTS_ID = "admin-critical-google-fonts";
const ADMIN_CRITICAL_GOOGLE_FONTS_HREF =
  "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap";

let adminShellAssetsPromise: Promise<void> | null = null;

type RootWindow = Window & typeof globalThis & { __MAXP_APP_ROOT__?: Root; __SW_UPDATE_PENDING__?: boolean };

// Get root element
const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found");
}

const rootWindow = window as RootWindow;
installChunkLoadRecovery();

// Preserve a single React root across HMR re-evaluations to avoid remounting
// the entire app into the same container more than once in development.
const root = rootWindow.__MAXP_APP_ROOT__ ?? createRoot(rootElement);
rootWindow.__MAXP_APP_ROOT__ = root;

const loadAdminShellAssets = async (): Promise<void> => {
  if (!adminShellAssetsPromise) {
    adminShellAssetsPromise = Promise.all([
      import("./styles/index.css"),
      import("./styles/app-dashboard.css"),
      import("./i18n").catch((error) => {
        console.warn("[bootstrap] Failed to load i18n. Continuing without it.", error);
      }),
    ]).then(() => undefined);
  }

  await adminShellAssetsPromise;
};

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
const removeLoadingScreen = (): void => {
  const loadingElement = document.getElementById("initial-loading");
  if (loadingElement) {
    loadingElement.style.opacity = "0";
    loadingElement.style.transition = "opacity 0.3s ease-out";
    setTimeout(() => {
      loadingElement.remove();
      document.body.classList.add("app-ready");
    }, 300);
  }
};

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

  loadAdminCriticalGoogleFonts();
  await loadAdminShellAssets();
  const { default: AdminAppBootstrap } = await import(
    "./bootstrap/AdminAppBootstrap"
  );
  root.render(<AdminAppBootstrap />);
  scheduleOptionalGoogleFonts();

  // ponytail: push notifications are non-critical; load after interactive
  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(() => {
      import("./utils/pushNotifications")
        .then(({ registerPushServiceWorker }) => registerPushServiceWorker())
        .catch(() => {});
    }, { timeout: 5000 });
  }
};

void bootstrapApp()
  .then(() => {
    // Remove loading screen after a tiny delay to let the initial React render paint
    setTimeout(removeLoadingScreen, 50);
  })
  .catch((error) => {
    if (recoverFromChunkLoadError(error, "bootstrap")) {
      return;
    }

    renderBootstrapError(error);
  });

// Service Worker auto-update: notify user when a new version is ready (Production only)
if ("serviceWorker" in navigator && (import.meta.env.PROD || import.meta.env.MODE === "production")) {
  // Unregister any legacy "/sw.js" registration so the renamed worker doesn't
  // keep controlling the page alongside the new "/sw-v4.js" worker.
  navigator.serviceWorker.getRegistrations().then((regs) => {
    regs.forEach((r) => {
      if (r.active && /\/sw\.js$/.test(r.active.scriptURL) && !/\/sw-v4\.js$/.test(r.active.scriptURL)) {
        r.unregister();
      }
    });
  });
  navigator.serviceWorker.register("/sw-v4.js").then((reg) => {
    const notify = () => {
      window.__SW_UPDATE_PENDING__ = true;
      window.dispatchEvent(new CustomEvent("sw-update-ready"));
    };

    if (reg.waiting && navigator.serviceWorker.controller) {
      notify();
    }

    reg.addEventListener("updatefound", () => {
      const installing = reg.installing;
      if (!installing) return;
      installing.addEventListener("statechange", () => {
        if (installing.state === "installed" && navigator.serviceWorker.controller) {
          notify();
        }
      });
    });
  });

  // Auto-reload when new controller takes over
  let refreshing = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });
}

// Hot Module Replacement (HMR) for development
if (import.meta.hot) {
  import.meta.hot.accept();
}
