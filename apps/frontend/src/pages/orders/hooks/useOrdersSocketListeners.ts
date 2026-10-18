import React, { useEffect } from "react";
import type { Socket } from "socket.io-client";
import { transformOrder } from "../utils/orderTransformer";
import type { Order, RawOrder } from "../utils/orderTransformer";
import type { OrdersFilters } from "../ordersFilterTypes";

export type SocketOrderUpdate = Partial<Order> & {
  orderNumber: string;
  _refetch?: boolean;
};

export interface UseOrdersSocketListenersParams {
  socket: Socket | null;
  isConnected: boolean;
  page: number;
  limit: number;
  filtersRef: React.MutableRefObject<OrdersFilters>;
  ordersRef: React.MutableRefObject<Order[]>;
  fetchOrdersRef: React.MutableRefObject<() => Promise<void>>;
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
  setTotalOrders: React.Dispatch<React.SetStateAction<number>>;
}

export function useOrdersSocketListeners({
  socket,
  isConnected,
  page,
  limit,
  filtersRef,
  ordersRef,
  fetchOrdersRef,
  setOrders,
  setTotalOrders,
}: UseOrdersSocketListenersParams): void {
  useEffect(() => {
    if (!socket || !isConnected) return;

    const hasActiveFilters = () => {
      const f = filtersRef.current;
      return Boolean(
        f.status.length > 0 ||
        f.paymentStatus.length > 0 ||
        f.sourceType.length > 0 ||
        f.merchantId.length > 0 ||
        f.affiliateId.length > 0 ||
        f.fulfillmentSource.length > 0 ||
        f.merchantOperationStatus.length > 0 ||
        f.merchantSettlementStatus.length > 0 ||
        f.search ||
        f.startDate ||
        f.endDate ||
        f.onlyUnseen ||
        f.onlyPostPurchaseOffer,
      );
    };

    // Listen for new orders
    const handleNewOrder = (newOrder: RawOrder) => {
      if (page !== 1) return;
      if (hasActiveFilters()) {
        void fetchOrdersRef.current();
        return;
      }
      const transformed = transformOrder(newOrder);
      if (ordersRef.current.some((o) => o.orderNumber === transformed.orderNumber)) {
        return;
      }
      setOrders((prev) => [transformed, ...prev].slice(0, limit));
      setTotalOrders((prev) => prev + 1);
    };

    // Listen for order updates
    const handleOrderUpdate = (updatedData: SocketOrderUpdate) => {
      if (updatedData._refetch) {
        void fetchOrdersRef.current();
        return;
      }

      setOrders((prev) =>
        prev.map((order) => {
          if (order.orderNumber === updatedData.orderNumber) {
            return { ...order, ...updatedData };
          }
          return order;
        }),
      );
    };

    // Listen for bulk updates
    const handleBulkUpdate = () => {
      void fetchOrdersRef.current();
    };

    const handleBulkDelete = () => {
      void fetchOrdersRef.current();
    };

    socket.on("order:created", handleNewOrder);
    socket.on("order:updated", handleOrderUpdate);
    socket.on("order:updated_bulk", handleBulkUpdate);
    socket.on("order:deleted_bulk", handleBulkDelete);

    return () => {
      socket.off("order:created", handleNewOrder);
      socket.off("order:updated", handleOrderUpdate);
      socket.off("order:updated_bulk", handleBulkUpdate);
      socket.off("order:deleted_bulk", handleBulkDelete);
    };
  }, [
    socket,
    isConnected,
    page,
    limit,
    filtersRef,
    ordersRef,
    fetchOrdersRef,
    setOrders,
    setTotalOrders,
  ]);
}
