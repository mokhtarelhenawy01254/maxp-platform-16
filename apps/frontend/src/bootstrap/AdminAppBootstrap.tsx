import React from "react";
import { BrowserRouter } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "../utils/queryClient";

const AppRoot = React.lazy(() => import("../AppRoot"));
const ThemeProvider = React.lazy(() => import("../components/theme-provider").then(m => ({ default: m.ThemeProvider })));
const LazyToaster = React.lazy(() => import("sonner").then(m => ({ default: m.Toaster })));
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
        <LazyToaster position="top-right" richColors />
      </BrowserRouter>
    </ThemeProvider>
  </React.Suspense>
  </QueryClientProvider>
);

export default AdminAppBootstrap;
