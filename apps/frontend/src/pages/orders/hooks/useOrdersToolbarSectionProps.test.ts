import { renderHook, act } from "@testing-library/react";
import { useOrdersToolbarSectionProps } from "./useOrdersToolbarSectionProps";

describe("useOrdersToolbarSectionProps", () => {
  const defaultParams = {
    filters: { search: "test", status: [] } as any,
    advancedFilterCount: 2,
    ordersLoadError: null,
    showAdvancedFilters: false,
    setShowAdvancedFilters: jest.fn(),
    fieldClassName: "input-class",
    filterableOrderStatuses: [],
    filterablePaymentStatuses: [],
    merchantOptions: [],
    affiliateOptions: [],
    showOrderSourceFilter: false,
    showUnifiedOperationFilters: false,
    showMerchantOperationFilters: false,
    showAffiliateOperationFilter: false,
    hasCustomDateFilters: false,
    getAffiliateDisplayName: jest.fn(() => "Affiliate"),
    handleFilterChange: jest.fn(),
    applySavedFilters: jest.fn(),
    clearAdvancedFilters: jest.fn(),
    setQuickDate: jest.fn(),
    fetchOrders: jest.fn(),

    isAdmin: true,
    isMerchant: false,
    merchantSettlementSummary: null,
    merchantSettlementLoading: false,
    merchantSettlementError: null,
    formatPrice: jest.fn((p) => String(p)),
    getFulfillmentSourceText: jest.fn(() => "Source"),
  };

  it("builds toolbar and statsbar props correctly", () => {
    const { result } = renderHook(() =>
      useOrdersToolbarSectionProps(defaultParams as any),
    );

    expect(result.current.filters).toBe(defaultParams.filters);
    expect(result.current.advancedFilterCount).toBe(2);
    expect(result.current.isAdmin).toBe(true);

    act(() => {
      result.current.onToggleAdvancedFilters();
    });
    expect(defaultParams.setShowAdvancedFilters).toHaveBeenCalled();

    act(() => {
      result.current.onClearMerchantFilters();
    });
    expect(defaultParams.handleFilterChange).toHaveBeenCalledWith(
      "merchantOperationStatus",
      [],
    );
    expect(defaultParams.handleFilterChange).toHaveBeenCalledWith(
      "merchantSettlementStatus",
      [],
    );

    act(() => {
      result.current.onShowDueOrders();
    });
    expect(defaultParams.handleFilterChange).toHaveBeenCalledWith(
      "merchantOperationStatus",
      ["DELIVERED"],
    );
    expect(defaultParams.handleFilterChange).toHaveBeenCalledWith(
      "merchantSettlementStatus",
      ["PAYABLE"],
    );
  });

  it("handles filter changes, saved filter applications, quick dates, and refresh triggers", () => {
    const { result } = renderHook(() =>
      useOrdersToolbarSectionProps(defaultParams as any),
    );

    act(() => {
      result.current.onFilterChange("search", "query");
      result.current.onApplyFilters({ search: "applied" });
      result.current.onClearAdvancedFilters();
      result.current.onSetQuickDate(7);
      result.current.onRetry();
      result.current.onRefresh();
    });

    expect(defaultParams.handleFilterChange).toHaveBeenCalledWith("search", "query");
    expect(defaultParams.applySavedFilters).toHaveBeenCalledWith({ search: "applied" });
    expect(defaultParams.clearAdvancedFilters).toHaveBeenCalled();
    expect(defaultParams.setQuickDate).toHaveBeenCalledWith(7);
    expect(defaultParams.fetchOrders).toHaveBeenCalledTimes(2);
  });

  it("supports merchant role with loaded settlement summary and loading states", () => {
    const merchantParams = {
      ...defaultParams,
      isAdmin: false,
      isMerchant: true,
      merchantSettlementSummary: {
        merchant: { id: "m1", name: "Merchant One" },
        inventorySummary: { availableForSale: 10 },
      },
      merchantSettlementLoading: true,
      merchantSettlementError: "Temporary fetch error",
    };

    const { result } = renderHook(() =>
      useOrdersToolbarSectionProps(merchantParams as any),
    );

    expect(result.current.isAdmin).toBe(false);
    expect(result.current.isMerchant).toBe(true);
    expect(result.current.merchantSettlementLoading).toBe(true);
    expect(result.current.merchantSettlementError).toBe("Temporary fetch error");
    expect(result.current.merchantSettlementSummary?.merchant?.id).toBe("m1");
  });
});
