import React from "react";
import i18n from "../../i18n";
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
    trackingNumber?: string | null;
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
  // Since this is a shipping label format, we generally fit everything on one label.
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
                      {item.productSku || "—"}
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
           <div style={{ ...valueStyle, flex: 1 }}></div>
        </div>

        {/* Row 7: Shipping Barcode & Total (Footer) */}
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1.2fr", minHeight: compact ? "50px" : "65px", alignItems: "stretch" }}>
           <div style={{ borderLeft: innerBorderStyle, padding: compact ? "4px 8px" : "8px 12px", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
             {showShipBarcode && trackingNumberVal ? (
                <InvoiceBarcode value={String(trackingNumberVal)} label={i18n.t("invoiceContent.shippingCode")} height={compact ? 35 : 45} width={compact ? 1.2 : 1.5} compact={compact} />
             ) : (
               <span style={{ color: "#94a3b8" }}>—</span>
             )}
           </div>
           <div style={{ borderLeft: innerBorderStyle, padding: compact ? "4px 8px" : "8px 12px", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
              <div style={{ ...titleStyle, textAlign: "center", marginBottom: "4px" }}>{i18n.t("invoiceContent.shippingCost")}</div>
             <div style={{ ...valueStyle, textAlign: "center", fontWeight: 700 }}>{fm(parseNumber(invoice.shipping))}</div>
           </div>
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
