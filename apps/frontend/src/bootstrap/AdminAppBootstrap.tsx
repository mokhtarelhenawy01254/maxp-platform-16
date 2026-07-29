import React from "react";
import { BrowserRouter } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "../utils/queryClient";
import { toast } from "sonner";
import { flushSWCacheAndReload } from "../utils/swCacheFlush";

import ErrorBoundary from "../components/ErrorBoundary";
import { ThemeProvider } from "../components/theme-provider";

const SwUpdateToast: React.FC = () => {
  React.useEffect(() => {
    const show = () => {
      toast("تحديث جديد متاح", {
        description: "اضغط للتحديث وتحديث الكاش فوراً",
        duration: Infinity,
        action: {
          label: "تحديث",
          onClick: () => {
            void flushSWCacheAndReload();
          },
        },
      });
    };

    if ((window as unknown as Record<string, unknown>).__SW_UPDATE_PENDING__) show();
    window.addEventListener("sw-update-ready", show);
    return () => window.removeEventListener("sw-update-ready", show);
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
        <LazyToaster position="top-right" richColors />
      </BrowserRouter>
    </ThemeProvider>
  </React.Suspense>
  </QueryClientProvider>
);

export default AdminAppBootstrap;
