import { useState, useEffect, useCallback } from "react";
import { apiClient } from "../../../services/api";
import { toast } from "sonner";
import type { OrderItem, CaptainInfo, Stats } from "./turboCaptainHelpers";

export function useTurboCaptainOrders(captainName: string) {
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [captain, setCaptain] = useState<CaptainInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchOrders = useCallback(async () => {
    if (!captainName) return;
    setLoading(true);
    try {
      const res = await apiClient.get(
        `/turbo/captains/${encodeURIComponent(captainName)}/orders`,
        {
          params: { page, limit: 50, status: statusFilter || undefined },
        }
      );
      if (res.data?.success) {
        setOrders(res.data.data || []);
        setStats(res.data.stats || null);
        setCaptain(res.data.captain || null);
        setTotalPages(res.data.pagination?.pages || 1);
      }
    } catch (err: any) {
      toast.error(
        err.response?.data?.error || "تعذر تحميل تفاصيل شحنات المندوب"
      );
    } finally {
      setLoading(false);
    }
  }, [captainName, page, statusFilter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  return {
    orders,
    stats,
    captain,
    loading,
    statusFilter,
    setStatusFilter,
    page,
    setPage,
    totalPages,
    fetchOrders,
  };
}

export default useTurboCaptainOrders;
