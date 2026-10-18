import { useMemo } from "react";
import { format, subDays } from "date-fns";
import type { Order } from "../../../types/orders";
import type { OrdersFilters } from "../ordersFilterTypes";
import { hasPostPurchaseOffer } from "../../../utils/postPurchaseOfferBadge";

export interface UseOrdersFilterActionsParams {
  orders: Order[];
  filters: OrdersFilters;
  setFilters: React.Dispatch<React.SetStateAction<OrdersFilters>>;
  page: number;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  totalPages: number;
  limit: number;
  setLimit: React.Dispatch<React.SetStateAction<number>>;
  selectedOrders: string[];
  setSelectedOrders: React.Dispatch<React.SetStateAction<string[]>>;
  setShowAdvancedFilters: React.Dispatch<React.SetStateAction<boolean>>;
}

export function useOrdersFilterActions({
  orders,
  filters,
  setFilters,
  page,
  setPage,
  totalPages,
  limit,
  setLimit,
  selectedOrders,
  setSelectedOrders,
  setShowAdvancedFilters,
}: UseOrdersFilterActionsParams) {
  const setQuickDate = (range: string) => {
    const now = new Date();
    let startDate: string = "";
    let endDate: string = "";

    if (range === "custom") {
      setShowAdvancedFilters(true);
      setFilters((prev) => ({ ...prev, timeRange: "custom" }));
      return;
    }

    switch (range) {
      case "today":
        startDate = format(now, "yyyy-MM-dd");
        endDate = format(now, "yyyy-MM-dd");
        break;
      case "yesterday": {
        const yesterday = subDays(now, 1);
        startDate = format(yesterday, "yyyy-MM-dd");
        endDate = format(yesterday, "yyyy-MM-dd");
        break;
      }
      case "last7":
        startDate = format(subDays(now, 7), "yyyy-MM-dd");
        endDate = format(now, "yyyy-MM-dd");
        break;
      case "last30":
        startDate = format(subDays(now, 30), "yyyy-MM-dd");
        endDate = format(now, "yyyy-MM-dd");
        break;
      case "last90":
        startDate = format(subDays(now, 90), "yyyy-MM-dd");
        endDate = format(now, "yyyy-MM-dd");
        break;
      case "last180":
        startDate = format(subDays(now, 180), "yyyy-MM-dd");
        endDate = format(now, "yyyy-MM-dd");
        break;
      case "last365":
        startDate = format(subDays(now, 365), "yyyy-MM-dd");
        endDate = format(now, "yyyy-MM-dd");
        break;
      case "thisYear":
        startDate = format(new Date(now.getFullYear(), 0, 1), "yyyy-MM-dd");
        endDate = format(now, "yyyy-MM-dd");
        break;
      case "thisMonth":
        startDate = format(
          new Date(now.getFullYear(), now.getMonth(), 1),
          "yyyy-MM-dd",
        );
        endDate = format(now, "yyyy-MM-dd");
        break;
      case "":
      case "clear":
        startDate = "";
        endDate = "";
        break;
      default:
        return;
    }

    setFilters((prev) => ({
      ...prev,
      startDate,
      endDate,
      timeRange: range === "clear" ? "" : range,
    }));
    setPage(1);
  };

  const clearAdvancedFilters = () => {
    setFilters((prev) => ({
      ...prev,
      status: [],
      paymentStatus: [],
      sourceType: [],
      merchantId: [],
      affiliateId: [],
      fulfillmentSource: [],
      merchantOperationStatus: [],
      merchantSettlementStatus: [],
      startDate: "",
      endDate: "",
      extractionMethod: "",
      minConfidence: "",
      timeRange: "",
    }));
    setPage(1);
  };

  const handleFilterChange = <K extends keyof OrdersFilters>(
    key: K,
    value: OrdersFilters[K],
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const applySavedFilters = (saved: Partial<OrdersFilters>) => {
    setFilters((prev) => ({ ...prev, ...saved }));
    setPage(1);
  };

  const clearAllFilters = () => {
    clearAdvancedFilters();
    setFilters((prev) => ({
      ...prev,
      search: "",
      onlyUnseen: false,
      onlyPostPurchaseOffer: false,
    }));
    setPage(1);
  };

  const displayedOrders = useMemo(() => {
    if (!filters.onlyPostPurchaseOffer) return orders;
    return orders.filter(hasPostPurchaseOffer);
  }, [orders, filters.onlyPostPurchaseOffer]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
    }
  };

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
    setPage(1);
  };

  const toggleOrderSelection = (orderNumber: string) => {
    setSelectedOrders((prev) =>
      prev.includes(orderNumber)
        ? prev.filter((id) => id !== orderNumber)
        : [...prev, orderNumber],
    );
  };

  const toggleAllSelection = () => {
    if (displayedOrders.every((o) => selectedOrders.includes(o.orderNumber))) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(displayedOrders.map((o) => o.orderNumber));
    }
  };

  return {
    displayedOrders,
    setQuickDate,
    clearAdvancedFilters,
    handleFilterChange,
    applySavedFilters,
    clearAllFilters,
    handlePageChange,
    handleLimitChange,
    toggleOrderSelection,
    toggleAllSelection,
  };
}
