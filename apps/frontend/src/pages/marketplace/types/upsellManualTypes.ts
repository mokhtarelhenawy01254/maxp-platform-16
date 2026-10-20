import { type ReactNode } from "react";

export type JsonRecord = Record<string, unknown>;
export type ManagedRelationType = "related" | "crossSell" | "upsell";
export type RelationBuckets = Record<ManagedRelationType, string[]>;

export interface ManagedProduct {
  id: string;
  name: string;
  sku: string;
  price: number | null;
  isActive: boolean;
  categoryName: string;
  metadata: unknown;
}

export interface UpsellManualManagerProps {
  active: boolean;
}

export const EMPTY_RELATIONS: RelationBuckets = {
  related: [],
  crossSell: [],
  upsell: [],
};

export const RELATION_ORDER: ManagedRelationType[] = ["related", "crossSell", "upsell"];

export const isRecord = (value: unknown): value is JsonRecord =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

export const parseJsonRecord = (value: unknown): JsonRecord => {
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return isRecord(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }

  return isRecord(value) ? value : {};
};

export const normalizeManagedProduct = (value: unknown): ManagedProduct => {
  const raw = isRecord(value) ? value : {};
  const rawPrice = Number(raw["price"]);

  return {
    id: String(raw["id"] || ""),
    name: String(raw["name"] || "منتج بدون اسم"),
    sku: String(raw["sku"] || ""),
    price: Number.isFinite(rawPrice) ? rawPrice : null,
    isActive: raw["isActive"] !== false,
    categoryName: isRecord(raw["category"]) ? String(raw["category"]["name"] || "") : "",
    metadata: raw["metadata"],
  };
};

export const extractRelationIds = (metadata: JsonRecord, key: string) => {
  const value = metadata[key];
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((entry) => String(entry || "").trim()).filter(Boolean);
};

export const cloneRelationBuckets = (source: RelationBuckets): RelationBuckets => ({
  related: [...source.related],
  crossSell: [...source.crossSell],
  upsell: [...source.upsell],
});

export const formatPrice = (price: number | null) => {
  if (price === null) {
    return "بدون سعر";
  }

  return price.toLocaleString("en-US", { maximumFractionDigits: 2 });
};

export const includesQuery = (product: ManagedProduct, query: string) => {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return true;
  }

  return [product.name, product.sku, product.id, product.categoryName]
    .map((entry) => entry.toLowerCase())
    .some((entry) => entry.includes(normalizedQuery));
};

export const createFallbackProduct = (productId: string): ManagedProduct => ({
  id: productId,
  name: `منتج #${productId}`,
  sku: "",
  price: null,
  isActive: true,
  categoryName: "",
  metadata: null,
});

export interface RelationConfigItem {
  title: string;
  subtitle: string;
  help: string;
  metadataKey: string;
  placementLabel: string;
  placementNote: string;
}

export const RELATION_CONFIG_DATA: Record<ManagedRelationType, RelationConfigItem> = {
  related: {
    title: "Related",
    subtitle: "منتجات مشابهة أو من نفس الفئة.",
    help:
      "استخدم هذا النوع عندما تريد اقتراح منتجات قريبة من المنتج الحالي على صفحة المنتج بدون ضغط بيعي زائد.",
    metadataKey: "relatedProducts",
    placementLabel: "Product Page",
    placementNote: "يغذي شبكة المنتجات المشابهة أسفل صفحة المنتج.",
  },
  crossSell: {
    title: "Cross-sell",
    subtitle: "منتجات مكملة ترفع قيمة السلة.",
    help:
      "هذا هو النوع الأفضل للإضافات السريعة والمكملات، لأنه يؤثر على صفحة المنتج والسلة معًا.",
    metadataKey: "crossSellProducts",
    placementLabel: "PDP + Cart",
    placementNote: "الأولوية هنا للمكملات السريعة و quick add داخل السلة.",
  },
  upsell: {
    title: "Upsell",
    subtitle: "منتجات أعلى قيمة أو ترقية واضحة.",
    help:
      "اربط هنا المنتجات التي تريد دفع العميل نحوها بعد الشراء أو عند البحث عن بديل أغلى منطقيًا.",
    metadataKey: "upsellProducts",
    placementLabel: "Thank You",
    placementNote: "يخدم صفحة الشكر ويغذي اقتراحات ما بعد الشراء.",
  },
};
