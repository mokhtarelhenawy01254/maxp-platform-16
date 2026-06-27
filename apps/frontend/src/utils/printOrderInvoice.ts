import { formatCurrency } from "./currency";
import { OrderDetailsType, OrderItem } from "../pages/orders/types";
import { groupOrderDocumentQuantityOffers } from "./orderDocumentQuantityOffers";

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
            background: #eef2f7;
            color: #111827;
          }
          .page {
            max-width: ${pageWidth};
            min-height: ${pageHeight};
            margin: 24px auto;
            background: #ffffff;
            padding: 18mm 16mm;
            box-shadow: 0 12px 40px rgba(15, 23, 42, 0.12);
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 24px;
            padding-bottom: 18px;
            border-bottom: 2px solid ${settings.primaryColor}33;
          }
          .brand {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }
          .brand img {
            max-width: 120px;
            max-height: 72px;
            object-fit: contain;
          }
          .brand h1 {
            margin: 0;
            font-size: 28px;
            line-height: 1.2;
          }
          .muted {
            color: ${settings.secondaryColor};
            font-size: 13px;
          }
          .invoice-title {
            text-align: left;
          }
          .invoice-title h2 {
            margin: 0 0 8px;
            font-size: 30px;
            color: ${settings.primaryColor};
          }
          .invoice-title p {
            margin: 4px 0;
            font-size: 14px;
          }
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
            margin: 22px 0;
          }
          .card {
            border: 1px solid #e5e7eb;
            border-radius: 14px;
            padding: 16px;
            background: #fafafa;
          }
          .card h3 {
            margin: 0 0 10px;
            font-size: 16px;
          }
          .card p {
            margin: 6px 0;
            font-size: 14px;
            line-height: 1.6;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 8px;
          }
          thead th {
            padding: 12px 10px;
            border-bottom: 2px solid #d1d5db;
            font-size: 13px;
            text-align: right;
            background: #f8fafc;
          }
          tbody td {
            padding: 12px 10px;
            border-bottom: 1px solid #e5e7eb;
            vertical-align: top;
            font-size: 14px;
          }
          .offer-summary-row td {
            background: #ecfdf5;
            border-bottom: 1px solid #bbf7d0;
            font-weight: 700;
          }
          .offer-item-row td:first-child {
            padding-right: 24px;
          }
          .item-name {
            font-weight: 600;
          }
          .item-meta {
            margin-top: 4px;
            color: #6b7280;
            font-size: 12px;
          }
          .center { text-align: center; }
          .amount {
            text-align: left;
            white-space: nowrap;
          }
          .totals {
            width: 340px;
            margin-right: auto;
            margin-top: 22px;
            border: 1px solid #e5e7eb;
            border-radius: 14px;
            padding: 12px 16px;
            background: #fcfcfd;
          }
          .totals-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 12px;
            padding: 8px 0;
            font-size: 14px;
          }
          .totals-row.total {
            margin-top: 6px;
            padding-top: 14px;
            border-top: 2px solid #e5e7eb;
            font-size: 18px;
            font-weight: 700;
          }
          .footer {
            margin-top: 24px;
            padding-top: 18px;
            border-top: 1px dashed #d1d5db;
          }
          .footer p {
            margin: 6px 0;
            font-size: 13px;
            color: #4b5563;
          }
          @media print {
            body {
              background: #ffffff;
            }
            .page {
              margin: 0;
              min-height: auto;
              box-shadow: none;
              padding: 12mm;
            }
            @page {
              size: ${settings.pdfPageSize} ${settings.pdfOrientation};
              margin: 10mm;
            }
          }
        </style>
      </head>
      <body>
        <div class="page">
          <div class="header">
            <div class="brand">
              ${
                settings.showCompanyLogo && companyLogoUrl
                  ? `<img src="${escapeHtml(companyLogoUrl)}" alt="Company Logo" />`
                  : ""
              }
              <h1>${escapeHtml(companyName || "منصة MaxP")}</h1>
              <div class="muted">${escapeHtml(invoiceTitle)}</div>
            </div>
            <div class="invoice-title">
              <h2>فاتورة</h2>
              <p><strong>رقم الطلب:</strong> ${escapeHtml(order.orderNumber)}</p>
              ${
                order.turboTrackingNumber
                  ? `<p><strong>رقم تتبع تربو:</strong> ${escapeHtml(order.turboTrackingNumber)}</p>`
                  : ""
              }
              <p><strong>التاريخ:</strong> ${escapeHtml(
                new Date(order.createdAt).toLocaleDateString("ar-EG", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                }),
              )}</p>
              <p><strong>الحالة:</strong> ${escapeHtml(getStatusLabel(order.status))}</p>
              <p><strong>حالة الدفع:</strong> ${escapeHtml(
                getPaymentStatusLabel(order.paymentStatus),
              )}</p>
            </div>
          </div>

          <div class="info-grid">
            <div class="card">
              <h3>بيانات العميل</h3>
              <p><strong>الاسم:</strong> ${escapeHtml(order.customerName || "عميل غير محدد")}</p>
              ${
                order.customerPhone
                  ? `<p><strong>الهاتف:</strong> ${escapeHtml(order.customerPhone)}</p>`
                  : ""
              }
              ${
                order.customerEmail
                  ? `<p><strong>البريد:</strong> ${escapeHtml(order.customerEmail)}</p>`
                  : ""
              }
              ${
                addressText
                  ? `<p><strong>العنوان:</strong> ${escapeHtml(addressText)}</p>`
                  : ""
              }
            </div>
            <div class="card">
              <h3>بيانات الطلب</h3>
              ${
                settings.showPaymentMethod && order.paymentMethod
                  ? `<p><strong>طريقة الدفع:</strong> ${escapeHtml(order.paymentMethod)}</p>`
                  : ""
              }
              <p><strong>عدد المنتجات:</strong> ${escapeHtml(order.items.length)}</p>
              <p><strong>المبلغ المطلوب تحصيله:</strong> ${escapeHtml(
                formatCurrency(amountToCollect, currency),
              )}</p>
              ${
                order.notes
                  ? `<p><strong>ملاحظات:</strong> ${escapeHtml(order.notes)}</p>`
                  : ""
              }
            </div>
          </div>

          ${
            settings.showOrderItems
              ? `<table>
            <thead>
              <tr>
                <th>المنتج</th>
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

          <div class="totals">
            <div class="totals-row">
              <span>المجموع الفرعي</span>
              <strong>${escapeHtml(formatCurrency(subtotal, currency))}</strong>
            </div>
            <div class="totals-row">
              <span>الشحن</span>
              <strong>${escapeHtml(formatCurrency(shipping, currency))}</strong>
            </div>
            ${
              settings.showTaxBreakdown
                ? `<div class="totals-row">
              <span>الضريبة</span>
              <strong>${escapeHtml(formatCurrency(tax, currency))}</strong>
            </div>`
                : ""
            }
            <div class="totals-row total">
              <span>الإجمالي</span>
              <strong>${escapeHtml(formatCurrency(total, currency))}</strong>
            </div>
          </div>

          <div class="footer">
            <p>تم توليد هذه الفاتورة مباشرة من صفحة تفاصيل الطلب.</p>
            ${
              order.metadata?.isGuestOrder
                ? "<p>هذا الطلب من نوع طلب ضيف، لذلك تم استخدام الطباعة المباشرة بدل الفاتورة المحفوظة.</p>"
                : ""
            }
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
