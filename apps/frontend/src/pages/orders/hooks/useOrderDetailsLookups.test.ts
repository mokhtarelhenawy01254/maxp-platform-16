import { renderHook, act } from "@testing-library/react";
import { useOrderDetailsLookups } from "./useOrderDetailsLookups";
import { apiClient } from "../../../services/apiClient";
import orderWorkflowService from "../../../services/orderWorkflowService";

jest.mock("../../../services/apiClient", () => ({
  apiClient: {
    get: jest.fn(),
  },
}));

jest.mock("../../../services/orderWorkflowService", () => ({
  getAllowedTransitions: jest.fn(),
}));

describe("useOrderDetailsLookups", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("fetches order statuses with fallback if empty", async () => {
    (apiClient.get as jest.Mock).mockResolvedValueOnce({
      data: { success: true, data: [{ code: "PENDING", name: "قيد الانتظار" }] },
    });

    const { result } = renderHook(() =>
      useOrderDetailsLookups({
        order: null,
        isEditing: false,
        authLoading: false,
        isAuthenticated: true,
      }),
    );

    await act(async () => {
      await result.current.fetchOrderStatuses();
    });

    expect(result.current.orderStatuses).toEqual([
      { code: "PENDING", name: "قيد الانتظار" },
    ]);
  });

  it("fetches payment statuses correctly", async () => {
    (apiClient.get as jest.Mock).mockResolvedValueOnce({
      data: { success: true, data: [{ code: "COMPLETED", name: "مدفوع" }] },
    });

    const { result } = renderHook(() =>
      useOrderDetailsLookups({
        order: null,
        isEditing: false,
        authLoading: false,
        isAuthenticated: true,
      }),
    );

    await act(async () => {
      await result.current.fetchPaymentStatuses();
    });

    expect(result.current.paymentStatuses).toEqual([
      { code: "COMPLETED", name: "مدفوع" },
    ]);
  });

  it("handles allowed workflow transitions", async () => {
    (orderWorkflowService.getAllowedTransitions as jest.Mock).mockResolvedValueOnce({
      success: true,
      data: [{ code: "SHIPPED", name: "تم الشحن" }],
    });

    const { result } = renderHook(() =>
      useOrderDetailsLookups({
        order: null,
        isEditing: false,
        authLoading: false,
        isAuthenticated: true,
      }),
    );

    await act(async () => {
      await result.current.fetchAllowedTransitions("PROCESSING");
    });

    expect(result.current.allowedTransitions).toEqual(["SHIPPED"]);
  });

  it("handles government change and triggers areas fetch", async () => {
    (apiClient.get as jest.Mock).mockImplementation((url: string) => {
      if (url.includes("/turbo/areas/")) {
        return Promise.resolve({
          data: { success: true, data: { areas: [{ id: 1, name: "Maadi" }] } },
        });
      }
      return Promise.resolve({
        data: { success: true, data: { governments: [] } },
      });
    });

    const onGovSelect = jest.fn();
    const { result } = renderHook(() =>
      useOrderDetailsLookups({
        order: null,
        isEditing: false,
        authLoading: false,
        isAuthenticated: true,
        onGovernmentSelect: onGovSelect,
      }),
    );

    await act(async () => {
      await result.current.handleGovernmentChange(12, "Cairo");
    });

    expect(result.current.selectedGovernmentId).toBe(12);
    expect(onGovSelect).toHaveBeenCalledWith("Cairo");
    expect(result.current.areas).toEqual([{ id: 1, name: "Maadi" }]);
  });
});
