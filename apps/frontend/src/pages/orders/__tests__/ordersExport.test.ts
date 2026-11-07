import {
  buildEnhancedOrdersQueryParams,
  buildOrdersExportRows,
  buildOrdersQueryParams,
  describeOrderSource,
  getAffiliateCompanyName,
  ordersExportFileName,
  usesEnhancedOrdersApi,
} from "../utils/ordersExport";
import { DEFAULT_ORDERS_FILTERS } from "../ordersFilterTypes";
import type { Order } from "../utils/orderTransformer";

const order = (overrides: Partial<Order> = {}): Order =>
  ({
    id: "o1",
    orderNumber: "ORD-249175-783",
    customerName: "منى أحمد",
    customerPhone: "01000000000",
    status: "PREPARATION",
    paymentStatus: "PAID",
    total: 390,
    sourceType: "manual",
    orderSource: "AFFILIATE_DIRECT",
    governorate: "القاهرة",
    items: [{ id: "i1" }, { id: "i2" }],
    createdAt: "2026-11-07T10:20:30.000Z",
    shippingAddress: { governorate: "القاهرة" },
    ...overrides,
  }) as unknown as Order;

describe("orders export query params", () => {
  it("maps every active list filter to the same API params as the orders screen", () => {
    const filters = {
      ...DEFAULT_ORDERS_FILTERS,
      status: ["PREPARATION", "CANCELLED"],
      paymentStatus: ["PAID"],
      sourceType: ["affiliate_direct"],
      merchantId: ["m1", "m2"],
      affiliateId: ["a1"],
      companyId: ["c1", "c2"],
      fulfillmentSource: ["MERCHANT"],
      merchantOperationStatus: ["IN_SHIPPING"],
      merchantSettlementStatus: ["PAYABLE"],
      search: "ORD-249175",
      startDate: "2026-11-01",
      endDate: "2026-11-07",
      onlyUnseen: true,
      onlyPostPurchaseOffer: true,
    };

    expect(buildOrdersQueryParams(filters, 3, 200)).toEqual({
      page: "3",
      limit: "200",
      status: "PREPARATION,CANCELLED",
      paymentStatus: "PAID",
      sourceType: "affiliate_direct",
      merchantId: "m1,m2",
      affiliateId: "a1",
      companyId: "c1,c2",
      fulfillmentSource: "MERCHANT",
      merchantOperationStatus: "IN_SHIPPING",
      merchantSettlementStatus: "PAYABLE",
      search: "ORD-249175",
      startDate: "2026-11-01",
      endDate: "2026-11-07",
      onlyUnseen: "true",
      onlyPostPurchaseOffer: "true",
    });
  });

  it("sends only page/limit when no filters are active", () => {
    expect(buildOrdersQueryParams(DEFAULT_ORDERS_FILTERS, 1, 200)).toEqual({
      page: "1",
      limit: "200",
    });
  });

  it("uses the enhanced API only for extraction filters", () => {
    expect(usesEnhancedOrdersApi(DEFAULT_ORDERS_FILTERS)).toBe(false);
    const enhanced = { ...DEFAULT_ORDERS_FILTERS, extractionMethod: "AI", minConfidence: "0.8" };
    expect(usesEnhancedOrdersApi(enhanced)).toBe(true);
    expect(buildEnhancedOrdersQueryParams(enhanced, 2, 200)).toMatchObject({
      page: "2",
      limit: "200",
      extractionMethod: "AI",
      minConfidence: "0.8",
    });
  });
});

describe("orders export rows", () => {
  it("includes the affiliate company and an Arabic source label for AFF orders", () => {
    const row = buildOrdersExportRows([
      order({
        affiliate: { user: { company: { name: "شركة النور" } } },
      } as Partial<Order>),
    ])[0];

    expect(row["رقم الطلب"]).toBe("ORD-249175-783");
    expect(row["المصدر"]).toBe("من شركة مرتبطة");
    expect(row["الشركة المرتبطة"]).toBe("شركة النور");
    expect(row["المبلغ الإجمالي"]).toBe(390);
    expect(row["عدد الأصناف"]).toBe(2);
    expect(row["تاريخ الإنشاء"]).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
  });

  it("labels wholesale, marketer-linked and plain orders distinctly", () => {
    expect(describeOrderSource(order({ orderSource: "WHOLESALE" } as Partial<Order>))).toBe(
      "موزع جملة",
    );
    expect(describeOrderSource(order({ orderSource: undefined, affiliateId: "a1" } as Partial<Order>))).toBe(
      "مسوق",
    );
    expect(
      describeOrderSource(
        order({
          orderSource: undefined,
          affiliateId: undefined,
          sourceType: "ai_conversation",
        } as Partial<Order>),
      ),
    ).toBe("محادثة تلقائية");
    expect(
      describeOrderSource(order({ orderSource: undefined, affiliateId: undefined } as Partial<Order>)),
    ).toBe("يدوي");
    expect(getAffiliateCompanyName(order())).toBe("");
  });

  it("translates raw status and payment codes into the labels shown in the UI", () => {
    const row = buildOrdersExportRows([
      order({
        status: "cancelled",
        paymentStatus: "failed",
      } as Partial<Order>),
    ])[0];
    expect(row["حالة الطلب"]).toBe("ملغي");
    expect(row["حالة الدفع"]).toBe("فشل");
    expect(buildOrdersExportRows([order({ status: "NEW", paymentStatus: "paid" } as Partial<Order>)])[0]["حالة الطلب"]).toBe(
      "طلب جديد",
    );
  });

  it("falls back to zero totals and empty strings for sparse rows", () => {
    const row = buildOrdersExportRows([
      order({ total: undefined, customerPhone: undefined, governorate: "", items: [] } as Partial<Order>),
    ])[0];
    expect(row["المبلغ الإجمالي"]).toBe(0);
    expect(row["الهاتف"]).toBe("");
    expect(row["عدد الأصناف"]).toBe(0);
  });
});

describe("orders export file name", () => {
  it("is dated and ends with .xlsx", () => {
    expect(ordersExportFileName(new Date(2026, 10, 7, 9, 5))).toBe("orders-2026-11-07-0905.xlsx");
  });
});
