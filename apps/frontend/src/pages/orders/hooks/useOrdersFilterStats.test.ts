import { renderHook } from "@testing-library/react";
import { useOrdersFilterStats } from "./useOrdersFilterStats";
import { DEFAULT_ORDERS_FILTERS } from "../ordersFilterTypes";

describe("useOrdersFilterStats", () => {
  it("calculates zero counts on default empty filters", () => {
    const { result } = renderHook(() =>
      useOrdersFilterStats(DEFAULT_ORDERS_FILTERS),
    );

    expect(result.current.activeFilterCount).toBe(0);
    expect(result.current.advancedFilterCount).toBe(0);
    expect(result.current.hasCustomDateFilters).toBe(false);
  });

  it("calculates activeFilterCount correctly for array, string, and boolean filters", () => {
    const filters = {
      ...DEFAULT_ORDERS_FILTERS,
      status: ["PENDING", "PROCESSING"],
      search: "Mohamed",
      onlyUnseen: true,
      onlyPostPurchaseOffer: true,
    };

    const { result } = renderHook(() => useOrdersFilterStats(filters));

    // status has 2, search has 1, onlyUnseen has 1, onlyPostPurchaseOffer has 1 = 5
    expect(result.current.activeFilterCount).toBe(5);
  });

  it("calculates advancedFilterCount accurately across advanced dimensions", () => {
    const filters = {
      ...DEFAULT_ORDERS_FILTERS,
      status: ["CONFIRMED"],
      merchantId: ["m-1", "m-2"],
      affiliateId: ["aff-1"],
      extractionMethod: "AI",
      minConfidence: 0.8,
      startDate: "2026-10-01",
    };

    const { result } = renderHook(() => useOrdersFilterStats(filters));

    // status (1) + merchantId (2) + affiliateId (1) + extractionMethod (1) + minConfidence (1) + startDate (1) = 7
    expect(result.current.advancedFilterCount).toBe(7);
    expect(result.current.hasCustomDateFilters).toBe(true);
  });

  it("sets hasCustomDateFilters to true when timeRange is custom", () => {
    const filters = {
      ...DEFAULT_ORDERS_FILTERS,
      timeRange: "custom",
    };

    const { result } = renderHook(() => useOrdersFilterStats(filters));

    expect(result.current.hasCustomDateFilters).toBe(true);
  });
});
