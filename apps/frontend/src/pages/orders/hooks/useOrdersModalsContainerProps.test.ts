import { renderHook, act } from "@testing-library/react";
import { useOrdersModalsContainerProps } from "./useOrdersModalsContainerProps";
import type { Order } from "../Orders";

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
});
