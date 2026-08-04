import { formatCurrency } from "./currency";
import { OrderDetailsType, OrderItem } from "../pages/orders/types";
import { groupOrderDocumentQuantityOffers } from "./orderDocumentQuantityOffers";
import JsBarcode from "jsbarcode";
import {
  InvoicePrintSettings,
  DEFAULT_INVOICE_SETTINGS,
} from "../components/orders/InvoiceContent";

interface PrintOrderInvoiceOptions {
  order: OrderDetailsType;
  companyName?: string;
  companyLogoUrl?: string | null;
  printWindow?: Window | null;
  invoiceSettings?: Partial<InvoicePrintSettings & {
    pdfPageSize: "A4" | "Letter" | "Legal";
    pdfOrientation: "portrait" | "landscape";
  }>;
}

const escapeHtml = (value: unknown): string =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const normalizeText = (value: unknown): string => String(value ?? "").trim();

const parseJsonSafely = (value: unknown) => {
  if (!value) return null;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(String(value));
  } catch {
    return null;
  }
};

const buildAddressText = (order: OrderDetailsType) => {
  const shippingAddress = parseJsonSafely(order.shippingAddress);
  if (typeof shippingAddress === "string" && shippingAddress.trim()) {
    return shippingAddress.trim();
  }
  if (shippingAddress && typeof shippingAddress === "object") {
    const rec = shippingAddress as Record<string, unknown>;
    const parts = [
      rec.street, rec.address, rec.area, rec.district,
      rec.landmark, rec.city, rec.governorate,
    ]
      .map(normalizeText)
      .filter(Boolean)
      .filter((p, i, arr) => arr.indexOf(p) === i);
    if (parts.length > 0) return parts.join(" - ");
  }
  return normalizeText(order.customerAddress);
};

const getItemTotal = (item: OrderItem) => {
  if (typeof item.total === "number" && !Number.isNaN(item.total)) return item.total;
  return (Number(item.price) || 0) * (Number(item.quantity) || 0);
};

const buildItemDetailsText = (item: OrderItem) =>
  [
    item.productColor ? `اللون: ${item.productColor}` : "",
    item.productSize ? `المقاس: ${item.productSize}` : "",
    item.productDetails ? item.productDetails : "",
  ]
    .filter(Boolean)
    .join(" | ");

const renderInvoiceItemRow = (item: OrderItem, currency: string, slotLabel = "") => {
  const itemTotal = getItemTotal(item);
  const extraDetails = buildItemDetailsText(item);
  const resolvedName = slotLabel
    ? `${slotLabel} - ${normalizeText(item.productName) || "منتج"}`
    : normalizeText(item.productName) || "منتج";

  return `
    <tr${slotLabel ? ` class="offer-item-row"` : ""}>
      <td>
        <div class="item-name">${escapeHtml(resolvedName)}</div>
        ${extraDetails ? `<div class="item-meta">${escapeHtml(extraDetails)}</div>` : ""}
      </td>
      <td class="center sku-cell">${item.productSku ? escapeHtml(item.productSku) : "—"}</td>
      <td class="center">${escapeHtml(item.quantity)}</td>
      <td class="amount">${escapeHtml(formatCurrency(item.price, currency))}</td>
      <td class="amount total-cell">${escapeHtml(formatCurrency(itemTotal, currency))}</td>
    </tr>
  `;
};

const getStatusLabel = (status?: string) => {
  const labels: Record<string, string> = {
    PENDING: "قيد الانتظار", DRAFT: "مسودة", CONFIRMED: "مؤكد",
    ON_HOLD: "معلق", PROCESSING: "قيد التجهيز", SHIPPED: "تم الشحن",
    DELIVERED: "تم التسليم", CANCELLED: "ملغي", DUPLICATE_ORDER: "طلب مكرر",
    REFUNDED: "مسترد", PARTIALLY_REFUNDED: "مسترد جزئياً",
    RETURNED: "مرتجع", PARTIALLY_RETURNED: "مرتجع جزئي",
    PARTIALLY_DELIVERED: "تسليم جزئي", EXCHANGED: "استبدال", FAILED: "فشل",
  };
  return labels[String(status || "").toUpperCase()] || normalizeText(status);
};

const getPaymentStatusLabel = (status?: string) => {
  const labels: Record<string, string> = {
    PENDING: "في انتظار الدفع", COMPLETED: "مدفوع", PAID: "مدفوع",
    FAILED: "فشل الدفع", CANCELLED: "ملغي", REFUNDED: "مسترد",
    PARTIALLY_PAID: "مدفوع جزئياً",
  };
  return labels[String(status || "").toUpperCase()] || normalizeText(status);
};

