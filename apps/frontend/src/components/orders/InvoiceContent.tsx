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
  const all = invoice.order?.orderItems || [];
  const n = Math.ceil(all.length / ITEMS_PER_PAGE) || 1;
  const pages: InvoicePageInfo[] = [];
  for (let i = 0; i < n; i++) {
    pages.push({ pageIndex: i, totalPages: n, isFirst: i === 0, isLast: i === n - 1, chunkItems: all.slice(i * ITEMS_PER_PAGE, (i + 1) * ITEMS_PER_PAGE) });
  }
  return pages;
}

const InvoiceContent: React.FC<InvoiceContentProps> = ({ invoice, settings: ps, compact = false, page }) => {
  const s: InvoicePrintSettings = { ...DEFAULT_INVOICE_SETTINGS, ...(ps || {}) };
  const currency = invoice.currency || "EGP";
  const totalAmount = invoice.totalAmount != null ? parseNumber(invoice.totalAmount) : parseNumber(invoice.subtotal) + parseNumber(invoice.shipping) + parseNumber(invoice.tax) - parseNumber(invoice.discount);
  const addressText = invoice.customerAddress ? formatAddress(invoice.customerAddress) : "";

  const isPaginated = page != null;
  const pageIndex = page?.pageIndex ?? 0;
  const totalPages = page?.totalPages ?? 1;
  const isFirst = page?.isFirst ?? true;
  const isLast = page?.isLast ?? true;
  const items = page?.chunkItems ?? (invoice.order?.orderItems || []);

  const fm = (a: number) => new Intl.NumberFormat("ar-EG", { style: "currency", currency }).format(a);

  const showOrderBarcode = s.showBarcodeOrderCode !== false && invoice.order?.orderNumber;
  const showShipBarcode = s.showBarcodeShippingCode !== false && invoice.order?.turboTrackingNumber;
  const hasBarcode = (showOrderBarcode || showShipBarcode);

  // shared compact row padding
  const rp = compact ? "1px 3px" : "2px 6px";
  const rowFont = compact ? "10px" : "12px";
  const thFont = compact ? "9px" : "11px";
  const sep = "1px solid #d1d5db";

  return (
    <div dir="rtl" style={{ fontFamily: s.fontFamily, color: "#0f172a", height: "100%", display: "flex", flexDirection: "column", overflow: "hidden", padding: compact ? "1mm 2mm" : "0", boxSizing: "border-box" }}>
      {/* ── Top block: customer + barcodes side by side ── */}
      {isFirst && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexShrink: 0, borderBottom: "1.5px solid " + s.primaryColor, paddingBottom: compact ? "1mm" : "4px", marginBottom: compact ? "1mm" : "4px", gap: "3px" }}>
          {/* customer info — left side (RTL: right) */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: compact ? "12px" : "0.95rem", marginBottom: "1px", color: s.primaryColor }}>
              {invoice.customerName}
            </div>
            {invoice.customerPhone && (
              <div style={{ fontWeight: 500, fontSize: compact ? "10px" : "13px", marginBottom: "1px" }}>
                {invoice.customerPhone}
              </div>
            )}
            {addressText && (
              <div style={{ fontSize: compact ? "9px" : "11px", color: "#374151", lineHeight: "1.3" }}>
                {addressText}
                {invoice.city ? " - " + invoice.city : ""}
              </div>
            )}
          </div>
          {/* barcodes — right side (RTL: left) */}
          {compact && hasBarcode && isFirst && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1px", flexShrink: 0 }}>
              {showOrderBarcode && (
                <div style={{ transform: "scale(0.33)", transformOrigin: "left top" }}>
                  <InvoiceBarcode value={invoice.order!.orderNumber!} label="طلب" height={28} width={1} />
                </div>
              )}
              {showShipBarcode && (
                <div style={{ transform: "scale(0.33)", transformOrigin: "left top" }}>
                  <InvoiceBarcode value={invoice.order!.turboTrackingNumber!} label="شحن" height={28} width={1} />
                </div>
              )}
            </div>
          )}
          {/* pagination marker */}
          {isPaginated && !isFirst && (
            <span style={{ fontSize: "9px", color: s.secondaryColor, flexShrink: 0 }}>{pageIndex + 1}/{totalPages}</span>
          )}
        </div>
      )}

      {/* ── Continuation header (non-first pages) ── */}
      {!isFirst && (
        <div style={{ flexShrink: 0, borderBottom: "1.5px solid " + s.primaryColor, paddingBottom: compact ? "1mm" : "4px", marginBottom: compact ? "1mm" : "4px" }}>
          <span style={{ fontSize: "9px", color: s.secondaryColor }}>تابع {pageIndex + 1}/{totalPages}</span>
        </div>
      )}

      {/* ── Products table ── */}
      {s.showOrderItems && (
        <div style={{ flex: 1, overflow: "hidden", minHeight: 0 }}>
          {items.length === 0 ? (
            <p style={{ textAlign: "center", color: "#94a3b8", padding: "4px 0", fontSize: rowFont }}>—</p>
          ) : (
            <table style={{ borderCollapse: "collapse", width: "100%", tableLayout: "fixed" }}>
              <thead>
                <tr style={{ background: s.primaryColor + "0f", borderBottom: sep }}>
                  <th style={{ textAlign: "right", width: "38%", padding: rp, fontWeight: 600, color: s.secondaryColor, fontSize: thFont }}>المنتج</th>
                  <th style={{ textAlign: "center", width: "14%", padding: rp, fontWeight: 600, color: s.secondaryColor, fontSize: thFont }}>SKU</th>
                  <th style={{ textAlign: "center", width: "10%", padding: rp, fontWeight: 600, color: s.secondaryColor, fontSize: thFont }}>كم</th>
                  <th style={{ textAlign: "left", width: "18%", padding: rp, fontWeight: 600, color: s.secondaryColor, fontSize: thFont }}>السعر</th>
                  <th style={{ textAlign: "left", width: "20%", padding: rp, fontWeight: 600, color: s.secondaryColor, fontSize: thFont }}>الإجمالي</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={item.id || idx} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={{ textAlign: "right", padding: rp }}>
                      <span style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", lineHeight: "1.25", fontWeight: 500, fontSize: rowFont }}>
                        {item.productName}
                      </span>
                      {(item.productColor || item.productSize) && (
                        <span style={{ display: "block", color: s.secondaryColor, fontSize: compact ? "8px" : "10px" }}>
                          {[item.productColor, item.productSize].filter(Boolean).join(" | ")}
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: "center", padding: rp, fontFamily: "monospace", fontSize: compact ? "8px" : "10px", color: s.secondaryColor }}>{item.productSku || "—"}</td>
                    <td style={{ textAlign: "center", padding: rp, fontSize: rowFont }}>{item.quantity}</td>
                    <td style={{ textAlign: "left", padding: rp, whiteSpace: "nowrap", fontSize: rowFont }}>{fm(parseNumber(item.price))}</td>
                    <td style={{ textAlign: "left", padding: rp, whiteSpace: "nowrap", fontWeight: 600, fontSize: rowFont }}>{fm(getItemTotal(item))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Totals (last page only) ── */}
      {isLast && (
        <div style={{ flexShrink: 0, borderTop: "1.5px solid " + s.primaryColor, paddingTop: compact ? "1mm" : "4px", marginTop: compact ? "0.5mm" : "2px", display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "8px" }}>
          <div style={{ fontWeight: 700, fontSize: compact ? "12px" : "1rem" }}>الإجمالي</div>
          <div>
            <span style={{ fontWeight: 700, fontSize: compact ? "12px" : "1rem" }}>{fm(totalAmount)}</span>
            {invoice.paymentMethod && compact && (
              <span style={{ fontSize: "9px", color: s.secondaryColor, marginRight: "6px" }}>{invoice.paymentMethod}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceContent;
