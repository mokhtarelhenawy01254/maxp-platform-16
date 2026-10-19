import type { Order } from "../utils/orderTransformer";
import type { OrderStatusDefinition } from "../ordersConstants";
import type { OrdersFilters } from "../ordersFilterTypes";
import { useOrdersEntityFormatters } from "./useOrdersEntityFormatters";
import { useOrdersStatusDisplays } from "./useOrdersStatusDisplays";
import { useOrdersViewHelpers } from "./useOrdersViewHelpers";
import { getOrderAmount } from "../utils/ordersTableHelpers";

export interface UseOrdersViewDecoratorsOptions {
  t: any;
  formatDate: (date: any) => string;
  formatPrice: (amount: number | null | undefined, currencyCode?: string) => string;
  orderStatuses: OrderStatusDefinition[];
  paymentStatuses: Array<{ code: string; name: string }>;
  orderStatusMap: Map<string, OrderStatusDefinition>;
  paymentStatusMap: Map<string, { code: string; name: string }>;
  filters: OrdersFilters;
  showIncompleteInOrders: boolean;
  normalizeStatusCode: (status?: string | null) => string;
  navigate: (path: string) => void;
  setSelectedOrder: (order: Order | null) => void;
  setShowOrderModal: (show: boolean) => void;
  handleMarkAsViewed: (orderNumber: string) => void;
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
}

export function useOrdersViewDecorators({
  t,
  formatDate,
  formatPrice,
  orderStatuses,
  paymentStatuses,
  orderStatusMap,
  paymentStatusMap,
  filters,
  showIncompleteInOrders,
  normalizeStatusCode,
  navigate,
  setSelectedOrder,
  setShowOrderModal,
  handleMarkAsViewed,
  setOrders,
}: UseOrdersViewDecoratorsOptions) {
  const {
    getCustomerDisplayName,
    getConfidenceColor,
    getConfidenceIcon,
    getRelativeTime,
    getAffiliateDisplayName,
    getFulfillmentSourceText,
  } = useOrdersEntityFormatters({
    t,
    formatDate,
  });

  const {
    getStatusBadgeStyle,
    getUnifiedStatusDisplay,
    getPaymentStatusColor,
    getPaymentStatusText,
    getPaymentStatusBadgeStyle,
    filterableOrderStatuses,
    filterablePaymentStatuses,
    bulkUpdatableStatuses,
    getOrderSourceText,
  } = useOrdersStatusDisplays({
    orderStatuses,
    paymentStatuses,
    orderStatusMap,
    paymentStatusMap,
    filters,
    showIncompleteInOrders,
    normalizeStatusCode,
    t,
  });

  const {
    handleOpenOrder,
    handleCustomerRatingChange,
    mobileListHelpers,
    tableHelpers,
  } = useOrdersViewHelpers({
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
  });

  return {
    getCustomerDisplayName,
    getConfidenceColor,
    getConfidenceIcon,
    getRelativeTime,
    getAffiliateDisplayName,
    getFulfillmentSourceText,
    getStatusBadgeStyle,
    getUnifiedStatusDisplay,
    getPaymentStatusColor,
    getPaymentStatusText,
    getPaymentStatusBadgeStyle,
    filterableOrderStatuses,
    filterablePaymentStatuses,
    bulkUpdatableStatuses,
    getOrderSourceText,
    handleOpenOrder,
    handleCustomerRatingChange,
    mobileListHelpers,
    tableHelpers,
  };
}
