import React, { createContext, useContext } from "react";
import { formatStorefrontCurrency } from "../../utils/currency";

export interface DynamicProductContext {
  id?: string | number;
  title?: string;
  name?: string;
  description?: string | null;
  price?: number | string | null;
  compareAtPrice?: number | string | null;
  comparePrice?: number | string | null;
  stock?: number | null;
  image?: string;
  images?: string[];
  featuredImage?: string;
  [key: string]: unknown;
}

export interface DynamicCollectionContext {
  id?: string | number;
  name?: string;
  title?: string;
  count?: number | null;
  productsCount?: number | null;
  [key: string]: unknown;
}

export interface DynamicPageContext {
  id?: string;
  title?: string;
  slug?: string;
  [key: string]: unknown;
}

export interface DynamicStoreContext {
  name?: string;
  currency?: string | null;
  [key: string]: unknown;
}

export interface DynamicContext {
  product?: DynamicProductContext | null;
  item?: DynamicProductContext | Record<string, unknown> | null;
  collection?: DynamicCollectionContext | null;
  page?: DynamicPageContext | null;
  store?: DynamicStoreContext | null;
  currency?: string | null;
  locale?: string | null;
  role?: "customer" | "guest" | string | null;
  pageKey?: string | null;
  custom?: Record<string, unknown> | null;
  [key: string]: unknown;
}

export interface DynamicTokenOption {
  token: string;
  label: string;
  group: "product" | "collection" | "page" | "store" | "custom";
  example?: string;
}

export const DYNAMIC_TOKENS: DynamicTokenOption[] = [
  { token: "{{product.title}}", label: "عنوان المنتج", group: "product", example: "قميص كتان" },
  { token: "{{product.description}}", label: "وصف المنتج", group: "product", example: "وصف تفصيلي ومواصفات المنتج..." },
  { token: "{{product.price}}", label: "سعر المنتج (رقم)", group: "product", example: "250" },
  { token: "{{product.priceFormatted}}", label: "سعر المنتج (منسق بالعملة)", group: "product", example: "250 ج.م" },
  { token: "{{product.compareAtPrice}}", label: "السعر قبل الخصم", group: "product", example: "350" },
  { token: "{{product.stock}}", label: "المخزون المتوفر", group: "product", example: "12" },
  { token: "{{product.image}}", label: "صورة المنتج", group: "product", example: "https://..." },
  { token: "{{item.title}}", label: "عنوان العنصر (Loop)", group: "product", example: "قميص كتان" },
  { token: "{{item.description}}", label: "وصف العنصر (Loop)", group: "product", example: "وصف المنتج..." },
  { token: "{{item.price}}", label: "سعر العنصر (Loop)", group: "product", example: "250" },
  { token: "{{item.priceFormatted}}", label: "سعر العنصر منسق (Loop)", group: "product", example: "250 ج.م" },
  { token: "{{item.image}}", label: "صورة العنصر (Loop)", group: "product", example: "https://..." },
  { token: "{{collection.name}}", label: "اسم المجموعة", group: "collection", example: "تشكيلة الصيف" },
  { token: "{{collection.count}}", label: "عدد منتجات المجموعة", group: "collection", example: "24" },
  { token: "{{page.title}}", label: "عنوان الصفحة", group: "page", example: "عروض الموسم" },
  { token: "{{store.name}}", label: "اسم المتجر", group: "store", example: "سوان ستور" },
];

export const DYNAMIC_TOKEN_REGEX = /\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g;

/**
 * Pure function resolving dynamic mustache-style tokens inside a template string.
 * Any unknown or missing token resolves to an empty string (""), never undefined/null/NaN.
 */
