import { renderHook, act } from "@testing-library/react";
import { useOrderDetailsSave } from "./useOrderDetailsSave";
import { apiClient } from "../../../services/apiClient";

jest.mock("../../../services/apiClient", () => ({
  apiClient: {
    put: jest.fn(),
    post: jest.fn(),
  },
}));

jest.mock("../../../utils/i18n-toast", () => ({
  tToast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock("../../../utils/validation", () => ({
  validateCustomerName: jest.fn(() => ({ isValid: true })),
  validateEgyptianPhone: jest.fn(() => ({ isValid: true })),
  validateOrderItems: jest.fn(() => ({ isValid: true })),
}));

describe("useOrderDetailsSave", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("saves order details and items successfully", async () => {
    (apiClient.put as jest.Mock).mockResolvedValue({
      data: { success: true },
    });
    const fetchOrderDetails = jest.fn().mockResolvedValue(undefined);
    const setUpdating = jest.fn();

    const { result } = renderHook(() =>
      useOrderDetailsSave({
        order: { orderNumber: "ORD-1", customerName: "Ahmed" } as any,
        orderNumber: "ORD-1",
        encodedOrderNumber: "ORD-1",
        fetchOrderDetails,
        setUpdating,
      }),
    );

    act(() => {
      result.current.setIsEditing(true);
      result.current.setEditForm({
        customerName: "Ahmed",
        customerPhone: "01000000000",
        alternativePhone: "",
        customerAddress: "Nasr City",
        city: "Cairo",
        governorate: "Cairo",
        notes: "Deliver morning",
        items: [{ id: "1", productId: "p1", name: "Item", price: 10, quantity: 2 }],
        shipping: 10,
        tax: 0,
        discount: 0,
        discountReason: "",
        customerRating: "GOOD",
      });
    });

    let ok = false;
    await act(async () => {
      ok = await result.current.saveChanges();
    });

    expect(ok).toBe(true);
    expect(result.current.isEditing).toBe(false);
    expect(fetchOrderDetails).toHaveBeenCalled();
  });

  it("handles discount approval correctly", async () => {
    (apiClient.post as jest.Mock).mockResolvedValueOnce({
      data: { success: true },
    });
    const fetchOrderDetails = jest.fn().mockResolvedValue(undefined);
    const setUpdating = jest.fn();

    const { result } = renderHook(() =>
      useOrderDetailsSave({
        order: { orderNumber: "ORD-1" } as any,
        orderNumber: "ORD-1",
        encodedOrderNumber: "ORD-1",
        fetchOrderDetails,
        setUpdating,
      }),
    );

    await act(async () => {
      await result.current.handleDiscountApproval("APPROVE");
    });

    expect(apiClient.post).toHaveBeenCalledWith(
      "/orders-new/simple/ORD-1/discount-approval",
      { action: "APPROVE", reason: undefined },
    );
    expect(fetchOrderDetails).toHaveBeenCalled();
  });
});
