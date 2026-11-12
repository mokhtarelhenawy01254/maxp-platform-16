jest.mock("xlsx", () => {
  const actual = jest.requireActual("xlsx");
  return {
    ...actual,
    writeFile: jest.fn(),
  };
});

import * as XLSX from "xlsx";
import {
  buildOrdersExportRows,
  exportOrdersToExcel,
  getOrdersExportFileName,
} from "./ordersExport";
import type { Order } from "./orderTransformer.types";

const makeOrder = (overrides: Partial<Order> = {}): Order =>
  ({
    id: "ord-1",
    orderNumber: "ORD-1001",
    customerName: "أحمد علي",
    customerEmail: "ahmed@example.com",
    customerPhone: "٠١٠١٢٣٤٥٦٧٨",
    status: "CONFIRMED",
    items: [],
    subtotal: 200,
    discount: 0,
    tax: 0,
    shipping: 30,
    total: 230,
    paymentMethod: "COD",
    paymentStatus: "pending",
    shippingAddress: { city: "القاهرة", governorate: "القاهرة", country: "EG" },
    notes: "",
    createdAt: "2026-11-10T12:00:00.000Z",
    updatedAt: "2026-11-10T12:00:00.000Z",
    sourceType: "regular",
    orderSource: "REGULAR",
    ...overrides,
  }) as Order;

describe("ordersExport", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("builds export rows with all required columns including linked company and affiliate", () => {
    const linkedOrder = makeOrder({
      id: "ord-2",
      orderNumber: "ORD-AFF-2002",
      customerName: "سارة محمد",
      customerPhone: "01122334455",
      status: "SHIPPED",
      paymentStatus: "paid",
      total: 450,
      sourceType: "affiliate_direct",
      orderSource: "AFFILIATE_DIRECT",
      affiliateId: "aff-1",
      affiliate: {
        id: "aff-1",
        affiliateCode: "AF01",
        user: {
          firstName: "كريم",
          lastName: "حسن",
          company: { id: "comp-2", name: "شركة النور" },
        },
      },
    });
    const regularOrder = makeOrder();

    const rows = buildOrdersExportRows([linkedOrder, regularOrder], {
      formatDate: (d) => String(d).slice(0, 10),
      getCustomerDisplayName: (o) => o.customerName,
      getOrderStatusText: (o) => (o.status === "SHIPPED" ? "تم الشحن" : "مؤكد"),
      getPaymentStatusText: (o) => (o.paymentStatus === "paid" ? "مدفوع" : "قيد الانتظار"),
      getAffiliateDisplayName: (aff) =>
        aff ? `${aff.user?.firstName || ""} ${aff.user?.lastName || ""}`.trim() : "",
      getOrderSourceText: (o) =>
        o.orderSource === "AFFILIATE_DIRECT" ? "أوردر من شركة مرتبطة" : "أوردر عادي",
      getOrderAmount: (o) => Number(o.total) || 0,
    });

    expect(rows).toHaveLength(2);
    expect(Object.keys(rows[0])).toEqual([
      "رقم الأوردر",
      "التاريخ",
      "العميل",
      "الهاتف",
      "الحالة",
      "حالة الدفع",
      "الشركة",
      "المسوق",
      "مصدر الأوردر",
      "الإجمالي",
    ]);

    expect(rows[0]).toEqual({
      "رقم الأوردر": "ORD-AFF-2002",
      "التاريخ": "2026-11-10",
      "العميل": "سارة محمد",
      "الهاتف": "01122334455",
      "الحالة": "تم الشحن",
      "حالة الدفع": "مدفوع",
      "الشركة": "شركة النور",
      "المسوق": "كريم حسن",
      "مصدر الأوردر": "أوردر من شركة مرتبطة",
      "الإجمالي": 450,
    });

    expect(rows[1]).toEqual({
      "رقم الأوردر": "ORD-1001",
      "التاريخ": "2026-11-10",
      "العميل": "أحمد علي",
      "الهاتف": "01012345678",
      "الحالة": "مؤكد",
      "حالة الدفع": "قيد الانتظار",
      "الشركة": "",
      "المسوق": "",
      "مصدر الأوردر": "أوردر عادي",
      "الإجمالي": 230,
    });
  });

  it("no-ops safely when exporting an empty array", () => {
    expect(buildOrdersExportRows([])).toEqual([]);
    expect(exportOrdersToExcel([])).toBe(false);
    expect(XLSX.writeFile).not.toHaveBeenCalled();
  });

  it("writes a valid .xlsx workbook using XLSX.utils.json_to_sheet and orders-<ISO date>.xlsx filename", () => {
    const fixedDate = new Date("2026-11-12T08:30:00.000Z");
    const orders = [
      makeOrder({ orderNumber: "ORD-1" }),
      makeOrder({
        id: "ord-2",
        orderNumber: "ORD-AFF-2",
        affiliate: {
          id: "aff-1",
          user: { firstName: "مروان", lastName: "سعيد", company: { name: "متجر الشريك" } },
        },
      }),
    ];

    expect(getOrdersExportFileName(fixedDate)).toBe("orders-2026-11-12.xlsx");
    const result = exportOrdersToExcel(orders, {}, fixedDate);

    expect(result).toBe(true);
    expect(XLSX.writeFile).toHaveBeenCalledTimes(1);
    const [workbookArg, fileNameArg] = (XLSX.writeFile as jest.Mock).mock.calls[0];
    expect(fileNameArg).toBe("orders-2026-11-12.xlsx");

    const buffer = XLSX.write(workbookArg, { type: "buffer", bookType: "xlsx" });
    const parsedWorkbook = XLSX.read(buffer, { type: "buffer" });
    const parsedRows = XLSX.utils.sheet_to_json(parsedWorkbook.Sheets["Orders"]);

    expect(parsedRows).toHaveLength(2);
    expect(parsedRows[0]).toMatchObject({ "رقم الأوردر": "ORD-1", "الشركة": "" });
    expect(parsedRows[1]).toMatchObject({
      "رقم الأوردر": "ORD-AFF-2",
      "الشركة": "متجر الشريك",
      "المسوق": "مروان سعيد",
    });
  });

  it("handles fallback paths without helpers, incomplete cart numbers, and invalid date placeholders", () => {
    const cartOrder = makeOrder({
      orderNumber: "cart_abcd1234ef",
      customerName: "",
      customerPhone: "",
      customer: { id: "c1", firstName: "منى", lastName: "طارق", phone: "٠١٢٣٤٥٦٧٨٩٠" },
      affiliate: {
        id: "aff-2",
        affiliateCode: "CODE-99",
        company: { name: "شركة الأمل" },
      } as Order["affiliate"],
      metadata: { isIncompleteCart: true },
    });

    const rows = buildOrdersExportRows([cartOrder], {
      formatDate: () => "—",
    });

    expect(rows[0]).toEqual({
      "رقم الأوردر": "INC-ABCD1234",
      "التاريخ": "2026-11-10",
      "العميل": "منى طارق",
      "الهاتف": "01234567890",
      "الحالة": "CONFIRMED",
      "حالة الدفع": "pending",
      "الشركة": "شركة الأمل",
      "المسوق": "CODE-99",
      "مصدر الأوردر": "regular",
      "الإجمالي": 230,
    });
  });
});
