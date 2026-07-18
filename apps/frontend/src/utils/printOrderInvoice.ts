import { formatCurrency } from "./currency";
import { OrderDetailsType, OrderItem } from "../pages/orders/types";
import { groupOrderDocumentQuantityOffers } from "./orderDocumentQuantityOffers";
import JsBarcode from "jsbarcode";



interface PrintOrderInvoiceOptions {
  order: OrderDetailsType;
  companyName?: string;
  companyLogoUrl?: string | null;
  printWindow?: Window | null;
  invoiceSettings?: Partial<InvoicePrintSettings>;
}

interface InvoicePrintSettings {
  showCompanyLogo: boolean;
  showTaxBreakdown: boolean;
  showPaymentMethod: boolean;
  showOrderItems: boolean;
  pdfPageSize: "A4" | "Letter" | "Legal";
  pdfOrientation: "portrait" | "landscape";
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
}

const defaultInvoicePrintSettings: InvoicePrintSettings = {
  showCompanyLogo: true,
  showTaxBreakdown: true,
  showPaymentMethod: true,
  showOrderItems: true,
  pdfPageSize: "A4",
  pdfOrientation: "portrait",
  primaryColor: "#0f766e",
  secondaryColor: "#6b7280",
  fontFamily: '"Segoe UI", Tahoma, Arial, sans-serif',
};

const pageMetrics: Record<
  InvoicePrintSettings["pdfPageSize"],
  { width: string; height: string }
> = {
  A4: { width: "210mm", height: "297mm" },
  Letter: { width: "216mm", height: "279mm" },
  Legal: { width: "216mm", height: "356mm" },
};

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
    const shippingAddressRecord = shippingAddress as Record<string, unknown>;
    const parts = [
      shippingAddressRecord.street,
      shippingAddressRecord.address,
      shippingAddressRecord.area,
      shippingAddressRecord.district,
      shippingAddressRecord.landmark,
      shippingAddressRecord.city,
      shippingAddressRecord.governorate,
    ]
      .map(normalizeText)
      .filter(Boolean)
      .filter((part, index, parts) => parts.indexOf(part) === index);

    if (parts.length > 0) {
      return parts.join(" - ");
    }
  }

  return normalizeText(order.customerAddress);
};

