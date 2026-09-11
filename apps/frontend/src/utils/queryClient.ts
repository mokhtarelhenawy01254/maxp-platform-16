import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 60_000, // Data fresh for 1 minute for instant tab navigation
      gcTime: 10 * 60 * 1000, // 10 minutes in-memory cache
      refetchOnReconnect: true,
    },
  },
});
