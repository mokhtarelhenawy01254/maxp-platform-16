import React from "react";
import { BrowserRouter } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "../utils/queryClient";

import AppRoot from "../AppRoot";
import { Toaster } from "sonner";
import { ThemeProvider } from "../components/theme-provider";

const LazyErrorBoundary = React.lazy(() => import("../components/ErrorBoundary"));

const RouteAwareErrorBoundary: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <React.Suspense fallback={<>{children}</>}>
    <LazyErrorBoundary>{children}</LazyErrorBoundary>
  </React.Suspense>
);

const AdminAppBootstrap: React.FC = () => (
  <QueryClientProvider client={queryClient}>
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
      <Toaster position="top-right" richColors />
    </BrowserRouter>
  </ThemeProvider>
  </QueryClientProvider>
);

export default AdminAppBootstrap;
