import { WorkspaceOrderItem } from "./types";

export const COLOR_KEYS = ["اللون", "الوان", "Color", "color", "pa_color", "لون"];
export const SIZE_KEYS = ["المقاس", "مقاس", "Size", "size", "pa_size", "الحجم", "القياس"];

export const getAttrValue = (metaAttrs: any, keys: string[]): string | null => {
  if (!metaAttrs || typeof metaAttrs !== "object") return null;
  for (const k of keys) {
    if (metaAttrs[k] != null && String(metaAttrs[k]).trim()) {
      return String(metaAttrs[k]).trim();
    }
  }
  return null;
};

export const normalizeText = (s?: string | null): string =>
  (s || "")
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/[إأآا]/g, "ا")
    .replace(/[ىي]/g, "ي")
    .replace(/[ةه]/g, "ه")
    .trim();

export interface ItemOptionsResult {
  colors: string[];
  sizes: string[];
  variants: any[];
}

export const getItemOptions = (
  item: WorkspaceOrderItem,
  productVariantsMap: Record<string, any[]>,
): ItemOptionsResult => {
  const vars =
    (item.variants && item.variants.length > 0 ? item.variants : null) ||
    (item.product?.variants && item.product.variants.length > 0
      ? item.product.variants
      : null) ||
    (item.product?.productVariants && item.product.productVariants.length > 0
      ? item.product.productVariants
      : null) ||
    (item.productId &&
    productVariantsMap[item.productId] &&
    productVariantsMap[item.productId].length > 0
      ? productVariantsMap[item.productId]
      : null) ||
    [];

  const colors = new Set<string>();
  const sizes = new Set<string>();

  vars.forEach((v: any) => {
    let meta: any = {};
    if (typeof v.metadata === "string") {
      try {
        meta = JSON.parse(v.metadata);
      } catch {}
    } else if (v.metadata && typeof v.metadata === "object") {
      meta = v.metadata;
    }
    const attrs = meta.attributeValues || {};
    const c = getAttrValue(attrs, COLOR_KEYS) || v.color;
    const s = getAttrValue(attrs, SIZE_KEYS) || (v.size != null ? String(v.size) : null);

    if (c) colors.add(String(c).trim());
    if (s) sizes.add(String(s).trim());

    if ((!c || !s) && v.name && v.name.includes("-")) {
      const parts = v.name.split("-").map((p: string) => p.trim());
      if (parts.length >= 2) {
        if (!c && parts[0]) colors.add(parts[0]);
        if (!s && parts[1]) sizes.add(parts[1]);
      }
    }
  });

  return {
    colors: Array.from(colors),
    sizes: Array.from(sizes),
    variants: vars,
  };
};

export const matchVariantByAttributes = (
  variants: any[],
  newColor: string,
  newSize: string,
): any | null => {
  const normColor = normalizeText(newColor);
  const normSize = normalizeText(newSize);

  if (!normColor && !normSize) return null;

  return variants.find((v: any) => {
    let meta: any = {};
    try {
      meta = typeof v.metadata === "string" ? JSON.parse(v.metadata) : v.metadata || {};
    } catch {}
    const attrs = meta.attributeValues || {};
    const vColor = getAttrValue(attrs, COLOR_KEYS) || v.color;
    const vSize = getAttrValue(attrs, SIZE_KEYS) || (v.size != null ? String(v.size) : null);

    const normVColor = normalizeText(vColor);
    const normVSize = normalizeText(vSize);
    const variantNameTokens = (v.name || "").split(/[\s\-_/]+/).map(normalizeText);

    const colorMatch =
      !normColor || (normVColor && normVColor === normColor) || variantNameTokens.includes(normColor);
    const sizeMatch =
      !normSize || (normVSize && normVSize === normSize) || variantNameTokens.includes(normSize);
    return colorMatch && sizeMatch;
  });
};