const stripNonAscii = (v: string): string =>
  v.replace(/[^\x20-\x7E]/g, "").trim() || "N/A";

const generateBarcodeSvg = (value: string, height = 50, width = 2): string => {
  const safe = stripNonAscii(value);
  try {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    JsBarcode(svg, safe, {
      format: "CODE128", width, height,
      displayValue: false, background: "#ffffff",
      lineColor: "#000000", margin: 0,
    });
    return svg.outerHTML;
  } catch {
    return "";
  }
};

interface ResolvedInvoiceContext {
  currency: string;
  subtotal: number;
  shipping: number;
  tax: number;
  discount: number;
  total: number;
  addressText: string;
  s: InvoicePrintSettings;
  itemsRows: string;
}

function resolveInvoiceContext(
  order: OrderDetailsType,
  invoiceSettings?: Partial<InvoicePrintSettings>,
): ResolvedInvoiceContext {
  const currency = order.currency || "EGP";
  const subtotal = order.subtotal != null
    ? Number(order.subtotal)
    : (Array.isArray(order.items)
        ? order.items.reduce((sum, item) => sum + getItemTotal(item), 0)
        : 0);
  const shipping = Number(order.shipping) || 0;
  const tax = Number(order.tax) || 0;
  const discount = Number(order.discount) || 0;
  const total = order.total != null ? Number(order.total) : subtotal + shipping + tax - discount;
  const addressText = buildAddressText(order);

  const displaySettings: InvoicePrintSettings = {
    ...DEFAULT_INVOICE_SETTINGS,
    ...(invoiceSettings || {}),
  };

  const s = displaySettings;

  const groupedOrderItems = groupOrderDocumentQuantityOffers(
    Array.isArray(order.items) ? order.items : [],
  );

  const itemsRows = [
    ...groupedOrderItems.groups.flatMap((group) => {
      const summaryRow = `
        <tr class="offer-summary-row">
          <td>
            <div class="item-name">عرض كميات: ${escapeHtml(group.offerLabel)}</div>
            <div class="item-meta">
              ${escapeHtml(`${group.selectedPieces}/${group.offerQuantity || group.selectedPieces} قطع${group.freeShipping ? " | شحن مجاني" : ""}`)}
            </div>
          </td>
          <td class="center sku-cell">—</td>
          <td class="center">${escapeHtml(group.offerQuantity || group.selectedPieces)}</td>
          <td class="amount">-</td>
          <td class="amount total-cell">${escapeHtml(formatCurrency(group.total, currency))}</td>
        </tr>
      `;
      const itemRows = group.items.map(({ item, slotIndex }, itemIndex) =>
        renderInvoiceItemRow(item, currency, `القطعة ${slotIndex || itemIndex + 1}`),
      );
      return [summaryRow, ...itemRows];
    }),
    ...groupedOrderItems.singles.map((item) => renderInvoiceItemRow(item, currency)),
  ].join("");

  return {
    currency,
    subtotal,
    shipping,
    tax,
    discount,
    total,
    addressText,
    s,
    itemsRows,
  };
}

