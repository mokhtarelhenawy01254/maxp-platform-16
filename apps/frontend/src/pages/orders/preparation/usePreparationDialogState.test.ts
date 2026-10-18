import { renderHook, act } from "@testing-library/react";
import { usePreparationDialogState } from "./usePreparationDialogState";
import { PreparationOrder, ProblemHoldDetails } from "./types";
import { toast } from "sonner";

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe("usePreparationDialogState", () => {
  const mockOrder: PreparationOrder = {
    id: 101,
    orderNumber: "ORD-101",
    status: "PROCESSING",
    items: [],
    customerName: "Test Customer",
    totalPrice: 500,
    createdAt: "2026-10-18T10:00:00Z",
    metadata: {
      problemHoldReason: "Wrong item color",
    },
  };

  const getOrderByNumber = jest.fn((orderNumber: string) => {
    if (orderNumber === "ORD-101") return mockOrder;
    return null;
  });

  const clearBulkControls = jest.fn();
  const fetchAll = jest.fn().mockResolvedValue(undefined);
  const navigate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("initializes with default null dialog state and derived values", () => {
    const { result } = renderHook(() =>
      usePreparationDialogState({
        getOrderByNumber,
        problemHoldDrafts: {},
        selectedOrders: [],
        clearBulkControls,
        fetchAll,
        navigate,
      }),
    );

    expect(result.current.statusChangeDialog).toBeNull();
    expect(result.current.showInternalCourierModal).toBe(false);
    expect(result.current.dialogOrder).toBeNull();
    expect(result.current.dialogHoldReason).toBe("");
    expect(result.current.internalCourierOrderIds).toEqual([]);
  });

  it("updates dialogOrder and derives hold details when statusChangeDialog is opened", () => {
    const drafts: Record<string, ProblemHoldDetails> = {
      "ORD-101": {
        reason: "Customer unreachable",
        notes: "Tried calling 3 times",
        responsibleParty: "CALL_CENTER",
        followUpDate: "2026-10-19",
      },
    };

    const { result } = renderHook(() =>
      usePreparationDialogState({
        getOrderByNumber,
        problemHoldDrafts: drafts,
        selectedOrders: ["ORD-101"],
        clearBulkControls,
        fetchAll,
        navigate,
      }),
    );

    act(() => {
      result.current.setStatusChangeDialog({
        orderNumber: "ORD-101",
        targetStatus: "HOLD_PROBLEM",
        isHold: true,
      });
    });

    expect(result.current.statusChangeDialog?.orderNumber).toBe("ORD-101");
    expect(result.current.dialogOrder).toBe(mockOrder);
    expect(result.current.dialogHoldReason).toBe("Customer unreachable");
    expect(result.current.internalCourierOrderIds).toEqual(["101"]);
  });

  it("handles internal courier modal toggle and success callback correctly", () => {
    const { result } = renderHook(() =>
      usePreparationDialogState({
        getOrderByNumber,
        problemHoldDrafts: {},
        selectedOrders: ["ORD-101"],
        clearBulkControls,
        fetchAll,
        navigate,
      }),
    );

    act(() => {
      result.current.setShowInternalCourierModal(true);
    });
    expect(result.current.showInternalCourierModal).toBe(true);

    act(() => {
      result.current.handleInternalCourierSuccess("RUN-1", "RUN-1001");
    });

    expect(result.current.showInternalCourierModal).toBe(false);
    expect(toast.success).toHaveBeenCalledWith(expect.stringContaining("RUN-1001"));
    expect(clearBulkControls).toHaveBeenCalled();
    expect(fetchAll).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith("/shipping/delivery-runs");
  });
});
