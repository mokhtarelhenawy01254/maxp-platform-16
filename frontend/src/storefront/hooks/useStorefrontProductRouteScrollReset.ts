import { useLayoutEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";
import { getStorefrontProductRouteKey } from "../utils/paths";

const scrollWindowToTop = () => {
  if (typeof window.scrollTo !== "function") {
    return;
  }

  try {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  } catch {
    window.scrollTo(0, 0);
  }
};

export const useStorefrontProductRouteScrollReset = (): void => {
  const location = useLocation();
  const navigationType = useNavigationType();
  const previousPathnameRef = useRef(location.pathname);

  useLayoutEffect(() => {
    const previousPathname = previousPathnameRef.current;
    const currentPathname = location.pathname;
    previousPathnameRef.current = currentPathname;

    if (previousPathname === currentPathname) {
      return;
    }

    if (navigationType === "POP" || location.hash) {
      return;
    }

    if (!getStorefrontProductRouteKey(currentPathname)) {
      return;
    }

    scrollWindowToTop();
  }, [location.hash, location.pathname, navigationType]);
};
