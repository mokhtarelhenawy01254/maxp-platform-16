import { type InvoiceData } from "../../../components/orders/InvoiceContent";
import {
  GuestOrderPrint,
  GuestPrintCompanyInfo,
  cleanBulkNotes,
} from "./guestPrintPayload";

export interface ApiInvoice {
  id: string;
  invoiceNumber: string;
  subtotal: number;
  tax: number;
  shipping: number;
  discount: number;
  totalAmount: number;
  currency: string;
  customerName: string;
  customerPhone: string | null;
  customerEmail: string | null;
  customerAddress: string | null;
  city: string | null;
  governorate?: string | null;
  companyName: string;
  companyPhone: string | null;
  companyLogo: string | null;
  paymentMethod: string | null;
  paymentStatus: string;
  notes?: string | null;
  metadata?: any;
  order: {
    orderNumber: string;
    trackingNumber?: string | null;
    turboTrackingNumber?: string | null;
    notes?: string | null;
    metadata?: any;
    shippingAddress?: any;
    orderItems: Array<{
      productName: string;
      productSku?: string | null;
      productColor?: string | null;
      productSize?: string | null;
      quantity: number;
      price: number;
      total: number;
      attributes?: any;
      customAttributes?: any;
      customFields?: any;
      metadata?: any;
      carModel?: string | null;
      car_model?: string | null;
    }>;
  };
}

/** Convert API Invoice to InvoiceData shape */
export function toInvoiceData(inv: ApiInvoice): InvoiceData {
  return {
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    companyName: inv.companyName,
    companyPhone: inv.companyPhone,
    companyLogo: inv.companyLogo,
    customerName: inv.customerName,
    customerPhone: inv.customerPhone,
    customerEmail: inv.customerEmail,
    customerAddress: inv.customerAddress,
    city: inv.city,
    governorate: inv.governorate,
    paymentMethod: inv.paymentMethod,
    paymentStatus: inv.paymentStatus,
    currency: inv.currency,
    subtotal: inv.subtotal,
    tax: inv.tax,
    shipping: inv.shipping,
    discount: inv.discount,
    totalAmount: inv.totalAmount,
    notes: (() => {
      const orderNotes = cleanBulkNotes(inv.order?.notes);
      const invoiceNotes = cleanBulkNotes(inv.notes);
      return (
        Array.from(new Set([orderNotes, invoiceNotes].filter(Boolean))).join("\n").trim() || null
      );
    })(),
    metadata: inv.order?.metadata || inv.metadata || null,
    order: {
      orderNumber: inv.order?.orderNumber,
      total: (inv.order as any)?.total != null ? (inv.order as any).total : inv.totalAmount,
      subtotal: (inv.order as any)?.subtotal != null ? (inv.order as any).subtotal : inv.subtotal,
      shipping: (inv.order as any)?.shipping != null ? (inv.order as any).shipping : inv.shipping,
      discount: (inv.order as any)?.discount != null ? (inv.order as any).discount : inv.discount,
      tax: (inv.order as any)?.tax != null ? (inv.order as any).tax : inv.tax,
      trackingNumber: (inv.order as any)?.trackingNumber || inv.order?.turboTrackingNumber || null,
      turboTrackingNumber: inv.order?.turboTrackingNumber,
      notes: (() => {
        const orderNotes = cleanBulkNotes(inv.order?.notes);
        const invoiceNotes = cleanBulkNotes(inv.notes);
        return (
          Array.from(new Set([orderNotes, invoiceNotes].filter(Boolean))).join("\n").trim() || null
        );
      })(),
      metadata: inv.order?.metadata || inv.metadata || null,
      shippingAddress: (inv.order as any)?.shippingAddress || null,
      orderItems: (inv.order?.orderItems || (inv as any).items || []).map((item: any) => ({
        ...item,
        productName: item.productName || item.name || "منتج",
        quantity: item.quantity,
        price: item.price,
        total: item.total,
        productSku:
          item.productSku ||
          item.sku ||
          item.code ||
          item.productVariant?.sku ||
          item.product?.sku ||
          item.barcode ||
          (() => {
            if (typeof item.metadata === "string" && item.metadata.includes("sku")) {
              try {
                const parsed = JSON.parse(item.metadata);
                return parsed?.sku || parsed?.variantSku || parsed?.productSku || null;
              } catch {
                return null;
              }
            } else if (item.metadata && typeof item.metadata === "object") {
              return item.metadata.sku || item.metadata.variantSku || item.metadata.productSku || null;
            }
            return null;
          })() ||
          null,
        productColor: item.productColor,
        productSize: item.productSize,
        attributes: item.attributes || item.customAttributes || item.customFields || null,
        customAttributes: item.customAttributes || null,
        customFields: item.customFields || null,
        metadata: item.metadata || null,
        carModel:
          item.carModel ||
          item.car_model ||
          (() => {
            let m = item.metadata;
            if (typeof m === "string") {
              try { m = JSON.parse(m); } catch { m = null; }
            }
            if (m && typeof m === "object") {
              return (
                m.carModel ||
                m.car_model ||
                m.attributeValues?.car_model ||
                m.attributeValues?.carModel ||
                m.attributeValues?.["نوع وموديل وسنة صنع السيارة"] ||
                m.attributeValues?.["موديل السيارة"] ||
                m.attributeValues?.["السيارة"] ||
                (m.details && typeof m.details === "string" && m.details.trim().length > 1 ? m.details.trim() : null) ||
                null
              );
            }
            return null;
          })() ||
          null,
      })),
    },
  };
}

