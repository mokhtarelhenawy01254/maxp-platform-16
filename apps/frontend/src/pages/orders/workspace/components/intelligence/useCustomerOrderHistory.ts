import { useState, useEffect, useCallback } from "react";
import { apiClient } from "../../../../../services/apiClient";
import type { CustomerOrderHistoryData } from "../../types";
import type { WorkspaceOrder } from "../../types";

export interface UseCustomerOrderHistoryReturn {
  historyData: CustomerOrderHistoryData | null;
  loadingHistory: boolean;
  historyError: string | null;
  handleRefreshHistory: () => Promise<void>;
  setHistoryData: React.Dispatch<React.SetStateAction<CustomerOrderHistoryData | null>>;
}

export const useCustomerOrderHistory = (
  order: WorkspaceOrder | null,
): UseCustomerOrderHistoryReturn => {
  const [historyData, setHistoryData] = useState<CustomerOrderHistoryData | null>(null);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (order?.orderNumber) {
      setLoadingHistory(true);
      setHistoryError(null);
      apiClient
        .get(`/orders-new/simple/${encodeURIComponent(order.orderNumber)}/customer-history`)
        .then((res) => {
          if (!cancelled && res?.data?.success && res.data.data) {
            setHistoryData(res.data.data);
          }
        })
        .catch((err: any) => {
          if (!cancelled) {
            console.warn("Failed to load customer order history in intelligence rail:", err);
            setHistoryError(err?.response?.data?.message || err?.message || "فشل جلب سجل العميل");
          }
        })
        .finally(() => {
          if (!cancelled) setLoadingHistory(false);
        });
    } else {
      setHistoryData(null);
      setHistoryError(null);
    }

    return () => {
      cancelled = true;
    };
  }, [order?.orderNumber]);

  const handleRefreshHistory = useCallback(async () => {
    if (!order?.orderNumber) return;
    setLoadingHistory(true);
    setHistoryError(null);
    try {
      const res = await apiClient.get(
        `/orders-new/simple/${encodeURIComponent(order.orderNumber)}/customer-history`,
      );
      if (res?.data?.success && res.data.data) {
        setHistoryData(res.data.data);
      }
    } catch (err: any) {
      setHistoryError(err?.response?.data?.message || err?.message || "فشل جلب سجل العميل");
    } finally {
      setLoadingHistory(false);
    }
  }, [order?.orderNumber]);

  return {
    historyData,
    loadingHistory,
    historyError,
    handleRefreshHistory,
    setHistoryData,
  };
};
