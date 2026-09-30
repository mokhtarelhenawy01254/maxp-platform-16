import { formatCurrency } from "./currency";
import { OrderDetailsType, OrderItem } from "../pages/orders/types";
import { groupOrderDocumentQuantityOffers } from "./orderDocumentQuantityOffers";
import JsBarcode from "jsbarcode";
import { resolveCustomFieldsForDisplay } from "./orderCustomFields";
import { isPersonalDevice } from "./deviceFingerprint";

export interface SimpleOrderForLabel {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  customerAddress?: string;
  city?: string;
  governorate?: string;
  total?: number | string;
  status: string;
  sourceType?: string;
  createdAt: string;
  updatedAt?: string;
  notes?: string;
  metadata?: Record<string, unknown> | string | null;
  items: Array<{
    id: string;
    productId?: string;
    name?: string;
    productName?: string;
    color?: string;
    productColor?: string;
    size?: string;
    productSize?: string;
    price?: number | string | null;
    quantity?: number | string | null;
    total?: number | string | null;
    sku?: string;
    productSku?: string;
    metadata?: Record<string, unknown> | string | null;
  }>;
  trackingNumber?: string | null;
  carrierType?: string | null;
  turboTrackingNumber?: string | null;
  shipping?: number | string;
  subtotal?: number | string;
  tax?: number | string;
  discount?: number | string;
  currency?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  shippingAddress?: string | Record<string, unknown>;
}

export function toOrderDetailsType(order: SimpleOrderForLabel): OrderDetailsType {
  return {
    id: String(order.id),
    orderNumber: String(order.orderNumber),
    customerName: String(order.customerName || "عميل غير محدد"),
    customerPhone: order.customerPhone || "",
    customerEmail: order.customerEmail || "",
    customerAddress: order.customerAddress || "",
    city: order.city || "",
    governorate: order.governorate || "",
    status: String(order.status || ""),
    paymentStatus: (order.paymentStatus as OrderDetailsType["paymentStatus"]) || "PENDING",
    paymentMethod: order.paymentMethod || "CASH",
    items: (order.items || []).map((item) => {
      let meta: any = {};
      try {
        meta = typeof item.metadata === "string" ? JSON.parse(item.metadata) : (item.metadata || {});
      } catch (_) {
        meta = {};
      }
      const metaAttrs =
        meta?.attributeValues ||
        (typeof meta?.attributes === "object" && !Array.isArray(meta?.attributes)
          ? meta?.attributes
          : null) ||
        {};
      const resolvedColor =
        (item as any).productColor ||
        item.color ||
        meta?.productColor ||
        meta?.color ||
        meta?.Color ||
        metaAttrs?.["اللون"] ||
        metaAttrs?.["لون"] ||
        metaAttrs?.["Color"] ||
        metaAttrs?.["color"] ||
        "";
      const resolvedSize =
        (item as any).productSize ||
        item.size ||
        meta?.productSize ||
        meta?.size ||
        meta?.Size ||
        metaAttrs?.["المقاس"] ||
        metaAttrs?.["مقاس"] ||
        metaAttrs?.["Size"] ||
        metaAttrs?.["size"] ||
        "";

      return {
        id: String(item.id),
        productId: item.productId || "",
        productName: String(item.productName || item.name || "منتج"),
        productColor: resolvedColor,
        productSize: resolvedSize,
        productSku:
          item.sku ||
          item.productSku ||
          (item as any).code ||
          (item as any).barcode ||
          (item as any).variant?.sku ||
          (item as any).product?.sku ||
          null,
        price: Number(item.price || 0),
        quantity: Number(item.quantity || 0),
        total: Number(item.total || 0),
        metadata: meta,
      };
    }),
    subtotal: Number(order.subtotal || 0),
    discount: Number(order.discount || 0),
    tax: Number(order.tax || 0),
    shipping: Number(order.shipping || 0),
    total: Number(order.total || 0),
    currency: order.currency || "EGP",
    notes: order.notes || "",
    createdAt: order.createdAt || new Date().toISOString(),
    trackingNumber:
      order.trackingNumber ||
      order.turboTrackingNumber ||
      (order as any).shipment?.trackingNumber ||
      (order as any).shipments?.[0]?.trackingNumber ||
      (typeof order.metadata === 'object' && order.metadata ? (order.metadata as any).trackingNumber : null) ||
      null,
    carrierType:
      order.carrierType ||
      (order as any).shipment?.carrierType ||
      (order as any).shipments?.[0]?.carrierType ||
      (typeof order.metadata === 'object' && order.metadata ? (order.metadata as any).shippingCarrier : null) ||
      null,
    turboTrackingNumber: order.turboTrackingNumber || (order as any).shipment?.trackingNumber || null,
    shippingAddress: order.shippingAddress || "",
    metadata: (order as any).metadata || null,
  };
}

