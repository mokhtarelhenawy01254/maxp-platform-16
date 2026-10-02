import { useState, useCallback, useEffect } from "react";
import { apiClient } from "../../../../../services/apiClient";
import type {
  FulfillmentVelocitySummaryData,
  ShippedOrderDetail,
  DrillDownPagination,
  FulfillmentMilestone,
} from "../types";

export interface UseFulfillmentVelocityReturn {
  data: FulfillmentVelocitySummaryData | null;
  loading: boolean;
  error: string | null;
  targetDate: string;
  setTargetDate: (d: string) => void;
  milestone: FulfillmentMilestone;
  setMilestone: (m: FulfillmentMilestone) => void;
  refetch: () => Promise<void>;
  // Drill-down states
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  drawerTitle: string;
  drawerOrders: ShippedOrderDetail[];
  drawerLoading: boolean;
  drawerPagination: DrillDownPagination;
  loadCohortOrders: (params: { creationDate?: string; vintageBucket?: string; title: string; page?: number }) => Promise<void>;
}

export function useFulfillmentVelocityData(): UseFulfillmentVelocityReturn {
  const [targetDate, setTargetDate] = useState(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  });

  const [milestone, setMilestone] = useState<FulfillmentMilestone>("READY_TO_SHIP");
  const [data, setData] = useState<FulfillmentVelocitySummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Drill-down drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTitle, setDrawerTitle] = useState("");
  const [drawerOrders, setDrawerOrders] = useState<ShippedOrderDetail[]>([]);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [currentCohortParams, setCurrentCohortParams] = useState<{ creationDate?: string; vintageBucket?: string }>({});
  const [drawerPagination, setDrawerPagination] = useState<DrillDownPagination>({
    total: 0,
    page: 1,
    limit: 30,
    totalPages: 1,
  });

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<{ success: boolean; data: FulfillmentVelocitySummaryData }>(
        "/analytics/fulfillment-velocity",
        { params: { date: targetDate, milestone } }
      );
      if (res.data?.success) {
        setData(res.data.data);
      } else {
        setError("تعذر تحميل البيانات");
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || "حدث خطأ أثناء تحميل بيانات سرعة الإنجاز");
    } finally {
      setLoading(false);
    }
  }, [targetDate, milestone]);

  useEffect(() => {
    void fetchSummary();
  }, [fetchSummary]);

  const loadCohortOrders = useCallback(
    async (params: { creationDate?: string; vintageBucket?: string; title: string; page?: number }) => {
      setDrawerLoading(true);
      setDrawerTitle(params.title);
      setDrawerOpen(true);
      const targetPage = params.page || 1;
      setCurrentCohortParams({ creationDate: params.creationDate, vintageBucket: params.vintageBucket });

      try {
        const queryParams: Record<string, any> = {
          date: targetDate,
          milestone,
          page: targetPage,
          limit: 30,
        };
        if (params.creationDate) queryParams.creationDate = params.creationDate;
        if (params.vintageBucket) queryParams.vintageBucket = params.vintageBucket;

        const res = await apiClient.get<{
          success: boolean;
          data: { orders: ShippedOrderDetail[]; pagination: DrillDownPagination };
        }>("/analytics/fulfillment-velocity/orders", { params: queryParams });

        if (res.data?.success) {
          setDrawerOrders(res.data.data.orders);
          setDrawerPagination(res.data.data.pagination);
        }
      } catch (err) {
        console.error("Error loading cohort orders:", err);
      } finally {
        setDrawerLoading(false);
      }
    },
    [targetDate, milestone]
  );

  return {
    data,
    loading,
    error,
    targetDate,
    setTargetDate,
    milestone,
    setMilestone,
    refetch: fetchSummary,
    drawerOpen,
    setDrawerOpen,
    drawerTitle,
    drawerOrders,
    drawerLoading,
    drawerPagination,
    loadCohortOrders,
  };
}
