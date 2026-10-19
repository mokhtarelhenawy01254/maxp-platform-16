import { OrderDetailsType } from "../types";

export interface OrderDetailsEditForm {
  customerName: string;
  customerPhone: string;
  alternativePhone: string;
  customerAddress: string;
  city: string;
  governorate: string;
  notes: string;
  items: any[];
  shipping: number;
  tax: number;
  discount: number;
  discountReason: string;
  customerRating: string;
}

export const resolveOrderImageSrc = (value: any): string => {
  if (!value) return "";

  if (typeof value === "string") {
    const trimmed = value.trim();

    if (
      (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
      (trimmed.startsWith("[") && trimmed.endsWith("]"))
    ) {
      try {
        return resolveOrderImageSrc(JSON.parse(trimmed));
      } catch {
        return trimmed;
      }
    }

    return trimmed;
  }

  if (Array.isArray(value)) {
    return resolveOrderImageSrc(value[0]);
  }

  if (typeof value === "object") {
    if (typeof value.url === "string") return value.url;
    if (typeof value.src === "string") return value.src;
  }

  return "";
};

export const looksLikeSizeValue = (value: unknown): boolean => {
  if (value == null) return false;
  const str = String(value).trim();
  return /^(?:xxs|xs|s|m|l|xl|xxl|xxxl|2xl|3xl|4xl|5xl|free|one size|onesize|universal|small|medium|large|extra large|\d{1,3}(?:\.\d+)?)$/i.test(
    str,
  );
};

export const normalizeVariantDisplayValues = (color: unknown, size: unknown) => {
  const normalizedColor =
    typeof color === "string" ? color.trim() : color != null ? String(color).trim() : "";
  let normalizedSize = size != null ? String(size).trim() : "";

  if (
    normalizedColor &&
    normalizedSize &&
    normalizedColor.toLowerCase() === normalizedSize.toLowerCase()
  ) {
    normalizedSize = "";
  }

  if (normalizedSize && !looksLikeSizeValue(normalizedSize)) {
    if (
      normalizedColor &&
      (normalizedColor.includes(normalizedSize) || normalizedSize.includes(normalizedColor))
    ) {
      normalizedSize = "";
    }
  }

  return {
    color: normalizedColor,
    size: normalizedSize,
  };
};

export const isCancellationStatus = (status: string) => {
  const normalizedStatus = String(status || "").trim().toUpperCase();
  return normalizedStatus === "CANCELLED" || normalizedStatus === "CANCELED";
};

export const extractItemProductColor = (
  item: any,
  itemMetadata: any,
  vObj: any,
  variantMetadata: any,
): string => {
  // 1. Direct fields
  if (item.productColor) return item.productColor;
  if (item.color) return item.color;

  // 2. Metadata
  if (itemMetadata.productColor) return itemMetadata.productColor;
  if (itemMetadata.color) return itemMetadata.color;
  if (itemMetadata.Color) return itemMetadata.Color;
  const itemAttrs =
    itemMetadata.attributeValues ||
    (typeof itemMetadata.attributes === "object" && !Array.isArray(itemMetadata.attributes)
      ? itemMetadata.attributes
      : null);
  if (itemAttrs) {
    if (itemAttrs["اللون"]) return itemAttrs["اللون"];
    if (itemAttrs["لون"]) return itemAttrs["لون"];
    if (itemAttrs["Color"]) return itemAttrs["Color"];
    if (itemAttrs["color"]) return itemAttrs["color"];
  }

  // 3. Variant Relation
  if (vObj) {
    const vAttrs =
      variantMetadata.attributeValues ||
      (typeof variantMetadata.attributes === "object" && !Array.isArray(variantMetadata.attributes)
        ? variantMetadata.attributes
        : null) ||
      variantMetadata;
    if (vAttrs) {
      if (vAttrs["اللون"]) return vAttrs["اللون"];
      if (vAttrs["لون"]) return vAttrs["لون"];
      if (vAttrs["Color"]) return vAttrs["Color"];
      if (vAttrs["color"]) return vAttrs["color"];
    }
    if (vObj.color) return vObj.color;

    if (vObj.name) {
      const parts = vObj.name.split(/\s*[-–|\/]\s*/);
      if (parts.length >= 2 && isNaN(Number(parts[0]))) return parts[0];
      if (vObj.type === "color") return vObj.name;
    }
  }

  return "";
};

export const extractItemProductSize = (
  item: any,
  itemMetadata: any,
  vObj: any,
  variantMetadata: any,
): string => {
  const toStr = (v: unknown): string => (v != null ? String(v).trim() : "");

  // 1. Direct fields
  if (item.productSize != null && item.productSize !== "") return toStr(item.productSize);
  if (item.size != null && item.size !== "") return toStr(item.size);

  // 2. Metadata
  if (itemMetadata.productSize != null && itemMetadata.productSize !== "")
    return toStr(itemMetadata.productSize);
  if (itemMetadata.size != null && itemMetadata.size !== "") return toStr(itemMetadata.size);
  if (itemMetadata.Size != null && itemMetadata.Size !== "") return toStr(itemMetadata.Size);
  const itemAttrs =
    itemMetadata.attributeValues ||
    (typeof itemMetadata.attributes === "object" && !Array.isArray(itemMetadata.attributes)
      ? itemMetadata.attributes
      : null);
  if (itemAttrs) {
    if (itemAttrs["المقاس"] != null) return toStr(itemAttrs["المقاس"]);
    if (itemAttrs["مقاس"] != null) return toStr(itemAttrs["مقاس"]);
    if (itemAttrs["Size"] != null) return toStr(itemAttrs["Size"]);
    if (itemAttrs["size"] != null) return toStr(itemAttrs["size"]);
  }

  // 3. Variant Relation
  if (vObj) {
    const vAttrs =
      variantMetadata.attributeValues ||
      (typeof variantMetadata.attributes === "object" && !Array.isArray(variantMetadata.attributes)
        ? variantMetadata.attributes
        : null) ||
      variantMetadata;
    if (vAttrs) {
      if (vAttrs["المقاس"] != null) return toStr(vAttrs["المقاس"]);
      if (vAttrs["مقاس"] != null) return toStr(vAttrs["مقاس"]);
      if (vAttrs["Size"] != null) return toStr(vAttrs["Size"]);
      if (vAttrs["size"] != null) return toStr(vAttrs["size"]);
    }
    if (vObj.size != null) return toStr(vObj.size);

    if (vObj.name) {
      const parts = vObj.name.split(/\s*[-–|\/]\s*/).map((s: any) => s.trim());
      const sizePart = parts.find((part: string) => looksLikeSizeValue(part));
      if (sizePart) return sizePart;
      if (parts.length >= 2) return parts[parts.length - 1];
      if (vObj.type === "size") return parts[0];
    }
  }

  return "";
};

export const parseOrderDetailsResponse = (simpleOrder: any): OrderDetailsType => {
  const parsedSubtotal =
    parseFloat(simpleOrder.subtotal ?? simpleOrder.baseTotal ?? simpleOrder.total) || 0;
  const parsedTax = parseFloat(simpleOrder.tax) || 0;
  const parsedDiscount = parseFloat(simpleOrder.discount) || 0;
  const parsedFinalTotal = parseFloat(simpleOrder.finalTotal ?? simpleOrder.total) || 0;
  const directShipping =
    parseFloat(simpleOrder.shipping ?? simpleOrder.shippingCost) || 0;
  const resolvedShipping =
    directShipping > 0
      ? directShipping
      : Math.max(0, parsedFinalTotal - parsedSubtotal - parsedTax);
  const resolvedTotal =
    parsedFinalTotal > 0
      ? parsedFinalTotal
      : Math.max(0, parsedSubtotal + resolvedShipping + parsedTax - parsedDiscount);

  const kashierPaymentData =
    simpleOrder.kashierPayment ||
    (simpleOrder.metadata as any)?.kashierPayment ||
    null;

  return {
    ...simpleOrder,
    status: (simpleOrder.status || "").toUpperCase(),
    kashierPayment: kashierPaymentData,
    paymentStatus: (() => {
      const rawStatus = String(
        simpleOrder.paymentStatus ||
          (simpleOrder.metadata?.isGuestOrder ? "UNAVAILABLE" : "PENDING"),
      ).toUpperCase();

      if (
        kashierPaymentData &&
        (String(kashierPaymentData.status).toUpperCase() === "SUCCESS" ||
          String(kashierPaymentData.status).toUpperCase() === "CAPTURED")
      ) {
        return "COMPLETED";
      }

      if (
        (rawStatus === "PENDING" ||
          rawStatus === "UNAVAILABLE" ||
          rawStatus === "UNKNOWN" ||
          rawStatus === "") &&
        String(simpleOrder.paymentMethod || "").toLowerCase() === "wallet"
      ) {
        const walletProof = (simpleOrder.metadata as any)?.walletPaymentProof;
        const hasScreenshot = Boolean(walletProof?.imageUrl);
        const isRejected = String(walletProof?.status || "").toUpperCase() === "REJECTED";
        if (hasScreenshot && !isRejected) {
          return "COMPLETED";
        }
      }
      return rawStatus;
    })() as any,
    items: (Array.isArray(simpleOrder.items) ? simpleOrder.items : []).map((item: any) => {
      const price = parseFloat(item.price);
      const quantity = parseInt(item.quantity);
      const validPrice = !isNaN(price) && price >= 0 ? price : 0;
      const validQuantity = !isNaN(quantity) && quantity > 0 ? quantity : 1;

      let itemMetadata: any = {};
      try {
        itemMetadata =
          typeof item.metadata === "string" ? JSON.parse(item.metadata) : item.metadata || {};
      } catch {
        itemMetadata = {};
      }

      const vObj = item.variant || item.productVariant;
      let variantMetadata: any = {};
      if (vObj && vObj.metadata) {
        try {
          variantMetadata =
            typeof vObj.metadata === "string" ? JSON.parse(vObj.metadata) : vObj.metadata;
        } catch {
          variantMetadata = {};
        }
      }

      const extractedColor = extractItemProductColor(item, itemMetadata, vObj, variantMetadata);
      const extractedSize = extractItemProductSize(item, itemMetadata, vObj, variantMetadata);

      const normalizedVariantValues = normalizeVariantDisplayValues(extractedColor, extractedSize);

      return {
        id: item.id || Math.random().toString(),
        productId: item.productId || "",
        variantId: item.variantId || item.variant?.id || itemMetadata.variantId || null,
        productName:
          item.name || item.productName || (item as any).local_product_id || "منتج غير محدد",
        productColor: normalizedVariantValues.color,
        productSize: normalizedVariantValues.size,
        productImage:
          resolveOrderImageSrc(item.productImage) ||
          resolveOrderImageSrc(item.image) ||
          resolveOrderImageSrc(itemMetadata.image) ||
          resolveOrderImageSrc(itemMetadata.images) ||
          resolveOrderImageSrc(item.product?.images) ||
          "",
        productSku: item.productSku || "",
        price: validPrice,
        quantity: validQuantity,
        total: parseFloat(item.total) || validPrice * validQuantity,
        metadata: itemMetadata,
      };
    }),
    subtotal: parsedSubtotal,
    discount: parsedDiscount,
    discountReason:
      simpleOrder.discountReason || (simpleOrder.metadata as any)?.discountReason || null,
    needsDiscountApproval: Boolean(
      simpleOrder.needsDiscountApproval ?? (simpleOrder.metadata as any)?.needsDiscountApproval,
    ),
    discountApprovalStatus:
      simpleOrder.discountApprovalStatus ||
      (simpleOrder.metadata as any)?.discountApprovalStatus ||
      null,
    discountApprovedBy:
      simpleOrder.discountApprovedBy ||
      (simpleOrder.metadata as any)?.discountApprovedBy ||
      null,
    discountApprovedAt:
      simpleOrder.discountApprovedAt ||
      (simpleOrder.metadata as any)?.discountApprovedAt ||
      null,
    discountRejectedBy:
      simpleOrder.discountRejectedBy ||
      (simpleOrder.metadata as any)?.discountRejectedBy ||
      null,
    discountRejectedAt:
      simpleOrder.discountRejectedAt ||
      (simpleOrder.metadata as any)?.discountRejectedAt ||
      null,
    discountRejectionReason:
      simpleOrder.discountRejectionReason ||
      (simpleOrder.metadata as any)?.discountRejectionReason ||
      null,
    tax: parsedTax,
    shipping: resolvedShipping,
    total: resolvedTotal,
    trackingNumber:
      simpleOrder.trackingNumber ||
      simpleOrder.shipments?.[0]?.trackingNumber ||
      simpleOrder.turboTrackingNumber ||
      (simpleOrder.metadata as any)?.trackingNumber ||
      null,
    carrierType:
      simpleOrder.carrierType ||
      simpleOrder.shipments?.[0]?.carrierType ||
      (simpleOrder.metadata as any)?.shippingCarrier ||
      null,
    shipments: simpleOrder.shipments || [],
    currency: "EGP",
    isViewed: true,
  };
};

export const buildInitialEditForm = (
  enhancedOrder: OrderDetailsType,
  shippingAddr?: any,
): OrderDetailsEditForm => {
  return {
    customerName: enhancedOrder.customerName,
    customerPhone: enhancedOrder.customerPhone || "",
    alternativePhone: enhancedOrder.alternativePhone || "",
    customerAddress: enhancedOrder.customerAddress || "",
    city: enhancedOrder.city || "",
    governorate: enhancedOrder.governorate || shippingAddr?.governorate || "",
    notes: enhancedOrder.notes || "",
    items: JSON.parse(JSON.stringify(enhancedOrder.items || [])),
    shipping: enhancedOrder.shipping || 0,
    tax: enhancedOrder.tax || 0,
    discount: enhancedOrder.discount || 0,
    discountReason: enhancedOrder.discountReason || "",
    customerRating:
      enhancedOrder.customerRating || enhancedOrder.customer?.customerRating || "UNKNOWN",
  };
};
