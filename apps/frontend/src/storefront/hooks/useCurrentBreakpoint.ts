import { useState, useEffect } from "react";
import type { StorefrontBreakpoint } from "../studio/utils/studioStyleUtils";

/**
 * Resolves current storefront breakpoint based on standard MaxP breakpoints:
 * - Desktop: >= 1024px
 * - Tablet: 768px – 1023px
 * - Mobile: < 768px
 *
 * SSR-safe and reacts immediately to window resize and matchMedia changes.
 */
export function getStorefrontBreakpoint(): StorefrontBreakpoint {
  if (typeof window === "undefined") {
    return "desktop";
  }
  const width = window.innerWidth;
  if (width < 768) {
    return "mobile";
  }
  if (width < 1024) {
    return "tablet";
  }
  return "desktop";
}

export function useCurrentBreakpoint(): StorefrontBreakpoint {
  const [breakpoint, setBreakpoint] = useState<StorefrontBreakpoint>(getStorefrontBreakpoint);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleUpdate = () => {
      const next = getStorefrontBreakpoint();
      setBreakpoint((prev) => (prev === next ? prev : next));
    };

    // Initial check on mount
    handleUpdate();

    // Resize event
    window.addEventListener("resize", handleUpdate);

    // Media query listeners for instant threshold crossings
    let mqlMobile: MediaQueryList | undefined;
    let mqlTablet: MediaQueryList | undefined;

    try {
      mqlMobile = window.matchMedia("(max-width: 767px)");
      mqlTablet = window.matchMedia("(min-width: 768px) and (max-width: 1023px)");

      if (mqlMobile.addEventListener) {
        mqlMobile.addEventListener("change", handleUpdate);
        mqlTablet.addEventListener("change", handleUpdate);
      } else if ((mqlMobile as any).addListener) {
        (mqlMobile as any).addListener(handleUpdate);
        (mqlTablet as any).addListener(handleUpdate);
      }
    } catch {
      // ignore mediaQuery unsupported environments
    }

    return () => {
      window.removeEventListener("resize", handleUpdate);
      try {
        if (mqlMobile?.removeEventListener) {
          mqlMobile.removeEventListener("change", handleUpdate);
          mqlTablet?.removeEventListener("change", handleUpdate);
        } else if ((mqlMobile as any)?.removeListener) {
          (mqlMobile as any).removeListener(handleUpdate);
          (mqlTablet as any)?.removeListener(handleUpdate);
        }
      } catch {
        // ignore
      }
    };
  }, []);

  return breakpoint;
}

export default useCurrentBreakpoint;
