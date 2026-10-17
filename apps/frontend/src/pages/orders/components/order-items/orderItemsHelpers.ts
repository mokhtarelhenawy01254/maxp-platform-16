import { OrderItem } from "../types";
import {
  OrderItemMetadata,
  QuantityOfferDisplay,
} from "./orderItemsTypes";

export const looksLikeSizeValue = (value: unknown): boolean => {
  if (value == null) return false;
  const str = String(value).trim();
  return /^(?:xxs|xs|s|m|l|xl|xxl|xxxl|2xl|3xl|4xl|5xl|free|one size|onesize|universal|small|medium|large|extra large|\d{1,3}(?:\.\d+)?)$/i.test(
    str,
  );
};

export const normalizeVariantDisplayValues = (color: unknown, size: unknown) => {
  const normalizedColor = typeof color === "string" ? color.trim() : (color != null ? String(color).trim() : "");
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
      (normalizedColor.includes(normalizedSize) ||
        normalizedSize.includes(normalizedColor))
    ) {
      normalizedSize = "";
    }
  }

  return {
    color: normalizedColor,
    size: normalizedSize,
  };
};

export const getOrderItemMetadata = (item: OrderItem): OrderItemMetadata => {
  const { metadata } = item;

  if (!metadata) {
    return {};
  }

  if (typeof metadata === "string") {
    try {
      const parsed = JSON.parse(metadata) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as OrderItemMetadata;
      }
    } catch (error) {
      console.error("Error parsing order item metadata:", error);
    }

    return {};
  }

  return typeof metadata === "object" && !Array.isArray(metadata)
    ? (metadata as OrderItemMetadata)
    : {};
};

export const normalizeVariantBadges = (
  item: OrderItem,
  itemMetadata: OrderItemMetadata,
) => {
  let displayColor = item.productColor || (item as any).color;
  let displaySize = item.productSize || (item as any).size;

  try {
    if (!displayColor && (itemMetadata.color || itemMetadata.Color || itemMetadata.productColor)) {
      displayColor = (itemMetadata.color || itemMetadata.Color || itemMetadata.productColor) as string;
    }

    if (!displaySize && (itemMetadata.size || itemMetadata.Size || itemMetadata.productSize)) {
      displaySize = (itemMetadata.size || itemMetadata.Size || itemMetadata.productSize) as string;
    }

    const attrs =
      itemMetadata.attributeValues ||
      (typeof itemMetadata.attributes === "object" && !Array.isArray(itemMetadata.attributes)
        ? (itemMetadata.attributes as Record<string, unknown>)
        : null) ||
      (item as any).attributes;

    if (attrs && typeof attrs === "object") {
      if (!displayColor) {
        displayColor = (attrs["اللون"] || attrs["لون"] || attrs["Color"] || attrs["color"]) as string;
      }
      if (!displaySize) {
        displaySize = (attrs["المقاس"] || attrs["مقاس"] || attrs["Size"] || attrs["size"]) as string;
      }
    }

    if (itemMetadata.attributes && Array.isArray(itemMetadata.attributes)) {
      itemMetadata.attributes.forEach((attr) => {
        const type = String(attr.type || (attr as any).name || (attr as any).key || "").toLowerCase();
        const val = attr.option || (attr as any).value || (attr as any).displayValue;
        if (
          (type === "color" || type === "colour" || type === "اللون" || type === "لون") &&
          typeof val === "string" &&
          !displayColor
        ) {
          displayColor = val;
        }
        if (
          (type === "size" || type === "المقاس" || type === "مقاس") &&
          typeof val === "string" &&
          !displaySize
        ) {
          displaySize = val;
        }
      });
    }

    const variantName =
      (item as any).variantName ||
      (item as any).productVariant?.name ||
      (item as any).name ||
      item.productName;
    if ((!displayColor || !displaySize) && typeof variantName === "string") {
      const parts = variantName.split(/\s*[-–|\/]\s*/);
      if (parts.length >= 2) {
        if (!displayColor && isNaN(Number(parts[0]))) displayColor = parts[0];
        if (!displaySize) displaySize = parts[parts.length - 1];
      }
    }
  } catch (error) {
    console.error("Error parsing variant metadata:", error);
  }

  return normalizeVariantDisplayValues(displayColor, displaySize);
};

export const normalizeImageSrc = (value: unknown): string | null => {
  if (!value) return null;

  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    return normalizeImageSrc(value[0]);
  }

  if (typeof value === "object") {
    const candidate = value as { url?: unknown; src?: unknown };
    if (typeof candidate.url === "string") return candidate.url;
    if (typeof candidate.src === "string") return candidate.src;
  }

  return null;
};

// Prefer persisted order item images, then fall back to legacy metadata formats.
export const getProductImage = (item: OrderItem): string | null => {
  const metadata = getOrderItemMetadata(item);

  try {
    const directImage = normalizeImageSrc(item.productImage);
    if (directImage) return directImage;

    const metadataImage = normalizeImageSrc(metadata.image);
    if (metadataImage) return metadataImage;
    if (Array.isArray(metadata.images) && metadata.images.length > 0) {
      const firstImage = normalizeImageSrc(metadata.images);
      if (firstImage) return firstImage;
    }
  } catch (e) {
    console.error("Error parsing product image:", e);
  }
  return null;
};

// Get stock info from metadata
export const getStockInfo = (
  item: OrderItem,
): { stock: number; status: "available" | "low" | "out" } => {
  const metadata = getOrderItemMetadata(item);
  const stock = Number(metadata.stock || 0);

  if (stock <= 0) return { stock, status: "out" };
  if (stock < 5) return { stock, status: "low" };
  return { stock, status: "available" };
};

export const getQuantityOfferSummary = (
  item: OrderItem,
): QuantityOfferDisplay | null => {
  const metadata = getOrderItemMetadata(item);
  if (!metadata.quantityOffer) {
    return null;
  }

  const quantityOffer = metadata.quantityOffer;
  const groupId =
    typeof quantityOffer.groupId === "string" ? quantityOffer.groupId.trim() : "";
  const offerQuantity = Number(quantityOffer.offerQuantity);
  const slotIndex = Number(quantityOffer.slotIndex);

  return {
    groupId,
    offerLabel:
      (typeof quantityOffer.offerLabel === "string"
        ? quantityOffer.offerLabel
        : "") ||
      (typeof metadata.attributeValues?.["عرض الكمية"] === "string"
        ? metadata.attributeValues["عرض الكمية"]
        : "") ||
      "عرض كميات",
    offerQuantity:
      Number.isFinite(offerQuantity) && offerQuantity > 0
        ? offerQuantity
        : Math.max(1, Number(item.quantity || 1)),
    slotIndex:
      Number.isFinite(slotIndex) && slotIndex > 0 ? slotIndex : null,
    freeShipping: Boolean(quantityOffer?.freeShipping),
  };
};
