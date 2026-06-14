import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../services/apiClient";
import type { DashboardResponse } from "../pages/dashboard/types";

interface UseDashboardOptions {
  startDate?: string;
  endDate?: string;
}

export function useDashboardData(options?: UseDashboardOptions) {
  const { startDate, endDate } = options ?? {};

  return useQuery<DashboardResponse>({
    queryKey: ["company-dashboard", startDate, endDate],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const response = await apiClient.get<DashboardResponse>("/company-dashboard", { params });
      return response.data;
    },
    staleTime: 60 * 1000,
    refetchOnWindowFocus: true,
  });
}
