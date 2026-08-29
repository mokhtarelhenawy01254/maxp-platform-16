import { useMemo } from "react";
import { buildStoreUrl } from "../../../utils/storeUrl";
import { useRoutePrefetch } from "../../../hooks/useRoutePrefetch";
import { isSidebarPathActive } from "./matchSidebarPath";

interface UseSidebarNavLinkParams {
  to: string;
  external?: boolean;
  currentPath: string;
  user: any;
}

export function useSidebarNavLink({
  to,
  external,
  currentPath,
  user,
}: UseSidebarNavLinkParams) {
  const prefetch = useRoutePrefetch();
  const isActive = !external && isSidebarPathActive(currentPath, to);

  const href = useMemo(() => {
    if (!external) {
      return to;
    }
    const slug = user?.company?.slug;
    const companyId = user?.companyId || user?.company?.id;
    const customDomain = user?.company?.customDomain;
    if (slug && slug.trim().length > 0) {
      return buildStoreUrl(
        slug,
        to,
        customDomain || undefined,
        companyId || undefined,
      );
    }
    return to;
  }, [external, to, user]);

  return { isActive, href, prefetch };
}