import { useCallback } from "react";
import { queryClient } from "../utils/queryClient";
import { apiClient } from "../services/apiClient";

const prefetched = new Set<string>();

export function useRoutePrefetch(): (path: string) => void {
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
        if (!prefetched.has("query:/company-dashboard")) {
          prefetched.add("query:/company-dashboard");
          void queryClient.prefetchQuery({
            queryKey: ["company-dashboard"],
            queryFn: async () => {
              const res = await apiClient.get("/company-dashboard");
              return res.data;
            },
            staleTime: 60 * 1000,
          });
        }
      }
    }
  }, []);
}
