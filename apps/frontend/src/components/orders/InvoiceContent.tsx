import React from "react";
import i18n from "../../i18n";
import InvoiceBarcode from "./InvoiceBarcode";
import { resolveCustomFieldsForDisplay } from "../../utils/orderCustomFields";

export interface InvoicePrintSettings {
  showCompanyLogo: boolean;
  showTaxBreakdown: boolean;
  showPaymentMethod: boolean;
  showOrderItems: boolean;
  showCustomFields?: boolean;
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  showBarcodeOrderCode: boolean;
  showBarcodeShippingCode: boolean;
}

export const DEFAULT_INVOICE_SETTINGS: InvoicePrintSettings = {
  showCompanyLogo: true,
  showTaxBreakdown: true,
  showPaymentMethod: true,
  showOrderItems: true,
  showCustomFields: false,
  primaryColor: "#0f766e",
  secondaryColor: "#6b7280",
  fontFamily: 'Cairo, "Segoe UI", Tahoma, Arial, sans-serif',
  showBarcodeOrderCode: true,
  showBarcodeShippingCode: true,
};

interface InvoiceItem {
  id?: string;
  productName: string;
  quantity: number;
  price: number | string;
  total?: number | string;
  totalPrice?: number | string;
  productSku?: string | null;
  sku?: string | null;
  code?: string | null;
  barcode?: string | null;
  variantSku?: string | null;
  productColor?: string | null;
  productSize?: string | null;
  [key: string]: any;
}

const resolveItemCode = (item: InvoiceItem): string | null => {
  if (item.productSku && String(item.productSku).trim()) return String(item.productSku).trim();
  const raw = item as Record<string, any>;
  if (raw.sku && String(raw.sku).trim()) return String(raw.sku).trim();
  if (raw.code && String(raw.code).trim()) return String(raw.code).trim();
  if (raw.barcode && String(raw.barcode).trim()) return String(raw.barcode).trim();
  if (raw.variantSku && String(raw.variantSku).trim()) return String(raw.variantSku).trim();
  if (raw.productVariant?.sku && String(raw.productVariant.sku).trim()) return String(raw.productVariant.sku).trim();
  if (raw.variant?.sku && String(raw.variant.sku).trim()) return String(raw.variant.sku).trim();
  if (raw.product?.sku && String(raw.product.sku).trim()) return String(raw.product.sku).trim();
  if (raw.product?.barcode && String(raw.product.barcode).trim()) return String(raw.product.barcode).trim();
  if (typeof raw.metadata === "string" && raw.metadata.includes("sku")) {
    try {
      const parsed = JSON.parse(raw.metadata);
      if (parsed?.sku) return String(parsed.sku).trim();
      if (parsed?.variantSku) return String(parsed.variantSku).trim();
    } catch {}
  } else if (raw.metadata && typeof raw.metadata === "object") {
    if (raw.metadata.sku) return String(raw.metadata.sku).trim();
    if (raw.metadata.variantSku) return String(raw.metadata.variantSku).trim();
  }
  return null;
};

export interface InvoiceData {
  id?: string;
  invoiceNumber?: string;
  companyName: string;
  companyPhone?: string | null;
  companyLogo?: string | null;
  customerName: string;
  customerPhone?: string | null;
  customerEmail?: string | null;
  customerAddress?: string | null;
  city?: string | null;
  governorate?: string | null;
  paymentMethod?: string | null;
  paymentStatus: string;
  currency?: string;
  subtotal?: number | string;
  tax?: number | string;
  shipping?: number | string;
  discount?: number | string;
  discountReason?: string | null;
  totalAmount?: number | string;
  notes?: string | null;
  metadata?: any;
  order?: {
    orderNumber?: string;
    status?: string;
    trackingNumber?: string | null;
    turboTrackingNumber?: string | null;
    notes?: string | null;
    metadata?: any;
    shippingAddress?: any;
    orderItems?: InvoiceItem[];
  };
}

export interface InvoicePageInfo {
  pageIndex: number;
  totalPages: number;
  isFirst: boolean;
  isLast: boolean;
  chunkItems: InvoiceItem[];
}