function buildInvoiceStyle(s: InvoicePrintSettings): string {
  return `
    <style>
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: ${s.fontFamily};
        background: #f1f5f9;
        color: #0f172a;
      }
      .page {
        max-width: 148mm;
        margin: 16px auto;
        background: #ffffff;
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 2px 12px rgba(0,0,0,0.06);
      }
      .page-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 14px 14px 6px;
        border-bottom: 2px solid ${s.primaryColor};
      }
      .page-header .company-logo {
        height: 40px;
        width: auto;
        object-fit: contain;
      }
      .page-header h1 {
        margin: 0;
        font-size: 18px;
        font-weight: 800;
        color: ${s.primaryColor};
      }
      .page-header .invoice-num {
        font-size: 12px;
        font-weight: 600;
        color: ${s.secondaryColor};
        text-align: left;
      }
      .body-content { padding: 6px 14px 14px; }
      .customer-name {
        margin: 0;
        font-size: 14px;
        font-weight: 600;
        color: #0f172a;
      }
      .customer-detail {
        font-size: 13px;
        color: #475569;
        line-height: 1.4;
      }
      table { width: 100%; border-collapse: collapse; }
      thead th {
        padding: 5px 10px;
        font-weight: 600;
        font-size: 13px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: ${s.secondaryColor};
        border-bottom: 1.5px solid ${s.primaryColor}40;
        background: ${s.primaryColor}10;
        text-align: right;
      }
      thead th.center { text-align: center; }
      thead th.amount { text-align: left; }
      tbody td {
        padding: 4px 10px;
        border-bottom: 1px solid #f1f5f9;
        font-size: 14px;
        vertical-align: top;
      }
      tbody tr:last-child td { border-bottom: none; }
      .offer-summary-row td {
        background: #ecfdf5;
        font-weight: 700;
      }
      .offer-item-row td:first-child { padding-right: 20px; }
      .item-name {
        font-weight: 700;
        color: #0f172a;
        font-size: 14px;
      }
      .item-meta { color: #000; font-size: 13px; font-weight: 700; }
      .sku-cell { font-family: monospace; font-size: 0.8rem; color: ${s.secondaryColor}; font-weight: 800; }
      .center { text-align: center; }
      .amount { text-align: left; white-space: nowrap; font-weight: 700; }
      .totals-left { text-align: left; margin-right: auto; max-width: 60%; }
      .totals-row {
        display: flex;
        justify-content: space-between;
        padding: 3px 0;
        font-size: 14px;
      }
      .totals-row .label { color: ${s.secondaryColor}; }
      .totals-row .value { color: #334155; }
      .totals-row.total-line {
        margin-top: 4px;
        padding-top: 8px;
        border-top: 1.5px solid #0f172a;
      }
      .totals-row.total-line .value {
        font-size: 16px;
        font-weight: 800;
        color: #0f172a;
      }
      .barcode-wrap {
        text-align: center;
        margin-bottom: 8px;
      }
      .barcode-wrap svg {
        transform: scale(0.7);
        transform-origin: center;
      }
      .payment-info {
        margin-top: 6px;
        padding-top: 6px;
        border-top: 1px solid #e2e8f0;
        font-size: 13px;
        color: ${s.secondaryColor};
      }
      .invoice-print-page {
        page-break-after: always;
      }
      .invoice-print-page:last-child {
        page-break-after: auto;
      }
      @media print {
        html, body { margin: 0 !important; padding: 0 !important; background: #ffffff; }
        .page { margin: 0; min-height: auto; border: none; box-shadow: none; }
        .invoice-num { display: none !important; }
        @page { size: A5; margin: 0; }
      }
    </style>
  `;
}

function buildInvoicePageMarkup(order: OrderDetailsType, companyName?: string, companyLogoUrl?: string | null, ctx?: ResolvedInvoiceContext): string {
  const { currency, subtotal, shipping, tax, discount, total, addressText, s, itemsRows } = ctx || resolveInvoiceContext(order);
  return `
    <div class="page">
      <div class="page-header">
        <div style="display:flex;align-items:center;gap:12px;">
          ${s.showCompanyLogo && companyLogoUrl ? `<img class="company-logo" src="${escapeHtml(companyLogoUrl)}" alt="شعار الشركة" />` : ""}
          <h1>${escapeHtml(companyName || "منصة MaxP")}</h1>
        </div>
        <div class="invoice-num">${escapeHtml(order.invoiceNumber || "")}</div>
      </div>

      <div class="body-content">
        ${order.orderNumber || order.turboTrackingNumber ? `
        <div class="barcode-wrap">
          ${order.orderNumber ? generateBarcodeSvg(order.orderNumber) : ""}
          ${order.turboTrackingNumber ? generateBarcodeSvg(order.turboTrackingNumber) : ""}
        </div>` : ""}

        <p class="customer-name">${escapeHtml(order.customerName || "عميل غير محدد")}</p>
        <div class="customer-detail">
          ${order.customerPhone ? `<p>${escapeHtml(order.customerPhone)}</p>` : ""}
          ${order.customerEmail ? `<p>${escapeHtml(order.customerEmail)}</p>` : ""}
          ${addressText ? `<p>${escapeHtml(addressText)}</p>` : ""}
        </div>

        ${s.showOrderItems ? `
        <table style="margin-top: 6px;">
          <thead>
            <tr>
              <th>المنتج</th>
              <th class="center">SKU</th>
              <th class="center">الكمية</th>
              <th class="amount">السعر</th>
              <th class="amount">الإجمالي</th>
            </tr>
          </thead>
          <tbody>${itemsRows}</tbody>
        </table>` : ""}

        <div class="totals-left" style="margin-top: 4px;">
          <div class="totals-row">
            <span class="label">المجموع الفرعي</span>
            <span class="value"><strong>${escapeHtml(formatCurrency(subtotal, currency))}</strong></span>
          </div>
          ${discount > 0 ? `
          <div class="totals-row">
            <span class="label">الخصم</span>
            <span class="value" style="color:#ef4444;">- ${escapeHtml(formatCurrency(discount, currency))}</span>
          </div>` : ""}
          <div class="totals-row">
            <span class="label">الشحن</span>
            <span class="value"><strong>${escapeHtml(formatCurrency(shipping, currency))}</strong></span>
          </div>
          ${s.showTaxBreakdown ? `
          <div class="totals-row">
            <span class="label">الضريبة</span>
            <span class="value"><strong>${escapeHtml(formatCurrency(tax, currency))}</strong></span>
          </div>` : ""}
          <div class="totals-row total-line">
            <span class="label">الإجمالي</span>
            <span class="value">${escapeHtml(formatCurrency(total, currency))}</span>
          </div>
          ${s.showPaymentMethod && order.paymentMethod ? `
          <div class="payment-info">
            <strong>طريقة الدفع:</strong> ${escapeHtml(order.paymentMethod)}
            &nbsp;|&nbsp;
            <strong>حالة الدفع:</strong> ${escapeHtml(getPaymentStatusLabel(order.paymentStatus))}
          </div>` : `
          <div class="payment-info">
            <strong>الحالة:</strong> ${escapeHtml(getStatusLabel(order.status))}
            &nbsp;|&nbsp;
            <strong>حالة الدفع:</strong> ${escapeHtml(getPaymentStatusLabel(order.paymentStatus))}
          </div>`}
        </div>
      </div>
    </div>
  `;
}

