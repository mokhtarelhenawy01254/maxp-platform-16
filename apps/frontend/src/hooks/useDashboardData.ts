import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../services/apiClient";
import { useAuth } from "./useAuthSimple";
import type { DashboardResponse } from "../pages/dashboard/types";

interface UseDashboardOptions {
  startDate?: string;
  endDate?: string;
}

export function useDashboardData(options?: UseDashboardOptions) {
  const { startDate, endDate } = options ?? {};
  const { user } = useAuth();
  const companyId = user?.companyId || user?.company?.id || "unknown";

  return useQuery<DashboardResponse>({
    queryKey: ["company-dashboard", companyId, startDate, endDate],
    queryFn: async ({ signal }) => {
      const params: Record<string, string> = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const response = await apiClient.get<DashboardResponse>("/company-dashboard", { params, signal });
      return response.data;
    },
    staleTime: 60 * 1000,
    refetchOnWindowFocus: true,
    placeholderData: (prev) => prev,
  });
}
