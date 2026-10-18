import { renderHook, act } from "@testing-library/react";
import { usePreparationShortageOperations } from "./usePreparationShortageOperations";
import { apiClient } from "../../../services/apiClient";
import { toast } from "sonner";
import { SHORTAGE_FAILED_STATUS, SHORTAGE_HOLD_STATUS } from "./constants";
import type { SimpleOrder } from "./types";

jest.mock("../../../services/apiClient", () => ({
  apiClient: {
    put: jest.fn(),
  },
}));

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

const mockOrder: SimpleOrder = {
  id: "ord-1",
  orderNumber: "ORD-1001",
  customerName: "Ahmed Ali",
  customerPhone: "01012345678",
  status: "CONFIRMED",
  total: 500,
  items: [],
  createdAt: "2026-10-18T10:00:00Z",
  metadata: {},
};

describe("usePreparationShortageOperations", () => {
  const handleSingleStatusUpdate = jest.fn().mockResolvedValue(true);
  const updateLocalMetadata = jest.fn();
  const fetchAll = jest.fn();
  const getApiErrorMessage = jest.fn((err: any) => err?.message || "Error");
  const t = (k: string) => k;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("updates shortage draft field when handleShortageFieldChange is called", () => {
    const { result } = renderHook(() =>
      usePreparationShortageOperations({
        orders: [mockOrder],
        startingStatus: "CONFIRMED",
        updateLocalMetadata,
        fetchAll,
        handleSingleStatusUpdate,
        getApiErrorMessage,
        t,
      }),
    );

    act(() => {
      result.current.handleShortageFieldChange("ORD-1001", "reason", "منتج غير متوفر بالمخزن");
    });

    expect(result.current.shortageHoldDrafts["ORD-1001"]?.reason).toBe("منتج غير متوفر بالمخزن");
  });

  it("saves shortage hold details and updates local metadata", async () => {
    (apiClient.put as jest.Mock).mockResolvedValueOnce({ data: { success: true } });

    const { result } = renderHook(() =>
      usePreparationShortageOperations({
        orders: [mockOrder],
        startingStatus: "CONFIRMED",
        updateLocalMetadata,
        fetchAll,
        handleSingleStatusUpdate,
        getApiErrorMessage,
        t,
      }),
    );

    let saved = false;
    await act(async () => {
      saved = await result.current.saveShortageHoldDetails("ORD-1001", {
        reason: "Out of stock",
      });
    });

    expect(saved).toBe(true);
    expect(apiClient.put).toHaveBeenCalledWith(
      "/orders-new/simple/ORD-1001",
      expect.objectContaining({
        metadataPatch: expect.anything(),
      }),
    );
    expect(updateLocalMetadata).toHaveBeenCalledWith(
      "ORD-1001",
      expect.objectContaining({
        preparationShortageHold: expect.objectContaining({ reason: "Out of stock" }),
      }),
    );
    expect(toast.success).toHaveBeenCalled();
    expect(fetchAll).toHaveBeenCalled();
  });

  it("handles mark as shortage hold and transitions status", async () => {
    (apiClient.put as jest.Mock).mockResolvedValueOnce({ data: { success: true } });

    const { result } = renderHook(() =>
      usePreparationShortageOperations({
        orders: [mockOrder],
        startingStatus: "CONFIRMED",
        updateLocalMetadata,
        fetchAll,
        handleSingleStatusUpdate,
        getApiErrorMessage,
        t,
      }),
    );

    await act(async () => {
      await result.current.handleMarkAsShortageHold("ORD-1001");
    });

    expect(handleSingleStatusUpdate).toHaveBeenCalledWith("ORD-1001", SHORTAGE_HOLD_STATUS);
  });

  it("handles release shortage hold and transitions back to startingStatus", async () => {
    (apiClient.put as jest.Mock).mockResolvedValueOnce({ data: { success: true } });

    const { result } = renderHook(() =>
      usePreparationShortageOperations({
        orders: [mockOrder],
        startingStatus: "CONFIRMED",
        updateLocalMetadata,
        fetchAll,
        handleSingleStatusUpdate,
        getApiErrorMessage,
        t,
      }),
    );

    await act(async () => {
      await result.current.handleReleaseShortageHold("ORD-1001");
    });

    expect(handleSingleStatusUpdate).toHaveBeenCalledWith("ORD-1001", "CONFIRMED");
  });

  it("handles mark as shortage failed when user confirms prompt", async () => {
    jest.spyOn(window, "confirm").mockReturnValueOnce(true);
    (apiClient.put as jest.Mock).mockResolvedValueOnce({ data: { success: true } });

    const { result } = renderHook(() =>
      usePreparationShortageOperations({
        orders: [mockOrder],
        startingStatus: "CONFIRMED",
        updateLocalMetadata,
        fetchAll,
        handleSingleStatusUpdate,
        getApiErrorMessage,
        t,
      }),
    );

    await act(async () => {
      await result.current.handleMarkAsShortageFailed("ORD-1001");
    });

    expect(handleSingleStatusUpdate).toHaveBeenCalledWith("ORD-1001", SHORTAGE_FAILED_STATUS);
  });
});
