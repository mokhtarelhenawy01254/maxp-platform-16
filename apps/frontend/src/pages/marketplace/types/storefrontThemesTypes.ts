import { StorefrontThemeCatalogItem } from "../../../services/storefrontThemeCatalogService";

export type WalletBalance = {
  balance: number;
  currency: string;
};

export type ThemeFilterType = "all" | "owned" | "free" | "paid";

export const THEME_FILTER_TYPES: ThemeFilterType[] = ["all", "owned", "free", "paid"];

export type ThemeSubcategoryGroup = {
  id: string;
  label: string;
  count: number;
};

export type ThemeCategoryGroup = {
  id: string;
  label: string;
  count: number;
  subcategories: ThemeSubcategoryGroup[];
};

export const MARKETPLACE_CATEGORY_ORDER = [
  "general",
  "fashion",
  "food",
  "electronics",
  "automotive",
  "medical",
  "kids",
  "digital",
  "services",
];

export const MARKETPLACE_SUBCATEGORY_ORDER: Record<string, string[]> = {
  general: [
    "general-store",
    "multi-category",
    "premium-brand",
    "natural-products",
  ],
  fashion: [
    "womens-shoes",
    "mens-shoes",
    "womens-fashion",
    "mens-clothing",
    "fashion-store",
    "luxury-fashion",
    "heritage-fashion",
    "accessories",
  ],
  food: ["restaurants"],
  electronics: ["mobile-store", "tech-store"],
  automotive: ["car-accessories"],
  medical: ["dental-lab"],
  kids: ["toys"],
  digital: ["web3"],
  services: ["travel-services"],
};

export const STOREFRONT_READY_MARKETPLACE_PREVIEWS = new Set([
  "cafe-demo",
  "restaurant-demo",
  "pharmacy-demo",
]);

export const FALLBACK_THEME_CATEGORY: StorefrontThemeCatalogItem["category"] = {
  primary: {
    id: "general",
    label: "General",
  },
  secondary: {
    id: "general-store",
    label: "General Store",
  },
};

export const getOrderRank = (value: string, preferredOrder: string[]): number => {
  const matchIndex = preferredOrder.indexOf(value);
  return matchIndex >= 0 ? matchIndex : preferredOrder.length + 1;
};

export const getThemeCategory = (
  theme: Pick<StorefrontThemeCatalogItem, "category">
): StorefrontThemeCatalogItem["category"] => ({
  primary: {
    id:
      typeof theme.category?.primary?.id === "string" &&
      theme.category.primary.id.trim()
        ? theme.category.primary.id.trim()
        : FALLBACK_THEME_CATEGORY.primary.id,
    label:
      typeof theme.category?.primary?.label === "string" &&
      theme.category.primary.label.trim()
        ? theme.category.primary.label.trim()
        : FALLBACK_THEME_CATEGORY.primary.label,
  },
  secondary: {
    id:
      typeof theme.category?.secondary?.id === "string" &&
      theme.category.secondary.id.trim()
        ? theme.category.secondary.id.trim()
        : FALLBACK_THEME_CATEGORY.secondary.id,
    label:
      typeof theme.category?.secondary?.label === "string" &&
      theme.category.secondary.label.trim()
        ? theme.category.secondary.label.trim()
        : FALLBACK_THEME_CATEGORY.secondary.label,
  },
});

export const formatThemePrice = (
  theme: StorefrontThemeCatalogItem,
  t: (key: string) => string
): string => {
  if (theme.pricingModel === "ONE_TIME" && theme.monthlyPrice > 0) {
    return `${theme.monthlyPrice.toLocaleString("en-US")} ${theme.currency}`;
  }
  return t("storefrontThemes.freePrice");
};

export const getErrorMessage = (error: unknown, fallback: string): string => {
  const maybeMessage =
    typeof error === "object" && error !== null && "response" in error
      ? (error as { response?: { data?: { message?: unknown } } }).response
          ?.data?.message
      : "";

  return typeof maybeMessage === "string" && maybeMessage.trim()
    ? maybeMessage.trim()
    : fallback;
};

export const getCurrentCompanyId = (): string => {
  if (typeof window === "undefined") {
    return "";
  }

  const params = new URLSearchParams(window.location.search);
  const fromQuery = params.get("companyId")?.trim();
  if (fromQuery) {
    return fromQuery;
  }

  try {
    const rawUser = window.localStorage.getItem("user");
    if (rawUser) {
      const parsed = JSON.parse(rawUser) as {
        companyId?: unknown;
        company?: { id?: unknown; slug?: unknown } | null;
      };

      if (typeof parsed.companyId === "string" && parsed.companyId.trim()) {
        return parsed.companyId.trim();
      }

      if (typeof parsed.company?.id === "string" && parsed.company.id.trim()) {
        return parsed.company.id.trim();
      }

      if (
        typeof parsed.company?.slug === "string" &&
        parsed.company.slug.trim()
      ) {
        return parsed.company.slug.trim();
      }
    }
  } catch {
    // Ignore malformed auth cache and continue to fallback keys.
  }

  const directKeys = ["storefront_companyId", "companyId", "currentCompanyId"];
  for (const key of directKeys) {
    const value = window.localStorage.getItem(key)?.trim();
    if (value) {
      return value;
    }
  }

  return "";
};

export const getCurrentPreviewStoreTarget = (): {
  companyId: string | null;
  companySlug: string | null;
  customDomain: string | null;
} => {
  if (typeof window === "undefined") {
    return { companyId: null, companySlug: null, customDomain: null };
  }

  try {
    const rawUser = window.localStorage.getItem("user");
    if (!rawUser) {
      return { companyId: null, companySlug: null, customDomain: null };
    }

    const parsed = JSON.parse(rawUser) as {
      companyId?: unknown;
      company?: { id?: unknown; slug?: unknown; customDomain?: unknown } | null;
    };

    return {
      companyId:
        typeof parsed.companyId === "string" && parsed.companyId.trim()
          ? parsed.companyId.trim()
          : typeof parsed.company?.id === "string" && parsed.company.id.trim()
          ? parsed.company.id.trim()
          : null,
      companySlug:
        typeof parsed.company?.slug === "string" && parsed.company.slug.trim()
          ? parsed.company.slug.trim()
          : null,
      customDomain:
        typeof parsed.company?.customDomain === "string" &&
        parsed.company.customDomain.trim()
          ? parsed.company.customDomain.trim()
          : null,
    };
  } catch {
    return { companyId: null, companySlug: null, customDomain: null };
  }
};

export const normalizeMarketplaceSearchText = (value: string): string =>
  value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[-_/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export const matchesMarketplaceSearch = (
  fields: Array<string | undefined>,
  query: string
): boolean => {
  const normalizedQuery = normalizeMarketplaceSearchText(query);
  if (!normalizedQuery) {
    return true;
  }

  const haystack = normalizeMarketplaceSearchText(fields.filter(Boolean).join(" "));
  if (!haystack) {
    return false;
  }

  return normalizedQuery
    .split(" ")
    .every((token) => token && haystack.includes(token));
};