const getItemTotal = (item: OrderItem) => {
  if (typeof item.total === "number" && !Number.isNaN(item.total)) {
    return item.total;
  }

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
        ${
          extraDetails
            ? `<div class="item-meta">${escapeHtml(extraDetails)}</div>`
            : ""
        }
      </td>
      <td class="center">${item.productSku ? escapeHtml(item.productSku) : "—"}</td>
      <td class="center">${escapeHtml(item.quantity)}</td>
      <td class="amount">${escapeHtml(formatCurrency(item.price, currency))}</td>
      <td class="amount total-cell">${escapeHtml(formatCurrency(itemTotal, currency))}</td>
    </tr>
  `;
};

const getStatusLabel = (status?: string) => {
  const labels: Record<string, string> = {
    PENDING: "قيد الانتظار",
    DRAFT: "مسودة",
    CONFIRMED: "مؤكد",
    ON_HOLD: "معلق",
    PROCESSING: "قيد التجهيز",
    SHIPPED: "تم الشحن",
    DELIVERED: "تم التسليم",
    CANCELLED: "ملغي",
    DUPLICATE_ORDER: "طلب مكرر",
    REFUNDED: "مسترد",
    PARTIALLY_REFUNDED: "مسترد جزئياً",
    RETURNED: "مرتجع",
    PARTIALLY_RETURNED: "مرتجع جزئي",
    PARTIALLY_DELIVERED: "تسليم جزئي",
    EXCHANGED: "استبدال",
    FAILED: "فشل",
  };

  return labels[String(status || "").toUpperCase()] || normalizeText(status);
};

const getPaymentStatusLabel = (status?: string) => {
  const labels: Record<string, string> = {
    PENDING: "في انتظار الدفع",
    COMPLETED: "مدفوع",
    PAID: "مدفوع",
    FAILED: "فشل الدفع",
    CANCELLED: "ملغي",
    REFUNDED: "مسترد",
    PARTIALLY_PAID: "مدفوع جزئياً",
  };

  return labels[String(status || "").toUpperCase()] || normalizeText(status);
};

const generateBarcodeSvg = (value: string, height = 50, width = 2): string => {
  try {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    JsBarcode(svg, value, {
      format: "CODE128",
      width,
      height,
      displayValue: false,
      background: "#ffffff",
      lineColor: "#000000",
      margin: 0,
    });
    return svg.outerHTML;
  } catch {
    return "";
  }
};

export const printOrderInvoice = async ({
  order,
  companyName,
  companyLogoUrl,
  printWindow,
  invoiceSettings,
}: PrintOrderInvoiceOptions) => {
  const targetWindow = printWindow || window.open("", "_blank");

  if (!targetWindow) {
    throw new Error("فشل في فتح نافذة جديدة للطباعة");
  }

  const currency = order.currency || "EGP";
  const subtotal =
    Number(order.subtotal) ||
    (Array.isArray(order.items)
      ? order.items.reduce((sum, item) => sum + getItemTotal(item), 0)
      : 0);
  const shipping = Number(order.shipping) || 0;
  const tax = Number(order.tax) || 0;
  const total = Number(order.total) || subtotal + shipping + tax;
  const amountToCollect = ["COMPLETED", "PAID"].includes(
    String(order.paymentStatus || "").toUpperCase(),
  )
    ? 0
    : total;
  const addressText = buildAddressText(order);
  const invoiceTitle = order.metadata?.isGuestOrder
    ? `فاتورة طلب ضيف - ${order.orderNumber}`
    : `فاتورة طلب - ${order.orderNumber}`;
  const settings: InvoicePrintSettings = {
    ...defaultInvoicePrintSettings,
    ...(invoiceSettings || {}),
    pdfPageSize:
      invoiceSettings?.pdfPageSize === "Letter" ||
      invoiceSettings?.pdfPageSize === "Legal"
        ? invoiceSettings.pdfPageSize
        : "A4",
    pdfOrientation:
      invoiceSettings?.pdfOrientation === "landscape"
        ? "landscape"
        : "portrait",
  };
  const pageSize = pageMetrics[settings.pdfPageSize] || pageMetrics.A4;
  const pageWidth =
    settings.pdfOrientation === "landscape" ? pageSize.height : pageSize.width;
  const pageHeight =
    settings.pdfOrientation === "landscape" ? pageSize.width : pageSize.height;

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
              ${escapeHtml(
                `${group.selectedPieces}/${group.offerQuantity || group.selectedPieces} قطع${group.freeShipping ? " | شحن مجاني" : ""}`,
              )}
            </div>
          </td>
          <td class="center">—</td>
          <td class="center">${escapeHtml(group.offerQuantity || group.selectedPieces)}</td>
          <td class="amount">-</td>
          <td class="amount total-cell">${escapeHtml(formatCurrency(group.total, currency))}</td>
        </tr>
      `;

      const itemRows = group.items.map(({ item, slotIndex }, itemIndex) =>
        renderInvoiceItemRow(
          item,
          currency,
          `القطعة ${slotIndex || itemIndex + 1}`,
        ),
      );

      return [summaryRow, ...itemRows];
    }),
    ...groupedOrderItems.singles.map((item) => renderInvoiceItemRow(item, currency)),
  ].join("");

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${escapeHtml(invoiceTitle)}</title>
        <style>
          * { box-sizing: border-box; }
          body {
            margin: 0;
            font-family: ${settings.fontFamily};
            background: #f1f5f9;
            color: #0f172a;
          }
          .page {
            max-width: ${pageWidth};
            min-height: ${pageHeight};
            margin: 24px auto;
            background: #ffffff;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 4px 24px rgba(0,0,0,0.06);
          }
          .header-bg {
            padding: 40px 48px 24px;
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          }
          .header-flex {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
          }
          .header-right {
            text-align: right;
          }
          .header-right h1 {
            margin: 0 0 4px;
            font-size: 24px;
            font-weight: 700;
            color: #ffffff;
          }
          .header-muted {
            color: #94a3b8;
            font-size: 14px;
          }
          .header-left {
            text-align: left;
          }
          .header-left .label {
            margin: 0 0 4px;
            font-size: 12px;
            font-weight: 500;
            letter-spacing: 0.5px;
            color: #94a3b8;
          }
          .header-left .number {
            margin: 0;
            font-size: 20px;
            font-weight: 700;
            color: #ffffff;
          }
          .header-left .date {
            margin: 4px 0 0;
            font-size: 14px;
            color: #94a3b8;
          }
          .body-content {
            padding: 24px 48px;
          }
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 32px;
            margin-bottom: 32px;
          }
          .info-col h3 {
            margin: 0 0 8px;
            font-size: 12px;
            font-weight: 600;
            letter-spacing: 0.5px;
            color: #64748b;
            text-transform: uppercase;
          }
          .info-col .name {
            margin: 0;
            font-size: 14px;
            font-weight: 600;
            color: #0f172a;
          }
          .info-col .detail {
            margin: 4px 0 0;
            font-size: 14px;
            color: #475569;
            line-height: 1.6;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 32px;
          }
          thead th {
            padding: 12px 16px;
            font-weight: 600;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #64748b;
            border-bottom: 2px solid #e2e8f0;
            text-align: right;
          }
          thead th.center { text-align: center; }
          thead th.amount { text-align: left; }
          tbody td {
            padding: 14px 16px;
            border-bottom: 1px solid #f1f5f9;
            font-size: 13px;
            vertical-align: top;
          }
          tbody tr:last-child td {
            border-bottom: none;
          }
          .offer-summary-row td {
            background: #ecfdf5;
            font-weight: 700;
          }
          .offer-item-row td:first-child {
            padding-right: 32px;
          }
          .item-name {
            font-weight: 600;
            color: #0f172a;
          }
          .item-meta {
            margin-top: 4px;
            color: #64748b;
            font-size: 12px;
          }
          .center { text-align: center; }
          .amount {
            text-align: left;
            white-space: nowrap;
          }
          .totals-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 32px;
            margin-bottom: 32px;
          }
          .totals-left {
            text-align: left;
          }
          .totals-row {
            display: flex;
            justify-content: space-between;
            padding: 4px 0;
            font-size: 14px;
          }
          .totals-row .label {
            color: #64748b;
          }
          .totals-row .value {
            color: #334155;
          }
          .totals-row.total-line {
            margin-top: 4px;
            padding-top: 12px;
            border-top: 2px solid #0f172a;
          }
          .totals-row.total-line .value {
            font-size: 18px;
            font-weight: 700;
            color: #0f172a;
          }
          .payment-info {
            margin-top: 16px;
            padding-top: 16px;
            border-top: 1px solid #e2e8f0;
            font-size: 13px;
            color: #64748b;
          }
          .barcode-section {
            display: flex;
            justify-content: center;
            gap: 48px;
            padding-top: 20px;
            border-top: 1px solid #e2e8f0;
            flex-wrap: wrap;
          }
          .barcode-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 4px;
            text-align: center;
          }
          .barcode-label {
            font-size: 12px;
            font-weight: 700;
            color: #374151;
          }
          .barcode-value {
            font-size: 11px;
            color: #6b7280;
            font-family: "Courier New", monospace;
          }
          .footer {
            padding: 16px 48px;
            text-align: center;
            background: #f8fafc;
            border-top: 1px solid #e2e8f0;
          }
          .footer p {
            margin: 2px 0;
            font-size: 12px;
            color: #94a3b8;
          }
          @media print {
            body {
              background: #ffffff;
            }
            .page {
              margin: 0;
              min-height: auto;
              border-radius: 0;
              box-shadow: none;
            }
            .header-bg {
              padding: 30px 40px 20px;
            }
            .body-content {
              padding: 20px 40px;
            }
            .footer {
              padding: 12px 40px;
            }
            @page {
              size: ${settings.pdfPageSize} ${settings.pdfOrientation};
              margin: 0;
            }
          }
        </style>
      </head>
      <body>
        <div class="page">
          <div class="header-bg">
            <div class="header-flex">
              <div class="header-right">
                <h1>${escapeHtml(companyName || "منصة MaxP")}</h1>
                <div class="header-muted">${escapeHtml(invoiceTitle)}</div>
              </div>
              <div class="header-left">
                <div class="label">فاتورة</div>
                <div class="number">${escapeHtml(order.orderNumber)}</div>
                <div class="date">${escapeHtml(
                  new Date(order.createdAt).toLocaleDateString("ar-EG", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  }),
                )}</div>
              </div>
            </div>
          </div>

          <div class="body-content">
            <div class="info-col">
              <h3>بيانات العميل</h3>
              <p class="name">${escapeHtml(order.customerName || "عميل غير محدد")}</p>
              <div class="detail">
                ${order.customerPhone ? `<p>هاتف: ${escapeHtml(order.customerPhone)}</p>` : ""}
                ${order.customerEmail ? `<p>بريد: ${escapeHtml(order.customerEmail)}</p>` : ""}
                ${addressText ? `<p>${escapeHtml(addressText)}</p>` : ""}
              </div>
            </div>

            ${
              settings.showOrderItems
                ? `<table>
              <thead>
                <tr>
                  <th>المنتج</th>
                  <th class="center">SKU</th>
                  <th class="center">الكمية</th>
                  <th class="amount">السعر</th>
                  <th class="amount">الإجمالي</th>
                </tr>
              </thead>
              <tbody>
                ${itemsRows}
              </tbody>
            </table>`
                : ""
            }

            <div class="totals-left" style="margin-right: auto; max-width: 300px;">
                <div class="totals-row">
                  <span class="label">المجموع الفرعي</span>
                  <span class="value"><strong>${escapeHtml(formatCurrency(subtotal, currency))}</strong></span>
                </div>
                <div class="totals-row">
                  <span class="label">الشحن</span>
                  <span class="value"><strong>${escapeHtml(formatCurrency(shipping, currency))}</strong></span>
                </div>
                ${
                  settings.showTaxBreakdown
                    ? `<div class="totals-row">
                  <span class="label">الضريبة</span>
                  <span class="value"><strong>${escapeHtml(formatCurrency(tax, currency))}</strong></span>
                </div>`
                    : ""
                }
                <div class="totals-row total-line">
                  <span class="label">الإجمالي</span>
                  <span class="value">${escapeHtml(formatCurrency(total, currency))}</span>
                </div>
                <div class="payment-info">
                  <strong>الحالة:</strong> ${escapeHtml(getStatusLabel(order.status))}
                  &nbsp;|&nbsp;
                  <strong>حالة الدفع:</strong> ${escapeHtml(getPaymentStatusLabel(order.paymentStatus))}
                </div>
                </div>

            ${
              order.orderNumber || order.turboTrackingNumber
                ? `<div class="barcode-section">
                    ${order.orderNumber ? `<div class="barcode-item">${generateBarcodeSvg(order.orderNumber)}<div class="barcode-label">رقم الطلب</div><div class="barcode-value">${escapeHtml(order.orderNumber)}</div></div>` : ""}
                    ${order.turboTrackingNumber ? `<div class="barcode-item">${generateBarcodeSvg(order.turboTrackingNumber)}<div class="barcode-label">كود الشحن</div><div class="barcode-value">${escapeHtml(order.turboTrackingNumber)}</div></div>` : ""}
                  </div>`
                : ""
            }
          </div>

          <div class="footer">
            <p>شكراً لتعاملكم معنا</p>
            <p>منصة إدارة التواصل والمبيعات الإلكترونية</p>
          </div>
        </div>
      </body>
    </html>
  `;

  targetWindow.document.open();
  targetWindow.document.write(htmlContent);
  targetWindow.document.close();
  targetWindow.focus();

  window.setTimeout(() => {
    targetWindow.print();
  }, 500);

  return true;
};