/** Convert a guest order (from bulk-generate) to InvoiceData using company info */
export function guestOrderToInvoiceData(guest: GuestOrderPrint, company: GuestPrintCompanyInfo): InvoiceData {
  return {
    id: guest.id,
    invoiceNumber: guest.orderNumber,
    companyName: company.companyName,
    companyPhone: company.companyPhone,
    companyLogo: company.companyLogo,
    customerName: guest.customerName || "عميل غير محدد",
    customerPhone: guest.customerPhone,
    customerEmail: guest.customerEmail,
    customerAddress: guest.customerAddress,
    city: guest.city,
    governorate: guest.governorate,
    paymentMethod: guest.paymentMethod,
    paymentStatus: guest.paymentStatus || "PENDING",
    currency: guest.currency || "EGP",
    subtotal: Number(guest.subtotal || 0),
    tax: Number(guest.tax || 0),
    shipping: Number(guest.shipping || 0),
    discount: Number(guest.discount || 0),
    totalAmount: Number(guest.total || 0),
    notes: cleanBulkNotes(guest.notes) || null,
    metadata: guest.metadata || null,
    order: {
      orderNumber: guest.orderNumber,
      trackingNumber: guest.trackingNumber || guest.turboTrackingNumber || null,
      turboTrackingNumber: guest.turboTrackingNumber,
      notes: cleanBulkNotes(guest.notes) || null,
      metadata: guest.metadata || null,
      shippingAddress: guest.shippingAddress || null,
      orderItems: (guest.items || []).map((item: any) => ({
        ...item,
        productName: item.productName || item.name || "منتج",
        quantity: Number(item.quantity || 1),
        price: Number(item.price || 0),
        total: Number(item.total != null ? item.total : (Number(item.price || 0) * Number(item.quantity || 1))),
        productSku: item.productSku || item.sku || item.code || item.barcode || item.variant?.sku || item.product?.sku || null,
        productColor: item.productColor,
        productSize: item.productSize,
        attributes: item.attributes || item.customAttributes || item.customFields || null,
        customAttributes: item.customAttributes || null,
        customFields: item.customFields || null,
        metadata: item.metadata || null,
        carModel:
          item.carModel ||
          item.car_model ||
          (() => {
            let m = item.metadata;
            if (typeof m === "string") {
              try { m = JSON.parse(m); } catch { m = null; }
            }
            if (m && typeof m === "object") {
              return (
                m.carModel ||
                m.car_model ||
                m.attributeValues?.car_model ||
                m.attributeValues?.carModel ||
                m.attributeValues?.["نوع وموديل وسنة صنع السيارة"] ||
                m.attributeValues?.["موديل السيارة"] ||
                m.attributeValues?.["السيارة"] ||
                (m.details && typeof m.details === "string" && m.details.trim().length > 1 ? m.details.trim() : null) ||
                null
              );
            }
            return null;
          })() ||
          null,
      })),
    },
  };
}
