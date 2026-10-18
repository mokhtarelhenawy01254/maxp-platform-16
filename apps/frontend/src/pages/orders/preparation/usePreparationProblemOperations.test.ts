import { renderHook, act } from "@testing-library/react";
import { usePreparationProblemOperations } from "./usePreparationProblemOperations";
import { apiClient } from "../../../services/apiClient";
import { toast } from "sonner";
import { PROBLEM_HOLD_STATUS } from "./constants";
import type { PreparationOrder, SimpleOrder } from "./types";

jest.mock("../../../services/apiClient", () => ({
  apiClient: {
    put: jest.fn(),
    post: jest.fn(),
  },
}));

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

const mockOrder: SimpleOrder = {
  id: "ord-2",
  orderNumber: "ORD-2002",
  customerName: "Mahmoud Hassan",
  customerPhone: "01099887766",
  status: "CONFIRMED",
  total: 750,
  items: [],
  createdAt: "2026-10-18T10:00:00Z",
  metadata: {
    preparationHold: {
      reason: "Missing address details",
      state: "held",
    },
  },
};

const mockPrepOrder: PreparationOrder = {
  ...mockOrder,
  stage: "ON_HOLD_PREP",
  priorityScore: 10,
  formattedDate: "2026-10-18",
  relativeAge: "1d",
  isHeld: true,
  problemHoldDetails: {
    reason: "Missing address details",
    state: "held",
    heldAt: "2026-10-18T09:00:00Z",
    heldBy: "Admin",
    releasedAt: "",
    releasedBy: "",
    followUpDate: "",
    note: "",
    customerNotified: false,
  },
  shortageHoldDetails: {} as any,
  itemSummaries: [],
};

describe("usePreparationProblemOperations", () => {
  const getOrderByNumber = jest.fn((orderNumber: string) =>
    orderNumber === "ORD-2002" ? mockPrepOrder : null,
  );
  const updateLocalMetadata = jest.fn();
  const updateLocalStatuses = jest.fn();
  const fetchAll = jest.fn();
  const setStatusChangeDialog = jest.fn();
  const getApiErrorMessage = jest.fn((err: any) => err?.message || "Error");
  const t = (k: string) => k;
  const user = { firstName: "Admin", lastName: "User", role: "COMPANY_ADMIN" };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("opens status change dialog with PROBLEM_HOLD_STATUS on handleHoldAsProblem", async () => {
    const { result } = renderHook(() =>
      usePreparationProblemOperations({
        orders: [mockOrder],
        user,
        startingStatus: "CONFIRMED",
        getOrderByNumber,
        updateLocalMetadata,
        updateLocalStatuses,
        fetchAll,
        setStatusChangeDialog,
        getApiErrorMessage,
        t,
      }),
    );

    await act(async () => {
      await result.current.handleHoldAsProblem("ORD-2002");
    });

    expect(setStatusChangeDialog).toHaveBeenCalledWith({
      orderNumber: "ORD-2002",
      targetStatus: PROBLEM_HOLD_STATUS,
      isHold: true,
    });
  });

  it("sets editReasonOrder with existing reason on handleEditProblemReason", () => {
    const { result } = renderHook(() =>
      usePreparationProblemOperations({
        orders: [mockOrder],
        user,
        startingStatus: "CONFIRMED",
        getOrderByNumber,
        updateLocalMetadata,
        updateLocalStatuses,
        fetchAll,
        setStatusChangeDialog,
        getApiErrorMessage,
        t,
      }),
    );

    act(() => {
      result.current.handleEditProblemReason("ORD-2002");
    });

    expect(result.current.editReasonOrder).toEqual({
      orderNumber: "ORD-2002",
      reason: "Missing address details",
    });
    expect(result.current.editReasonOrderOrder?.orderNumber).toBe("ORD-2002");
  });

  it("saves reason and clears dialog on handleConfirmEditReason", async () => {
    (apiClient.put as jest.Mock).mockResolvedValueOnce({ data: { success: true } });

    const { result } = renderHook(() =>
      usePreparationProblemOperations({
        orders: [mockOrder],
        user,
        startingStatus: "CONFIRMED",
        getOrderByNumber,
        updateLocalMetadata,
        updateLocalStatuses,
        fetchAll,
        setStatusChangeDialog,
        getApiErrorMessage,
        t,
      }),
    );

    act(() => {
      result.current.setEditReasonOrder({
        orderNumber: "ORD-2002",
        reason: "Old reason",
      });
    });

    await act(async () => {
      await result.current.handleConfirmEditReason("Updated address reason");
    });

    expect(apiClient.put).toHaveBeenCalledWith(
      "/orders-new/simple/ORD-2002",
      expect.objectContaining({
        metadataPatch: expect.anything(),
      }),
    );
    expect(result.current.editReasonOrder).toBeNull();
  });

  it("releases problem hold, updates status to startingStatus, and refreshes", async () => {
    (apiClient.put as jest.Mock).mockResolvedValueOnce({ data: { success: true } });
    (apiClient.post as jest.Mock).mockResolvedValueOnce({ data: { success: true } });

    const { result } = renderHook(() =>
      usePreparationProblemOperations({
        orders: [mockOrder],
        user,
        startingStatus: "CONFIRMED",
        getOrderByNumber,
        updateLocalMetadata,
        updateLocalStatuses,
        fetchAll,
        setStatusChangeDialog,
        getApiErrorMessage,
        t,
      }),
    );

    await act(async () => {
      await result.current.handleReleaseProblemHold("ORD-2002");
    });

    expect(apiClient.put).toHaveBeenCalledWith(
      "/orders-new/simple/ORD-2002",
      expect.objectContaining({
        metadataPatch: expect.anything(),
      }),
    );
    expect(apiClient.post).toHaveBeenCalledWith(
      "/orders-new/simple/ORD-2002/status",
      expect.objectContaining({
        status: "CONFIRMED",
      }),
    );
    expect(updateLocalStatuses).toHaveBeenCalledWith(["ORD-2002"], "CONFIRMED");
    expect(toast.success).toHaveBeenCalled();
    expect(fetchAll).toHaveBeenCalled();
  });
});
