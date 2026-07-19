import { useQuery } from "@tanstack/react-query";
import { aiAdminService } from "../services/aiAdminService";

export function useAiKeyLogs(params?: {
  provider?: string;
  key_id?: string;
  status?: string;
  limit?: number;
  offset?: number;
}, refreshKey?: number) {
  return useQuery({
    queryKey: ["ai-admin", "key-logs", params, refreshKey],
    queryFn: () => aiAdminService.getKeyLogs(params),
    staleTime: 30_000,
    refetchInterval: 30_000,
  });
}
