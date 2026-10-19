import { renderHook, act } from "@testing-library/react";
import { useTurboShipping } from "./useTurboShipping";
import { apiClient } from "../../../services/apiClient";

jest.mock("../../../config", () => ({
  config: {
    apiUrl: "https://api.example.com",
  },
}));

jest.mock("../../../utils/tokenManager", () => ({
  getAccessToken: () => "mock-token",
}));

jest.mock("../../../services/apiClient", () => ({
  apiClient: {
    post: jest.fn(),
    put: jest.fn(),
  },
}));

jest.mock("../../../hooks/useAuthSimple", () => ({
  useAuth: () => ({ user: { id: "u-1", companyId: "c-1" } }),
}));

jest.mock("../../../services/socketService", () => ({
  socketService: {
    isConnected: () => false,
    connect: jest.fn(),
    getSocket: () => null,
  },
}));

jest.mock("sonner", () => ({
  toast: {
    info: jest.fn(),
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe("useTurboShipping", () => {
  const mockSetOrder = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("initializes with default state", () => {
    const { result } = renderHook(() =>
      useTurboShipping(
        { id: "ord-1", shippingCost: 80, shipping: 60 },
        mockSetOrder,
      ),
    );

    expect(result.current.turboLoading).toBe(false);
    expect(result.current.turboTrackingData).toBeNull();
    expect(result.current.shippingComparison).toEqual({
      actualCost: 80,
      customerCost: 60,
      difference: 20,
    });
  });

  it("creates shipment successfully and updates order", async () => {
    (apiClient.post as jest.Mock).mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          shipmentId: "turb-ship-1",
          trackingNumber: "TRK-999",
          status: "created",
          labelUrl: "https://turbo.eg/label/999",
        },
      },
    });

    const { result } = renderHook(() =>
      useTurboShipping(
        { id: "ord-1", orderNumber: "ORD-1" },
        mockSetOrder,
      ),
    );

    let res: any;
    await act(async () => {
      res = await result.current.createShipment();
    });

    expect(res).toEqual({
      success: true,
      trackingNumber: "TRK-999",
    });
    expect(apiClient.post).toHaveBeenCalledWith(
      "/turbo/orders/ord-1/shipment",
      undefined,
    );
    expect(mockSetOrder).toHaveBeenCalled();
  });

  it("cancels shipment successfully", async () => {
    (apiClient.post as jest.Mock).mockResolvedValueOnce({
      data: { success: true },
    });

    const { result } = renderHook(() =>
      useTurboShipping(
        { id: "ord-1", turboShipmentId: "turb-ship-1" },
        mockSetOrder,
      ),
    );

    let res: boolean = false;
    await act(async () => {
      res = await result.current.cancelShipment();
    });

    expect(res).toBe(true);
    expect(apiClient.post).toHaveBeenCalledWith("/turbo/orders/ord-1/cancel");
  });

  it("unlinks shipment successfully", async () => {
    (apiClient.post as jest.Mock).mockResolvedValueOnce({
      data: { success: true },
    });

    const { result } = renderHook(() =>
      useTurboShipping(
        { id: "ord-1", orderNumber: "ORD-1", turboShipmentId: "turb-ship-1" },
        mockSetOrder,
      ),
    );

    let res: boolean = false;
    await act(async () => {
      res = await result.current.unlinkShipment();
    });

    expect(res).toBe(true);
    expect(apiClient.post).toHaveBeenCalledWith("/turbo/orders/ord-1/unlink");
    expect(result.current.turboTrackingData).toBeNull();
    expect(result.current.shippingComparison).toBeNull();
  });
});
