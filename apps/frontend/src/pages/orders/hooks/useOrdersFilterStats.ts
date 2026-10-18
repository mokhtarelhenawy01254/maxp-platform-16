import { useMemo } from "react";
import type { OrdersFilters } from "../ordersFilterTypes";

export interface UseOrdersFilterStatsReturn {
  activeFilterCount: number;
  advancedFilterCount: number;
  hasCustomDateFilters: boolean;
}

export function useOrdersFilterStats(filters: OrdersFilters): UseOrdersFilterStatsReturn {
  const activeFilterCount = useMemo(
    () =>
      Object.entries(filters).reduce((count, [key, value]) => {
        if (key === "onlyUnseen" || key === "onlyPostPurchaseOffer") {
          return count + (value ? 1 : 0);
        }

        if (Array.isArray(value)) {
          return count + value.length;
        }

        if (!value) return count;
        return count + 1;
      }, 0),
    [filters],
  );

  const advancedFilterCount = useMemo(() => {
    let count = 0;

    if (filters.status.length > 0) count += filters.status.length;
    if (filters.paymentStatus.length > 0) count += filters.paymentStatus.length;
    if (filters.sourceType.length > 0) count += filters.sourceType.length;
    if (filters.merchantId.length > 0) count += filters.merchantId.length;
    if (filters.affiliateId.length > 0) count += filters.affiliateId.length;
    if (filters.fulfillmentSource.length > 0) count += filters.fulfillmentSource.length;
    if (filters.merchantOperationStatus.length > 0) count += filters.merchantOperationStatus.length;
    if (filters.merchantSettlementStatus.length > 0) count += filters.merchantSettlementStatus.length;
    if (filters.extractionMethod) count += 1;
    if (filters.minConfidence) count += 1;
    if (filters.timeRange || filters.startDate || filters.endDate) count += 1;

    return count;
  }, [filters]);

  const hasCustomDateFilters = useMemo(
    () => Boolean(filters.timeRange === "custom" || filters.startDate || filters.endDate),
    [filters.timeRange, filters.startDate, filters.endDate],
  );

  return {
    activeFilterCount,
    advancedFilterCount,
    hasCustomDateFilters,
  };
}