export interface ShippingLabelSettings {
  showCustomFields?: boolean;
  [key: string]: unknown;
}

export interface PrintShippingLabelOptions {
  order: OrderDetailsType;
  companyName?: string;
  companyLogoUrl?: string | null;
  printWindow?: Window | null;
  settings?: ShippingLabelSettings;
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

const parseAddressFields = (order: OrderDetailsType) => {
  let governorate = order.governorate || "";
  let city = order.city || "";

  if (!governorate || !city) {
    const shippingAddress = parseJsonSafely(order.shippingAddress);
    if (shippingAddress && typeof shippingAddress === "object") {
      const rec = shippingAddress as Record<string, unknown>;
      if (!governorate) governorate = String(rec.governorate || rec.state || "");
      if (!city) city = String(rec.city || "");
    }
  }

  if (!governorate || !city) {
    const addressText = normalizeText(order.customerAddress);
    if (addressText.startsWith("{")) {
      try {
        const addr = JSON.parse(addressText);
        if (!governorate) governorate = addr.governorate || addr.state || "";
        if (!city) city = addr.city || "";
      } catch {}
    }
  }

  return { governorate, city };
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

const stripNonAscii = (v: string): string =>
  v.replace(/[^\x20-\x7E]/g, "").trim() || "N/A";

const generateBarcodeSvg = (value: string, height = 45, width = 1.5): string => {
  const safe = stripNonAscii(value);
  try {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    JsBarcode(svg, safe, {
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

const getStatusLabel = (status?: string) => {
  const labels: Record<string, string> = {
    PENDING: "قيد الانتظار", DRAFT: "مسودة", CONFIRMED: "مؤكد",
    ON_HOLD: "معلق", ON_HOLD_PREP: "معلق للتجهيز", PROCESSING: "قيد التجهيز",
    SHIPPED: "تم الشحن", DELIVERED: "تم التسليم", CANCELLED: "ملغي",
    DUPLICATE_ORDER: "طلب مكرر", REFUNDED: "مسترد", PARTIALLY_REFUNDED: "مسترد جزئياً",
    RETURNED: "مرتجع", PARTIALLY_RETURNED: "مرتجع جزئي",
    PARTIALLY_DELIVERED: "تسليم جزئي", EXCHANGED: "استبدال", FAILED: "فشل",
  };
  return labels[String(status || "").toUpperCase()] || normalizeText(status);
};

function resolveLabelContext(order: OrderDetailsType) {
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
  const { governorate, city } = parseAddressFields(order);

  const curLabel = currency === "EGP" ? "ج.م" : currency;
  const fm = (a: number) => `${new Intl.NumberFormat("ar-EG").format(a)} ${curLabel}`;

  const groupedOrderItems = groupOrderDocumentQuantityOffers(
    Array.isArray(order.items) ? order.items : [],
  );

  const itemsRows = [
    ...groupedOrderItems.groups.flatMap((group) => {
      const summaryRow = `
        <tr>
          <td style="padding:4px 6px;border-left:1.5px solid #000;text-align:right">
            <div style="font-size:13px;font-weight:700;line-height:1.2">عرض كميات: ${escapeHtml(group.offerLabel)}</div>
            <div style="font-size:12px;font-weight:700;color:#000;margin-top:2px">
              ${escapeHtml(`${group.selectedPieces}/${group.offerQuantity || group.selectedPieces} قطع${group.freeShipping ? " | شحن مجاني" : ""}`)}
            </div>
          </td>
          <td style="padding:4px 6px;border-left:1.5px solid #000;text-align:center;font-family:monospace;font-size:12px;font-weight:900">—</td>
          <td style="padding:4px 6px;border-left:1.5px solid #000;text-align:center;font-size:14px;font-weight:800">${escapeHtml(String(group.offerQuantity || group.selectedPieces))}</td>
          <td style="padding:4px 6px;border-left:1.5px solid #000;text-align:center;font-size:12px;font-weight:700">-</td>
          <td style="padding:4px 6px;text-align:center;font-size:14px;font-weight:900">${escapeHtml(fm(group.total))}</td>
        </tr>
      `;
      const itemRows = group.items.map(({ item, slotIndex }, itemIndex) => {
        const slotLabel = `القطعة ${slotIndex || itemIndex + 1}`;
        const resolvedName = `${slotLabel} - ${normalizeText(item.productName) || "منتج"}`;
        const extraDetails = buildItemDetailsText(item);
        return `
          <tr>
            <td style="padding:4px 6px;border-left:1.5px solid #000;text-align:right">
              <div style="font-size:13px;font-weight:700;line-height:1.2">${escapeHtml(resolvedName)}</div>
              ${extraDetails ? `<div style="font-size:12px;font-weight:700;color:#000;margin-top:2px">${escapeHtml(extraDetails)}</div>` : ""}
            </td>
            <td style="padding:4px 6px;border-left:1.5px solid #000;text-align:center;font-family:monospace;font-size:12px;font-weight:900">${item.productSku ? escapeHtml(item.productSku) : "—"}</td>
            <td style="padding:4px 6px;border-left:1.5px solid #000;text-align:center;font-size:14px;font-weight:800">${escapeHtml(String(item.quantity))}</td>
            <td style="padding:4px 6px;border-left:1.5px solid #000;text-align:center;font-size:12px;font-weight:700">${escapeHtml(fm(Number(item.price) || 0))}</td>
            <td style="padding:4px 6px;text-align:center;font-size:14px;font-weight:900">${escapeHtml(fm(getItemTotal(item)))}</td>
          </tr>
        `;
      });
      return [summaryRow, ...itemRows];
    }),
    ...groupedOrderItems.singles.map((item) => {
      const extraDetails = buildItemDetailsText(item);
      return `
        <tr>
          <td style="padding:4px 6px;border-left:1.5px solid #000;text-align:right">
            <div style="font-size:13px;font-weight:700;line-height:1.2">${escapeHtml(normalizeText(item.productName) || "منتج")}</div>
            ${extraDetails ? `<div style="font-size:12px;font-weight:700;color:#000;margin-top:2px">${escapeHtml(extraDetails)}</div>` : ""}
          </td>
          <td style="padding:4px 6px;border-left:1.5px solid #000;text-align:center;font-family:monospace;font-size:12px;font-weight:900">${item.productSku ? escapeHtml(item.productSku) : "—"}</td>
          <td style="padding:4px 6px;border-left:1.5px solid #000;text-align:center;font-size:14px;font-weight:800">${escapeHtml(String(item.quantity))}</td>
          <td style="padding:4px 6px;border-left:1.5px solid #000;text-align:center;font-size:12px;font-weight:700">${escapeHtml(fm(Number(item.price) || 0))}</td>
          <td style="padding:4px 6px;text-align:center;font-size:14px;font-weight:900">${escapeHtml(fm(getItemTotal(item)))}</td>
        </tr>
      `;
    }),
  ].join("");

  return {
    currency,
    subtotal,
    shipping,
    tax,
    discount,
    total,
    addressText,
    governorate,
    curLabel,
    fm,
    itemsRows,
    isPaid: (() => {
      const pStatus = String(order.paymentStatus || "").toUpperCase();
      const pMethod = String(order.paymentMethod || "").toUpperCase();
      return (
        pStatus === "COMPLETED" ||
        pStatus === "PAID" ||
        Boolean(order.kashierPayment || (order.metadata as any)?.kashierPayment) ||
        ["CREDIT_CARD", "WALLET", "KASHIER", "ONLINE", "VODAFONE_CASH", "INSTAPAY"].some((m) =>
          pMethod.includes(m),
        )
      );
    })(),
  };
}

function buildShippingLabelStyle(): string {
  return `
    <style>
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: Cairo, "Segoe UI", Tahoma, Arial, sans-serif;
        background: #f1f5f9;
        color: #000;
      }
      .label-page {
        max-width: 148mm;
        margin: 16px auto;
        background: #ffffff;
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 2px 12px rgba(0,0,0,0.06);
      }
      .label-inner {
        border: 2px solid #000;
        display: flex;
        flex-direction: column;
        box-sizing: border-box;
      }
      .label-header {
        border-bottom: 2px solid #000;
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px;
        min-height: 75px;
      }
      .label-header .sender {
        display: flex;
        flex-direction: column;
        gap: 4px;
        justify-content: center;
        align-items: flex-start;
      }
      .label-header .sender .company-name {
        font-size: 14px;
        font-weight: 800;
        color: #000;
      }
      .label-header .sender .company-logo {
        max-height: 40px;
        max-width: 120px;
        object-fit: contain;
      }
      .label-header .barcodes {
        display: flex;
        gap: 12px;
        align-items: center;
        justify-content: center;
      }
      .label-header .barcodes svg {
        transform: scale(0.7);
        transform-origin: center;
      }
      .label-row-4col {
        border-bottom: 2px solid #000;
        display: grid;
        grid-template-columns: 1.5fr 1.2fr 1fr 1fr;
      }
      .label-cell {
        border-left: 1.5px solid #000;
        padding: 8px 12px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
      }
      .label-cell:last-child { border-left: none; }
      .label-cell .cell-title {
        font-size: 13px;
        font-weight: 700;
        margin-bottom: 2px;
        color: #000;
        text-align: right;
      }
      .label-cell .cell-value {
        font-size: 15px;
        font-weight: 700;
        color: #000;
        text-align: right;
        direction: rtl;
      }
      .label-cell .cell-value.ltr {
        direction: ltr;
        text-align: right;
        font-size: 14px;
      }
      .label-address {
        border-bottom: 2px solid #000;
        padding: 8px 12px;
        min-height: 60px;
        display: flex;
        flex-direction: column;
      }
      .label-address .cell-title {
        font-size: 13px;
        font-weight: 700;
        margin-bottom: 2px;
        color: #000;
        text-align: right;
      }
      .label-address .cell-value {
        font-size: 15px;
        font-weight: 700;
        color: #000;
        text-align: right;
        direction: rtl;
        flex: 1;
        display: flex;
        align-items: flex-end;
        justify-content: flex-end;
      }
      .label-table {
        border-bottom: 2px solid #000;
        flex: 1;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }
      .label-table table {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
      }
      .label-table thead tr {
        border-bottom: 1.5px solid #000;
      }
      .label-table th {
        padding: 4px 6px;
        border-left: 1.5px solid #000;
        font-size: 13px;
        font-weight: 700;
        text-align: center;
        color: #000;
      }
      .label-table th:last-child { border-left: none; }
      .label-table th:nth-child(1) { width: 38%; }
      .label-table th:nth-child(2) { width: 20%; }
      .label-table th:nth-child(3) { width: 10%; }
      .label-table th:nth-child(4) { width: 15%; }
      .label-table th:nth-child(5) { width: 17%; }
      .label-table td {
        border-left: 1.5px solid #000;
        text-align: center;
        vertical-align: top;
      }
      .label-table td:last-child { border-left: none; }
      .label-table tbody tr:not(:last-child) {
        border-bottom: 1.5px solid #000;
      }
      .label-notes {
        border-bottom: 2px solid #000;
        padding: 8px 12px;
        min-height: 45px;
        display: flex;
        flex-direction: column;
      }
      .label-notes .cell-title {
        font-size: 13px;
        font-weight: 700;
        margin-bottom: 2px;
        color: #000;
        text-align: right;
      }
      .label-footer {
        display: grid;
        grid-template-columns: 1.2fr 1fr 1.2fr;
        min-height: 65px;
        align-items: stretch;
      }
      .label-footer .footer-cell {
        border-left: 1.5px solid #000;
        padding: 8px 12px;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
      }
      .label-footer .footer-cell:last-child { border-left: none; }
      .label-footer .footer-cell .cell-title {
        font-size: 13px;
        font-weight: 700;
        margin-bottom: 4px;
        color: #000;
        text-align: center;
      }
      .label-footer .footer-cell .cell-value {
        font-size: 15px;
        font-weight: 700;
        color: #000;
        text-align: center;
        direction: rtl;
      }
      .label-footer .footer-cell .cell-value.total {
        font-size: 20px;
        font-weight: 900;
      }
      .label-footer .footer-cell .barcode-wrap svg {
        transform: scale(0.7);
        transform-origin: center;
      }
      .label-footer .footer-cell .placeholder {
        color: #94a3b8;
      }
      .page-break {
        page-break-after: always;
      }
      .page-break:last-child {
        page-break-after: auto;
      }
      .personal-device-watermark {
        position: absolute;
        top: 45%;
        left: 50%;
        transform: translate(-50%, -50%) rotate(-25deg);
        font-size: 22px;
        font-weight: 800;
        color: rgba(220, 38, 38, 0.4);
        border: 3px dashed rgba(220, 38, 38, 0.5);
        background: rgba(254, 242, 242, 0.65);
        padding: 10px 18px;
        border-radius: 8px;
        pointer-events: none;
        white-space: nowrap;
        text-align: center;
        z-index: 999;
      }
      @media print {
        html, body { margin: 0 !important; padding: 0 !important; background: #ffffff; }
        .label-page { margin: 0; min-height: auto; border: none; box-shadow: none; }
        .no-print { display: none !important; }
        @page { size: A5; margin: 0; }
      }
    </style>
  `;
}

function buildShippingLabelPageMarkup(
  order: OrderDetailsType,
  companyName?: string,
  companyLogoUrl?: string | null,
  settings?: ShippingLabelSettings,
): string {
  const ctx = resolveLabelContext(order);
  const showCustomFields = settings?.showCustomFields === true;
  const { customFields, displayNotes } = resolveCustomFieldsForDisplay(order, {
    showCustomFields,
  });
  const orderBarcode = order.orderNumber
    ? `<div style="text-align:center;margin-bottom:4px">${generateBarcodeSvg(order.orderNumber)}<div style="font-size:10px;font-weight:600;color:#000">كود الطلب</div></div>`
    : "";
  const trackingNumberVal =
    order.trackingNumber ||
    order.turboTrackingNumber ||
    (order as any).shipment?.trackingNumber ||
    (order as any).shipments?.[0]?.trackingNumber ||
    (order as any).merchantOrder?.trackingNumber ||
    null;

  const shippingBarcode = trackingNumberVal
    ? `<div style="text-align:center;margin-bottom:4px">${generateBarcodeSvg(String(trackingNumberVal))}<div style="font-size:10px;font-weight:600;color:#000">كود الشحن (${escapeHtml(trackingNumberVal)})</div></div>`
    : "";

  const personalWatermark = isPersonalDevice()
    ? `<div class="personal-device-watermark">معاينة فقط — جهاز شخصي غير معتمد للشحن</div>`
    : "";

  return `
    <div class="label-page" style="position:relative">
      ${personalWatermark}
      <div class="label-inner">

        <!-- Row 1: Header -->
        <div class="label-header">
          <div class="sender">
            ${companyLogoUrl ? `<img class="company-logo" src="${escapeHtml(companyLogoUrl)}" alt="" />` : ""}
            <div class="company-name">مرسل: ${escapeHtml(companyName || "منصة MaxP")}</div>
          </div>
          <div class="barcodes">
            ${shippingBarcode}
            ${orderBarcode}
          </div>
        </div>

        <!-- Row 2: Customer Data (4 columns) -->
        <div class="label-row-4col">
          <div class="label-cell">
            <div class="cell-title">اسم المستلم</div>
            <div class="cell-value">${escapeHtml(order.customerName || "عميل غير محدد")}</div>
          </div>
          <div class="label-cell">
            <div class="cell-title">رقم الهاتف</div>
            <div class="cell-value ltr">${order.customerPhone ? escapeHtml(order.customerPhone) : "—"}</div>
          </div>
          <div class="label-cell">
            <div class="cell-title">المحافظة</div>
            <div class="cell-value">${ctx.governorate ? escapeHtml(ctx.governorate) : "—"}</div>
          </div>
          <div class="label-cell">
            <div class="cell-title">المدينة</div>
            <div class="cell-value">${ctx.city ? escapeHtml(ctx.city) : "—"}</div>
          </div>
        </div>

        <!-- Row 3: Address -->
        <div class="label-address">
          <div class="cell-title">العنوان</div>
          <div class="cell-value">${ctx.addressText ? escapeHtml(ctx.addressText) : "—"}</div>
        </div>

        <!-- Row 3b: Custom Fields (Car Make, Model & Year / Custom Specs) -->
        ${showCustomFields && customFields.length > 0 ? `
          <div class="label-custom-fields" style="border-bottom: 2px solid #000; padding: 6px 12px; background-color: #f8fafc;">
            ${customFields.map((cf) => `
              <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; flex-wrap:wrap; margin-bottom:2px;">
                <span style="font-size:12px; font-weight:700; color:#334155;">${escapeHtml(cf.label)}:</span>
                <span style="font-size:14px; font-weight:900; color:#000; direction:rtl; text-align:right;">${escapeHtml(cf.value)}</span>
              </div>
            `).join("")}
          </div>
        ` : ""}

        <!-- Row 4: Products Table -->
        <div class="label-table">
          <table>
            <thead>
              <tr>
                <th>المنتج</th>
                <th>SKU</th>
                <th>الكمية</th>
                <th>السعر</th>
                <th>الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              ${ctx.itemsRows || '<tr><td colspan="5" style="padding:8px;text-align:center;color:#94a3b8">لا توجد منتجات</td></tr>'}
            </tbody>
          </table>
        </div>

        <!-- Row 5: Notes -->
        <div class="label-notes">
          <div class="cell-title">ملاحظات</div>
          <div style="flex:1;font-size:12px;font-weight:700;color:#000;">
            ${ctx.isPaid ? '<span style="color:#059669;font-weight:800;display:inline-block;margin-left:6px;">⚠️ الطلب مدفوع مسبقاً (لا يتم تحصيل أي مبالغ من العميل).</span>' : ''}
            ${escapeHtml(displayNotes)}
          </div>
        </div>

        <!-- Row 6: Footer -->
        <div class="label-footer">
          <div class="footer-cell">
            ${shippingBarcode || '<span class="placeholder">—</span>'}
          </div>
          <div class="footer-cell">
            <div class="cell-title">تكلفة الشحن</div>
            <div class="cell-value">${escapeHtml(ctx.fm(ctx.shipping))}</div>
          </div>
          <div class="footer-cell">
            <div class="cell-title">المبلغ المطلوب تحصيله</div>
            <div class="cell-value total" style="${ctx.isPaid ? 'color:#059669;' : ''}">
              ${ctx.isPaid ? `0 ${escapeHtml(ctx.curLabel)} <span style="display:block;font-size:11px;font-weight:800;color:#059669;margin-top:2px;">(مدفوع إلكترونياً بالكامل ✅)</span>` : escapeHtml(ctx.fm(ctx.total))}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function buildSingleLabelDocument(
  order: OrderDetailsType,
  companyName?: string,
  companyLogoUrl?: string | null,
  settings?: ShippingLabelSettings,
): string {
  return `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>بوليصة الشحن - ${escapeHtml(order.orderNumber || "")}</title>
        ${buildShippingLabelStyle()}
      </head>
      <body>
        ${buildShippingLabelPageMarkup(order, companyName, companyLogoUrl, settings)}
      </body>
    </html>
  `;
}

function buildMultiLabelDocument(
  orders: OrderDetailsType[],
  companyName?: string,
  companyLogoUrl?: string | null,
  settings?: ShippingLabelSettings,
): string {
  const pages = orders.map((order) => {
    return `<div class="page-break">${buildShippingLabelPageMarkup(order, companyName, companyLogoUrl, settings)}</div>`;
  }).join("\n");

  return `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>بوليصات الشحن</title>
        ${buildShippingLabelStyle()}
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

export const printSingleShippingLabel = async ({
  order,
  companyName,
  companyLogoUrl,
  printWindow,
  settings,
}: PrintShippingLabelOptions) => {
  const targetWindow = printWindow || window.open("", "_blank");
  if (!targetWindow) throw new Error("فشل في فتح نافذة جديدة للطباعة");

  writeAndPrint(targetWindow, buildSingleLabelDocument(order, companyName, companyLogoUrl, settings));
  return true;
};

export interface PrintMultipleShippingLabelsOptions {
  orders: OrderDetailsType[];
  companyName?: string;
  companyLogoUrl?: string | null;
  printWindow?: Window | null;
  settings?: ShippingLabelSettings;
}

export const printMultipleShippingLabels = async ({
  orders,
  companyName,
  companyLogoUrl,
  printWindow,
  settings,
}: PrintMultipleShippingLabelsOptions) => {
  const targetWindow = printWindow || window.open("", "_blank");
  if (!targetWindow) throw new Error("فشل في فتح نافذة جديدة للطباعة");

  writeAndPrint(targetWindow, buildMultiLabelDocument(orders, companyName, companyLogoUrl, settings));
  return true;
};
