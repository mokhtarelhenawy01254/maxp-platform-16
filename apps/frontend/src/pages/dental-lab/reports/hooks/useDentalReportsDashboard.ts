import { useCallback, useEffect, useState } from "react";
import { fetchDashboard } from "../../shared";
import type { ReportsKpi } from "../types/reportsTypes";

export function useDentalReportsDashboard() {
  const [kpi, setKpi] = useState<ReportsKpi | null>(null);
  const [loading, setLoading] = useState(false);

  const refreshDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const d = await fetchDashboard();
      setKpi({
        todayReceived: d.todayReceived ?? 0,
        overdueCount: d.overdueCount ?? 0,
        revenue: d.revenue ?? 0,
        outstanding: d.outstanding ?? 0,
      });
    } catch {
      setKpi(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshDashboard();
  }, [refreshDashboard]);

  return {
    kpi,
    loading,
    refreshDashboard,
  };
}

export default useDentalReportsDashboard;
