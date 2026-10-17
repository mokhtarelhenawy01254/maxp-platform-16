import { getPrimaryImageUrl } from "../../../utils/imageUrl";

export type AvailabilityRow = {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
  trackInventory: boolean;
  isPreOrder: boolean;
  preOrderDate: string | null;
  categoryName: string;
  image: string | null;
  isActive: boolean;
  isHidden: boolean;
  variantsCount: number;
};

export type RawProduct = {
  id: string;
  name?: string;
  sku?: string;
  price?: number | string | null;
  stock?: number | string | null;
  trackInventory?: boolean;
  isPreOrder?: boolean;
  preOrderDate?: string | null;
  mainImage?: string | null;
  images?: unknown;
  category?: unknown;
  productVariants?: unknown[];
  variants?: unknown[];
  isActive?: boolean;
  isHidden?: boolean;
};

export type AvailabilityResponse = {
  success: boolean;
  data: RawProduct[];
  pagination: { total: number; page: number; limit: number; pages: number };
  publishedCount: number;
};

export type StockStatus = "in-stock" | "low-stock" | "out-of-stock" | "untracked";

export const STOCK_STATUS_META: Record<
  StockStatus,
  { label: string; className: string }
> = {
  "in-stock": {
    label: "متوفر",
    className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  },
  "low-stock": {
    label: "مخزون منخفض",
    className: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  },
  "out-of-stock": {
    label: "نفد المخزون",
    className: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20",
  },
  untracked: {
    label: "بدون تتبع",
    className: "bg-muted text-muted-foreground border-border/70",
  },
};

export function parseSafeDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

export function formatSafeDate(
  value: string | null | undefined,
  locale: string,
): string {
  const date = parseSafeDate(value);
  if (!date) return "";
  return date.toLocaleDateString(locale);
}

export function toDateInputValue(value: string | null | undefined): string {
  const date = parseSafeDate(value);
  if (!date) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function mapProductRow(p: RawProduct): AvailabilityRow {
  const images = p.images;
  const image = getPrimaryImageUrl(p.mainImage, images) || null;
  let categoryName = "";
  if (typeof p.category === "string") {
    categoryName = p.category;
  } else if (p.category && typeof p.category === "object") {
    categoryName = (p.category as any).name || "";
  }
  const variants = Array.isArray(p.productVariants)
    ? p.productVariants
    : Array.isArray(p.variants)
      ? p.variants
      : [];
  return {
    id: p.id,
    name: p.name || "",
    sku: p.sku || "",
    price: Number(p.price ?? 0),
    stock: Number(p.stock ?? 0),
    trackInventory: p.trackInventory !== false,
    isPreOrder: Boolean(p.isPreOrder),
    preOrderDate: p.preOrderDate || null,
    categoryName,
    image,
    isActive: Boolean(p.isActive),
    isHidden: Boolean(p.isHidden),
    variantsCount: variants.length,
  };
}

export const getStockStatus = (row: AvailabilityRow): StockStatus => {
  if (!row.trackInventory) return "untracked";
  if (row.stock === 0) return "out-of-stock";
  if (row.stock <= 5) return "low-stock";
  return "in-stock";
};
