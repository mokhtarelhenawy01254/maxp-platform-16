import { useCallback } from "react";
import { queryClient } from "../config/queryClient";
import { apiClient } from "../services/apiClient";
import { useAuth } from "./useAuthSimple";

const prefetched = new Set<string>();

export function useRoutePrefetch(): (path: string) => void {
  const { user } = useAuth();
  const companyId = user?.companyId || user?.company?.id || "unknown";

  return useCallback((_path: string) => {
    if (typeof window !== "undefined") {
      const normalizedPath = _path.replace(/\/+$/, "") || "/";
      const prefetch =
        (window as unknown as Record<string, Record<string, () => Promise<unknown>>>).__MAXP_ROUTE_PREFETCH__?.[_path] ||
        (window as unknown as Record<string, Record<string, () => Promise<unknown>>>).__MAXP_ROUTE_PREFETCH__?.[normalizedPath];

      if (prefetch && !prefetched.has(normalizedPath)) {
        prefetched.add(normalizedPath);
        prefetch().catch(() => {});
      }

      // Prefetch dashboard data on hover for instant rendering
      if (normalizedPath === "/company-dashboard" || normalizedPath === "/dashboard") {
        const cacheKey = `query:/company-dashboard:${companyId}`;
        if (!prefetched.has(cacheKey)) {
          prefetched.add(cacheKey);
          void queryClient.prefetchQuery({
            queryKey: ["company-dashboard", companyId, undefined, undefined],
            queryFn: async () => {
              const res = await apiClient.get("/company-dashboard");
              return res.data;
            },
            staleTime: 60 * 1000,
          });
        }
      }

      // Prefetch merchant portal data on hover
      if (normalizedPath === "/merchant-portal" || normalizedPath === "/merchant-portal/dashboard") {
        const portalKey = `query:/merchant-portal:${companyId}`;
        if (!prefetched.has(portalKey)) {
          prefetched.add(portalKey);
          void queryClient.prefetchQuery({
            queryKey: ["merchant-portal-me"],
            queryFn: async () => (await apiClient.get("/merchant-portal/me")).data,
            staleTime: 60 * 1000,
          });
          void queryClient.prefetchQuery({
            queryKey: ["merchant-portal-operations-summary"],
            queryFn: async () => (await apiClient.get("/merchant-portal/operations-summary")).data,
            staleTime: 60 * 1000,
          });
          void queryClient.prefetchQuery({
            queryKey: ["merchant-portal-payout-summary"],
            queryFn: async () => (await apiClient.get("/merchant-portal/payout-summary")).data,
            staleTime: 60 * 1000,
          });
        }
      }
    }
  }, [companyId]);
}
