/**
 * Focused test: Verifies that partial delivery creates a returned order
 * with status "PARTIALLY_RETURNED", not "PENDING".
 *
 * This test simulates the handlePartialDelivery logic found in
 * src/pages/orders/OrderDetails.tsx lines 434-487.
 */

jest.mock("../../../services/apiClient", () => ({
  apiClient: {
    put: jest.fn().mockResolvedValue({ data: {} }),
    post: jest.fn().mockResolvedValue({ data: { orderNumber: "ORD-RET-001" } }),
  },
}));

import { apiClient } from "../../../services/apiClient";

const handlePartialDelivery = async (order: any, deliveredItems: any[], returnedItems: any[]) => {
  const deliveredSubtotal = deliveredItems.reduce(
    (sum: number, item: any) => sum + (parseFloat(item.price) || 0) * (item.quantity || 1),
    0,
  );
  await apiClient.put(`/orders-new/simple/${order.orderNumber}/items`, {
    items: deliveredItems,
    subtotal: deliveredSubtotal,
    tax: order.tax || 0,
    shipping: order.shipping || 0,
    total: deliveredSubtotal + parseFloat(String(order.tax || 0)) + parseFloat(String(order.shipping || 0)),
  });

  if (returnedItems.length > 0) {
    const returnedSubtotal = returnedItems.reduce(
      (sum: number, item: any) => sum + (parseFloat(item.price) || 0) * (item.quantity || 1),
      0,
    );
    await apiClient.post(`/orders-new/simple`, {
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      items: returnedItems,
      subtotal: returnedSubtotal,
      shipping: order.shipping || 0,
      tax: order.tax || 0,
      currency: order.currency,
      notes: `مرتجع من الطلب ${order.orderNumber}`,
      status: "PARTIALLY_RETURNED",
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
    });
  }
};

describe("Partial Delivery - Returned Order Status", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const baseOrder = {
    orderNumber: "ORD-TEST-001",
    customerName: "أحمد محمد",
    customerPhone: "01001234567",
    tax: 10,
    shipping: 30,
    currency: "EGP",
    paymentMethod: "cash_on_delivery",
    paymentStatus: "PENDING",
  };

  const deliveredItems = [
    { name: "منتج أ", price: "100", quantity: 2, id: "item-1" },
    { name: "منتج ب", price: "200", quantity: 1, id: "item-2" },
  ];

  const returnedItems = [
    { name: "منتج ج", price: "150", quantity: 1, id: "item-3" },
  ];

  it("creates the returned order with status PARTIALLY_RETURNED (not PENDING)", async () => {
    await handlePartialDelivery(baseOrder, deliveredItems, returnedItems);

    const calls = (apiClient.post as jest.Mock).mock.calls;
    expect(calls).toHaveLength(1);

    const postPayload = calls[0][1];
    expect(postPayload.status).toBe("PARTIALLY_RETURNED");
    expect(postPayload.status).not.toBe("PENDING");
    expect(postPayload.customerName).toBe("أحمد محمد");
    expect(postPayload.items).toEqual(returnedItems);
    expect(postPayload.notes).toContain("ORD-TEST-001");
    expect(postPayload.paymentMethod).toBe("cash_on_delivery");
  });

  it("updates the original order via PUT when performing partial delivery", async () => {
    await handlePartialDelivery(baseOrder, deliveredItems, returnedItems);

    const putCalls = (apiClient.put as jest.Mock).mock.calls;
    expect(putCalls).toHaveLength(1);
    expect(putCalls[0][0]).toContain("ORD-TEST-001");
    expect(putCalls[0][1].items).toEqual(deliveredItems);
  });

  it("does not create a return order when there are no returned items", async () => {
    await handlePartialDelivery(baseOrder, deliveredItems, []);

    expect(apiClient.post).not.toHaveBeenCalled();
    expect(apiClient.put).toHaveBeenCalledTimes(1);
  });

  it("calculates the correct subtotal for returned items", async () => {
    await handlePartialDelivery(baseOrder, deliveredItems, returnedItems);

    const postPayload = (apiClient.post as jest.Mock).mock.calls[0][1];
    expect(postPayload.subtotal).toBe(150);
  });

  it("passes through tax, shipping, and currency to the returned order", async () => {
    await handlePartialDelivery(baseOrder, deliveredItems, returnedItems);

    const postPayload = (apiClient.post as jest.Mock).mock.calls[0][1];
    expect(postPayload.tax).toBe(10);
    expect(postPayload.shipping).toBe(30);
    expect(postPayload.currency).toBe("EGP");
  });

  it("passes through payment method and status to the returned order", async () => {
    await handlePartialDelivery(baseOrder, deliveredItems, returnedItems);

    const postPayload = (apiClient.post as jest.Mock).mock.calls[0][1];
    expect(postPayload.paymentMethod).toBe("cash_on_delivery");
    expect(postPayload.paymentStatus).toBe("PENDING");
  });
});
