import { useQuery } from "@tanstack/react-query";
import { aiAdminService } from "../services/aiAdminService";

export function useAiProviders() {
  return useQuery({
    queryKey: ["ai-admin", "providers"],
    queryFn: async ({ signal }) => {
      return aiAdminService.getProviders();
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useAiKeys() {
  return useQuery({
    queryKey: ["ai-admin", "keys"],
    queryFn: async ({ signal }) => {
      return aiAdminService.getKeys();
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useAiDashboard() {
  return useQuery({
    queryKey: ["ai-admin", "dashboard"],
    queryFn: () => aiAdminService.getDashboard(),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}

export function useAiGlobalConfig() {
  return useQuery({
    queryKey: ["ai-admin", "config"],
    queryFn: () => aiAdminService.getGlobalConfig(),
    staleTime: 1000 * 60 * 5,
  });
}
