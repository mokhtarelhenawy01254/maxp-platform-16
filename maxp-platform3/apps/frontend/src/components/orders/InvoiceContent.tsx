import React from "react";
import InvoiceBarcode from "./InvoiceBarcode";

export interface InvoicePrintSettings {
  showCompanyLogo: boolean;
  showTaxBreakdown: boolean;
  showPaymentMethod: boolean;
  showOrderItems: boolean;
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
  primaryColor: "#0f766e",
  secondaryColor: "#6b7280",
  fontFamily: '"Segoe UI", Tahoma, Arial, sans-serif',
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
  productColor?: string | null;
  productSize?: string | null;
}

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
  totalAmount?: number | string;
  order?: {
    orderNumber?: string;
    status?: string;
    turboTrackingNumber?: string | null;
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

const parseNumber = (value: number | string | null | undefined): number =>
  Number(value || 0);

const getItemTotal = (item: InvoiceItem): number => {
  const explicitTotal = item.total ?? item.totalPrice;
  if (explicitTotal !== undefined && explicitTotal !== null) {
    return parseNumber(explicitTotal);
  }
  return parseNumber(item.price) * parseNumber(item.quantity);
};

const formatAddress = (address: unknown): string => {
  if (!address) return "";
  if (typeof address === "string") {
    if (address.startsWith("{")) {
      try {
        const parsed = JSON.parse(address);
        return formatAddress(parsed);
      } catch {
        return address;
      }
    }
    return address;
  }
  if (typeof address === "object") {
    const obj = address as Record<string, unknown>;
    const parts = [
      obj.street, obj.address, obj.area, obj.district,
      obj.landmark, obj.city, obj.governorate,
    ]
      .map((v) => String(v ?? "").trim())
      .filter(Boolean)
      .filter((p, i, arr) => arr.indexOf(p) === i);
    return parts.length > 0 ? parts.join(" - ") : "";
  }
  return "";
};

export const ITEMS_PER_PAGE = 7;

export function getInvoicePages(invoice: InvoiceData): InvoicePageInfo[] {
  const allItems = invoice.order?.orderItems || [];
  const totalPages = Math.ceil(allItems.length / ITEMS_PER_PAGE) || 1;
  const pages: InvoicePageInfo[] = [];
  for (let i = 0; i < totalPages; i++) {
    pages.push({
      pageIndex: i,
      totalPages,
      isFirst: i === 0,
      isLast: i === totalPages - 1,
      chunkItems: allItems.slice(i * ITEMS_PER_PAGE, (i + 1) * ITEMS_PER_PAGE),
    });
  }
  return pages;
}

const InvoiceContent: React.FC<InvoiceContentProps> = ({
  invoice,
  settings: partialSettings,
  compact = false,
  page,
}) => {
  const s: InvoicePrintSettings = { ...DEFAULT_INVOICE_SETTINGS, ...(partialSettings || {}) };

  const currency = invoice.currency || "EGP";
  const subtotal = parseNumber(invoice.subtotal);
  const shipping = parseNumber(invoice.shipping);
  const tax = parseNumber(invoice.tax);
  const discount = parseNumber(invoice.discount);
  const totalAmount = invoice.totalAmount != null ? parseNumber(invoice.totalAmount) : subtotal + shipping + tax - discount;
  const addressText = invoice.customerAddress ? formatAddress(invoice.customerAddress) : "";
  const allItems = invoice.order?.orderItems || [];

  const isPaginated = page != null;
  const pageIndex = page?.pageIndex ?? 0;
  const totalPages = page?.totalPages ?? 1;
  const isFirst = page?.isFirst ?? true;
  const isLast = page?.isLast ?? true;
  const items = page?.chunkItems ?? allItems;

  const fm = (amount: number) =>
    new Intl.NumberFormat("ar-EG", { style: "currency", currency }).format(amount);

  const showBarcodeOrderCode = s.showBarcodeOrderCode !== false;
  const showBarcodeShippingCode = s.showBarcodeShippingCode !== false;
  const sep = "1px solid #d1d5db";

  /** shared row padding */
  const rp = compact ? "1px 3px" : "2px 6px";

  return (
    <div
      dir="rtl"
      style={{
        fontFamily: s.fontFamily,
        color: "#0f172a",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        padding: compact ? "1.5mm 3mm" : "0",
        boxSizing: "border-box",
        fontSize: compact ? "11px" : "14px",
      }}
    >
      {/* ── Header: company + barcode (compact, first page) ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, marginBottom: compact ? "0.5mm" : "4px", borderBottom: "1.5px solid " + s.primaryColor, paddingBottom: compact ? "0.5mm" : "3px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          {s.showCompanyLogo && invoice.companyLogo && (
            <img src={invoice.companyLogo} alt="" style={{ height: compact ? "20px" : "40px", width: "auto", objectFit: "contain" }} />
          )}
          <span style={{ fontWeight: 800, color: s.primaryColor, fontSize: compact ? "11px" : "1.1rem" }}>
            {invoice.companyName}
            {isPaginated && !isFirst && (
              <span style={{ color: s.secondaryColor, fontSize: "9px", fontWeight: 600 }}>
                {" "}({pageIndex + 1}/{totalPages})
              </span>
            )}
          </span>
        </div>
        {/* barcodes in header - separated */}
        {isFirst && compact && (showBarcodeOrderCode || showBarcodeShippingCode) && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "2px", flexShrink: 0 }}>
            {showBarcodeOrderCode && invoice.order?.orderNumber && (
              <div style={{ transform: "scale(0.3)", transformOrigin: "right top" }}>
                <InvoiceBarcode value={invoice.order.orderNumber} label="طلب" height={28} width={1} />
              </div>
            )}
            {showBarcodeShippingCode && invoice.order?.turboTrackingNumber && (
              <div style={{ transform: "scale(0.3)", transformOrigin: "right top" }}>
                <InvoiceBarcode value={invoice.order.turboTrackingNumber} label="شحن" height={28} width={1} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Customer — priority section ── */}
      {isFirst && (
        <div style={{ flexShrink: 0, marginBottom: compact ? "0.5mm" : "4px", paddingBottom: compact ? "0.5mm" : "3px", borderBottom: sep }}>
          <div style={{ fontSize: compact ? "13px" : "0.95rem", fontWeight: 700, marginBottom: "1px" }}>
            {invoice.customerName}
          </div>
          <div style={{ lineHeight: "1.35" }}>
            {invoice.customerPhone && (
              <span style={{ display: "block", fontWeight: 500, fontSize: compact ? "11px" : "0.85rem" }}>
                📞 {invoice.customerPhone}
              </span>
            )}
            {addressText && (
              <span style={{ display: "block", fontSize: compact ? "10px" : "0.8rem", color: "#374151" }}>
                📍 {addressText}
              </span>
            )}
            {invoice.city && (
              <span style={{ display: "block", fontSize: compact ? "10px" : "0.8rem", color: "#374151" }}>
                🏙 {invoice.city}
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── Products table ── */}
      {s.showOrderItems && (
        <div style={{ flex: 1, overflow: "hidden", minHeight: 0, marginBottom: compact ? "0.5mm" : "2px" }}>
          {items.length === 0 ? (
            <p style={{ textAlign: "center", color: "#94a3b8", padding: "4px 0", fontSize: compact ? "10px" : "13px" }}>—</p>
          ) : (
            <table style={{ borderCollapse: "collapse", width: "100%", tableLayout: "fixed" }}>
              <thead>
                <tr style={{ background: s.primaryColor + "0f", borderBottom: sep }}>
                  <th style={{ textAlign: "right", width: "38%", padding: rp, fontWeight: 600, color: s.secondaryColor, fontSize: compact ? "9px" : "11px" }}>المنتج</th>
                  <th style={{ textAlign: "center", width: "14%", padding: rp, fontWeight: 600, color: s.secondaryColor, fontSize: compact ? "9px" : "11px" }}>SKU</th>
                  <th style={{ textAlign: "center", width: "10%", padding: rp, fontWeight: 600, color: s.secondaryColor, fontSize: compact ? "9px" : "11px" }}>كم</th>
                  <th style={{ textAlign: "left", width: "18%", padding: rp, fontWeight: 600, color: s.secondaryColor, fontSize: compact ? "9px" : "11px" }}>السعر</th>
                  <th style={{ textAlign: "left", width: "20%", padding: rp, fontWeight: 600, color: s.secondaryColor, fontSize: compact ? "9px" : "11px" }}>الإجمالي</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={item.id || idx} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={{ textAlign: "right", padding: rp }}>
                      <span style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", lineHeight: "1.25", fontWeight: 500, fontSize: compact ? "10px" : "12px" }}>
                        {item.productName}
                      </span>
                      {(item.productColor || item.productSize) && (
                        <span style={{ display: "block", color: s.secondaryColor, fontSize: compact ? "8px" : "10px" }}>
                          {[item.productColor, item.productSize].filter(Boolean).join(" | ")}
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: "center", padding: rp, fontFamily: "monospace", fontSize: compact ? "8px" : "10px", color: s.secondaryColor }}>
                      {item.productSku || "—"}
                    </td>
                    <td style={{ textAlign: "center", padding: rp, fontSize: compact ? "10px" : "12px" }}>
                      {item.quantity}
                    </td>
                    <td style={{ textAlign: "left", padding: rp, whiteSpace: "nowrap", fontSize: compact ? "10px" : "12px" }}>
                      {fm(parseNumber(item.price))}
                    </td>
                    <td style={{ textAlign: "left", padding: rp, whiteSpace: "nowrap", fontWeight: 600, fontSize: compact ? "10px" : "12px" }}>
                      {fm(getItemTotal(item))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Totals (last page only) ── */}
      {isLast && (
        <div style={{ flexShrink: 0, borderTop: sep, paddingTop: compact ? "0.5mm" : "3px", textAlign: "left", marginRight: "auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", fontWeight: 700, fontSize: compact ? "12px" : "0.95rem" }}>
            <span>الإجمالي</span>
            <span>{fm(totalAmount)}</span>
          </div>
          {s.showPaymentMethod && invoice.paymentMethod && (
            <div style={{ fontSize: compact ? "9px" : "11px", color: s.secondaryColor, marginTop: "1px", borderTop: "1px solid #f3f4f6", paddingTop: "1px" }}>
              {invoice.paymentMethod}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default InvoiceContent;
