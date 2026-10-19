import { renderHook, act } from "@testing-library/react";
import { useOrdersViewHelpers } from "./useOrdersViewHelpers";
import type { Order } from "../../../types/orders";

describe("useOrdersViewHelpers", () => {
  const navigate = jest.fn();
  const setSelectedOrder = jest.fn();
  const setShowOrderModal = jest.fn();
  const handleMarkAsViewed = jest.fn();
  const setOrders = jest.fn();
  const getCustomerDisplayName = jest.fn((o: Order) => o.customerName || "Customer");
  const formatPrice = jest.fn((p: number) => `$${p}`);
  const getOrderAmount = jest.fn((o: Order) => o.total || 0);
  const getOrderSourceText = jest.fn(() => "Web");
  const getRelativeTime = jest.fn(() => "5m ago");
  const formatDate = jest.fn(() => "2026-10-19");
  const getPaymentStatusBadgeStyle = jest.fn(() => ({}));
  const getPaymentStatusColor = jest.fn(() => "green");
  const getPaymentStatusText = jest.fn(() => "Paid");
  const getUnifiedStatusDisplay = jest.fn(() => ({ label: "Delivered" }));
  const getConfidenceColor = jest.fn(() => "green");
  const getConfidenceIcon = jest.fn(() => null);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const setup = () =>
    renderHook(() =>
      useOrdersViewHelpers({
        navigate,
        setSelectedOrder,
        setShowOrderModal,
        handleMarkAsViewed,
        setOrders,
        getCustomerDisplayName,
        formatPrice,
        getOrderAmount,
        getOrderSourceText,
        getRelativeTime,
        formatDate,
        getPaymentStatusBadgeStyle,
        getPaymentStatusColor,
        getPaymentStatusText,
        getUnifiedStatusDisplay,
        getConfidenceColor,
        getConfidenceIcon,
      }),
    );

  describe("handleOpenOrder", () => {
    it("navigates to incomplete cart page when order has isIncompleteCart metadata", () => {
      const { result } = setup();
      const incompleteOrder = {
        orderNumber: "ORD-INC",
        metadata: { isIncompleteCart: true, cartId: "cart-123" },
      } as unknown as Order;

      act(() => {
        result.current.handleOpenOrder(incompleteOrder);
      });

      expect(navigate).toHaveBeenCalledWith("/orders/incomplete/cart-123");
      expect(setSelectedOrder).not.toHaveBeenCalled();
      expect(setShowOrderModal).not.toHaveBeenCalled();
    });

    it("opens regular order modal and marks as viewed if not yet viewed", () => {
      const { result } = setup();
      const order = {
        orderNumber: "ORD-1",
        isViewed: false,
      } as unknown as Order;

      act(() => {
        result.current.handleOpenOrder(order);
      });

      expect(setSelectedOrder).toHaveBeenCalledWith(order);
      expect(setShowOrderModal).toHaveBeenCalledWith(true);
      expect(handleMarkAsViewed).toHaveBeenCalledWith("ORD-1");
    });

    it("does not call handleMarkAsViewed if order is already viewed", () => {
      const { result } = setup();
      const order = {
        orderNumber: "ORD-2",
        isViewed: true,
      } as unknown as Order;

      act(() => {
        result.current.handleOpenOrder(order);
      });

      expect(setSelectedOrder).toHaveBeenCalledWith(order);
      expect(setShowOrderModal).toHaveBeenCalledWith(true);
      expect(handleMarkAsViewed).not.toHaveBeenCalled();
    });
  });

  describe("handleCustomerRatingChange", () => {
    it("updates order customerRating in setOrders state updater", () => {
      const { result } = setup();
      act(() => {
        result.current.handleCustomerRatingChange("ORD-1", "VIP");
      });

      expect(setOrders).toHaveBeenCalled();
      const updater = setOrders.mock.calls[0][0];
      const prevOrders = [
        { orderNumber: "ORD-1", customerRating: "NORMAL", customer: { customerRating: "NORMAL" } } as unknown as Order,
        { orderNumber: "ORD-2", customerRating: "NORMAL" } as unknown as Order,
      ];
      const updated = updater(prevOrders);
      expect(updated[0].customerRating).toBe("VIP");
      expect(updated[0].customer?.customerRating).toBe("VIP");
      expect(updated[1].customerRating).toBe("NORMAL");
    });
  });

  describe("mobileListHelpers and tableHelpers", () => {
    it("assembles mobile and table helper bundles with matching methods", () => {
      const { result } = setup();
      expect(result.current.mobileListHelpers.getCustomerDisplayName).toBe(getCustomerDisplayName);
      expect(result.current.tableHelpers.getConfidenceColor).toBe(getConfidenceColor);
    });
  });
});
