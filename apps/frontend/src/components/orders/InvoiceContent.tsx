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
  // Since we concatenate items into one string, we only need 1 page per invoice.
  // We keep this function signature for compatibility with PrintMultipleInvoices.tsx
  const all = invoice.order?.orderItems || [];
  return [{ pageIndex: 0, totalPages: 1, isFirst: true, isLast: true, chunkItems: all }];
}

const InvoiceContent: React.FC<InvoiceContentProps> = ({ invoice, settings: ps, compact = false, page }) => {
  const s: InvoicePrintSettings = { ...DEFAULT_INVOICE_SETTINGS, ...(ps || {}) };
  const currency = invoice.currency || "EGP";
  
  // Total calculation
  const totalAmount = invoice.totalAmount != null 
    ? parseNumber(invoice.totalAmount) 
    : parseNumber(invoice.subtotal) + parseNumber(invoice.shipping) + parseNumber(invoice.tax) - parseNumber(invoice.discount);
  
  const addressText = invoice.customerAddress ? formatAddress(invoice.customerAddress) : "";
  const items = page?.chunkItems ?? (invoice.order?.orderItems || []);
  
  // Format total (e.g. 854.94 جنيه)
  const fm = (a: number) => `${new Intl.NumberFormat("ar-EG").format(a)} جنيه`;
  
  // Choose barcode value (prefer tracking number for shipping labels)
  const barcodeValue = invoice.order?.turboTrackingNumber || invoice.order?.orderNumber;
  
  // Concatenate products (e.g. The Collection Snowboard: Liquid * 1)
  const productsString = items.map(i => {
    let name = i.productName;
    if (i.productColor) name += ` (${i.productColor})`;
    if (i.productSize) name += ` [${i.productSize}]`;
    return `${name} * ${i.quantity}`;
  }).join(" | ");

  const borderStyle = "2px solid #000";
  
  // Reusable cell styles
  const titleStyle: React.CSSProperties = {
    fontSize: compact ? "11px" : "13px",
    fontWeight: 700,
    marginBottom: "4px",
    textAlign: "right"
  };
  
  const valueStyle: React.CSSProperties = {
    fontSize: compact ? "13px" : "15px",
    fontWeight: 600,
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
        {/* Row 1: Logo */}
        <div style={{ borderBottom: borderStyle, display: "flex", justifyContent: "center", alignItems: "center", padding: "6px", minHeight: compact ? "40px" : "55px" }}>
           {invoice.companyLogo ? (
             <img src={invoice.companyLogo} alt={invoice.companyName} style={{ maxHeight: compact ? "30px" : "40px", objectFit: "contain" }} />
           ) : (
             <h2 style={{ margin: 0, fontSize: compact ? "16px" : "20px", fontWeight: 800, color: "#dc2626" }}>{invoice.companyName}</h2>
           )}
        </div>

        {/* Row 2: Barcode */}
        <div style={{ borderBottom: borderStyle, display: "flex", justifyContent: "center", alignItems: "center", padding: "8px", minHeight: compact ? "65px" : "85px" }}>
           {barcodeValue && (
             <InvoiceBarcode value={barcodeValue} label="" height={compact ? 45 : 55} width={compact ? 1.5 : 2} compact={compact} />
           )}
        </div>

        {/* Row 3: Recipient & Phone */}
        <div style={{ borderBottom: borderStyle, display: "grid", gridTemplateColumns: "1fr 1fr" }}>
           <div style={{ borderLeft: borderStyle, padding: compact ? "4px 8px" : "8px 12px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
             <div style={titleStyle}>اسم المستلم</div>
             <div style={valueStyle}>{invoice.customerName}</div>
           </div>
           <div style={{ padding: compact ? "4px 8px" : "8px 12px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
             <div style={titleStyle}>تليفون</div>
             <div style={{ ...valueStyle, direction: "ltr", textAlign: "right" }}>{invoice.customerPhone || "—"}</div>
           </div>
        </div>

        {/* Row 4: City & Area */}
        <div style={{ borderBottom: borderStyle, display: "grid", gridTemplateColumns: "1fr 1fr" }}>
           <div style={{ borderLeft: borderStyle, padding: compact ? "4px 8px" : "8px 12px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
             <div style={titleStyle}>المدينة</div>
             <div style={valueStyle}>{invoice.city || "—"}</div>
           </div>
           <div style={{ padding: compact ? "4px 8px" : "8px 12px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
             <div style={titleStyle}>المنطقة</div>
             <div style={valueStyle}>{invoice.governorate || "—"}</div>
           </div>
        </div>

        {/* Row 5: Address */}
        <div style={{ borderBottom: borderStyle, padding: compact ? "4px 8px" : "8px 12px", minHeight: compact ? "50px" : "70px", display: "flex", flexDirection: "column" }}>
           <div style={titleStyle}>العنوان :</div>
           <div style={{ ...valueStyle, flex: 1, display: "flex", alignItems: "flex-end", justifyContent: "flex-end" }}>{addressText || "—"}</div>
        </div>

        {/* Row 6: Items (وصف الشحنة) */}
        <div style={{ borderBottom: borderStyle, padding: compact ? "4px 8px" : "8px 12px", flex: 1, display: "flex", flexDirection: "column" }}>
           <div style={titleStyle}>وصف الشحنة :</div>
           <div style={{ ...valueStyle, flex: 1, display: "flex", alignItems: "flex-end", justifyContent: "flex-end", lineHeight: "1.5" }}>{productsString || "—"}</div>
        </div>

        {/* Row 7: Notes */}
        <div style={{ borderBottom: borderStyle, padding: compact ? "4px 8px" : "8px 12px", minHeight: compact ? "35px" : "45px", display: "flex", flexDirection: "column" }}>
           <div style={titleStyle}>ملاحظات :</div>
           <div style={{ ...valueStyle, flex: 1 }}></div>
        </div>

        {/* Row 8: Total & Company (Centered values) */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", minHeight: compact ? "50px" : "70px" }}>
           <div style={{ borderLeft: borderStyle, padding: compact ? "4px 8px" : "8px 12px", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
             <div style={{ ...titleStyle, textAlign: "center", marginBottom: "8px" }}>اسم الشركة :</div>
             <div style={{ ...valueStyle, textAlign: "center" }}>{invoice.companyName}</div>
           </div>
           <div style={{ padding: compact ? "4px 8px" : "8px 12px", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
             <div style={{ ...titleStyle, textAlign: "center", marginBottom: "8px" }}>المبلغ المطلوب تحصيله :</div>
             <div style={{ ...valueStyle, textAlign: "center", fontWeight: 800, fontSize: compact ? "15px" : "18px" }}>{fm(totalAmount)}</div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceContent;
