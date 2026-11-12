import * as XLSX from "xlsx";
import type { Order } from "./orderTransformer.types";
import { toStandardDigits } from "../components/table/ordersTableTypes";

export interface OrdersExportHelpers {
  formatDate?: (date: string | Date) => string;
  getCustomerDisplayName?: (order: Order) => string;
  getOrderStatusText?: (order: Order) => string;
  getPaymentStatusText?: (order: Order) => string;
  getAffiliateDisplayName?: (affiliate?: Order["affiliate"]) => string;
  getOrderSourceText?: (order: Order) => string;
  getOrderAmount?: (order: Order) => number;
}

export interface OrdersExportRow {
  "رقم الأوردر": string;
  "التاريخ": string;
  "العميل": string;
  "الهاتف": string;
  "الحالة": string;
  "حالة الدفع": string;
  "الشركة": string;
  "المسوق": string;
  "مصدر الأوردر": string;
  "الإجمالي": number;
}

const getDisplayOrderNumber = (order: Order): string => {
  const rawNumber = String(order.orderNumber || order.id || "");
  const isCartId = rawNumber.startsWith("cart_");
  if (order.metadata?.isIncompleteCart || isCartId) {
    return `INC-${rawNumber.replace(/^cart_/, "").slice(0, 8).toUpperCase()}`;
  }
  return rawNumber;
};

const INVALID_DATE_PLACEHOLDERS = new Set([
  "—",
  "-",
  "تاريخ غير صحيح",
  "Invalid date",
  "Invalid Date",
]);

const getExportDate = (
  createdAt: string | undefined,
  formatDate?: (date: string | Date) => string,
): string => {
  if (!createdAt) return "";
  if (formatDate) {
    try {
      const formatted = formatDate(createdAt);
      if (formatted && !INVALID_DATE_PLACEHOLDERS.has(formatted.trim())) {
        return formatted;
      }
    } catch {
      // Fallback to ISO slice below
    }
  }
  const parsed = new Date(createdAt);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  return String(createdAt);
};

const getExportCompanyName = (order: Order): string => {
  const affiliateWithCompany = order.affiliate as
    | (Order["affiliate"] & { company?: { name?: string } })
    | undefined;
  const orderWithCompany = order as Order & { company?: { name?: string } };
  return (
    order.affiliate?.user?.company?.name ||
    affiliateWithCompany?.company?.name ||
    orderWithCompany.company?.name ||
    ""
  );
};

const getExportAffiliateName = (
  order: Order,
  getAffiliateDisplayName?: (affiliate?: Order["affiliate"]) => string,
): string => {
  if (!order.affiliate) return "";
  if (order.affiliate.name) return order.affiliate.name;
  if (getAffiliateDisplayName) {
    return getAffiliateDisplayName(order.affiliate);
  }
  const userName =
    `${order.affiliate.user?.firstName || ""} ${order.affiliate.user?.lastName || ""}`.trim();
  return (
    userName ||
    order.affiliate.affiliateCode ||
    order.affiliate.user?.email ||
    order.affiliate.id ||
    ""
  );
};

/**
 * Builds Excel-ready rows from the currently loaded/filtered orders in the table.
 */
export const buildOrdersExportRows = (
  orders: Order[],
  helpers: OrdersExportHelpers = {},
): OrdersExportRow[] => {
  if (!Array.isArray(orders) || orders.length === 0) {
    return [];
  }

  return orders.map((order) => {
    const rawPhone = order.customerPhone || order.customer?.phone || "";
    const customerName = helpers.getCustomerDisplayName
      ? helpers.getCustomerDisplayName(order)
      : order.customerName ||
        `${order.customer?.firstName || ""} ${order.customer?.lastName || ""}`.trim() ||
        "";

    const status = helpers.getOrderStatusText
      ? helpers.getOrderStatusText(order)
      : String(order.status || "");

    const paymentStatus = helpers.getPaymentStatusText
      ? helpers.getPaymentStatusText(order)
      : String(order.paymentStatus || "");

    const source = helpers.getOrderSourceText
      ? helpers.getOrderSourceText(order)
      : String(order.sourceType || order.orderSource || "");

    const total = helpers.getOrderAmount
      ? helpers.getOrderAmount(order)
      : typeof order.total === "number"
        ? order.total
        : Number(order.total) || 0;

    return {
      "رقم الأوردر": getDisplayOrderNumber(order),
      "التاريخ": getExportDate(order.createdAt, helpers.formatDate),
      "العميل": customerName,
      "الهاتف": toStandardDigits(rawPhone),
      "الحالة": status,
      "حالة الدفع": paymentStatus,
      "الشركة": getExportCompanyName(order),
      "المسوق": getExportAffiliateName(order, helpers.getAffiliateDisplayName),
      "مصدر الأوردر": source,
      "الإجمالي": total,
    };
  });
};

export const getOrdersExportFileName = (now: Date = new Date()): string => {
  const isoDate = now.toISOString().slice(0, 10);
  return `orders-${isoDate}.xlsx`;
};

/**
 * Exports currently loaded filtered orders directly to an .xlsx workbook.
 * Safely no-ops and returns false if the orders array is empty.
 */
export const exportOrdersToExcel = (
  orders: Order[],
  helpers: OrdersExportHelpers = {},
  now: Date = new Date(),
): boolean => {
  if (!Array.isArray(orders) || orders.length === 0) {
    return false;
  }

  const rows = buildOrdersExportRows(orders, helpers);
  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet["!cols"] = [
    { wch: 20 },
    { wch: 16 },
    { wch: 22 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
    { wch: 22 },
    { wch: 20 },
    { wch: 22 },
    { wch: 12 },
  ];
  worksheet["!views"] = [{ rightToLeft: true }];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Orders");
  XLSX.writeFile(workbook, getOrdersExportFileName(now));
  return true;
};
