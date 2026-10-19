import { renderHook } from "@testing-library/react";
import { useOrdersViewDecorators } from "./useOrdersViewDecorators";
import type { OrderStatusDefinition } from "../ordersConstants";
import { DEFAULT_ORDERS_FILTERS } from "../ordersFilterTypes";

describe("useOrdersViewDecorators", () => {
  it("assembles and exposes entity formatters, status displays, and view helpers", () => {
    const t = (key: string) => key;
    const formatDate = (d: any) => String(d);
    const formatPrice = (p: any) => `$${p}`;
    const orderStatuses: OrderStatusDefinition[] = [];
    const paymentStatuses: Array<{ code: string; name: string }> = [];
    const orderStatusMap = new Map<string, OrderStatusDefinition>();
    const paymentStatusMap = new Map<string, { code: string; name: string }>();
    const normalizeStatusCode = (s?: string | null) => (s || "").toUpperCase();
    const navigate = jest.fn();
    const setSelectedOrder = jest.fn();
    const setShowOrderModal = jest.fn();
    const handleMarkAsViewed = jest.fn();
    const setOrders = jest.fn();

    const { result } = renderHook(() =>
      useOrdersViewDecorators({
        t,
        formatDate,
        formatPrice,
        orderStatuses,
        paymentStatuses,
        orderStatusMap,
        paymentStatusMap,
        filters: DEFAULT_ORDERS_FILTERS,
        showIncompleteInOrders: false,
        normalizeStatusCode,
        navigate,
        setSelectedOrder,
        setShowOrderModal,
        handleMarkAsViewed,
        setOrders,
      }),
    );

    expect(typeof result.current.getCustomerDisplayName).toBe("function");
    expect(typeof result.current.getUnifiedStatusDisplay).toBe("function");
    expect(typeof result.current.handleOpenOrder).toBe("function");
    expect(result.current.mobileListHelpers).toBeDefined();
    expect(result.current.tableHelpers).toBeDefined();
  });
});
