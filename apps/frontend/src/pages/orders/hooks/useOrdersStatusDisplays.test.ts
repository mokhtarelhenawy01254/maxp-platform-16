import { renderHook } from "@testing-library/react";
import { useOrdersStatusDisplays } from "./useOrdersStatusDisplays";
import type { Order } from "../../../types/orders";
import type { OrdersFilters } from "../ordersFilterTypes";

describe("useOrdersStatusDisplays", () => {
  const sampleOrderStatusMap = new Map([
    ["CONFIRMED", { code: "CONFIRMED", name: "Confirmed Order", color: "#10b981" }],
    ["PREPARING", { code: "PREPARING", name: "In Prep", color: "#3b82f6" }],
  ]);

  const samplePaymentStatusMap = new Map([
    ["PAID", { code: "PAID", name: "Paid In Full", color: "#059669" }],
  ]);

  const sampleFilters: OrdersFilters = {
    search: "",
    status: ["CONFIRMED", "CUSTOM_CODE"],
    paymentStatus: ["PAID", "CUSTOM_PAY"],
    sourceType: [],
    merchantId: [],
    affiliateId: [],
    fulfillmentSource: [],
    merchantOperationStatus: [],
    merchantSettlementStatus: [],
    startDate: "",
    endDate: "",
    extractionMethod: "",
    minConfidence: "",
    timeRange: "",
    onlyUnseen: false,
    onlyPostPurchaseOffer: false,
  };

  const sampleParams = {
    orderStatuses: [
      { code: "CONFIRMED", name: "Confirmed Order", color: "#10b981" },
      { code: "PREPARING", name: "In Prep", color: "#3b82f6" },
      { code: "TRASH", name: "Trash Order" },
      { code: "DRAFT", name: "Draft Order" },
    ],
    paymentStatuses: [
      { code: "PAID", name: "Paid In Full", color: "#059669" },
    ],
    orderStatusMap: sampleOrderStatusMap,
    paymentStatusMap: samplePaymentStatusMap,
    filters: sampleFilters,
    showIncompleteInOrders: true,
    normalizeStatusCode: (c: string) => String(c || "").toUpperCase(),
    t: (k: string, d?: string) => d || k,
  };

  test("generates custom status and payment badge styles", () => {
    const { result } = renderHook(() => useOrdersStatusDisplays(sampleParams));

    const statusStyle = result.current.getStatusBadgeStyle("CONFIRMED");
    expect(statusStyle).toEqual({
      backgroundColor: "#10b98120",
      color: "#10b981",
      border: "1px solid #10b981",
    });

    const unconfiguredStyle = result.current.getStatusBadgeStyle("UNKNOWN_STATUS");
    expect(unconfiguredStyle).toBeUndefined();

    const paymentStyle = result.current.getPaymentStatusBadgeStyle("PAID");
    expect(paymentStyle).toEqual({
      backgroundColor: "#05966920",
      color: "#059669",
      border: "1px solid #059669",
    });
  });

  test("generates unified status display for standard and return states", () => {
    const { result } = renderHook(() => useOrdersStatusDisplays(sampleParams));

    const standardOrder = {
      orderNumber: "ORD-1",
      status: "CONFIRMED",
    } as unknown as Order;

    const display = result.current.getUnifiedStatusDisplay(standardOrder, (k) => k);
    expect(display).toBeDefined();
    expect(display.className).toContain("rounded-full");

    const returnOrder = {
      orderNumber: "ORD-2",
      status: "SHIPPED",
      turboShipmentStatus: "returned",
    } as unknown as Order;

    const returnDisplay = result.current.getUnifiedStatusDisplay(returnOrder, (k) => k);
    expect(returnDisplay.text).toContain("مرتجع");
  });

  test("formats payment status text and colors accurately", () => {
    const { result } = renderHook(() => useOrdersStatusDisplays(sampleParams));

    expect(result.current.getPaymentStatusColor("paid")).toContain("green");
    expect(result.current.getPaymentStatusColor("pending")).toContain("yellow");
    expect(result.current.getPaymentStatusColor("failed")).toContain("red");
    expect(result.current.getPaymentStatusColor("unavailable")).toContain("slate");

    expect(result.current.getPaymentStatusText("PAID")).toBe("Paid In Full");
    expect(result.current.getPaymentStatusText("COMPLETED")).toBe("orders.completed");
    expect(result.current.getPaymentStatusText("FAILED")).toBe("orders.failed");
  });

  test("filters order and payment statuses and builds bulk updatable list", () => {
    const { result } = renderHook(() => useOrdersStatusDisplays(sampleParams));

    const orderCodes = result.current.filterableOrderStatuses.map((s) => s.code);
    expect(orderCodes).toContain("CONFIRMED");
    expect(orderCodes).toContain("INCOMPLETE");
    expect(orderCodes).toContain("LOST");
    expect(orderCodes).toContain("CUSTOM_CODE");
    expect(orderCodes).not.toContain("TRASH");

    const bulkCodes = result.current.bulkUpdatableStatuses.map((s) => s.code);
    expect(bulkCodes).toContain("CONFIRMED");
    expect(bulkCodes).not.toContain("TRASH");
    expect(bulkCodes).not.toContain("DRAFT");
  });

  test("determines order source text accurately across origins", () => {
    const { result } = renderHook(() => useOrdersStatusDisplays(sampleParams));

    expect(result.current.getOrderSourceText({ sourceType: "storefront" } as Order)).toBe("المتجر");
    expect(result.current.getOrderSourceText({ sourceType: "woocommerce" } as Order)).toBe("وو كومرس");
    expect(result.current.getOrderSourceText({ sourceType: "pos" } as Order)).toBe("نقطة بيع");
    expect(result.current.getOrderSourceText({ sourceType: "affiliate_direct" } as Order)).toBe("مسوق مباشر");
    expect(result.current.getOrderSourceText({ sourceType: "manual" } as Order)).toBe("يدوي");
    expect(result.current.getOrderSourceText({ sourceType: "import" } as Order)).toBe("استيراد");
    expect(result.current.getOrderSourceText({ extractionMethod: "ai_enhanced" } as Order)).toBe("استخراج محسن");
  });
});
