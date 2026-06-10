import { useCallback } from "react";

const prefetched = new Set<string>();

export function useRoutePrefetch(): (path: string) => void {
  return useCallback((_path: string) => {
    if (typeof window !== "undefined") {
      const prefetch = (window as any).__MAXP_ROUTE_PREFETCH__?.[_path];
      if (prefetch && !prefetched.has(_path)) {
        prefetched.add(_path);
        prefetch().catch(() => {});
      }
    }
  }, []);
}