interface InvoiceContentProps {
  invoice: InvoiceData;
  settings?: Partial<InvoicePrintSettings>;
  compact?: boolean;
  page?: InvoicePageInfo;
}

const parseNumber = (v: number | string | null | undefined): number => Number(v || 0);

const getItemTotal = (item: InvoiceItem): number => {
  const x = item.total ?? item.totalPrice;
  if (x != null) return parseNumber(x);
  return parseNumber(item.price) * parseNumber(item.quantity);
};

const formatAddress = (address: unknown): string => {
  if (!address) return "";
  if (typeof address === "string") {
    if (address.startsWith("{")) {
      try { return formatAddress(JSON.parse(address)); } catch { return address; }
    }
    return address;
  }
  if (typeof address === "object") {
    const o = address as Record<string, unknown>;
    const p = [o.street, o.address, o.area, o.district, o.landmark, o.city, o.governorate]
      .map(v => String(v ?? "").trim()).filter(Boolean)
      .filter((v, i, a) => a.indexOf(v) === i);
    return p.length > 0 ? p.join(" - ") : "";
  }
  return "";
};

export const ITEMS_PER_PAGE = 7;

export function getInvoicePages(invoice: InvoiceData): InvoicePageInfo[] {
  // Since this is a shipping label format, we generally fit everything on one label.
  const all = invoice.order?.orderItems || [];
  return [{ pageIndex: 0, totalPages: 1, isFirst: true, isLast: true, chunkItems: all }];
}

