import { renderHook, act } from "@testing-library/react";
import {
  useOrderStatusOperations,
  isCancellationStatus,
  getLatestCancellationReason,
} from "./useOrderStatusOperations";
import { cancellationService } from "../../../services/cancellationService";
import type { OrderDetailsType } from "../types";

jest.mock("../../../services/cancellationService", () => ({
  cancellationService: {
    getReasons: jest.fn(),
  },
}));

describe("useOrderStatusOperations", () => {
  const mockOrder: OrderDetailsType = {
    id: "ord-1",
    orderNumber: "ORD-001",
    status: "PENDING",
  } as any;

  const mockUpdateStatus = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (cancellationService.getReasons as jest.Mock).mockResolvedValue({
      data: [],
    });
  });

  it("ignores handleQuickStatusSelect when canUpdateOrderStatus is false", async () => {
    const { result } = renderHook(() =>
      useOrderStatusOperations({
        order: mockOrder,
        canUpdateOrderStatus: false,
        updateStatus: mockUpdateStatus,
      }),
    );

    await act(async () => {
      await result.current.handleQuickStatusSelect("CONFIRMED");
    });

    expect(mockUpdateStatus).not.toHaveBeenCalled();
    expect(result.current.showStatusModal).toBe(false);
  });

  it("opens status modal when selected status is a cancellation or return status", async () => {
    const { result } = renderHook(() =>
      useOrderStatusOperations({
        order: mockOrder,
        canUpdateOrderStatus: true,
        updateStatus: mockUpdateStatus,
      }),
    );

    await act(async () => {
      await result.current.handleQuickStatusSelect("CANCELLED");
    });

    expect(result.current.showStatusModal).toBe(true);
    expect(result.current.newStatus).toBe("CANCELLED");
    expect(result.current.isModalCancellationStatus).toBe(true);
    expect(mockUpdateStatus).not.toHaveBeenCalled();
  });

  it("updates status directly when selected status is standard forward status", async () => {
    mockUpdateStatus.mockResolvedValue(true);

    const { result } = renderHook(() =>
      useOrderStatusOperations({
        order: mockOrder,
        canUpdateOrderStatus: true,
        updateStatus: mockUpdateStatus,
      }),
    );

    await act(async () => {
      await result.current.handleQuickStatusSelect("CONFIRMED");
    });

    expect(mockUpdateStatus).toHaveBeenCalledWith("CONFIRMED", "", false);
    expect(result.current.showStatusModal).toBe(false);
  });

  it("submits status update and resets modal state on onUpdateStatus", async () => {
    mockUpdateStatus.mockResolvedValue(true);

    const { result } = renderHook(() =>
      useOrderStatusOperations({
        order: mockOrder,
        canUpdateOrderStatus: true,
        updateStatus: mockUpdateStatus,
      }),
    );

    act(() => {
      result.current.setShowStatusModal(true);
      result.current.setNewStatus("CANCELLED");
      result.current.setStatusNotes("Customer changed mind");
      result.current.setCancellationAdditionalNotes("Refused at doorstep");
    });

    await act(async () => {
      await result.current.onUpdateStatus();
    });

    expect(mockUpdateStatus).toHaveBeenCalledWith(
      "CANCELLED",
      "Customer changed mind\nRefused at doorstep",
      false,
    );
    expect(result.current.showStatusModal).toBe(false);
    expect(result.current.newStatus).toBe("");
    expect(result.current.statusNotes).toBe("");
  });

  it("loads cancellation reasons when cancellation modal opens", async () => {
    (cancellationService.getReasons as jest.Mock).mockResolvedValue({
      data: [{ id: "r1", reason: "Out of Stock" }],
    });

    const { result, rerender } = renderHook(
      (props) => useOrderStatusOperations(props),
      {
        initialProps: {
          order: mockOrder,
          canUpdateOrderStatus: true,
          updateStatus: mockUpdateStatus,
        },
      },
    );

    act(() => {
      result.current.setNewStatus("CANCELLED");
      result.current.setShowStatusModal(true);
    });

    rerender({
      order: mockOrder,
      canUpdateOrderStatus: true,
      updateStatus: mockUpdateStatus,
    });

    // Wait for resolution
    await act(async () => {
      await Promise.resolve();
    });

    expect(cancellationService.getReasons).toHaveBeenCalled();
  });

  describe("getLatestCancellationReason", () => {
    it("returns empty string when order is null or undefined", () => {
      expect(getLatestCancellationReason(null)).toBe("");
      expect(getLatestCancellationReason(undefined)).toBe("");
    });

    it("returns cancellationReason when present on order", () => {
      const order = { cancellationReason: "Customer canceled via chat" } as any;
      expect(getLatestCancellationReason(order)).toBe("Customer canceled via chat");
    });

    it("extracts reason from statusHistory when available", () => {
      const order = {
        statusHistory: [
          { status: "PENDING", reason: "" },
          { status: "CANCELLED", reason: "Out of area" },
        ],
      } as any;
      expect(getLatestCancellationReason(order)).toBe("Out of area");
    });

    it("falls back to order.notes when order is in cancellation status", () => {
      const order = {
        status: "CANCELLED",
        notes: "Delayed delivery refusal",
      } as any;
      expect(getLatestCancellationReason(order)).toBe("Delayed delivery refusal");
    });
  });

  describe("isCancellationStatus", () => {
    it("identifies CANCELLED and CANCELED accurately", () => {
      expect(isCancellationStatus("CANCELLED")).toBe(true);
      expect(isCancellationStatus("cancelled")).toBe(true);
      expect(isCancellationStatus("CANCELED")).toBe(true);
      expect(isCancellationStatus("DELIVERED")).toBe(false);
      expect(isCancellationStatus(null)).toBe(false);
    });
  });
});