export function resolveDynamicValue(template: string, ctx?: DynamicContext | null): string {
  if (typeof template !== "string") {
    return "";
  }
  if (!template.includes("{{")) {
    return template;
  }

  const safeCtx: DynamicContext = ctx || {};
  const currency = safeCtx.store?.currency || safeCtx.currency || "EGP";
  const locale = safeCtx.locale || "ar-EG";

  return template.replace(DYNAMIC_TOKEN_REGEX, (_match, tokenPath: string) => {
    const trimmed = String(tokenPath || "").trim();
    if (!trimmed) {
      return "";
    }

    // 1. Product tokens
    if (trimmed.startsWith("product.")) {
      const field = trimmed.slice("product.".length);
      const prod = safeCtx.product ?? (safeCtx.item as DynamicProductContext | undefined);
      if (!prod) return "";

      if (field === "title" || field === "name") {
        const val = prod.title ?? prod.name;
        return val !== undefined && val !== null ? String(val) : "";
      }
      if (field === "price") {
        return prod.price !== undefined && prod.price !== null && !Number.isNaN(Number(prod.price))
          ? String(prod.price)
          : "";
      }
      if (field === "priceFormatted") {
        if (prod.price === undefined || prod.price === null || Number.isNaN(Number(prod.price))) {
          return "";
        }
        return formatStorefrontCurrency(Number(prod.price), currency, locale);
      }
      if (field === "compareAtPrice" || field === "comparePrice") {
        const comp = prod.compareAtPrice ?? prod.comparePrice;
        return comp !== undefined && comp !== null && !Number.isNaN(Number(comp))
          ? String(comp)
          : "";
      }
      if (field === "stock") {
        return prod.stock !== undefined && prod.stock !== null && !Number.isNaN(Number(prod.stock))
          ? String(prod.stock)
          : "";
      }
      if (field === "image") {
        const img =
          prod.image ??
          prod.featuredImage ??
          (Array.isArray(prod.images) && prod.images.length > 0 ? prod.images[0] : "");
        return img ? String(img) : "";
      }
      const direct = (prod as Record<string, unknown>)[field];
      return direct !== undefined && direct !== null ? String(direct) : "";
    }

    // 2. Loop Item tokens (Loop / Repeat item tokens: {{item.title}}, {{item.price}}, etc.)
    if (trimmed.startsWith("item.")) {
      const field = trimmed.slice("item.".length);
      const item = ((safeCtx.item ?? safeCtx.product) || {}) as Record<string, unknown>;
      if (!item || Object.keys(item).length === 0) return "";

      if (field === "title" || field === "name") {
        const val = item.title ?? item.name;
        return val !== undefined && val !== null ? String(val) : "";
      }
      if (field === "price") {
        return item.price !== undefined && item.price !== null && !Number.isNaN(Number(item.price))
          ? String(item.price)
          : "";
      }
      if (field === "priceFormatted") {
        if (item.price === undefined || item.price === null || Number.isNaN(Number(item.price))) {
          return "";
        }
        return formatStorefrontCurrency(Number(item.price), currency, locale);
      }
      if (field === "compareAtPrice" || field === "comparePrice") {
        const comp = item.compareAtPrice ?? item.comparePrice;
        return comp !== undefined && comp !== null && !Number.isNaN(Number(comp))
          ? String(comp)
          : "";
      }
      if (field === "stock") {
        return item.stock !== undefined && item.stock !== null && !Number.isNaN(Number(item.stock))
          ? String(item.stock)
          : "";
      }
      if (field === "image") {
        const img =
          item.image ??
          item.featuredImage ??
          (Array.isArray(item.images) && item.images.length > 0 ? item.images[0] : "");
        return img ? String(img) : "";
      }
      const direct = item[field];
      return direct !== undefined && direct !== null ? String(direct) : "";
    }

    // 2. Collection tokens
    if (trimmed.startsWith("collection.")) {
      const field = trimmed.slice("collection.".length);
      const col = safeCtx.collection;
      if (!col) return "";

      if (field === "name") {
        const val = col.name ?? col.title;
        return val !== undefined && val !== null ? String(val) : "";
      }
      if (field === "count") {
        const count = col.count ?? col.productsCount;
        return count !== undefined && count !== null && !Number.isNaN(Number(count))
          ? String(count)
          : "";
      }
      return "";
    }

    // 3. Page tokens
    if (trimmed.startsWith("page.")) {
      const field = trimmed.slice("page.".length);
      const pg = safeCtx.page;
      if (!pg) return "";

      if (field === "title") {
        return pg.title !== undefined && pg.title !== null ? String(pg.title) : "";
      }
      return "";
    }

    // 4. Store tokens
    if (trimmed.startsWith("store.")) {
      const field = trimmed.slice("store.".length);
      const st = safeCtx.store;
      if (!st) return "";

      if (field === "name") {
        return st.name !== undefined && st.name !== null ? String(st.name) : "";
      }
      return "";
    }

    // 5. Custom tokens: {{custom.<key>}}
    if (trimmed.startsWith("custom.")) {
      const key = trimmed.slice("custom.".length);
      const val = safeCtx.custom?.[key];
      return val !== undefined && val !== null ? String(val) : "";
    }

    // Unknown token -> empty string "" (never undefined / null / NaN)
    return "";
  });
}

/**
 * Recursively resolves dynamic values in section settings object or array.
 */
export function resolveDynamicSettings<T>(settings: T, ctx?: DynamicContext | null): T {
  if (!settings || typeof settings !== "object") {
    return settings;
  }
  if (Array.isArray(settings)) {
    return settings.map((item) => resolveDynamicSettings(item, ctx)) as unknown as T;
  }
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(settings as Record<string, unknown>)) {
    if (typeof value === "string") {
      result[key] = resolveDynamicValue(value, ctx);
    } else if (value && typeof value === "object") {
      result[key] = resolveDynamicSettings(value, ctx);
    } else {
      result[key] = value;
    }
  }
  return result as T;
}

export const DynamicValuesContext = createContext<DynamicContext | null>(null);

export const useStorefrontDynamicContext = (): DynamicContext => {
  return useContext(DynamicValuesContext) || {};
};

export const StorefrontDynamicProvider: React.FC<{
  value?: DynamicContext | null;
  children: React.ReactNode;
}> = ({ value, children }) => {
  return React.createElement(
    DynamicValuesContext.Provider,
    { value: value || {} },
    children
  );
};
