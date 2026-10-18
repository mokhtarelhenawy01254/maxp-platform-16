import { renderHook, act } from "@testing-library/react";
import { usePreparationBulkStatusOperations } from "./usePreparationBulkStatusOperations";
import { apiClient } from "../../../services/apiClient";
import { toast } from "sonner";
import { PROBLEM_HOLD_STATUS } from "./constants";
import type { PreparationOrder } from "./types";

jest.mock("../../../services/apiClient", () => ({
  apiClient: {
    post: jest.fn(),
  },
}));

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

const mockOrderA: PreparationOrder = {
  id: "ord-a",
  orderNumber: "ORD-A",
  customerName: "Customer A",
  customerPhone: "01011111111",
  status: "CONFIRMED",
  total: 400,
  items: [],
  createdAt: "2026-10-18T10:00:00Z",
  stage: "PENDING_PREPARATION",
  priorityScore: 10,
  formattedDate: "2026-10-18",
  relativeAge: "1d",
  isHeld: false,
  problemHoldDetails: {} as any,
  shortageHoldDetails: {} as any,
  itemSummaries: [],
};

const mockOrderB: PreparationOrder = {
  ...mockOrderA,
  id: "ord-b",
  orderNumber: "ORD-B",
};

describe("usePreparationBulkStatusOperations", () => {
  const getOrderByNumber = jest.fn((id: string) => {
    if (id === "ORD-A") return mockOrderA;
    if (id === "ORD-B") return mockOrderB;
    return null;
  });
  const validateTransition = jest.fn(() => ({ valid: true }));
  const updateLocalStatuses = jest.fn();
  const fetchAll = jest.fn();
  const clearBulkControls = jest.fn();
  const statusLabelMap = new Map([
    ["PREPARING", "قيد التجهيز"],
    [PROBLEM_HOLD_STATUS, "معلق لمشكلة"],
  ]);
  const getFiltersPayload = jest.fn(() => ({
    stage: "PENDING_PREPARATION",
    warehouseId: "wh-1",
  }));
  const getApiErrorMessage = jest.fn((e: any) => e?.message || "Error");
  const t = (k: string) => k;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("executes bulk update for selected orders successfully", async () => {
    (apiClient.post as jest.Mock).mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          results: [
            { id: "ORD-A", success: true, workflowStatus: "applied" },
            { id: "ORD-B", success: true, workflowStatus: "applied" },
          ],
        },
      },
    });

    const { result } = renderHook(() =>
      usePreparationBulkStatusOperations({
        bulkStatus: "PREPARING",
        selectedOrders: ["ORD-A", "ORD-B"],
        enrichedOrders: [mockOrderA, mockOrderB],
        getOrderByNumber,
        validateTransition,
        updateLocalStatuses,
        fetchAll,
        clearBulkControls,
        statusLabelMap,
        paginationTotal: 2,
        getFiltersPayload,
        getApiErrorMessage,
        t,
      }),
    );

    await act(async () => {
      await result.current.executeBulkUpdateSelected([mockOrderA, mockOrderB]);
    });

    expect(apiClient.post).toHaveBeenCalledWith("/orders-new/bulk/status", {
      orderIds: ["ORD-A", "ORD-B"],
      status: "PREPARING",
      notes: undefined,
    });
    expect(updateLocalStatuses).toHaveBeenCalledWith(["ORD-A", "ORD-B"], "PREPARING");
    expect(clearBulkControls).toHaveBeenCalled();
    expect(fetchAll).toHaveBeenCalled();
  });

  it("opens bulkHoldDialog when bulkStatus is PROBLEM_HOLD_STATUS", async () => {
    const { result } = renderHook(() =>
      usePreparationBulkStatusOperations({
        bulkStatus: PROBLEM_HOLD_STATUS,
        selectedOrders: ["ORD-A"],
        enrichedOrders: [mockOrderA],
        getOrderByNumber,
        validateTransition,
        updateLocalStatuses,
        fetchAll,
        clearBulkControls,
        statusLabelMap,
        paginationTotal: 1,
        getFiltersPayload,
        getApiErrorMessage,
        t,
      }),
    );

    await act(async () => {
      await result.current.handleBulkUpdate();
    });

    expect(result.current.bulkHoldDialog).toEqual({
      mode: "selected",
      validOrders: [mockOrderA],
      count: 1,
    });
  });

  it("executes bulk update for all orders matching filters successfully", async () => {
    (apiClient.post as jest.Mock).mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          successCount: 15,
          totalRequested: 15,
          results: [],
        },
      },
    });

    const { result } = renderHook(() =>
      usePreparationBulkStatusOperations({
        bulkStatus: "PREPARING",
        selectedOrders: [],
        enrichedOrders: [mockOrderA],
        getOrderByNumber,
        validateTransition,
        updateLocalStatuses,
        fetchAll,
        clearBulkControls,
        statusLabelMap,
        paginationTotal: 15,
        getFiltersPayload,
        getApiErrorMessage,
        t,
      }),
    );

    await act(async () => {
      await result.current.executeBulkUpdateAll();
    });

    expect(apiClient.post).toHaveBeenCalledWith(
      "/orders-new/bulk/status/by-filters",
      expect.objectContaining({
        status: "PREPARING",
        filters: expect.objectContaining({ stage: "PENDING_PREPARATION" }),
      }),
    );
    expect(clearBulkControls).toHaveBeenCalled();
    expect(fetchAll).toHaveBeenCalled();
  });
});
