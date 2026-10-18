import { renderHook, act } from "@testing-library/react";
import { usePreparationSingleStatusOperations } from "./usePreparationSingleStatusOperations";
import { apiClient } from "../../../services/apiClient";
import { toast } from "sonner";
import { PROBLEM_HOLD_METADATA_KEY, PROBLEM_HOLD_STATUS } from "./constants";
import type { PreparationOrder, PreparationQueueSettings, ProblemHoldDetails } from "./types";

jest.mock("../../../services/apiClient", () => ({
  apiClient: {
    post: jest.fn(),
    put: jest.fn(),
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
  orderNumber: "ORD-101",
  customerName: "Omar Said",
  customerPhone: "01011111111",
  status: "CONFIRMED",
  total: 550,
  items: [],
  createdAt: "2026-10-18T10:00:00Z",
  stage: "PENDING_PREPARATION",
  priorityScore: 10,
  formattedDate: "2026-10-18",
  relativeAge: "1d",
  isHeld: false,
  metadata: {},
  problemHoldDetails: {} as any,
  shortageHoldDetails: {} as any,
  itemSummaries: [],
};

const mockOrderHeld: PreparationOrder = {
  ...mockOrderA,
  id: "ord-held",
  orderNumber: "ORD-HELD",
  stage: "ON_HOLD_PREP",
  isHeld: true,
};

const mockSettings: PreparationQueueSettings = {
  enabled: true,
  handoffStatus: "READY_TO_SHIP",
  startingStatus: "CONFIRMED",
  requireStockBeforePreparing: false,
  allowPartialPreparation: false,
  allowCrossWarehouseTransfer: false,
  enableQcChecklist: false,
  requiredQcChecks: [],
};

describe("usePreparationSingleStatusOperations", () => {
  const getOrderByNumber = jest.fn((orderNumber: string) => {
    if (orderNumber === "ORD-101") return mockOrderA;
    if (orderNumber === "ORD-HELD") return mockOrderHeld;
    return null;
  });

  const validateTransition = jest.fn(() => ({ valid: true }));
  const setProblemHoldDrafts = jest.fn();
  const setProblemHoldSavingOrderId = jest.fn();
  const updateLocalMetadata = jest.fn();
  const updateLocalStatuses = jest.fn();
  const fetchAll = jest.fn();
  const setStatusChangeDialog = jest.fn();
  const getApiErrorMessage = jest.fn((e: any) => e?.message || "Error");
  const t = (k: string) => k;
  const statusLabelMap = new Map([
    ["PREPARING", "قيد التجهيز"],
    [PROBLEM_HOLD_STATUS, "معلق لمشكلة"],
  ]);

  const defaultProps = {
    getOrderByNumber,
    validateTransition,
    problemHoldDrafts: {} as Record<string, ProblemHoldDetails>,
    setProblemHoldDrafts,
    setProblemHoldSavingOrderId,
    updateLocalMetadata,
    updateLocalStatuses,
    statusLabelMap,
    preparationSettings: mockSettings,
    user: { firstName: "Adham", lastName: "Admin", role: "COMPANY_ADMIN" },
    fetchAll,
    statusChangeDialog: null,
    setStatusChangeDialog,
    getApiErrorMessage,
    t,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("handles transition failure when order is not found", async () => {
    const { result } = renderHook(() =>
      usePreparationSingleStatusOperations(defaultProps),
    );

    let success: any;
    await act(async () => {
      success = await result.current.performStatusUpdate("ORD-NOT-FOUND", "PREPARING", "");
    });

    expect(success).toBe(false);
    expect(toast.error).toHaveBeenCalledWith("preparation.k_20");
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it("updates single status successfully for a standard transition", async () => {
    (apiClient.post as jest.Mock).mockResolvedValueOnce({ data: { success: true } });

    const { result } = renderHook(() =>
      usePreparationSingleStatusOperations(defaultProps),
    );

    let success: any;
    await act(async () => {
      success = await result.current.performStatusUpdate("ORD-101", "PREPARING", "Starting prep");
    });

    expect(success).toBe(true);
    expect(apiClient.post).toHaveBeenCalledWith(
      "/orders-new/simple/ORD-101/status",
      expect.objectContaining({
        status: "PREPARING",
        notes: "Starting prep",
        isOverride: true,
      }),
    );
    expect(updateLocalStatuses).toHaveBeenCalledWith(["ORD-101"], "PREPARING");
    expect(toast.success).toHaveBeenCalled();
    expect(fetchAll).toHaveBeenCalled();
  });

  it("handles problem hold target status with reason and draft metadata", async () => {
    (apiClient.put as jest.Mock).mockResolvedValueOnce({ data: { success: true } });
    (apiClient.post as jest.Mock).mockResolvedValueOnce({ data: { success: true } });

    const { result } = renderHook(() =>
      usePreparationSingleStatusOperations(defaultProps),
    );

    let success: any;
    await act(async () => {
      success = await result.current.performStatusUpdate(
        "ORD-101",
        PROBLEM_HOLD_STATUS,
        "",
        { reason: "Missing fragile packaging" },
      );
    });

    expect(success).toBe(true);
    expect(apiClient.put).toHaveBeenCalledWith(
      "/orders-new/simple/ORD-101",
      expect.objectContaining({
        metadataPatch: expect.objectContaining({
          [PROBLEM_HOLD_METADATA_KEY]: expect.objectContaining({
            reason: "Missing fragile packaging",
            state: "held",
          }),
        }),
      }),
    );
    expect(apiClient.post).toHaveBeenCalledWith(
      "/orders-new/simple/ORD-101/status",
      expect.objectContaining({
        status: PROBLEM_HOLD_STATUS,
        notes: "Missing fragile packaging",
      }),
    );
  });

  it("handles single status update validation rejection", async () => {
    validateTransition.mockReturnValueOnce({
      valid: false,
      message: "Stage transition not permitted",
    });

    const { result } = renderHook(() =>
      usePreparationSingleStatusOperations(defaultProps),
    );

    await act(async () => {
      await result.current.handleSingleStatusUpdate("ORD-101", "QUALITY_CHECK");
    });

    expect(toast.error).toHaveBeenCalledWith("Stage transition not permitted");
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it("opens status change dialog on handleRequestStatusChange", async () => {
    const { result } = renderHook(() =>
      usePreparationSingleStatusOperations(defaultProps),
    );

    await act(async () => {
      await result.current.handleRequestStatusChange("ORD-101", "PACKAGED");
    });

    expect(setStatusChangeDialog).toHaveBeenCalledWith({
      orderNumber: "ORD-101",
      targetStatus: "PACKAGED",
      isHold: false,
    });
  });

  it("confirms status change from dialog payload and closes dialog", async () => {
    (apiClient.post as jest.Mock).mockResolvedValueOnce({ data: { success: true } });

    const dialogState = {
      orderNumber: "ORD-101",
      targetStatus: "READY_TO_SHIP",
      isHold: false,
    };

    const { result } = renderHook(() =>
      usePreparationSingleStatusOperations({
        ...defaultProps,
        statusChangeDialog: dialogState,
      }),
    );

    await act(async () => {
      await result.current.handleConfirmStatusChange({
        note: "Verified by QC supervisor",
      });
    });

    expect(apiClient.post).toHaveBeenCalledWith(
      "/orders-new/simple/ORD-101/status",
      expect.objectContaining({
        status: "READY_TO_SHIP",
        notes: "Verified by QC supervisor",
      }),
    );
    expect(setStatusChangeDialog).toHaveBeenCalledWith(null);
  });
});
