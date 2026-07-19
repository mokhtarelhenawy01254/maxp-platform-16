import { getImageUrl } from "../utils/imageUrl";

type UnknownRecord = Record<string, unknown>;

const IMAGE_VALUE_KEYS = [
  "fullUrl",
  "url",
  "src",
  "image",
  "imageUrl",
] as const;

const IMAGE_COLLECTION_KEYS = [
  "images",
  "items",
  "data",
  "gallery",
  "media",
] as const;

export interface ProductImage {
  url: string;
  fullUrl?: string;
  alt?: string;
  id?: string;
}

export interface ProductCategory {
  id: string;
  name: string;
  slug?: string;
  image?: unknown;
  description?: string;
  [key: string]: unknown;
}

export interface ProductVariantOption {
  name: string;
  value: string;
}

export interface ProductVariant {
  id: string;
  name?: string;
  price?: number | null;
  compareAtPrice?: number | null;
  comparePrice?: number | null;
  sku?: string;
  stock?: number | null;
  type?: string;
  image?: unknown;
  images?: unknown;
  metadata?: UnknownRecord | string | null;
  attributes?: Record<string, string> | string | null;
  attributeValues?:
    | Record<string, string>
    | Record<string, unknown>
    | Array<Record<string, unknown>>
    | string
    | null;
  options?: ProductVariantOption[] | null;
  optionValues?: Record<string, unknown> | Array<Record<string, unknown>> | null;
  trackInventory?: boolean;
  [key: string]: unknown;
}

export interface StorefrontProduct {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  shortDescription?: string;
  price: number;
  compareAtPrice?: number | null;
  comparePrice?: number | null;
  images: ProductImage[];
  rawImages?: unknown;
  mainImage?: unknown;
  image?: unknown;
  imageUrl?: string;
  categoryId?: string;
  category?: ProductCategory | null;
  categories?: ProductCategory[];
  metadata?: UnknownRecord | string | null;
  sku?: string;
  stock?: number | null;
  specifications?: string;
  sizeGuide?: string;
  productVariants?: ProductVariant[];
  variants?: ProductVariant[];
  [key: string]: unknown;
}

export interface VariantOptionGroup {
  name: string;
  values: string[];
}

export interface VariantSelectionState {
  selectedOptions: Record<string, string>;
  selectedVariant: ProductVariant | null;
  optionGroups: VariantOptionGroup[];
  isValidSelection: boolean;
  resolvedPrice: number;
  resolvedCompareAtPrice?: number | null;
}

export interface ProductFilter {
  categoryId?: string;
  searchQuery?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  tags?: string[];
}

export type SortOption = string;

export type CheckoutPaymentMethod = "CASH" | "CARD" | "WALLET" | string;

export interface CheckoutFormData {
  guestName: string;
  guestPhone: string;
  guestEmail?: string;
  governorate: string;
  city?: string;
  shippingAddress: string;
  notes?: string;
  paymentMethod?: CheckoutPaymentMethod;
  couponCode?: string;
  alternatePhone?: string;
}

export interface AppliedCoupon {
  code: string;
  name?: string;
  discountAmount: number;
  type?: string;
  finalAmount?: number;
  orderAmount?: number;
}

export interface ShippingMethod {
  id: string;
  name?: string;
  title?: string;
  label?: string;
  cost: number;
  eta?: string;
  description?: string;
  type?: string;
  [key: string]: unknown;
}

const isRecord = (value: unknown): value is UnknownRecord =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const normalizeImageUrl = (value: string): string => {
  const resolved = getImageUrl(value.trim());
  return resolved || value.trim();
};

const pushImage = (
  value: unknown,
  seen: Set<string>,
  images: ProductImage[],
): void => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return;
    }

    const looksLikeJson =
      (trimmed.startsWith("[") && trimmed.endsWith("]")) ||
      (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
      (trimmed.startsWith('"') && trimmed.endsWith('"'));

    if (looksLikeJson) {
      try {
        pushImage(JSON.parse(trimmed), seen, images);
        return;
      } catch {
        // Fall through and treat the value as a plain URL-like string.
      }
    }

    const normalizedUrl = normalizeImageUrl(trimmed);
    if (!normalizedUrl || seen.has(normalizedUrl)) {
      return;
    }

    seen.add(normalizedUrl);
    images.push({
      url: normalizedUrl,
      fullUrl: normalizedUrl,
    });
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((entry) => pushImage(entry, seen, images));
    return;
  }

  if (!isRecord(value)) {
    return;
  }

  const directImageValue = IMAGE_VALUE_KEYS
    .map((key) => value[key])
    .find((entry) => typeof entry === "string" && entry.trim());

  if (typeof directImageValue === "string") {
    const normalizedUrl = normalizeImageUrl(directImageValue);
    if (!normalizedUrl || seen.has(normalizedUrl)) {
      return;
    }

    seen.add(normalizedUrl);
    images.push({
      id:
        typeof value["id"] === "string" && value["id"].trim()
          ? value["id"].trim()
          : undefined,
      alt:
        typeof value["alt"] === "string" && value["alt"].trim()
          ? value["alt"].trim()
          : typeof value["name"] === "string" && value["name"].trim()
            ? value["name"].trim()
            : undefined,
      url: normalizedUrl,
      fullUrl: normalizedUrl,
    });
    return;
  }

  IMAGE_COLLECTION_KEYS.forEach((key) => {
    if (value[key] !== undefined) {
      pushImage(value[key], seen, images);
    }
  });
};

export const normalizeProductImages = (value: unknown): ProductImage[] => {
  const seen = new Set<string>();
  const images: ProductImage[] = [];

  pushImage(value, seen, images);

  return images;
};
