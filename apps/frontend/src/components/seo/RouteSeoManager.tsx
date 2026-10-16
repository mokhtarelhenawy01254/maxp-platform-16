import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { applyPublicRouteSeo } from "../../seo/publicRouteSeo";

/**
 * Keeps <title> / description / canonical in sync with the current public route.
 *
 * The apex domain is served as one static index.html by nginx, so the
 * server-side SEO map never reaches maxp.online — see src/seo/publicRouteSeo.ts.
 * Renders nothing.
 */
const RouteSeoManager = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    applyPublicRouteSeo(pathname);
  }, [pathname]);

  return null;
};

export default RouteSeoManager;
