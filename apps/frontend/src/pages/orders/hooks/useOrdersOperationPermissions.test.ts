import { renderHook } from "@testing-library/react";
import { useOrdersOperationPermissions } from "./useOrdersOperationPermissions";
import { DEFAULT_ORDERS_FILTERS } from "../ordersFilterTypes";

describe("useOrdersOperationPermissions", () => {
  it("enables unified operation filters for Admin with active merchant/affiliate options", () => {
    const { result } = renderHook(() =>
      useOrdersOperationPermissions({
        user: { role: "ADMIN" },
        company: { settings: {} },
        isAdmin: true,
        isMerchant: false,
        filters: DEFAULT_ORDERS_FILTERS,
        merchantOptions: [{ value: "m1", label: "Merchant 1" }],
        affiliateOptions: [{ value: "a1", label: "Affiliate 1" }],
      }),
    );

    expect(result.current.canShowUnifiedOperationFilters).toBe(true);
    expect(result.current.showMerchantOperationFilters).toBe(true);
    expect(result.current.showAffiliateOperationFilter).toBe(true);
    expect(result.current.showUnifiedOperationFilters).toBe(true);
    expect(result.current.showOrderSourceFilter).toBe(false);
  });

  it("disables operation filters for merchant user even if options exist", () => {
    const { result } = renderHook(() =>
      useOrdersOperationPermissions({
        user: { role: "MERCHANT" },
        company: { settings: {} },
        isAdmin: false,
        isMerchant: true,
        filters: DEFAULT_ORDERS_FILTERS,
        merchantOptions: [{ value: "m1", label: "Merchant 1" }],
        affiliateOptions: [{ value: "a1", label: "Affiliate 1" }],
      }),
    );

    expect(result.current.canShowUnifiedOperationFilters).toBe(false);
    expect(result.current.showMerchantOperationFilters).toBe(false);
    expect(result.current.showAffiliateOperationFilter).toBe(false);
    expect(result.current.showUnifiedOperationFilters).toBe(false);
    expect(result.current.showOrderSourceFilter).toBe(false);
  });

  it("detects active merchant and affiliate filters correctly", () => {
    const filtersWithOperations = {
      ...DEFAULT_ORDERS_FILTERS,
      merchantId: ["m1"],
      affiliateId: ["a1"],
      sourceType: ["WOOCOMMERCE"],
    };

    const { result } = renderHook(() =>
      useOrdersOperationPermissions({
        user: { role: "ADMIN" },
        company: { settings: {} },
        isAdmin: true,
        isMerchant: false,
        filters: filtersWithOperations,
        merchantOptions: [],
        affiliateOptions: [],
      }),
    );

    expect(result.current.merchantOperationFilterIsActive).toBe(true);
    expect(result.current.affiliateFilterIsActive).toBe(true);
    expect(result.current.sourceFilterIsActive).toBe(true);
    expect(result.current.showOrderSourceFilter).toBe(true);
    expect(result.current.showMerchantOperationFilters).toBe(true);
    expect(result.current.showAffiliateOperationFilter).toBe(true);
  });
});
