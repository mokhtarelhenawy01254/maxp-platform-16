import { renderHook } from "@testing-library/react";
import { useOrderPermissionsAndApps } from "./useOrderPermissionsAndApps";
import type { OrderDetailsType } from "../types";

describe("useOrderPermissionsAndApps", () => {
  const baseOrder: OrderDetailsType = {
    id: "ord-1",
    orderNumber: "ORD-123",
    status: "CONFIRMED",
    items: [],
  } as any;

  it("evaluates default admin user permissions correctly", () => {
    const { result } = renderHook(() =>
      useOrderPermissionsAndApps({
        order: baseOrder,
        user: { role: "ADMIN" },
        company: { settings: {} },
      }),
    );

    expect(result.current.isMerchant).toBe(false);
    expect(result.current.canEditOrderDetails).toBe(true);
    expect(result.current.canUpdateOrderStatus).toBe(true);
    expect(result.current.canManageTurboShipping).toBe(true);
    expect(result.current.showPartnerOperationsCard).toBe(true);
    expect(result.current.showLateCancellationButton).toBe(false);
  });

  it("restricts merchant permissions when order is not self-fulfilled", () => {
    const { result } = renderHook(() =>
      useOrderPermissionsAndApps({
        order: baseOrder,
        user: { role: "MERCHANT" },
        company: { settings: {} },
      }),
    );

    expect(result.current.isMerchant).toBe(true);
    expect(result.current.canUpdateOrderStatus).toBe(false);
    expect(result.current.canManageTurboShipping).toBe(false);
    expect(result.current.showPartnerOperationsCard).toBe(false);
  });

  it("allows merchant to update order status when order is self-fulfilled", () => {
    const selfFulfilledOrder = {
      ...baseOrder,
      merchantOrder: { fulfillmentSource: "MERCHANT" },
    };

    const { result } = renderHook(() =>
      useOrderPermissionsAndApps({
        order: selfFulfilledOrder,
        user: { role: "MERCHANT" },
        company: { settings: {} },
      }),
    );

    expect(result.current.isMerchant).toBe(true);
    expect(result.current.canUpdateOrderStatus).toBe(true);
  });

  it("activates late cancellation button when enabled and status matches", () => {
    const pendingOrder = {
      ...baseOrder,
      status: "PENDING_CONFIRMATION",
    };

    const companyWithLateCancellation = {
      settings: {
        lateCancellationInterceptEnabled: true,
        lateCancellationTargetStatuses: ["PENDING_CONFIRMATION"],
      },
    };

    const { result } = renderHook(() =>
      useOrderPermissionsAndApps({
        order: pendingOrder,
        user: { role: "ADMIN" },
        company: companyWithLateCancellation,
      }),
    );

    expect(result.current.showLateCancellationButton).toBe(true);
  });

  it("shows source card when order has a conversationId", () => {
    const orderWithChat = {
      ...baseOrder,
      conversationId: "conv-999",
    };

    const { result } = renderHook(() =>
      useOrderPermissionsAndApps({
        order: orderWithChat,
        user: { role: "ADMIN" },
        company: { settings: {} },
      }),
    );

    expect(result.current.showOrderSourceCard).toBe(true);
  });
});
