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
});