function buildInvoiceDocument(order: OrderDetailsType, companyName?: string, companyLogoUrl?: string | null, invoiceSettings?: Partial<InvoicePrintSettings>): string {
  const ctx = resolveInvoiceContext(order, invoiceSettings);
  return `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title></title>
        ${buildInvoiceStyle(ctx.s)}
      </head>
      <body>
        ${buildInvoicePageMarkup(order, companyName, companyLogoUrl, ctx)}
      </body>
    </html>
  `;
}

function buildMultiInvoiceDocument(
  orders: OrderDetailsType[],
  companyName?: string,
  companyLogoUrl?: string | null,
  invoiceSettings?: Partial<InvoicePrintSettings>,
): string {
  const first = orders[0];
  const s = resolveInvoiceContext(first, invoiceSettings).s;
  const pages = orders.map((order) => {
    const ctx = resolveInvoiceContext(order, invoiceSettings);
    return `<div class="invoice-print-page">${buildInvoicePageMarkup(order, companyName, companyLogoUrl, ctx)}</div>`;
  }).join("\n");

  return `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title></title>
        ${buildInvoiceStyle(s)}
      </head>
      <body>
        ${pages}
      </body>
    </html>
  `;
}

function writeAndPrint(targetWindow: Window, htmlContent: string) {
  targetWindow.document.open();
  targetWindow.document.write(htmlContent);
  targetWindow.document.close();
  targetWindow.focus();

  window.setTimeout(() => {
    targetWindow.print();
  }, 500);
}

export const printOrderInvoice = async ({
  order,
  companyName,
  companyLogoUrl,
  printWindow,
  invoiceSettings,
}: PrintOrderInvoiceOptions) => {
  const targetWindow = printWindow || window.open("", "_blank");
  if (!targetWindow) throw new Error("فشل في فتح نافذة جديدة للطباعة");

  writeAndPrint(targetWindow, buildInvoiceDocument(order, companyName, companyLogoUrl, invoiceSettings));
  return true;
};

export interface PrintMultipleGuestInvoicesOptions {
  orders: OrderDetailsType[];
  companyName?: string;
  companyLogoUrl?: string | null;
  printWindow?: Window | null;
  invoiceSettings?: Partial<InvoicePrintSettings & {
    pdfPageSize: "A4" | "Letter" | "Legal";
    pdfOrientation: "portrait" | "landscape";
  }>;
}

export const printMultipleGuestInvoices = async ({
  orders,
  companyName,
  companyLogoUrl,
  printWindow,
  invoiceSettings,
}: PrintMultipleGuestInvoicesOptions) => {
  const targetWindow = printWindow || window.open("", "_blank");
  if (!targetWindow) throw new Error("فشل في فتح نافذة جديدة للطباعة");

  writeAndPrint(targetWindow, buildMultiInvoiceDocument(orders, companyName, companyLogoUrl, invoiceSettings));
  return true;
};
