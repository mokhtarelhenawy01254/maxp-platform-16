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

interface InvoiceData {
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

interface InvoiceContentProps {
  invoice: InvoiceData;
  settings?: Partial<InvoicePrintSettings>;
  compact?: boolean;
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

const InvoiceContent: React.FC<InvoiceContentProps> = ({
  invoice,
  settings: partialSettings,
  compact = false,
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
  const items = invoice.order?.orderItems || [];

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("ar-EG", {
      style: "currency",
      currency,
    }).format(amount);

  const containerStyle: React.CSSProperties = {
    fontFamily: s.fontFamily,
    color: "#0f172a",
  };

  const showBarcodeOrderCode = s.showBarcodeOrderCode !== false;
  const showBarcodeShippingCode = s.showBarcodeShippingCode !== false;

  const thStyle: React.CSSProperties = {
    color: s.secondaryColor,
    fontSize: compact ? "0.72rem" : "0.8rem",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  };

  return (
    <div dir="rtl" style={containerStyle}>
      <div style={{ fontSize: compact ? 14 : 16 }}>
        {/* Company Header */}
        <div
          className="flex items-center justify-between pb-2 mb-2"
          style={{ borderBottom: `2px solid ${s.primaryColor}` }}
        >
          <div className="flex items-center gap-3">
            {s.showCompanyLogo && invoice.companyLogo && (
              <img
                src={invoice.companyLogo}
                alt="شعار الشركة"
                className="h-10 w-auto object-contain"
              />
            )}
            <h1
              className="font-extrabold m-0"
              style={{
                color: s.primaryColor,
                fontSize: compact ? "1.1rem" : "1.25rem",
              }}
            >
              {invoice.companyName}
            </h1>
          </div>
          <div className="text-left">
            <p className="text-xs font-semibold m-0" style={{ color: s.secondaryColor }}>
              {invoice.invoiceNumber || ""}
            </p>
          </div>
        </div>

        {/* Barcodes */}
        {(showBarcodeOrderCode || showBarcodeShippingCode) &&
          (invoice.order?.orderNumber || invoice.order?.turboTrackingNumber) && (
            <div className="mb-2">
              <div
                className="flex justify-center gap-6"
                style={{ transform: "scale(0.7)", transformOrigin: "center" }}
              >
                {showBarcodeOrderCode && invoice.order?.orderNumber && (
                  <InvoiceBarcode
                    value={invoice.order.orderNumber}
                    label="رقم الطلب"
                  />
                )}
                {showBarcodeShippingCode &&
                  invoice.order?.turboTrackingNumber && (
                    <InvoiceBarcode
                      value={invoice.order.turboTrackingNumber}
                      label="كود الشحن"
                    />
                  )}
              </div>
            </div>
          )}

        {/* Customer Info */}
        <div className="mb-2">
          <p className="font-semibold m-0" style={{ fontSize: compact ? "0.85rem" : "0.9rem" }}>
            {invoice.customerName}
          </p>
          <div className="text-slate-600 mt-0.5" style={{ fontSize: compact ? "0.78rem" : "0.85rem" }}>
            {invoice.customerPhone && <p className="m-0">{invoice.customerPhone}</p>}
            {invoice.customerEmail && <p className="m-0">{invoice.customerEmail}</p>}
            {addressText && (
              <p className="m-0 max-w-xs">{addressText}</p>
            )}
            {invoice.city && !addressText && (
              <p className="m-0">{invoice.city}</p>
            )}
          </div>
        </div>

        {/* Items Table */}
        {s.showOrderItems && (
          <div className="mb-1">
            {items.length === 0 ? (
              <p className="text-center text-slate-400 py-4 text-sm">لا توجد منتجات</p>
            ) : (
            <table className="w-full" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr
                  style={{
                    background: s.primaryColor + "10",
                    borderBottom: `1.5px solid ${s.primaryColor}40`,
                  }}
                >
                  <th className="text-right py-1.5 px-2 font-semibold" style={thStyle}>
                    المنتج
                  </th>
                  <th className="text-center py-1.5 px-2 font-semibold" style={thStyle}>
                    SKU
                  </th>
                  <th className="text-center py-1.5 px-2 font-semibold" style={thStyle}>
                    الكمية
                  </th>
                  <th className="text-left py-1.5 px-2 font-semibold" style={thStyle}>
                    السعر
                  </th>
                  <th className="text-left py-1.5 px-2 font-semibold" style={thStyle}>
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
                      fontSize: compact ? "0.8rem" : "0.875rem",
                    }}
                  >
                    <td className="text-right font-medium py-1 px-2">
                      {item.productName}
                      {(item.productColor || item.productSize) && (
                        <span
                          className="block font-normal"
                          style={{ color: s.secondaryColor, fontSize: "0.75rem" }}
                        >
                          {[item.productColor, item.productSize]
                            .filter(Boolean)
                            .join(" | ")}
                        </span>
                      )}
                    </td>
                    <td
                      className="text-center py-1 px-2"
                      style={{
                        fontFamily: "monospace",
                        fontSize: "0.8rem",
                        color: s.secondaryColor,
                      }}
                    >
                      {item.productSku || "—"}
                    </td>
                    <td className="text-center py-1 px-2">{item.quantity}</td>
                    <td className="text-left py-1 px-2">
                      {formatCurrency(parseNumber(item.price))}
                    </td>
                    <td className="text-left font-semibold py-1 px-2">
                      {formatCurrency(getItemTotal(item))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            )}
          </div>
        )}

        {/* Totals */}
        <div className="text-left ml-auto" style={{ maxWidth: compact ? "100%" : "60%" }}>
          <div className="flex justify-between py-0.5" style={{ fontSize: compact ? "0.78rem" : "0.85rem" }}>
            <span style={{ color: s.secondaryColor }}>المجموع الفرعي</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between py-0.5" style={{ fontSize: compact ? "0.78rem" : "0.85rem" }}>
              <span style={{ color: s.secondaryColor }}>الخصم</span>
              <span className="text-red-500">- {formatCurrency(discount)}</span>
            </div>
          )}
          {shipping > 0 && (
            <div className="flex justify-between py-0.5" style={{ fontSize: compact ? "0.78rem" : "0.85rem" }}>
              <span style={{ color: s.secondaryColor }}>الشحن</span>
              <span>{formatCurrency(shipping)}</span>
            </div>
          )}
          {s.showTaxBreakdown && tax > 0 && (
            <div className="flex justify-between py-0.5" style={{ fontSize: compact ? "0.78rem" : "0.85rem" }}>
              <span style={{ color: s.secondaryColor }}>الضريبة</span>
              <span>{formatCurrency(tax)}</span>
            </div>
          )}
          <div
            className="flex justify-between py-1 mt-0.5"
            style={{
              borderTop: "1.5px solid #0f172a",
              fontSize: compact ? "0.9rem" : "1rem",
            }}
          >
            <span className="font-bold">الإجمالي</span>
            <span className="font-bold">{formatCurrency(totalAmount)}</span>
          </div>

          {s.showPaymentMethod && invoice.paymentMethod && (
            <div
              className="mt-1 pt-1"
              style={{
                borderTop: "1px solid #e2e8f0",
                fontSize: compact ? "0.78rem" : "0.85rem",
              }}
            >
              <span style={{ color: s.secondaryColor }}>طريقة الدفع: </span>
              <span className="font-medium">{invoice.paymentMethod}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InvoiceContent;
