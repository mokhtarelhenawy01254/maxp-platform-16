import { renderHook } from "@testing-library/react";
import { usePreparationQueueData } from "./usePreparationQueueData";
import { useQuery, useQueryClient } from "@tanstack/react-query";

jest.mock("../../../services/apiClient", () => ({
  apiClient: {
    get: jest.fn(),
  },
}));

jest.mock("@tanstack/react-query", () => ({
  useQuery: jest.fn(),
  useQueryClient: jest.fn(),
}));

describe("usePreparationQueueData", () => {
  const defaultParams = {
    page: 1,
    pageSize: 20 as const,
    activeStage: "ALL",
    selectedWarehouseId: "",
    stockFilter: "all" as const,
    shortageReasonFilter: "all" as const,
    shortageFollowUpFilter: "all" as const,
    shortageOwnerFilter: "",
    productFilter: "",
    productColorFilter: "",
    productSizeFilter: "",
    productIdFilter: "",
    variantIdFilter: "",
    itemCountFilter: "all" as const,
    notPrintedFilter: "all" as const,
    noShippingCodeFilter: "all" as const,
    search: "",
    sortBy: "createdAt" as const,
    sortOrder: "desc" as const,
    companyId: "c1",
  };

  const mockSettingsData = { prioritizeShortageOrders: true };
  const mockProductsData: any[] = [];
  const mockOrdersList = [
    {
      id: "1",
      orderNumber: "ORD-1",
      customerName: "Ahmed",
      status: "PENDING_PREPARATION",
      items: [],
    },
  ];
  const mockOrdersData = {
    orders: mockOrdersList,
    pagination: { total: 1, page: 1, limit: 20, pages: 1 },
    summary: { filteredTotal: 1 },
  };
  const mockWarehousesData = [{ id: "w1", name: "Main" }];
  const mockStatusesData = [{ code: "PENDING_PREPARATION", statusType: "preparation" }];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("initializes queries and returns normalized state", () => {
    (useQueryClient as jest.Mock).mockReturnValue({
      setQueryData: jest.fn(),
      fetchQuery: jest.fn(),
    });

    (useQuery as jest.Mock).mockImplementation(({ queryKey }) => {
      if (queryKey.includes("settings")) {
        return { data: mockSettingsData, isPending: false };
      }
      if (queryKey.includes("products")) {
        return { data: mockProductsData, isLoading: false };
      }
      if (queryKey.includes("orders")) {
        return {
          data: mockOrdersData,
          isPending: false,
        };
      }
      if (queryKey.includes("warehouses")) {
        return { data: mockWarehousesData, isPending: false };
      }
      if (queryKey.includes("statuses")) {
        return {
          data: mockStatusesData,
          isPending: false,
        };
      }
      return { data: undefined, isPending: false };
    });

    const { result } = renderHook(() => usePreparationQueueData(defaultParams));

    expect(result.current.orders.length).toBe(1);
    expect(result.current.orders[0].orderNumber).toBe("ORD-1");
    expect(result.current.warehouses).toEqual([{ id: "w1", name: "Main" }]);
    expect(result.current.preparationStatuses).toEqual([
      { code: "PENDING_PREPARATION", statusType: "preparation" },
    ]);
  });
});
