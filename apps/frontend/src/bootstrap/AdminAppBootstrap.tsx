import React from "react";
import { BrowserRouter } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "../utils/queryClient";

import AppRoot from "../AppRoot";
import { Toaster as SonnerToaster } from "../components/ui/sonner";
import { ThemeProvider } from "../components/theme-provider";

const LazyToaster = React.lazy(() =>
  import("react-hot-toast").then((module) => ({ default: module.Toaster })),
);
const LazyErrorBoundary = React.lazy(() => import("../components/ErrorBoundary"));

const toastOptions = {
  duration: 4000,
  position: "top-right" as const,
  style: {
    background: "#363636",
    color: "#fff",
    borderRadius: "8px",
    fontSize: "14px",
    maxWidth: "400px",
  },
  success: {
    duration: 3000,
    iconTheme: {
      primary: "#22c55e",
      secondary: "#fff",
    },
  },
  error: {
    duration: 5000,
    iconTheme: {
      primary: "#ef4444",
      secondary: "#fff",
    },
  },
  loading: {
    duration: Infinity,
  },
};

const RouteAwareToaster: React.FC = () => (
  <React.Suspense fallback={null}>
    <LazyToaster toastOptions={toastOptions} />
  </React.Suspense>
);

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
      <RouteAwareToaster />
      <SonnerToaster position="top-right" richColors />
    </BrowserRouter>
  </ThemeProvider>
  </QueryClientProvider>
);

export default AdminAppBootstrap;
