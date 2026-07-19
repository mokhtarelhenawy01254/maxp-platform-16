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

/**
 * Calculate how many half-pages an invoice needs.
 * Uses fixed known element heights to determine items-per-page.
 */
export const ITEMS_PER_PAGE = 8; // fits in 2×2 grid cell (105×148mm)

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
  const s: InvoicePrintSettings = {
    ...DEFAULT_INVOICE_SETTINGS,
    ...(partialSettings || {}),
  };

  const currency = invoice.currency || "EGP";
  const subtotal = parseNumber(invoice.subtotal);
  const shipping = parseNumber(invoice.shipping);
  const tax = parseNumber(invoice.tax);
  const discount = parseNumber(invoice.discount);
  const totalAmount =
    invoice.totalAmount != null
      ? parseNumber(invoice.totalAmount)
      : subtotal + shipping + tax - discount;
  const addressText = invoice.customerAddress
    ? formatAddress(invoice.customerAddress)
    : "";
  const allItems = invoice.order?.orderItems || [];

  const isPaginated = page != null;
  const pageIndex = page?.pageIndex ?? 0;
  const totalPages = page?.totalPages ?? 1;
  const isFirst = page?.isFirst ?? true;
  const isLast = page?.isLast ?? true;
  const items = page?.chunkItems ?? allItems;

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("ar-EG", {
      style: "currency",
      currency,
    }).format(amount);

  const showBarcodeOrderCode = s.showBarcodeOrderCode !== false;
  const showBarcodeShippingCode = s.showBarcodeShippingCode !== false;

  const thStyle: React.CSSProperties = {
    color: s.secondaryColor,
    fontSize: compact ? "10px" : "12px",
    textTransform: "uppercase",
    letterSpacing: "0.3px",
    fontWeight: 600,
  };

  const rowStyle: React.CSSProperties = {
    fontSize: compact ? "11px" : "13px",
  };

  return (
    <div
      dir="rtl"
      className="invoice-half-page"
      style={{
        fontFamily: s.fontFamily,
        color: "#0f172a",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        padding: compact ? "3mm 4mm" : "0",
        boxSizing: "border-box",
      }}
    >
      {/* Company Header */}
      <div
        className="invoice-header"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingBottom: compact ? "1mm" : "4px",
          marginBottom: compact ? "1mm" : "6px",
          borderBottom: `2px solid ${s.primaryColor}`,
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: compact ? 6 : 12 }}>
          {s.showCompanyLogo && invoice.companyLogo && (
            <img
              src={invoice.companyLogo}
              alt="شعار الشركة"
              style={{ height: compact ? "26px" : "40px", width: "auto", objectFit: "contain" }}
            />
          )}
          <h1
            style={{
              margin: 0,
              fontWeight: 800,
              color: s.primaryColor,
              fontSize: compact ? "13px" : "1.25rem",
            }}
          >
            {invoice.companyName}
            {isPaginated && !isFirst && (
              <span style={{ color: s.secondaryColor, fontSize: compact ? "10px" : "12px", fontWeight: 600, marginRight: "6px" }}>
                - تابع ({pageIndex + 1}/{totalPages})
              </span>
            )}
          </h1>
        </div>
        <div style={{ textAlign: "left", flexShrink: 0 }}>
          <p className="invoice-number-text" style={{ margin: 0, fontSize: compact ? "10px" : "12px", fontWeight: 600, color: s.secondaryColor }}>
            {invoice.invoiceNumber || ""}
          </p>
        </div>
      </div>

      {/* Barcode + Customer — first page only */}
      {isFirst && (
        <div style={{ flexShrink: 0, marginBottom: compact ? "1mm" : "4px" }}>
          {(showBarcodeOrderCode || showBarcodeShippingCode) &&
            (invoice.order?.orderNumber || invoice.order?.turboTrackingNumber) && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  gap: compact ? "8px" : "24px",
                  transform: compact ? "scale(0.45)" : "scale(0.7)",
                  transformOrigin: "top center",
                  marginBottom: compact ? "0" : "4px",
                }}
              >
                {showBarcodeOrderCode && invoice.order?.orderNumber && (
                  <InvoiceBarcode value={invoice.order.orderNumber} label={compact ? "" : "رقم الطلب"} height={35} width={1.2} />
                )}
                {showBarcodeShippingCode && invoice.order?.turboTrackingNumber && (
                  <InvoiceBarcode value={invoice.order.turboTrackingNumber} label={compact ? "" : "كود الشحن"} height={35} width={1.2} />
                )}
              </div>
            )}
          <div>
            <p style={{ margin: 0, fontWeight: 600, fontSize: compact ? "12px" : "0.9rem" }}>
              {invoice.customerName}
            </p>
            <div style={{ color: "#475569", marginTop: "1px", fontSize: compact ? "10px" : "0.85rem", lineHeight: "1.3" }}>
              {invoice.customerPhone && <span style={{ display: "block" }}>{invoice.customerPhone}</span>}
              {addressText && <span style={{ display: "block", maxWidth: compact ? "160px" : "280px" }}>{addressText}</span>}
              {invoice.city && !addressText && <span style={{ display: "block" }}>{invoice.city}</span>}
            </div>
          </div>
        </div>
      )}

      {/* Items Table — scrollable area that clips at fixed height */}
      {s.showOrderItems && (
        <div
          className="invoice-items-area"
          style={{
            flex: 1,
            overflow: "hidden",
            minHeight: 0,
            marginBottom: compact ? "1mm" : "2px",
          }}
        >
          {items.length === 0 ? (
            <p style={{ textAlign: "center", color: "#94a3b8", padding: compact ? "8px 0" : "16px 0", fontSize: compact ? "11px" : "14px" }}>
              لا توجد منتجات
            </p>
          ) : (
            <table className="w-full" style={{ borderCollapse: "collapse", width: "100%" }}>
              <thead>
                <tr style={{ background: s.primaryColor + "10", borderBottom: `1.5px solid ${s.primaryColor}40` }}>
                  <th className="text-right" style={{ ...thStyle, padding: compact ? "2px 4px" : "4px 8px", textAlign: "right" }}>
                    المنتج
                  </th>
                  <th className="text-center" style={{ ...thStyle, padding: compact ? "2px 4px" : "4px 8px", textAlign: "center" }}>
                    SKU
                  </th>
                  <th className="text-center" style={{ ...thStyle, padding: compact ? "2px 4px" : "4px 8px", textAlign: "center" }}>
                    كم
                  </th>
                  <th className="text-left" style={{ ...thStyle, padding: compact ? "2px 4px" : "4px 8px", textAlign: "left" }}>
                    السعر
                  </th>
                  <th className="text-left" style={{ ...thStyle, padding: compact ? "2px 4px" : "4px 8px", textAlign: "left" }}>
                    الإجمالي
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr
                    key={item.id || idx}
                    style={{
                      borderBottom: "1px solid #f1f5f9",
                      ...rowStyle,
                    }}
                  >
                    <td className="text-right" style={{ padding: compact ? "1px 4px" : "2px 8px", fontWeight: 500, textAlign: "right" }}>
                      <span style={{ display: "block", lineHeight: "1.3", maxWidth: compact ? "100px" : "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {item.productName}
                      </span>
                      {(item.productColor || item.productSize) && (
                        <span style={{ display: "block", color: s.secondaryColor, fontSize: compact ? "9px" : "11px", fontWeight: 400 }}>
                          {[item.productColor, item.productSize].filter(Boolean).join(" | ")}
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: "center", padding: compact ? "1px 4px" : "2px 8px", fontFamily: "monospace", fontSize: compact ? "9px" : "12px", color: s.secondaryColor }}>
                      {item.productSku || "—"}
                    </td>
                    <td style={{ textAlign: "center", padding: compact ? "1px 4px" : "2px 8px" }}>
                      {item.quantity}
                    </td>
                    <td style={{ textAlign: "left", padding: compact ? "1px 4px" : "2px 8px", whiteSpace: "nowrap" }}>
                      {formatCurrency(parseNumber(item.price))}
                    </td>
                    <td style={{ textAlign: "left", padding: compact ? "1px 4px" : "2px 8px", fontWeight: 600, whiteSpace: "nowrap" }}>
                      {formatCurrency(getItemTotal(item))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Totals — last page only */}
      {isLast && (
        <div
          className="invoice-totals"
          style={{
            textAlign: "left",
            marginRight: "auto",
            flexShrink: 0,
            borderTop: compact ? "1px solid #e2e8f0" : "none",
            paddingTop: compact ? "1mm" : "2px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", padding: compact ? "1px 0" : "3px 0", fontSize: compact ? "10px" : "0.85rem", gap: "12px" }}>
            <span style={{ color: s.secondaryColor }}>المجموع الفرعي</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          {discount > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", padding: compact ? "1px 0" : "3px 0", fontSize: compact ? "10px" : "0.85rem", gap: "12px" }}>
              <span style={{ color: s.secondaryColor }}>الخصم</span>
              <span style={{ color: "#ef4444" }}>- {formatCurrency(discount)}</span>
            </div>
          )}
          {shipping > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", padding: compact ? "1px 0" : "3px 0", fontSize: compact ? "10px" : "0.85rem", gap: "12px" }}>
              <span style={{ color: s.secondaryColor }}>الشحن</span>
              <span>{formatCurrency(shipping)}</span>
            </div>
          )}
          {s.showTaxBreakdown && tax > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", padding: compact ? "1px 0" : "3px 0", fontSize: compact ? "10px" : "0.85rem", gap: "12px" }}>
              <span style={{ color: s.secondaryColor }}>الضريبة</span>
              <span>{formatCurrency(tax)}</span>
            </div>
          )}
          <div style={{
            display: "flex", justifyContent: "space-between",
            padding: compact ? "2px 0 0" : "8px 0 0",
            marginTop: compact ? "0" : "4px",
            borderTop: "1.5px solid #0f172a",
            fontSize: compact ? "12px" : "1rem", gap: "12px",
          }}>
            <span style={{ fontWeight: 700 }}>الإجمالي</span>
            <span style={{ fontWeight: 700 }}>{formatCurrency(totalAmount)}</span>
          </div>

          {s.showPaymentMethod && invoice.paymentMethod && (
            <div style={{
              marginTop: compact ? "1px" : "4px",
              paddingTop: compact ? "1px" : "4px",
              borderTop: "1px solid #e2e8f0",
              fontSize: compact ? "10px" : "0.85rem",
              color: s.secondaryColor,
            }}>
              طريقة الدفع: <span style={{ fontWeight: 500, color: "#334155" }}>{invoice.paymentMethod}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default InvoiceContent;
