import { renderHook, act } from "@testing-library/react";
import { useOrderDetails } from "./useOrderDetails";
import { apiClient } from "../../../services/apiClient";
import orderWorkflowService from "../../../services/orderWorkflowService";

jest.mock("../../../hooks/useAuthSimple", () => ({
  useAuth: () => ({
    isLoading: false,
    isAuthenticated: true,
  }),
}));

jest.mock("../../../services/apiClient", () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock("../../../services/orderWorkflowService", () => ({
  getAllowedTransitions: jest.fn(),
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

describe("useOrderDetails", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("fetches order details and initializes lookups and edit form", async () => {
    (apiClient.get as jest.Mock).mockImplementation((url: string) => {
      if (url.includes("/orders-new/simple/ORD-100")) {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              orderNumber: "ORD-100",
              customerName: "Mohamed Ali",
              status: "confirmed",
              items: [],
            },
          },
        });
      }
      if (url.includes("/order-status")) {
        return Promise.resolve({
          data: { success: true, data: [{ code: "CONFIRMED", name: "مؤكد" }] },
        });
      }
      return Promise.resolve({ data: { success: true } });
    });

    (apiClient.post as jest.Mock).mockResolvedValue({ data: { success: true } });
    (orderWorkflowService.getAllowedTransitions as jest.Mock).mockResolvedValue({
      success: true,
      data: [{ code: "PROCESSING", name: "قيد التجهيز" }],
    });

    const { result } = renderHook(() => useOrderDetails("ORD-100"));

    await act(async () => {
      await result.current.fetchOrderDetails();
    });

    expect(result.current.order?.orderNumber).toBe("ORD-100");
    expect(result.current.editForm.customerName).toBe("Mohamed Ali");
  });

  it("updates order status successfully", async () => {
    (apiClient.post as jest.Mock).mockResolvedValueOnce({
      data: { success: true, message: "تم تحديث الحالة" },
    });
    (apiClient.get as jest.Mock).mockResolvedValue({
      data: {
        success: true,
        data: { orderNumber: "ORD-100", status: "SHIPPED", items: [] },
      },
    });

    const { result } = renderHook(() => useOrderDetails("ORD-100"));

    let ok = false;
    await act(async () => {
      ok = await result.current.updateStatus("SHIPPED", "Dispatched to hub");
    });

    expect(ok).toBe(true);
    expect(apiClient.post).toHaveBeenCalledWith(
      "/orders-new/simple/ORD-100/status",
      { status: "SHIPPED", notes: "Dispatched to hub", isOverride: false },
    );
  });
});
