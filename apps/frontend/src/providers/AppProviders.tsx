import React, { ReactNode, Suspense, useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";

import { queryClient } from "../config/queryClient";
import { AuthProvider } from "../hooks/useAuthSimple";
import { CompanyProvider } from "../contexts/CompanyContext";
import { TimerProvider } from "../contexts/TimerContext";
import { ThemeProvider } from "../hooks/useTheme";
import { usePlatformSiteMetaPixel } from "../hooks/usePlatformSiteMetaPixel";
import { VisualThemeProvider } from "../contexts/VisualThemeContext";
import { TemplateProvider } from "../templates/TemplateProvider";
import "../templates/template-2/template.css";

interface AppProvidersProps {
  children: ReactNode;
}

const LazyGlobalToast = React.lazy(() => import("../components/common/GlobalToast"));

const isStorefrontOnlyPath = (pathname: string): boolean =>
  pathname.startsWith("/test-public") ||
  pathname.startsWith("/test-minimal") ||
  pathname.startsWith("/company-links/");

const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
  const { pathname } = useLocation();
  const shouldLoadI18n = !isStorefrontOnlyPath(pathname);
  const shouldRenderGlobalToast = !isStorefrontOnlyPath(pathname);

  usePlatformSiteMetaPixel();

  useEffect(() => {
    if (shouldLoadI18n) {
      void import("../i18n");
    }
  }, [shouldLoadI18n]);

  const content = children;

  const toastNode = shouldRenderGlobalToast
    ? React.createElement(
      Suspense,
      { fallback: null },
      React.createElement(LazyGlobalToast, null),
    )
    : null;

  return React.createElement(
    QueryClientProvider,
    { client: queryClient },
    React.createElement(
      AuthProvider,
      null,
      React.createElement(
        CompanyProvider,
        null,
        React.createElement(
          TimerProvider,
          null,
          React.createElement(
            ThemeProvider,
            null,
            React.createElement(
              VisualThemeProvider,
              null,
              React.createElement(
                TemplateProvider,
                null,
                toastNode,
                content,
              ),
            ),
          ),
        ),
      ),
    ),
  );
};

export default AppProviders;
