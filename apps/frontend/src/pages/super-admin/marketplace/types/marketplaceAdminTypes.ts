import type { StorefrontThemeCatalogItem } from "../../../../services/storefrontThemeCatalogService";
import tokenManager from "../../../../utils/tokenManager";

export type MarketplaceAppsManagementProps = {
  initialTab?: number;
  storefrontThemesOnly?: boolean;
  pageTitle?: string;
  pageDescription?: string;
};

export const getAuthHeaders = (additionalHeaders: Record<string, string> = {}) =>
  tokenManager.createAuthHeaders(additionalHeaders);

export type CatalogMeta = Record<string, unknown>;
export type PricingModel = "FREE" | "SUBSCRIPTION" | "PAY_PER_USE" | string;
export type MarketplaceItemType = "app" | "pricing" | "bundle";

export type MarketplaceAppReference =
  | string
  | { id?: string; name?: string; category?: string; slug?: string };

export type MarketplaceInstallCounts = {
  installations?: number;
};

export type MarketplaceManagementItem = {
  id?: string;
  name?: string;
  slug?: string;
  description?: string;
  monthlyPrice?: number;
  yearlyPrice?: number;
  trialDays?: number;
  category?: string;
  isActive?: boolean;
  isPublic?: boolean;
  isFeatured?: boolean;
  isPopular?: boolean;
  isAutoInstall?: boolean;
  logo?: string;
  icon?: string;
  coverImage?: string;
  images?: string[] | string | null;
  screenshots?: string[];
  mainRoute?: string;
  adminRoute?: string;
  pricingModel?: PricingModel;
  unitPrice?: number;
  unitName?: string;
  ppuBillingMethod?: "PER_ORDER" | "PER_ITEM" | "PERCENTAGE";
  feature?: string;
  price?: number;
  unit?: string;
  discount?: number;
  apps?: MarketplaceAppReference[];
  companyId?: string;
  features?: unknown;
  _count?: MarketplaceInstallCounts;
  installCount?: number;
  rating?: number;
  reviewCount?: number;
};

export type MarketplaceDialogFormData = Omit<
  MarketplaceManagementItem,
  "features" | "apps"
> & {
  features: string[];
  screenshots: string[];
  apps: MarketplaceAppReference[];
};

export type CatalogDiffFieldChange = {
  field: string;
  catalog: unknown;
  db: unknown;
};

export type CatalogDiffEntityDetails = {
  slug: string;
  changes: CatalogDiffFieldChange[];
};

export type CatalogDiffSection = {
  missingInDb: string[];
  extraInDb: string[];
  changed: CatalogDiffEntityDetails[];
};

export type CatalogDiffPayload = {
  comparedAt: string;
  catalogMeta?: CatalogMeta;
  totals?: {
    catalogApps: number;
    dbApps: number;
    catalogBundles: number;
    dbBundles: number;
    diffEntries: number;
  };
  apps?: CatalogDiffSection;
  bundles?: CatalogDiffSection;
};

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const getErrorMessage = (
  error: unknown,
  fallbackMessage: string,
): string => {
  if (
    isRecord(error) &&
    "response" in error &&
    isRecord(error["response"]) &&
    "data" in error["response"] &&
    isRecord(error["response"]["data"]) &&
    typeof error["response"]["data"]["message"] === "string"
  ) {
    return error["response"]["data"]["message"] as string;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallbackMessage;
};

export const parseStringList = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .filter((entry): entry is string => typeof entry === "string")
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  return [];
};

export const isLikelyImageUrl = (value: string): boolean => {
  if (!value) return false;
  const v = value.trim().toLowerCase();
  if (/\.(png|jpe?g|webp|gif|svg|avif|bmp|ico)(\?.*)?$/.test(v)) return true;
  return v.startsWith("/uploads/") || v.startsWith("data:image/");
};

export const isLikelyVideoUrl = (value: string): boolean => {
  if (!value) return false;
  const v = value.trim().toLowerCase();
  if (/\.(mp4|webm|mov|m4v|ogv)(\?.*)?$/.test(v)) return true;
  return /youtube|youtu\.be|vimeo|drive\.google/.test(v);
};

export const normalizeBundleApps = (value: unknown): MarketplaceAppReference[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (entry): entry is MarketplaceAppReference =>
      typeof entry === "string" ||
      (isRecord(entry) &&
        (entry["name"] === undefined || typeof entry["name"] === "string") &&
        (entry["category"] === undefined || typeof entry["category"] === "string") &&
        (entry["id"] === undefined || typeof entry["id"] === "string")),
  );
};

export const getBundleAppLabel = (app: MarketplaceAppReference): string =>
  typeof app === "string" ? app : app.name || app.id || "تطبيق";

export const getBundleAppCategory = (app: MarketplaceAppReference): string =>
  typeof app === "string" ? "" : app.category || "";

export const createDefaultMarketplaceFormData = (
  type: MarketplaceItemType,
): MarketplaceDialogFormData => ({
  name: "",
  slug: "",
  description: "",
  monthlyPrice: 0,
  yearlyPrice: 0,
  category: "ECOMMERCE",
  isActive: true,
  isPublic: true,
  isFeatured: false,
  isPopular: false,
  isAutoInstall: false,
  logo: "",
  icon: "",
  coverImage: "",
  mainRoute: "",
  adminRoute: "",
  pricingModel: "SUBSCRIPTION",
  unitPrice: 0,
  unitName: "",
  ppuBillingMethod: "PER_ORDER",
  feature: type === "pricing" ? "" : undefined,
  price: type === "pricing" ? 0 : undefined,
  unit: type === "pricing" ? "" : undefined,
  discount: type === "bundle" ? 0 : undefined,
  trialDays: type === "bundle" ? 7 : 0,
  apps: [],
  screenshots: [],
  companyId: "",
  features: [],
});
