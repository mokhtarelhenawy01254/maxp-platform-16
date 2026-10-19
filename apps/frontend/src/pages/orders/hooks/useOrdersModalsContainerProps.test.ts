import { renderHook, act } from "@testing-library/react";
import { useOrdersModalsContainerProps } from "./useOrdersModalsContainerProps";
import type { Order } from "../utils/orderTransformer";

describe("useOrdersModalsContainerProps", () => {
  it("assembles props and correctly updates orders state via onOrderUpdate", () => {
    const setSelectedOrder = jest.fn();
    const setShowOrderModal = jest.fn();
    const setOrders = jest.fn();
    const setSelectedInvoice = jest.fn();

    const sampleOrder = { orderNumber: "ORD-1", total: 100 } as Order;
    const sampleUpdatedOrder = { orderNumber: "ORD-1", total: 150 } as Order;

    const { result } = renderHook(() =>
      useOrdersModalsContainerProps({
        selectedOrder: sampleOrder,
        setSelectedOrder,
        showOrderModal: true,
        setShowOrderModal,
        isMerchant: false,
        orderStatuses: [],
        orders: [sampleOrder],
        setOrders,
        selectedInvoice: null,
        setSelectedInvoice,
      }),
    );

    expect(result.current.selectedOrder).toBe(sampleOrder);
    expect(result.current.showOrderModal).toBe(true);
    expect(result.current.isMerchant).toBe(false);

    act(() => {
      result.current.onOrderUpdate(sampleUpdatedOrder);
    });

    expect(setSelectedOrder).toHaveBeenCalledWith(sampleUpdatedOrder);
    expect(setOrders).toHaveBeenCalled();

    // Verify functional update updater logic
    const updater = setOrders.mock.calls[0][0];
    const prevOrders = [sampleOrder, { orderNumber: "ORD-2", total: 50 } as Order];
    const newOrders = updater(prevOrders);
    expect(newOrders[0].total).toBe(150);
    expect(newOrders[1].total).toBe(50);
  });

  it("handles onOrderUpdate when updated order is not present in orders list", () => {
    const setSelectedOrder = jest.fn();
    const setOrders = jest.fn();
    const existingOrder = { orderNumber: "ORD-100", total: 200 } as Order;
    const foreignOrder = { orderNumber: "ORD-999", total: 300 } as Order;

    const { result } = renderHook(() =>
      useOrdersModalsContainerProps({
        selectedOrder: null,
        setSelectedOrder,
        showOrderModal: false,
        setShowOrderModal: jest.fn(),
        isMerchant: true,
        orderStatuses: [],
        orders: [existingOrder],
        setOrders,
        selectedInvoice: null,
        setSelectedInvoice: jest.fn(),
      }),
    );

    act(() => {
      result.current.onOrderUpdate(foreignOrder);
    });

    expect(setSelectedOrder).toHaveBeenCalledWith(foreignOrder);
    const updater = setOrders.mock.calls[0][0];
    const outcome = updater([existingOrder]);
    expect(outcome).toHaveLength(1);
    expect(outcome[0].orderNumber).toBe("ORD-100");
  });

  it("safely handles empty orders array without exceptions", () => {
    const setSelectedOrder = jest.fn();
    const setOrders = jest.fn();
    const newOrder = { orderNumber: "ORD-EMPTY", total: 50 } as Order;

    const { result } = renderHook(() =>
      useOrdersModalsContainerProps({
        selectedOrder: null,
        setSelectedOrder,
        showOrderModal: false,
        setShowOrderModal: jest.fn(),
        isMerchant: false,
        orderStatuses: [],
        orders: [],
        setOrders,
        selectedInvoice: null,
        setSelectedInvoice: jest.fn(),
      }),
    );

    act(() => {
      result.current.onOrderUpdate(newOrder);
    });

    expect(setSelectedOrder).toHaveBeenCalledWith(newOrder);
    const updater = setOrders.mock.calls[0][0];
    const outcome = updater([]);
    expect(outcome).toEqual([]);
  });
});
