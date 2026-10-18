import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { apiClient } from "../../../../services/apiClient";
import type { PeriodRange } from "../../../../components/common/PeriodSelector";

export interface OrderStatsData {
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  statusCounts: {
    [key: string]: number;
  };
  recentOrders: Array<{
    orderNumber: string;
    customerName: string;
    total: number;
    status: string;
    createdAt: string;
  }>;
}

export function useOrderStatsData() {
  const [stats, setStats] = useState<OrderStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<PeriodRange | null>(null);
  const [allTime, setAllTime] = useState(true);
  const { t } = useTranslation();

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params: any = {};
      if (!allTime && range) {
        params.dateFrom = range.startDate;
        params.dateTo = range.endDate;
      }

      const response = await apiClient.get("/orders-enhanced/stats", {
        params,
      });

      if (response.data.success) {
        setStats(response.data.data);
        setError(null);
      } else {
        throw new Error(response.data.message || t("orderStats.fetchFailed"));
      }
    } catch (err: any) {
      console.error("Error fetching order stats:", err);
      const message =
        err.response?.data?.message ||
        err.message ||
        t("orderStats.loadingError");
      setError(message);
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [allTime, range, t]);

  useEffect(() => {
    void fetchStats();
  }, [fetchStats]);

  return {
    stats,
    loading,
    error,
    range,
    setRange,
    allTime,
    setAllTime,
    fetchStats,
  };
}
