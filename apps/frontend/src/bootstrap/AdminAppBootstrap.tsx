import React from "react";
import { BrowserRouter } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "../utils/queryClient";
import { toast, Toaster } from "sonner";
import { flushSWCacheAndReload } from "../utils/swCacheFlush";

import "../styles/index.css";
import "../styles/app-dashboard.css";
import "../i18n";

import ErrorBoundary from "../components/ErrorBoundary";
import { ThemeProvider } from "../components/theme-provider";
import AppRoot from "../AppRoot";

const SwUpdateToast: React.FC = () => {
  React.useEffect(() => {
    let hasPrompted = false;

    const show = () => {
      if (hasPrompted) return;
      hasPrompted = true;
      toast("تحديث جديد متاح للمنصة", {
        description: "اضغط لتحديث الواجهة إلى آخر إصدار فوراً",
        duration: Infinity,
        action: {
          label: "تحديث الآن",
          onClick: () => {
            void flushSWCacheAndReload();
          },
        },
      });
    };

    if ((window as unknown as Record<string, unknown>).__SW_UPDATE_PENDING__) show();
    window.addEventListener("sw-update-ready", show);

    const checkServerVersion = async () => {
      try {
        if (typeof window === "undefined" || !window.location?.origin) return;
        const res = await fetch(`/index.html?__v=${Date.now()}`, {
          cache: "no-store",
          headers: { "Cache-Control": "no-cache, no-store" },
        });
        if (!res.ok) return;
        const text = await res.text();
        const currentEntry = document.querySelector('script[src*="/assets/index-"]')?.getAttribute("src");
        const serverMatch = text.match(/src="(\/assets\/index-[^"]+)"/);
        if (currentEntry && serverMatch && serverMatch[1] && currentEntry !== serverMatch[1]) {
          show();
        }
      } catch {
        // Ignore network errors during background check
      }
    };

    // Check when user brings app/tab to foreground
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        void checkServerVersion();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    const interval = setInterval(checkServerVersion, 3 * 60 * 1000);

    return () => {
      window.removeEventListener("sw-update-ready", show);
      document.removeEventListener("visibilitychange", handleVisibility);
      clearInterval(interval);
    };
  }, []);

  return null;
};

const RouteAwareErrorBoundary: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <ErrorBoundary>{children}</ErrorBoundary>
);

const AdminAppBootstrap: React.FC = () => (
  <QueryClientProvider client={queryClient}>
  <React.Suspense fallback={null}>
    <ThemeProvider defaultTheme="light" storageKey="max-store-theme">
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <RouteAwareErrorBoundary>
          <AppRoot />
        </RouteAwareErrorBoundary>
        <SwUpdateToast />
        <Toaster position="top-right" richColors />
      </BrowserRouter>
    </ThemeProvider>
  </React.Suspense>
  </QueryClientProvider>
);

export default AdminAppBootstrap;
