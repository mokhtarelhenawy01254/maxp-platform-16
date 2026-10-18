import { renderHook } from "@testing-library/react";
import { useOrdersSocketListeners } from "./useOrdersSocketListeners";
import { DEFAULT_ORDERS_FILTERS } from "../ordersFilterTypes";
import type { Socket } from "socket.io-client";
import type { Order } from "../utils/orderTransformer";

describe("useOrdersSocketListeners", () => {
  let mockSocket: Partial<Socket>;
  let listeners: Record<string, Function>;
  const mockSetOrders = jest.fn();
  const mockSetTotalOrders = jest.fn();
  const mockFetchOrdersRef = { current: jest.fn().mockResolvedValue(undefined) };
  const mockOrdersRef = { current: [] as Order[] };
  const mockFiltersRef = { current: { ...DEFAULT_ORDERS_FILTERS } };

  beforeEach(() => {
    listeners = {};
    mockSocket = {
      on: jest.fn((event: string, callback: Function) => {
        listeners[event] = callback;
        return mockSocket as Socket;
      }),
      off: jest.fn((event: string) => {
        delete listeners[event];
        return mockSocket as Socket;
      }),
    };
    jest.clearAllMocks();
    mockFiltersRef.current = { ...DEFAULT_ORDERS_FILTERS };
    mockOrdersRef.current = [];
  });

  it("does not bind socket events when disconnected or socket is null", () => {
    renderHook(() =>
      useOrdersSocketListeners({
        socket: null,
        isConnected: false,
        page: 1,
        limit: 20,
        filtersRef: mockFiltersRef,
        ordersRef: mockOrdersRef,
        fetchOrdersRef: mockFetchOrdersRef,
        setOrders: mockSetOrders,
        setTotalOrders: mockSetTotalOrders,
      }),
    );

    expect(mockSocket.on).not.toHaveBeenCalled();
  });

  it("binds socket events and cleans up on unmount when connected", () => {
    const { unmount } = renderHook(() =>
      useOrdersSocketListeners({
        socket: mockSocket as Socket,
        isConnected: true,
        page: 1,
        limit: 20,
        filtersRef: mockFiltersRef,
        ordersRef: mockOrdersRef,
        fetchOrdersRef: mockFetchOrdersRef,
        setOrders: mockSetOrders,
        setTotalOrders: mockSetTotalOrders,
      }),
    );

    expect(mockSocket.on).toHaveBeenCalledWith("order:created", expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith("order:updated", expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith("order:updated_bulk", expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith("order:deleted_bulk", expect.any(Function));

    unmount();

    expect(mockSocket.off).toHaveBeenCalledWith("order:created", expect.any(Function));
    expect(mockSocket.off).toHaveBeenCalledWith("order:updated", expect.any(Function));
    expect(mockSocket.off).toHaveBeenCalledWith("order:updated_bulk", expect.any(Function));
    expect(mockSocket.off).toHaveBeenCalledWith("order:deleted_bulk", expect.any(Function));
  });

  it("handles new order on page 1 without filters by prepending order", () => {
    renderHook(() =>
      useOrdersSocketListeners({
        socket: mockSocket as Socket,
        isConnected: true,
        page: 1,
        limit: 20,
        filtersRef: mockFiltersRef,
        ordersRef: mockOrdersRef,
        fetchOrdersRef: mockFetchOrdersRef,
        setOrders: mockSetOrders,
        setTotalOrders: mockSetTotalOrders,
      }),
    );

    const newRawOrder = {
      id: "ord-99",
      orderNumber: "ORD-99",
      totalAmount: 300,
    };

    listeners["order:created"](newRawOrder);

    expect(mockSetOrders).toHaveBeenCalled();
    const updater = mockSetOrders.mock.calls[0][0];
    const prevOrders = [{ orderNumber: "ORD-1" }] as Order[];
    const result = updater(prevOrders);
    expect(result[0].orderNumber).toBe("ORD-99");
    expect(mockSetTotalOrders).toHaveBeenCalled();
  });

  it("triggers fetchOrdersRef when new order arrives and active filters are present", () => {
    mockFiltersRef.current.search = "Ahmed";

    renderHook(() =>
      useOrdersSocketListeners({
        socket: mockSocket as Socket,
        isConnected: true,
        page: 1,
        limit: 20,
        filtersRef: mockFiltersRef,
        ordersRef: mockOrdersRef,
        fetchOrdersRef: mockFetchOrdersRef,
        setOrders: mockSetOrders,
        setTotalOrders: mockSetTotalOrders,
      }),
    );

    listeners["order:created"]({ id: "ord-99", orderNumber: "ORD-99" });

    expect(mockFetchOrdersRef.current).toHaveBeenCalled();
    expect(mockSetOrders).not.toHaveBeenCalled();
  });

  it("handles order update merging updated data or refetching if _refetch is true", () => {
    renderHook(() =>
      useOrdersSocketListeners({
        socket: mockSocket as Socket,
        isConnected: true,
        page: 1,
        limit: 20,
        filtersRef: mockFiltersRef,
        ordersRef: mockOrdersRef,
        fetchOrdersRef: mockFetchOrdersRef,
        setOrders: mockSetOrders,
        setTotalOrders: mockSetTotalOrders,
      }),
    );

    // Case 1: _refetch: true
    listeners["order:updated"]({ orderNumber: "ORD-10", _refetch: true });
    expect(mockFetchOrdersRef.current).toHaveBeenCalled();

    // Case 2: standard merge update
    listeners["order:updated"]({ orderNumber: "ORD-10", status: "completed" });
    expect(mockSetOrders).toHaveBeenCalled();
    const updater = mockSetOrders.mock.calls[0][0];
    const existing = [{ orderNumber: "ORD-10", status: "pending" }] as Order[];
    const updated = updater(existing);
    expect(updated[0].status).toBe("completed");
  });

  it("calls fetchOrdersRef on bulk update and bulk delete", () => {
    renderHook(() =>
      useOrdersSocketListeners({
        socket: mockSocket as Socket,
        isConnected: true,
        page: 1,
        limit: 20,
        filtersRef: mockFiltersRef,
        ordersRef: mockOrdersRef,
        fetchOrdersRef: mockFetchOrdersRef,
        setOrders: mockSetOrders,
        setTotalOrders: mockSetTotalOrders,
      }),
    );

    listeners["order:updated_bulk"]();
    expect(mockFetchOrdersRef.current).toHaveBeenCalledTimes(1);

    listeners["order:deleted_bulk"]();
    expect(mockFetchOrdersRef.current).toHaveBeenCalledTimes(2);
  });
});
