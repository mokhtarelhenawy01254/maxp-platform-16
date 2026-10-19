import { useCallback, useMemo } from "react";
import type { Order } from "../../../types/orders";

export interface UseOrdersViewHelpersParams {
  navigate: (path: string) => void;
  setSelectedOrder: (order: Order | null) => void;
  setShowOrderModal: (show: boolean) => void;
  handleMarkAsViewed: (orderNumber: string) => Promise<void> | void;
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
  getCustomerDisplayName: (order: Order) => string;
  formatPrice: (price: number) => string;
  getOrderAmount: (order: Order) => number;
  getOrderSourceText: (order: Order) => string;
  getRelativeTime: (dateString: string) => string;
  formatDate: (dateString: string | Date, options?: any) => string;
  getPaymentStatusBadgeStyle: (status: string) => any;
  getPaymentStatusColor: (status: string) => string;
  getPaymentStatusText: (status: string) => string;
  getUnifiedStatusDisplay: (order: Order) => any;
  getConfidenceColor: (confidence?: number) => string;
  getConfidenceIcon: (confidence?: number) => React.ReactNode;
}

export function useOrdersViewHelpers({
  navigate,
  setSelectedOrder,
  setShowOrderModal,
  handleMarkAsViewed,
  setOrders,
  getCustomerDisplayName,
  formatPrice,
  getOrderAmount,
  getOrderSourceText,
  getRelativeTime,
  formatDate,
  getPaymentStatusBadgeStyle,
  getPaymentStatusColor,
  getPaymentStatusText,
  getUnifiedStatusDisplay,
  getConfidenceColor,
  getConfidenceIcon,
}: UseOrdersViewHelpersParams) {
  const handleOpenOrder = useCallback(
    (order: Order) => {
      if (order.metadata?.isIncompleteCart) {
        navigate(
          `/orders/incomplete/${encodeURIComponent(order.metadata.cartId || order.orderNumber)}`,
        );
        return;
      }
      setSelectedOrder(order);
      setShowOrderModal(true);
      if (!order.isViewed) {
        handleMarkAsViewed(order.orderNumber);
      }
    },
    [navigate, setSelectedOrder, setShowOrderModal, handleMarkAsViewed],
  );

  const handleCustomerRatingChange = useCallback(
    (orderNumber: string, newRating: string) => {
      setOrders((prev) =>
        prev.map((o) =>
          o.orderNumber === orderNumber || o.id === orderNumber
            ? {
                ...o,
                customerRating: newRating,
                customer: o.customer
                  ? { ...o.customer, customerRating: newRating }
                  : undefined,
              }
            : o,
        ),
      );
    },
    [setOrders],
  );

  const mobileListHelpers = useMemo(
    () => ({
      getCustomerDisplayName,
      formatPrice,
      getOrderAmount,
      getOrderSourceText,
      getRelativeTime,
      formatDate,
      getPaymentStatusBadgeStyle,
      getPaymentStatusColor,
      getPaymentStatusText,
      getUnifiedStatusDisplay,
    }),
    [
      getCustomerDisplayName,
      formatPrice,
      getOrderAmount,
      getOrderSourceText,
      getRelativeTime,
      formatDate,
      getPaymentStatusBadgeStyle,
      getPaymentStatusColor,
      getPaymentStatusText,
      getUnifiedStatusDisplay,
    ],
  );

  const tableHelpers = useMemo(
    () => ({
      getCustomerDisplayName,
      formatPrice,
      getRelativeTime,
      formatDate,
      getPaymentStatusBadgeStyle,
      getPaymentStatusColor,
      getPaymentStatusText,
      getUnifiedStatusDisplay,
      getConfidenceColor,
      getConfidenceIcon,
      getOrderSourceText,
    }),
    [
      getCustomerDisplayName,
      formatPrice,
      getRelativeTime,
      formatDate,
      getPaymentStatusBadgeStyle,
      getPaymentStatusColor,
      getPaymentStatusText,
      getUnifiedStatusDisplay,
      getConfidenceColor,
      getConfidenceIcon,
      getOrderSourceText,
    ],
  );

  return {
    handleOpenOrder,
    handleCustomerRatingChange,
    mobileListHelpers,
    tableHelpers,
  };
}
