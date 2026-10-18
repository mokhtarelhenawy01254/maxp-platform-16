import { renderHook, act } from "@testing-library/react";
import { format, subDays } from "date-fns";
import { useOrdersFilterActions } from "./useOrdersFilterActions";
import type { Order } from "../../../types/orders";
import type { OrdersFilters } from "../ordersFilterTypes";

describe("useOrdersFilterActions", () => {
  const initialFilters: OrdersFilters = {
    search: "test-query",
    status: ["CONFIRMED"],
    paymentStatus: ["PAID"],
    sourceType: [],
    merchantId: ["m1"],
    affiliateId: [],
    fulfillmentSource: [],
    merchantOperationStatus: [],
    merchantSettlementStatus: [],
    startDate: "2026-01-01",
    endDate: "2026-01-02",
    extractionMethod: "",
    minConfidence: "",
    timeRange: "custom",
    onlyUnseen: true,
    onlyPostPurchaseOffer: false,
  };

  const sampleOrders: Order[] = [
    { id: "1", orderNumber: "ORD-1", customerName: "Customer 1" } as Order,
    { id: "2", orderNumber: "ORD-2", customerName: "Customer 2" } as Order,
    { id: "3", orderNumber: "ORD-3", customerName: "Customer 3" } as Order,
  ];

  const setup = (overrides?: Partial<Parameters<typeof useOrdersFilterActions>[0]>) => {
    let currentFilters = overrides?.filters ?? initialFilters;
    let currentPage = overrides?.page ?? 2;
    let currentLimit = overrides?.limit ?? 10;
    let currentSelected = overrides?.selectedOrders ?? ["ORD-1"];
    let currentShowAdvanced = false;

    const setFilters = jest.fn((updater) => {
      currentFilters = typeof updater === "function" ? updater(currentFilters) : updater;
    });
    const setPage = jest.fn((updater) => {
      currentPage = typeof updater === "function" ? updater(currentPage) : updater;
    });
    const setLimit = jest.fn((updater) => {
      currentLimit = typeof updater === "function" ? updater(currentLimit) : updater;
    });
    const setSelectedOrders = jest.fn((updater) => {
      currentSelected = typeof updater === "function" ? updater(currentSelected) : updater;
    });
    const setShowAdvancedFilters = jest.fn((val) => {
      currentShowAdvanced = typeof val === "function" ? val(currentShowAdvanced) : val;
    });

    const { result } = renderHook(() =>
      useOrdersFilterActions({
        orders: sampleOrders,
        filters: currentFilters,
        setFilters,
        page: currentPage,
        setPage,
        totalPages: 5,
        limit: currentLimit,
        setLimit,
        selectedOrders: currentSelected,
        setSelectedOrders,
        setShowAdvancedFilters,
        ...overrides,
      }),
    );

    return {
      result,
      setFilters,
      setPage,
      setLimit,
      setSelectedOrders,
      setShowAdvancedFilters,
      getCurrentFilters: () => currentFilters,
      getCurrentPage: () => currentPage,
      getCurrentLimit: () => currentLimit,
      getCurrentSelected: () => currentSelected,
    };
  };

  test("handles quick date presets correctly", () => {
    const { result, setFilters, setPage } = setup();

    act(() => {
      result.current.setQuickDate("today");
    });

    const todayStr = format(new Date(), "yyyy-MM-dd");
    expect(setFilters).toHaveBeenCalled();
    expect(setPage).toHaveBeenCalledWith(1);

    act(() => {
      result.current.setQuickDate("yesterday");
    });
    const yesterdayStr = format(subDays(new Date(), 1), "yyyy-MM-dd");
    expect(setFilters).toHaveBeenCalled();
  });

  test("handles custom quick date by opening advanced filters", () => {
    const { result, setFilters, setShowAdvancedFilters } = setup();

    act(() => {
      result.current.setQuickDate("custom");
    });

    expect(setShowAdvancedFilters).toHaveBeenCalledWith(true);
    expect(setFilters).toHaveBeenCalled();
  });

  test("clears advanced filters and resets page to 1", () => {
    const { result, setFilters, setPage } = setup();

    act(() => {
      result.current.clearAdvancedFilters();
    });

    expect(setPage).toHaveBeenCalledWith(1);
    expect(setFilters).toHaveBeenCalled();
  });

  test("handles filter change for a single key", () => {
    const { result, setFilters, setPage } = setup();

    act(() => {
      result.current.handleFilterChange("search", "new-search");
    });

    expect(setPage).toHaveBeenCalledWith(1);
    expect(setFilters).toHaveBeenCalled();
  });

  test("applies saved filters subset and resets page to 1", () => {
    const { result, setFilters, setPage } = setup();

    act(() => {
      result.current.applySavedFilters({ status: ["DELIVERED"] });
    });

    expect(setPage).toHaveBeenCalledWith(1);
    expect(setFilters).toHaveBeenCalled();
  });

  test("clears all filters and resets flags", () => {
    const { result, setFilters, setPage } = setup();

    act(() => {
      result.current.clearAllFilters();
    });

    expect(setPage).toHaveBeenCalledWith(1);
    expect(setFilters).toHaveBeenCalled();
  });

  test("handles pagination change within valid bounds", () => {
    const { result, setPage } = setup();

    act(() => {
      result.current.handlePageChange(3);
    });
    expect(setPage).toHaveBeenCalledWith(3);

    act(() => {
      result.current.handlePageChange(0); // out of lower bound
    });
    expect(setPage).not.toHaveBeenCalledWith(0);

    act(() => {
      result.current.handlePageChange(6); // out of upper bound (totalPages = 5)
    });
    expect(setPage).not.toHaveBeenCalledWith(6);
  });

  test("handles limit change and resets page to 1", () => {
    const { result, setLimit, setPage } = setup();

    act(() => {
      result.current.handleLimitChange(25);
    });

    expect(setLimit).toHaveBeenCalledWith(25);
    expect(setPage).toHaveBeenCalledWith(1);
  });

  test("toggles single order selection", () => {
    const { result, setSelectedOrders } = setup({ selectedOrders: ["ORD-1"] });

    act(() => {
      result.current.toggleOrderSelection("ORD-2");
    });
    expect(setSelectedOrders).toHaveBeenCalled();
  });

  test("toggles all orders selection", () => {
    const { result, setSelectedOrders } = setup({ selectedOrders: ["ORD-1"] });

    act(() => {
      result.current.toggleAllSelection();
    });
    expect(setSelectedOrders).toHaveBeenCalled();
  });
});
