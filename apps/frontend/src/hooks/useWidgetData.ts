import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../services/apiClient";

export type WidgetDataResponse = Record<string, Record<string, unknown>>;

export function useWidgetData(enabled: boolean) {
  return useQuery<WidgetDataResponse>({
    queryKey: ["dashboard-widget-data"],
    queryFn: async () => {
      const res = await apiClient.get("/company-dashboard/widget-data");
      return res.data?.data ?? {};
    },
    staleTime: 30_000,
    enabled,
  });
}
