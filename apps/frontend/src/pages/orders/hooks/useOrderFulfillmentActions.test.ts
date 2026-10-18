import { renderHook, act } from "@testing-library/react";
import { useOrderFulfillmentActions } from "./useOrderFulfillmentActions";
import { apiClient } from "../../../services/apiClient";
import { toast } from "sonner";
import type { OrderDetailsType } from "../types";

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
  },
}));

describe("useOrderFulfillmentActions", () => {
  const mockOrder: OrderDetailsType = {
    id: "ord-1",
    orderNumber: "ORD-001",
    customerName: "Mohamed",
    customerPhone: "01012345678",
    status: "PROCESSING",
    subtotal: 500,
    shipping: 50,
    tax: 10,
    total: 560,
    currency: "EGP",
    items: [
      { id: "item-1", name: "Shirt", price: 200, quantity: 2 },
      { id: "item-2", name: "Pants", price: 100, quantity: 1 },
    ],
  } as any;

  const mockFetchOrderDetails = jest.fn();
  const mockUpdateStatus = jest.fn();
  const mockT = jest.fn((key) => key);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("handles handlePostponeOrder successfully", async () => {
    (apiClient.post as jest.Mock).mockResolvedValue({
      data: { success: true },
    });

    const { result } = renderHook(() =>
      useOrderFulfillmentActions({
        order: mockOrder,
        fetchOrderDetails: mockFetchOrderDetails,
        updateStatus: mockUpdateStatus,
        t: mockT,
      }),
    );

    act(() => {
      result.current.setShowPostponeModal(true);
    });
    expect(result.current.showPostponeModal).toBe(true);

    await act(async () => {
      await result.current.handlePostponeOrder({
        scheduledDeliveryDate: "2026-11-01",
        scheduledNotes: "Customer requested next week",
        autoTransitionEnabled: true,
      });
    });

    expect(apiClient.post).toHaveBeenCalledWith(
      "/orders-new/simple/ORD-001/schedule",
      {
        scheduledDeliveryDate: "2026-11-01",
        scheduledNotes: "Customer requested next week",
        autoTransitionEnabled: true,
        changeStatusToScheduled: true,
      },
    );
    expect(result.current.showPostponeModal).toBe(false);
    expect(mockFetchOrderDetails).toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith("orderDetails.orderPostponed");
  });

  it("handles handlePostponeOrder failure", async () => {
    (apiClient.post as jest.Mock).mockRejectedValue({
      response: { data: { message: "Schedule failed" } },
    });

    const { result } = renderHook(() =>
      useOrderFulfillmentActions({
        order: mockOrder,
        fetchOrderDetails: mockFetchOrderDetails,
        updateStatus: mockUpdateStatus,
        t: mockT,
      }),
    );

    await act(async () => {
      await result.current.handlePostponeOrder({
        scheduledDeliveryDate: "2026-11-01",
        scheduledNotes: "",
        autoTransitionEnabled: false,
      });
    });

    expect(toast.error).toHaveBeenCalledWith("Schedule failed");
    expect(result.current.postponing).toBe(false);
  });

  it("handles handlePartialDelivery with delivered and returned items", async () => {
    (apiClient.put as jest.Mock).mockResolvedValue({ data: { success: true } });
    (apiClient.post as jest.Mock).mockResolvedValue({ data: { success: true } });
    mockUpdateStatus.mockResolvedValue(true);

    const { result } = renderHook(() =>
      useOrderFulfillmentActions({
        order: mockOrder,
        fetchOrderDetails: mockFetchOrderDetails,
        updateStatus: mockUpdateStatus,
        t: mockT,
      }),
    );

    act(() => {
      result.current.setShowPartialDeliveryModal(true);
    });

    const delivered = [{ id: "item-1", name: "Shirt", price: 200, quantity: 1 }];
    const returned = [{ id: "item-2", name: "Pants", price: 100, quantity: 1 }];

    await act(async () => {
      await result.current.handlePartialDelivery(delivered, returned);
    });

    // Step 1 put items
    expect(apiClient.put).toHaveBeenCalledWith(
      "/orders-new/simple/ORD-001/items",
      expect.objectContaining({
        items: delivered,
        subtotal: 200,
      }),
    );
    expect(mockUpdateStatus).toHaveBeenCalledWith(
      "PARTIALLY_DELIVERED",
      "orderDetails.partialDeliveryNote",
    );

    // Step 2 post returned
    expect(apiClient.post).toHaveBeenCalledWith(
      "/orders-new/simple",
      expect.objectContaining({
        items: returned,
        subtotal: 100,
        status: "PARTIALLY_RETURNED",
      }),
    );

    expect(result.current.showPartialDeliveryModal).toBe(false);
    expect(mockFetchOrderDetails).toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith(
      "orderDetails.partialDeliverySuccessWithReturn",
    );
  });
});
