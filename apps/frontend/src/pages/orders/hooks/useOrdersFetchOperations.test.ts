import { renderHook, act } from "@testing-library/react";
import { useOrdersFetchOperations } from "./useOrdersFetchOperations";
import { apiClient } from "../../../services/apiClient";
import { queryClient } from "../../../config/queryClient";
import { DEFAULT_ORDERS_FILTERS } from "../ordersFilterTypes";

jest.mock("../../../services/apiClient", () => ({
  apiClient: {
    get: jest.fn(),
  },
}));

jest.mock("../../../config/queryClient", () => ({
  queryClient: {
    getQueryData: jest.fn(),
    setQueryData: jest.fn(),
  },
}));

jest.mock("../../../i18n", () => ({
  t: (key: string) => key,
}));

describe("useOrdersFetchOperations", () => {
  const mockSetOrders = jest.fn();
  const mockSetTotalPages = jest.fn();
  const mockSetTotalOrders = jest.fn();
  const mockSetSelectedOrders = jest.fn();
  const mockSetPage = jest.fn();
  const mockSetLoading = jest.fn();
  const mockSetOrdersLoadError = jest.fn();
  const mockSetLastUpdatedAt = jest.fn();
  const mockSetShowIncompleteInOrders = jest.fn();
  const mockOrdersRef = { current: [] };

  const defaultProps = {
    companyId: "comp-123",
    page: 1,
    limit: 20,
    filters: { ...DEFAULT_ORDERS_FILTERS },
    effectiveFilters: { ...DEFAULT_ORDERS_FILTERS },
    isMerchant: false,
    ordersRef: mockOrdersRef,
    setOrders: mockSetOrders,
    setTotalPages: mockSetTotalPages,
    setTotalOrders: mockSetTotalOrders,
    setSelectedOrders: mockSetSelectedOrders,
    setPage: mockSetPage,
    setLoading: mockSetLoading,
    setOrdersLoadError: mockSetOrdersLoadError,
    setLastUpdatedAt: mockSetLastUpdatedAt,
    setShowIncompleteInOrders: mockSetShowIncompleteInOrders,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("initializes and provides fetchOrders and fetchOrdersRef", () => {
    (queryClient.getQueryData as jest.Mock).mockReturnValue(null);
    (apiClient.get as jest.Mock).mockResolvedValue({
      data: { success: true, data: [], pagination: { pages: 0, total: 0 } },
    });

    const { result } = renderHook(() => useOrdersFetchOperations(defaultProps));

    expect(typeof result.current.fetchOrders).toBe("function");
    expect(result.current.fetchOrdersRef.current).toBe(result.current.fetchOrders);
  });

  it("uses cached orders if present in queryClient", async () => {
    const cachedOrders = [
      { id: "ord-1", orderNumber: "ORD-001", totalAmount: 100 },
    ];
    (queryClient.getQueryData as jest.Mock).mockReturnValue({
      orders: cachedOrders,
      totalPages: 1,
      totalOrders: 1,
    });

    (apiClient.get as jest.Mock).mockResolvedValue({
      data: {
        success: true,
        data: [{ id: "ord-1", orderNumber: "ORD-001", totalAmount: 100 }],
        pagination: { pages: 1, total: 1 },
      },
    });

    const { result } = renderHook(() => useOrdersFetchOperations(defaultProps));

    await act(async () => {
      await result.current.fetchOrders();
    });

    expect(mockSetOrders).toHaveBeenCalledWith(cachedOrders);
    expect(mockSetTotalPages).toHaveBeenCalledWith(1);
    expect(mockSetTotalOrders).toHaveBeenCalledWith(1);
    expect(mockSetLoading).toHaveBeenCalledWith(false);
  });

  it("handles successful simple orders fetch and updates state & cache", async () => {
    (queryClient.getQueryData as jest.Mock).mockReturnValue(null);
    (apiClient.get as jest.Mock).mockResolvedValue({
      data: {
        success: true,
        data: [
          { id: "ord-101", orderNumber: "ORD-101", totalAmount: 500, customerName: "Ahmed" },
        ],
        pagination: { pages: 2, total: 30 },
        meta: { showIncompleteCartsInOrders: true },
      },
    });

    const { result } = renderHook(() => useOrdersFetchOperations(defaultProps));

    await act(async () => {
      await result.current.fetchOrders();
    });

    expect(apiClient.get).toHaveBeenCalledWith(
      "/orders-new/simple",
      expect.objectContaining({
        params: expect.objectContaining({ page: "1", limit: "20" }),
      }),
    );
    expect(mockSetOrders).toHaveBeenCalled();
    expect(mockSetTotalPages).toHaveBeenCalledWith(2);
    expect(mockSetTotalOrders).toHaveBeenCalledWith(30);
    expect(queryClient.setQueryData).toHaveBeenCalled();
    expect(mockSetShowIncompleteInOrders).toHaveBeenCalledWith(true);
    expect(mockSetOrdersLoadError).toHaveBeenCalledWith(null);
  });

  it("uses enhanced orders endpoint when extractionMethod or minConfidence are set", async () => {
    (queryClient.getQueryData as jest.Mock).mockReturnValue(null);
    (apiClient.get as jest.Mock).mockResolvedValue({
      data: {
        success: true,
        data: [],
        pagination: { pages: 0, total: 0 },
      },
    });

    const propsWithExtraction = {
      ...defaultProps,
      filters: {
        ...DEFAULT_ORDERS_FILTERS,
        extractionMethod: "AI_PARSER",
      },
    };

    const { result } = renderHook(() => useOrdersFetchOperations(propsWithExtraction));

    await act(async () => {
      await result.current.fetchOrders();
    });

    expect(apiClient.get).toHaveBeenCalledWith(
      "/orders-enhanced",
      expect.objectContaining({
        params: expect.objectContaining({ extractionMethod: "AI_PARSER" }),
      }),
    );
  });

  it("resets page to 1 when nextTotalOrders is 0 and current page is greater than 1", async () => {
    (queryClient.getQueryData as jest.Mock).mockReturnValue(null);
    (apiClient.get as jest.Mock).mockResolvedValue({
      data: {
        success: true,
        data: [],
        pagination: { pages: 0, total: 0 },
      },
    });

    const propsOnPage3 = {
      ...defaultProps,
      page: 3,
    };

    const { result } = renderHook(() => useOrdersFetchOperations(propsOnPage3));

    await act(async () => {
      await result.current.fetchOrders();
    });

    expect(mockSetOrders).toHaveBeenCalledWith([]);
    expect(mockSetTotalPages).toHaveBeenCalledWith(0);
    expect(mockSetTotalOrders).toHaveBeenCalledWith(0);
    expect(mockSetPage).toHaveBeenCalledWith(1);
  });

  it("catches API errors and sets friendly load error message", async () => {
    (queryClient.getQueryData as jest.Mock).mockReturnValue(null);
    (apiClient.get as jest.Mock).mockRejectedValue(new Error("Network Error"));

    const { result } = renderHook(() => useOrdersFetchOperations(defaultProps));

    await act(async () => {
      await result.current.fetchOrders();
    });

    expect(mockSetOrdersLoadError).toHaveBeenCalledWith("orders.networkError");
    expect(mockSetLoading).toHaveBeenCalledWith(false);
  });
});
