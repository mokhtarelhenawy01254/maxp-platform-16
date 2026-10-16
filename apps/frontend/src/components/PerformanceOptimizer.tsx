/**
 * Performance Optimization Component
 * مكون لتحسين الأداء وتسريع تحميل الصفحات
 */

import React, { useEffect } from "react";
import { buildApiUrl } from "../utils/urlHelper";

interface PerformanceOptimizerProps {
  children: React.ReactNode;
}

export const PerformanceOptimizer: React.FC<PerformanceOptimizerProps> = ({
  children,
}) => {
  useEffect(() => {
    const pathname =
      typeof window !== "undefined" ? window.location.pathname : "";
    const shouldSkipHealthWarmup =
      !pathname ||
      pathname.startsWith("/auth/") ||
      pathname.startsWith("/register/") ||
      pathname.startsWith("/affiliate-register") ||
      pathname.startsWith("/apply/");

    if (shouldSkipHealthWarmup) {
      return;
    }

    // Non-blocking background health check (fire-and-forget)
    const timer = setTimeout(async () => {
      try {
        await fetch(buildApiUrl("health"), {
          method: "GET",
          signal: AbortSignal.timeout(3000),
        });
      } catch {
        // Silent fail - don't block UI
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  // No wrapper div/Box, just render children directly
  return <>{children}</>;
};

export default PerformanceOptimizer;
