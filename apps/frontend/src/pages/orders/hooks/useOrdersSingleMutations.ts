import { useCallback } from "react";
import { toast } from "sonner";
import { apiClient } from "../../../services/apiClient";
import type { Order } from "../../../types/orders";
import { normalizeOrderStatus, normalizePaymentStatus } from "../utils/orderTransformer";

export interface UseOrdersSingleMutationsParams {
  orders: Order[];
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
  selectedOrder: Order | null;
  setSelectedOrder: React.Dispatch<React.SetStateAction<Order | null>>;
  normalizeStatusCode: (code: string) => string;
  isCancellationStatus: (status: string) => boolean;
  getApiErrorMessage: (error: unknown, fallback: string) => string;
  t: (key: string, params?: any) => string;
}

export function useOrdersSingleMutations({
  orders,
  setOrders,
  selectedOrder,
  setSelectedOrder,
  normalizeStatusCode,
  isCancellationStatus,
  getApiErrorMessage,
  t,
}: UseOrdersSingleMutationsParams) {
  const handleUpdateStatus = useCallback(
    async (orderNumber: string, newStatus: string) => {
      const normalizedStatus = normalizeStatusCode(newStatus);
      let notes = "";

      if (isCancellationStatus(normalizedStatus)) {
        const cancellationReason = window.prompt(
          t("orders.cancellationReasonPrompt"),
        );
        if (cancellationReason === null) return;

        notes = cancellationReason.trim();
        if (!notes) {
          toast.error(t("orders.cancellationReasonRequired"));
          return;
        }
      }

      // Snapshot previous state for optimistic rollback
      const previousOrders = [...orders];
      const previousSelectedOrder = selectedOrder ? { ...selectedOrder } : null;
      const displayStatus = normalizeOrderStatus(normalizedStatus);

      // 1. Optimistic Update (Immediate UI response 0ms)
      setOrders((prev) =>
        prev.map((order) =>
          order.orderNumber === orderNumber
            ? { ...order, status: displayStatus }
            : order,
        ),
      );
      if (selectedOrder && selectedOrder.orderNumber === orderNumber) {
        setSelectedOrder({
          ...selectedOrder,
          status: displayStatus,
        });
      }

      try {
        const response = await apiClient.post(
          `/orders-new/simple/${orderNumber}/status`,
          {
            status: normalizedStatus,
            notes,
          },
        );
        const data = response.data;
        if (!data.success) {
          // Rollback
          setOrders(previousOrders);
          if (previousSelectedOrder) setSelectedOrder(previousSelectedOrder);
          toast.error(data.message || t("orders.statusUpdateFailed"));
        }
      } catch (error: unknown) {
        console.error("Error updating status:", error);
        // Rollback
        setOrders(previousOrders);
        if (previousSelectedOrder) setSelectedOrder(previousSelectedOrder);
        const errorMessage = getApiErrorMessage(error, t("orders.updateError"));
        toast.error(t("orders.statusUpdateFailedMsg", { error: errorMessage }));
      }
    },
    [orders, selectedOrder, setOrders, setSelectedOrder, normalizeStatusCode, isCancellationStatus, getApiErrorMessage, t],
  );

  const handleUpdatePaymentStatus = useCallback(
    async (orderNumber: string, newStatus: string) => {
      // Snapshot previous state for optimistic rollback
      const previousOrders = [...orders];
      const previousSelectedOrder = selectedOrder ? { ...selectedOrder } : null;
      const normalizedStatus = normalizePaymentStatus(newStatus, false);

      // 1. Optimistic Update (Immediate UI response 0ms)
      setOrders((prev) =>
        prev.map((order) =>
          order.orderNumber === orderNumber
            ? { ...order, paymentStatus: normalizedStatus }
            : order,
        ),
      );
      if (selectedOrder && selectedOrder.orderNumber === orderNumber) {
        setSelectedOrder({
          ...selectedOrder,
          paymentStatus: normalizedStatus,
        });
      }

      try {
        const response = await apiClient.post(
          `/orders-new/simple/${orderNumber}/payment-status`,
          {
            paymentStatus: newStatus,
          },
        );
        const data = response.data;
        if (!data.success) {
          // Rollback
          setOrders(previousOrders);
          if (previousSelectedOrder) setSelectedOrder(previousSelectedOrder);
          toast.error(data.message || t("orders.paymentStatusUpdateFailed"));
        }
      } catch (error: unknown) {
        console.error("Error updating payment status:", error);
        // Rollback
        setOrders(previousOrders);
        if (previousSelectedOrder) setSelectedOrder(previousSelectedOrder);
        const errorMessage = getApiErrorMessage(
          error,
          t("orders.paymentUpdateError"),
        );
        toast.error(t("orders.paymentUpdateFailedMsg", { error: errorMessage }));
      }
    },
    [orders, selectedOrder, setOrders, setSelectedOrder, getApiErrorMessage, t],
  );

  const handleMarkAsViewed = useCallback(
    async (orderId: string) => {
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId || o.orderNumber === orderId
            ? { ...o, isViewed: true }
            : o,
        ),
      );
      setSelectedOrder((prev) =>
        prev && (prev.id === orderId || prev.orderNumber === orderId)
          ? { ...prev, isViewed: true }
          : prev,
      );

      try {
        await apiClient.post(`/orders-new/simple/${orderId}/viewed`);
      } catch (error) {
        console.error("Error marking order as viewed:", error);
      }
    },
    [setOrders, setSelectedOrder],
  );

  return {
    handleUpdateStatus,
    handleUpdatePaymentStatus,
    handleMarkAsViewed,
  };
}
