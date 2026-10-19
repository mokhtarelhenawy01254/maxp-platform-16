import { renderHook, act } from "@testing-library/react";
import { useOrdersSingleMutations } from "./useOrdersSingleMutations";
import { apiClient } from "../../../services/apiClient";
import { toast } from "sonner";
import type { Order } from "../../../types/orders";

jest.mock("../../../services/apiClient", () => ({
  apiClient: {
    post: jest.fn(),
    get: jest.fn(),
  },
}));
jest.mock("sonner");

describe("useOrdersSingleMutations", () => {
  const sampleOrders: Order[] = [
    {
      id: "ord-1",
      orderNumber: "ORD-1",
      status: "CONFIRMED",
      paymentStatus: "PENDING",
      isViewed: false,
    } as unknown as Order,
  ];

  let currentOrders: Order[];
  let currentSelectedOrder: Order | null;
  let setOrders: jest.Mock;
  let setSelectedOrder: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    currentOrders = [...sampleOrders];
    currentSelectedOrder = { ...sampleOrders[0] };
    setOrders = jest.fn((updater) => {
      currentOrders = typeof updater === "function" ? updater(currentOrders) : updater;
    });
    setSelectedOrder = jest.fn((updater) => {
      currentSelectedOrder = typeof updater === "function" ? updater(currentSelectedOrder) : updater;
    });
  });

  const setup = () => {
    return renderHook(() =>
      useOrdersSingleMutations({
        orders: currentOrders,
        setOrders,
        selectedOrder: currentSelectedOrder,
        setSelectedOrder,
        normalizeStatusCode: (c) => String(c || "").toUpperCase(),
        isCancellationStatus: (s) => s === "CANCELLED",
        getApiErrorMessage: (_e, fallback) => fallback,
        t: (k) => k,
      }),
    );
  };

  test("handleUpdateStatus updates status successfully with API call", async () => {
    (apiClient.post as jest.Mock).mockResolvedValueOnce({
      data: { success: true },
    });

    const { result } = setup();

    await act(async () => {
      await result.current.handleUpdateStatus("ORD-1", "PREPARING");
    });

    expect(setOrders).toHaveBeenCalled();
    expect(apiClient.post).toHaveBeenCalledWith(
      "/orders-new/simple/ORD-1/status",
      {
        status: "PREPARING",
        notes: "",
      },
    );
  });

  test("handleUpdateStatus requires reason for cancellation status", async () => {
    const promptSpy = jest.spyOn(window, "prompt").mockReturnValueOnce("");

    const { result } = setup();

    await act(async () => {
      await result.current.handleUpdateStatus("ORD-1", "CANCELLED");
    });

    expect(toast.error).toHaveBeenCalledWith("orders.cancellationReasonRequired");
    expect(apiClient.post).not.toHaveBeenCalled();

    promptSpy.mockRestore();
  });

  test("handleUpdateStatus rolls back state on API failure", async () => {
    (apiClient.post as jest.Mock).mockResolvedValueOnce({
      data: { success: false, message: "Server error" },
    });

    const { result } = setup();

    await act(async () => {
      await result.current.handleUpdateStatus("ORD-1", "PREPARING");
    });

    // Rolled back
    expect(toast.error).toHaveBeenCalledWith("Server error");
  });

  test("handleUpdatePaymentStatus updates payment status optimistically", async () => {
    (apiClient.post as jest.Mock).mockResolvedValueOnce({
      data: { success: true },
    });

    const { result } = setup();

    await act(async () => {
      await result.current.handleUpdatePaymentStatus("ORD-1", "PAID");
    });

    expect(setOrders).toHaveBeenCalled();
    expect(apiClient.post).toHaveBeenCalledWith(
      "/orders-new/simple/ORD-1/payment-status",
      {
        paymentStatus: "PAID",
      },
    );
  });

  test("handleMarkAsViewed marks order as viewed in local state and API", async () => {
    (apiClient.post as jest.Mock).mockResolvedValueOnce({
      data: { success: true },
    });

    const { result } = setup();

    await act(async () => {
      await result.current.handleMarkAsViewed("ORD-1");
    });

    expect(setOrders).toHaveBeenCalled();
    expect(apiClient.post).toHaveBeenCalledWith(
      "/orders-new/simple/ORD-1/viewed",
    );
  });
});
