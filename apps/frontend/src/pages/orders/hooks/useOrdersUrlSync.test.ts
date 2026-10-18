import { renderHook } from "@testing-library/react";
import { useOrdersUrlSync } from "./useOrdersUrlSync";
import {
  DEFAULT_ORDERS_FILTERS,
  ORDERS_LIST_STORAGE_KEY,
  type OrdersFilters,
} from "../ordersFilterTypes";

describe("useOrdersUrlSync", () => {
  let mockSetFilters: jest.Mock;
  let mockSetPage: jest.Mock;
  let mockSetLimit: jest.Mock;
  let mockSetSearchParams: jest.Mock;

  beforeEach(() => {
    mockSetFilters = jest.fn();
    mockSetPage = jest.fn();
    mockSetLimit = jest.fn();
    mockSetSearchParams = jest.fn();
    jest.clearAllMocks();
  });

  it("syncs searchParams into local filters, page, and limit", () => {
    const searchParams = new URLSearchParams(
      "page=3&limit=50&status=DELIVERED,CONFIRMED&search=Ahmed",
    );

    renderHook(() =>
      useOrdersUrlSync({
        filters: DEFAULT_ORDERS_FILTERS,
        setFilters: mockSetFilters,
        page: 1,
        setPage: mockSetPage,
        limit: 20,
        setLimit: mockSetLimit,
        searchParams,
        setSearchParams: mockSetSearchParams,
      }),
    );

    expect(mockSetFilters).toHaveBeenCalled();
    expect(mockSetPage).toHaveBeenCalled();
    expect(mockSetLimit).toHaveBeenCalled();
  });

  it("syncs filters and pagination to searchParams with replace option", () => {
    const filters: OrdersFilters = {
      ...DEFAULT_ORDERS_FILTERS,
      search: "Omar",
      status: ["CANCELLED"],
      onlyUnseen: true,
      onlyPostPurchaseOffer: true,
    };

    renderHook(() =>
      useOrdersUrlSync({
        filters,
        setFilters: mockSetFilters,
        page: 2,
        setPage: mockSetPage,
        limit: 25,
        setLimit: mockSetLimit,
        searchParams: new URLSearchParams(),
        setSearchParams: mockSetSearchParams,
      }),
    );

    expect(mockSetSearchParams).toHaveBeenCalledWith(
      expect.objectContaining({
        page: "2",
        limit: "25",
        search: "Omar",
        status: "CANCELLED",
        onlyUnseen: "true",
        onlyPostPurchaseOffer: "true",
      }),
      { replace: true },
    );
  });

  it("persists state to localStorage using ORDERS_LIST_STORAGE_KEY", () => {
    const filters: OrdersFilters = {
      ...DEFAULT_ORDERS_FILTERS,
      search: "Test Order",
    };

    renderHook(() =>
      useOrdersUrlSync({
        filters,
        setFilters: mockSetFilters,
        page: 1,
        setPage: mockSetPage,
        limit: 20,
        setLimit: mockSetLimit,
        searchParams: new URLSearchParams(),
        setSearchParams: mockSetSearchParams,
      }),
    );

    expect(window.localStorage.setItem).toHaveBeenCalledWith(
      ORDERS_LIST_STORAGE_KEY,
      JSON.stringify({
        page: 1,
        limit: 20,
        filters,
      }),
    );
  });

  it("catches and ignores localStorage write errors gracefully", () => {
    (window.localStorage.setItem as jest.Mock).mockImplementationOnce(() => {
      throw new Error("QuotaExceededError");
    });
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});

    expect(() => {
      renderHook(() =>
        useOrdersUrlSync({
          filters: DEFAULT_ORDERS_FILTERS,
          setFilters: mockSetFilters,
          page: 1,
          setPage: mockSetPage,
          limit: 20,
          setLimit: mockSetLimit,
          searchParams: new URLSearchParams(),
          setSearchParams: mockSetSearchParams,
        }),
      );
    }).not.toThrow();

    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