const InvoiceContent: React.FC<InvoiceContentProps> = ({ invoice, settings: ps, compact = false, page }) => {
  const s: InvoicePrintSettings = { ...DEFAULT_INVOICE_SETTINGS, ...(ps || {}) };
  const currency = invoice.currency || "EGP";
  
  // Total calculation
  const items = page?.chunkItems ?? (invoice.order?.orderItems || []);
  const calculatedItemsSubtotal = items.length > 0
    ? items.reduce((sum, item) => sum + getItemTotal(item), 0)
    : parseNumber(invoice.subtotal);

  const rawOrder = invoice.order as any;
  const orderSubtotal = rawOrder?.subtotal != null ? parseNumber(rawOrder.subtotal) : null;
  const orderShipping = rawOrder?.shipping != null ? parseNumber(rawOrder.shipping) : null;
  const orderDiscount = rawOrder?.discount != null ? parseNumber(rawOrder.discount) : null;
  const orderTotal = rawOrder?.total != null ? parseNumber(rawOrder.total) : null;
  const orderTax = rawOrder?.tax != null ? parseNumber(rawOrder.tax) : null;

  const effectiveSubtotal = orderSubtotal != null ? orderSubtotal : calculatedItemsSubtotal;
  const effectiveShipping = orderShipping != null ? orderShipping : parseNumber(invoice.shipping);
  const effectiveDiscount = orderDiscount != null ? orderDiscount : parseNumber(invoice.discount);
  const effectiveTax = orderTax != null ? orderTax : parseNumber(invoice.tax);

  const invoiceSubtotalNum = parseNumber(invoice.subtotal);
  const isInvoiceSubtotalStale = Math.abs(invoiceSubtotalNum - calculatedItemsSubtotal) > 0.01;

  const discountVal = effectiveDiscount;
  const discountReasonVal =
    invoice.discountReason ||
    (invoice as any).metadata?.discountReason ||
    (invoice.order as any)?.discountReason ||
    (invoice.order as any)?.metadata?.discountReason ||
    null;

  const totalAmount = orderTotal != null
    ? orderTotal
    : (invoice.totalAmount != null && !isInvoiceSubtotalStale)
      ? parseNumber(invoice.totalAmount)
      : Math.max(0, effectiveSubtotal + effectiveShipping + effectiveTax - discountVal);
  
  const addressText = invoice.customerAddress ? formatAddress(invoice.customerAddress) : "";
  const { customFields, displayNotes } = resolveCustomFieldsForDisplay(invoice, {
    showCustomFields: s.showCustomFields,
  });
  
  let governorate = invoice.governorate;
  let city = invoice.city;
  
  if (!governorate || !city) {
    if (typeof invoice.customerAddress === "string" && invoice.customerAddress.startsWith("{")) {
       try {
         const addr = JSON.parse(invoice.customerAddress);
         if (!governorate) governorate = addr.governorate || addr.state;
         if (!city) city = addr.city;
       } catch (e) {}
    } else if (typeof invoice.customerAddress === "object" && invoice.customerAddress) {
       const addr = invoice.customerAddress as any;
       if (!governorate) governorate = addr.governorate || addr.state;
       if (!city) city = addr.city;
    }
  }
  
  // Format total (e.g. 854.94 جنيه)
  const curLabel = currency === "EGP" ? "ج.م" : currency;
  const fm = (a: number) => `${new Intl.NumberFormat("ar-EG").format(a)} ${curLabel}`;
  
  const trackingNumberVal =
    invoice.order?.trackingNumber ||
    invoice.order?.turboTrackingNumber ||
    (invoice as any).trackingNumber ||
    (invoice.order as any)?.shipment?.trackingNumber ||
    (invoice.order as any)?.shipments?.[0]?.trackingNumber ||
    null;

  const showOrderBarcode = s.showBarcodeOrderCode !== false && invoice.order?.orderNumber;
  const showShipBarcode = s.showBarcodeShippingCode !== false && Boolean(trackingNumberVal);

  const borderStyle = "2px solid #000";
  const innerBorderStyle = "1.5px solid #000";
  
  // Reusable cell styles
  const titleStyle: React.CSSProperties = {
    fontSize: compact ? "11px" : "13px",
    fontWeight: 700,
    marginBottom: "2px",
    color: "#000",
    textAlign: "right"
  };
  
  const valueStyle: React.CSSProperties = {
    fontSize: compact ? "13px" : "15px",
    fontWeight: 700,
    color: "#000",
    textAlign: "right",
    direction: "rtl"
  };

  return (
    <div dir="rtl" style={{ 
      fontFamily: s.fontFamily, 
      color: "#000", 
      width: "100%", 
      height: "100%", 
      boxSizing: "border-box",
      padding: compact ? "6px" : "12px",
      backgroundColor: "#fff"
    }}>
      <div style={{
        border: borderStyle,
        display: "flex",
        flexDirection: "column",
        height: "100%",
        boxSizing: "border-box"
      }}>
        
        {/* Row 1: Header (Sender + Order Barcode) */}
        <div style={{ borderBottom: borderStyle, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px", minHeight: compact ? "55px" : "75px" }}>
           <div style={{ display: "flex", flexDirection: "column", gap: "4px", justifyContent: "center", alignItems: "flex-start" }}>
             {invoice.companyLogo && (
               <img src={invoice.companyLogo} alt="" style={{ maxHeight: compact ? "30px" : "40px", maxWidth: "120px", objectFit: "contain" }} />
             )}
              <div style={{ fontSize: compact ? "12px" : "14px", fontWeight: 800, color: "#000" }}>{i18n.t("invoiceContent.sender", { companyName: invoice.companyName })}</div>
           </div>
           <div style={{ display: "flex", gap: "12px", alignItems: "center", justifyContent: "center" }}>
             {showOrderBarcode && (
                <InvoiceBarcode value={invoice.order!.orderNumber!} label={i18n.t("invoiceContent.orderCode")} height={compact ? 35 : 45} width={compact ? 1.2 : 1.5} compact={compact} />
             )}
           </div>
        </div>

        {/* Row 2: Customer Data (4 columns) */}
        <div style={{ borderBottom: borderStyle, display: "grid", gridTemplateColumns: "1.5fr 1.2fr 1fr 1fr" }}>
           <div style={{ borderLeft: innerBorderStyle, padding: compact ? "4px 6px" : "8px 12px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div style={titleStyle}>{i18n.t("invoiceContent.recipientName")}</div>
              <div style={valueStyle}>{invoice.customerName}</div>
           </div>
           <div style={{ borderLeft: innerBorderStyle, padding: compact ? "4px 6px" : "8px 12px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div style={titleStyle}>{i18n.t("invoiceContent.phone")}</div>
             <div style={{ ...valueStyle, direction: "ltr", textAlign: "right", fontSize: compact ? "12px" : "14px" }}>{invoice.customerPhone || "—"}</div>
           </div>
           <div style={{ borderLeft: innerBorderStyle, padding: compact ? "4px 6px" : "8px 12px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div style={titleStyle}>{i18n.t("invoiceContent.governorate")}</div>
             <div style={valueStyle}>{governorate || "—"}</div>
           </div>
           <div style={{ padding: compact ? "4px 6px" : "8px 12px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div style={titleStyle}>{i18n.t("invoiceContent.city")}</div>
             <div style={valueStyle}>{city || "—"}</div>
           </div>
        </div>

        {/* Row 4: Address */}
        <div style={{ borderBottom: borderStyle, padding: compact ? "4px 8px" : "8px 12px", minHeight: compact ? "45px" : "60px", display: "flex", flexDirection: "column" }}>
           <div style={titleStyle}>{i18n.t("invoiceContent.address")}</div>
           <div style={{ ...valueStyle, flex: 1, display: "flex", alignItems: "flex-end", justifyContent: "flex-end" }}>{addressText || "—"}</div>
        </div>

        {/* Row 4b: Custom Fields (Car Make & Model / Custom Specs) */}
        {s.showCustomFields && customFields.length > 0 && (
          <div
            style={{
              borderBottom: borderStyle,
              padding: compact ? "6px 8px" : "8px 12px",
              backgroundColor: "#f8fafc",
              display: "flex",
              flexDirection: "column",
              gap: "4px",
            }}
          >
            {customFields.map((cf, idx) => (
              <div
                key={idx}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "8px",
                  flexWrap: "wrap",
                }}
              >
                <span
                  style={{
                    fontSize: compact ? "11px" : "13px",
                    fontWeight: 700,
                    color: "#334155",
                  }}
                >
                  {cf.label}:
                </span>
                <span
                  style={{
                    fontSize: compact ? "13px" : "15px",
                    fontWeight: 900,
                    color: "#000",
                    direction: "rtl",
                    textAlign: "right",
                  }}
                >
                  {cf.value}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Row 5: Products Table (Replaces string concatenation) */}
        <div style={{ borderBottom: borderStyle, flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
           <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
             <thead>
               <tr style={{ borderBottom: innerBorderStyle }}>
                  <th style={{ ...titleStyle, padding: "4px 6px", borderLeft: innerBorderStyle, width: "38%", textAlign: "center" }}>{i18n.t("invoiceContent.product")}</th>
                  <th style={{ ...titleStyle, padding: "4px 6px", borderLeft: innerBorderStyle, width: "20%", textAlign: "center" }}>{i18n.t("invoiceContent.sku")}</th>
                  <th style={{ ...titleStyle, padding: "4px 6px", borderLeft: innerBorderStyle, width: "10%", textAlign: "center" }}>{i18n.t("invoiceContent.qty")}</th>
                  <th style={{ ...titleStyle, padding: "4px 6px", borderLeft: innerBorderStyle, width: "15%", textAlign: "center" }}>{i18n.t("invoiceContent.price")}</th>
                  <th style={{ ...titleStyle, padding: "4px 6px", width: "17%", textAlign: "center" }}>{i18n.t("invoiceContent.total")}</th>
               </tr>
             </thead>
             <tbody>
               {items.map((item, idx) => (
                 <tr key={item.id || idx} style={{ borderBottom: idx < items.length - 1 ? "1.5px solid #000" : "none" }}>
                   <td style={{ padding: "4px 6px", borderLeft: innerBorderStyle, textAlign: "right" }}>
                     <div style={{ fontSize: compact ? "12px" : "14px", fontWeight: 700, lineHeight: "1.2" }}>{item.productName}</div>
                      {(item.productColor || item.productSize) && (
                        <div style={{ fontSize: compact ? "11px" : "13px", fontWeight: 700, color: "#000", marginTop: "2px" }}>
                          {[item.productColor, item.productSize].filter(Boolean).join(" | ")}
                        </div>
                      )}
                   </td>
                    <td style={{ padding: "4px 6px", borderLeft: innerBorderStyle, textAlign: "center", fontFamily: "monospace", fontSize: compact ? "11px" : "13px", fontWeight: 900 }}>
                      {resolveItemCode(item) || "—"}
                    </td>
                    <td style={{ padding: "4px 6px", borderLeft: innerBorderStyle, textAlign: "center", fontSize: compact ? "12px" : "14px", fontWeight: 800 }}>
                      {item.quantity}
                    </td>
                    <td style={{ padding: "4px 6px", borderLeft: innerBorderStyle, textAlign: "center", fontSize: compact ? "11px" : "13px", fontWeight: 700 }}>
                      {fm(parseNumber(item.price))}
                    </td>
                    <td style={{ padding: "4px 6px", textAlign: "center", fontSize: compact ? "12px" : "14px", fontWeight: 900 }}>
                      {fm(getItemTotal(item))}
                    </td>
                 </tr>
               ))}
             </tbody>
           </table>
        </div>

        {/* Row 6: Notes */}
        <div style={{ borderBottom: borderStyle, padding: compact ? "4px 8px" : "8px 12px", minHeight: compact ? "35px" : "45px", display: "flex", flexDirection: "column" }}>
           <div style={titleStyle}>{i18n.t("invoiceContent.notes")}</div>
           <div style={{ ...valueStyle, flex: 1, fontSize: compact ? "11px" : "13px", fontWeight: 600 }}>{displayNotes}</div>
        </div>

        {/* Row 7: Shipping Barcode & Total (Footer) */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: discountVal > 0 ? "1.1fr 0.9fr 1fr 1.2fr" : "1.2fr 1fr 1.2fr",
            minHeight: compact ? "50px" : "65px",
            alignItems: "stretch",
          }}
        >
           <div style={{ borderLeft: innerBorderStyle, padding: compact ? "4px 8px" : "8px 12px", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
             {showShipBarcode && trackingNumberVal ? (
                <InvoiceBarcode value={String(trackingNumberVal)} label={i18n.t("invoiceContent.shippingCode")} height={compact ? 35 : 45} width={compact ? 1.2 : 1.5} compact={compact} />
             ) : (
               <span style={{ color: "#94a3b8" }}>—</span>
             )}
           </div>
           <div style={{ borderLeft: innerBorderStyle, padding: compact ? "4px 8px" : "8px 12px", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
              <div style={{ ...titleStyle, textAlign: "center", marginBottom: "4px" }}>{i18n.t("invoiceContent.shippingCost")}</div>
             <div style={{ ...valueStyle, textAlign: "center", fontWeight: 700 }}>{fm(effectiveShipping)}</div>
           </div>
           {discountVal > 0 && (
             <div style={{ borderLeft: innerBorderStyle, padding: compact ? "4px 6px" : "8px 10px", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
               <div style={{ ...titleStyle, textAlign: "center", marginBottom: "2px", color: "#dc2626" }}>الخصم</div>
               <div style={{ ...valueStyle, textAlign: "center", fontWeight: 700, color: "#dc2626" }}>-{fm(discountVal)}</div>
               {discountReasonVal && (
                 <div style={{ fontSize: compact ? "9px" : "10px", color: "#475569", fontWeight: 600, textAlign: "center", marginTop: "2px" }}>
                   {discountReasonVal}
                 </div>
               )}
             </div>
           )}
           <div style={{ padding: compact ? "4px 8px" : "8px 12px", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
              <div style={{ ...titleStyle, textAlign: "center", marginBottom: "4px" }}>{i18n.t("invoiceContent.amountToCollect")}</div>
             <div style={{ ...valueStyle, textAlign: "center", fontWeight: 900, fontSize: compact ? "16px" : "20px" }}>{fm(totalAmount)}</div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceContent;
