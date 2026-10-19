import { renderHook, act } from "@testing-library/react";
import { useOrdersInitialState } from "./useOrdersInitialState";
import { queryClient } from "../../../config/queryClient";

jest.mock("../../../config/queryClient", () => ({
  queryClient: {
    getQueryData: jest.fn(() => null),
  },
}));

describe("useOrdersInitialState", () => {
  const searchParams = new URLSearchParams("page=2&limit=25");

  beforeEach(() => {
    (queryClient.getQueryData as jest.Mock).mockReturnValue(null);
  });

  it("initializes with parsed search parameters and default states", () => {
    const { result } = renderHook(() =>
      useOrdersInitialState({
        searchParams,
        companyId: "company-123",
        userRole: "COMPANY_ADMIN",
      }),
    );

    expect(result.current.page).toBe(2);
    expect(result.current.limit).toBe(25);
    expect(result.current.isAdmin).toBe(true);
    expect(result.current.isMerchant).toBe(false);
    expect(result.current.canSelectOrders).toBe(true);
    expect(result.current.orders).toEqual([]);
    expect(result.current.loading).toBe(true);
  });

  it("restricts selection for merchant users", () => {
    const { result } = renderHook(() =>
      useOrdersInitialState({
        searchParams: new URLSearchParams(),
        companyId: "company-123",
        userRole: "MERCHANT",
      }),
    );

    expect(result.current.isAdmin).toBe(false);
    expect(result.current.isMerchant).toBe(true);
    expect(result.current.canSelectOrders).toBe(false);
  });

  it("updates state correctly when setters are called", () => {
    const { result } = renderHook(() =>
      useOrdersInitialState({
        searchParams: new URLSearchParams(),
        companyId: "company-123",
        userRole: "OWNER",
      }),
    );

    act(() => {
      result.current.setOrders([{ orderNumber: "ORD-99" }] as any);
      result.current.setSelectedOrders(["ORD-99"]);
      result.current.setShowAdvancedFilters(true);
    });

    expect(result.current.orders).toHaveLength(1);
    expect(result.current.ordersRef.current).toHaveLength(1);
    expect(result.current.selectedOrders).toEqual(["ORD-99"]);
    expect(result.current.showAdvancedFilters).toBe(true);
  });

  it("initializes with cache hit data when queryClient returns cached orders", () => {
    const cachedOrders = [{ orderNumber: "ORD-CACHED-1" }, { orderNumber: "ORD-CACHED-2" }];
    (queryClient.getQueryData as jest.Mock).mockReturnValue({
      orders: cachedOrders,
      totalOrders: 42,
      totalPages: 3,
    });

    const { result } = renderHook(() =>
      useOrdersInitialState({
        searchParams: new URLSearchParams(),
        companyId: "company-cached",
        userRole: "COMPANY_ADMIN",
      }),
    );

    expect(result.current.orders).toEqual(cachedOrders);
    expect(result.current.loading).toBe(false);
    expect(result.current.totalOrders).toBe(42);
    expect(result.current.totalPages).toBe(3);
  });

  it("handles undefined or employee user roles safely", () => {
    const { result: anonResult } = renderHook(() =>
      useOrdersInitialState({
        searchParams: new URLSearchParams(),
        companyId: "company-123",
        userRole: undefined,
      }),
    );
    expect(anonResult.current.isAdmin).toBe(false);
    expect(anonResult.current.isMerchant).toBe(false);
    expect(anonResult.current.canSelectOrders).toBe(false);

    const { result: agentResult } = renderHook(() =>
      useOrdersInitialState({
        searchParams: new URLSearchParams(),
        companyId: "company-123",
        userRole: "AGENT",
      }),
    );
    expect(agentResult.current.isAdmin).toBe(false);
    expect(agentResult.current.canSelectOrders).toBe(false);

    const { result: superAdminResult } = renderHook(() =>
      useOrdersInitialState({
        searchParams: new URLSearchParams(),
        companyId: "company-123",
        userRole: "SUPER_ADMIN",
      }),
    );
    expect(superAdminResult.current.isAdmin).toBe(true);
    expect(superAdminResult.current.canSelectOrders).toBe(true);
  });
});
