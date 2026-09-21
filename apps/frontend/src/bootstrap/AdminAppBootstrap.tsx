import React from "react";
import { BrowserRouter } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "../utils/queryClient";
import { Toaster } from "sonner";

import "../styles/index.css";
import "../styles/app-dashboard.css";
import "../i18n";

import ErrorBoundary from "../components/ErrorBoundary";
import { ThemeProvider } from "../components/theme-provider";
import AppRoot from "../AppRoot";

const AppUpdateNotifier: React.FC = () => {
  React.useEffect(() => {
    let hasNotified = false;

    const notifyUpdate = () => {
      if (hasNotified) return;
      hasNotified = true;
      (window as unknown as { __MAXP_UPDATE_AVAILABLE__?: boolean }).__MAXP_UPDATE_AVAILABLE__ = true;
      window.dispatchEvent(new CustomEvent("maxp:update-available"));
    };

    if ((window as unknown as Record<string, unknown>).__SW_UPDATE_PENDING__) {
      notifyUpdate();
    }
    window.addEventListener("sw-update-ready", notifyUpdate);

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
          notifyUpdate();
        }
      } catch {
        // Ignore network errors during background check
      }
    };

    // Run periodic check every 30 minutes in background (non-intrusive)
    const interval = setInterval(checkServerVersion, 30 * 60 * 1000);

    return () => {
      window.removeEventListener("sw-update-ready", notifyUpdate);
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
        <AppUpdateNotifier />
        <Toaster position="top-right" richColors />
      </BrowserRouter>
    </ThemeProvider>
  </React.Suspense>
  </QueryClientProvider>
);

export default AdminAppBootstrap;
