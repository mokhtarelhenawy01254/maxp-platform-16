import type { StorefrontSettings } from "../services/storefrontSettingsService";
import {
  type PdpIndependentIntegrationMode,
} from "./pdpPageStudioConfig";

type AnyRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is AnyRecord =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const normalizeSlug = (raw: unknown): string =>
  String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");

const normalizeIntegrationMode = (
  raw: unknown,
): PdpIndependentIntegrationMode => {
  const value = String(raw || "")
    .trim()
    .toLowerCase();
  if (value === "prepend") return "prepend";
  if (value === "append") return "append";
  return "standalone";
};

export type GenericPageAssignmentMode = "native" | "template-page";
export type ShopRuntimeLayout = "default" | "stitch" | "shoes-simple";
export type ProductPageAssignmentMode =
  | GenericPageAssignmentMode
  | "independent-page"
  | "studio-page"
  | "legacy";

export interface GenericPageAssignment {
  mode: GenericPageAssignmentMode;
  templatePageSlug: string;
  runtimeLayout: ShopRuntimeLayout;
}

export interface ProductPageAssignment {
  mode: ProductPageAssignmentMode;
  templatePageSlug: string;
  independentPageSlug: string;
  integrationMode: PdpIndependentIntegrationMode;
  studioPageId: string;
}

export interface StorefrontPageAssignmentsConfig {
  homepage: GenericPageAssignment;
  shop: GenericPageAssignment;
  product: ProductPageAssignment;
  cart: GenericPageAssignment;
  checkout: GenericPageAssignment;
}

export interface ProductStudioPageOption {
  id: string;
  name: string;
  variantId: string;
  settingsMode?: "inherit" | "isolated";
  settingsOverrides?: AnyRecord;
  previewProductId?: string;
}

export interface ProductStudioDisplayAssignmentsConfig {
  desktopStudioPageId: string;
  mobileStudioPageId: string;
}

const DEFAULT_ASSIGNMENTS: StorefrontPageAssignmentsConfig = {
  homepage: {
    mode: "native",
    templatePageSlug: "home",
    runtimeLayout: "default",
  },
  shop: {
    mode: "template-page",
    templatePageSlug: "shop",
    runtimeLayout: "default",
  },
  product: {
    mode: "legacy",
    templatePageSlug: "product-details",
    independentPageSlug: "",
    integrationMode: "standalone",
    studioPageId: "",
  },
  cart: {
    mode: "template-page",
    templatePageSlug: "cart",
    runtimeLayout: "default",
  },
  checkout: {
    mode: "template-page",
    templatePageSlug: "checkout",
    runtimeLayout: "default",
  },
};

const normalizeGenericMode = (raw: unknown): GenericPageAssignmentMode => {
  const value = String(raw || "")
    .trim()
    .toLowerCase();
  if (value === "native") return "native";
  return "template-page";
};

const normalizeProductMode = (raw: unknown): ProductPageAssignmentMode => {
  const value = String(raw || "")
    .trim()
    .toLowerCase();
  if (
    value === "legacy" ||
    value === "native" ||
    value === "template-page" ||
    value === "independent-page" ||
    value === "studio-page"
  ) {
    return value;
  }
  return "legacy";
};

const normalizeShopRuntimeLayout = (raw: unknown): ShopRuntimeLayout => {
  const value = String(raw || "")
    .trim()
    .toLowerCase();
  if (value === "stitch") return "stitch";
  if (value === "shoes-simple") return "shoes-simple";
  return "default";
};

const parseGenericAssignment = (
  value: unknown,
  fallback: GenericPageAssignment,
): GenericPageAssignment => {
  const source = isRecord(value) ? value : {};
  return {
    mode: normalizeGenericMode(source['mode']),
    templatePageSlug: normalizeSlug(source['templatePageSlug']) || fallback.templatePageSlug,
    runtimeLayout: normalizeShopRuntimeLayout(source['runtimeLayout']),
  };
};

const parseProductAssignment = (
  value: unknown,
  fallback: ProductPageAssignment,
): ProductPageAssignment => {
  const source = isRecord(value) ? value : {};
  return {
    mode: normalizeProductMode(source['mode']),
    templatePageSlug: normalizeSlug(source['templatePageSlug']) || fallback.templatePageSlug,
    independentPageSlug: normalizeSlug(source['independentPageSlug']),
    integrationMode: normalizeIntegrationMode(source['integrationMode']),
    studioPageId: String(source['studioPageId'] || "").trim(),
  };
};

export const parseStorefrontPageAssignmentsConfig = (
  designTokens: StorefrontSettings["designTokens"],
): StorefrontPageAssignmentsConfig => {
  const root = isRecord(designTokens) ? designTokens : {};
  const assignments = isRecord(root.storefrontPageAssignments)
    ? root.storefrontPageAssignments
    : {};

  return {
    homepage: parseGenericAssignment(
      assignments.homepage,
      DEFAULT_ASSIGNMENTS.homepage,
    ),
    shop: parseGenericAssignment(assignments.shop, DEFAULT_ASSIGNMENTS.shop),
    product: parseProductAssignment(
      assignments.product,
      DEFAULT_ASSIGNMENTS.product,
    ),
    cart: parseGenericAssignment(assignments.cart, DEFAULT_ASSIGNMENTS.cart),
    checkout: parseGenericAssignment(
      assignments.checkout,
      DEFAULT_ASSIGNMENTS.checkout,
    ),
  };
};

export const mergeStorefrontPageAssignmentsIntoDesignTokens = (
  currentDesignTokens: StorefrontSettings["designTokens"],
  nextConfig: Partial<StorefrontPageAssignmentsConfig>,
): StorefrontSettings["designTokens"] => {
  const root = isRecord(currentDesignTokens) ? currentDesignTokens : {};
  const currentConfig = parseStorefrontPageAssignmentsConfig(currentDesignTokens);
  const mergedConfig: StorefrontPageAssignmentsConfig = {
    homepage: {
      ...currentConfig.homepage,
      ...(nextConfig.homepage || {}),
    },
    shop: {
      ...currentConfig.shop,
      ...(nextConfig.shop || {}),
    },
    product: {
      ...currentConfig.product,
      ...(nextConfig.product || {}),
    },
    cart: {
      ...currentConfig.cart,
      ...(nextConfig.cart || {}),
    },
    checkout: {
      ...currentConfig.checkout,
      ...(nextConfig.checkout || {}),
    },
  };

  return {
    ...root,
    storefrontPageAssignments: {
      ...mergedConfig,
      updatedAt: new Date().toISOString(),
    },
  };
};

export const getDefaultStorefrontPageAssignmentsConfig =
  (): StorefrontPageAssignmentsConfig => ({
    ...DEFAULT_ASSIGNMENTS,
    homepage: { ...DEFAULT_ASSIGNMENTS.homepage },
    shop: { ...DEFAULT_ASSIGNMENTS.shop },
    product: { ...DEFAULT_ASSIGNMENTS.product },
    cart: { ...DEFAULT_ASSIGNMENTS.cart },
    checkout: { ...DEFAULT_ASSIGNMENTS.checkout },
  });

export const extractStorefrontPageAssignmentsConfig = (
  settings?: { designTokens?: unknown } | null,
): StorefrontPageAssignmentsConfig => {
  const designTokens = isRecord(settings?.designTokens)
    ? (settings?.designTokens as StorefrontSettings["designTokens"])
    : null;
  return parseStorefrontPageAssignmentsConfig(designTokens);
};

export const extractProductStudioPagesFromDesignTokens = (
  designTokens: StorefrontSettings["designTokens"],
): ProductStudioPageOption[] => {
  const root = isRecord(designTokens) ? rootFrom(designTokens) : {};
  const pdpStudio = isRecord(root.pdpStudio) ? root.pdpStudio : {};
  const items = Array.isArray(pdpStudio.productPages) ? pdpStudio.productPages : [];
  return items
    .map((item): ProductStudioPageOption | null => {
      if (!isRecord(item)) return null;
      const id = String(item.id || "").trim();
      if (!id) return null;
      const name = String(item.name || "").trim() || "Product Page";
      const variantId = String(item.variantId || "").trim() || "main-product";
      const settingsMode =
        String(item.settingsMode || "").trim().toLowerCase() === "isolated"
          ? "isolated"
          : "inherit";
      const settingsOverrides = isRecord(item.settingsOverrides)
        ? (item.settingsOverrides as AnyRecord)
        : undefined;
      const previewProductId = String(item.previewProductId || "").trim();
      return {
        id,
        name,
        variantId,
        settingsMode,
        ...(settingsOverrides ? { settingsOverrides } : {}),
        ...(previewProductId ? { previewProductId } : {}),
      };
    })
    .filter((item): item is ProductStudioPageOption => Boolean(item));
};

const DEFAULT_PRODUCT_STUDIO_DISPLAY_ASSIGNMENTS: ProductStudioDisplayAssignmentsConfig =
{
  desktopStudioPageId: "",
  mobileStudioPageId: "",
};

export const parseProductStudioDisplayAssignmentsConfig = (
  designTokens: StorefrontSettings["designTokens"],
): ProductStudioDisplayAssignmentsConfig => {
  const root = isRecord(designTokens) ? rootFrom(designTokens) : {};
  const pdpStudio = isRecord(root.pdpStudio) ? root.pdpStudio : {};
  const assignments = isRecord(pdpStudio.productDisplayAssignments)
    ? pdpStudio.productDisplayAssignments
    : {};

  return {
    desktopStudioPageId: String(assignments.desktopStudioPageId || "").trim(),
    mobileStudioPageId: String(assignments.mobileStudioPageId || "").trim(),
  };
};

export const extractProductStudioDisplayAssignmentsConfig = (
  settings?: { designTokens?: unknown } | null,
): ProductStudioDisplayAssignmentsConfig => {
  const designTokens = isRecord(settings?.designTokens)
    ? (settings?.designTokens as StorefrontSettings["designTokens"])
    : null;
  return parseProductStudioDisplayAssignmentsConfig(designTokens);
};

export const mergeProductStudioDisplayAssignmentsIntoDesignTokens = (
  currentDesignTokens: StorefrontSettings["designTokens"],
  nextConfig: Partial<ProductStudioDisplayAssignmentsConfig>,
): StorefrontSettings["designTokens"] => {
  const root = isRecord(currentDesignTokens) ? currentDesignTokens : {};
  const pdpStudio = isRecord(root.pdpStudio) ? root.pdpStudio : {};
  const currentConfig = parseProductStudioDisplayAssignmentsConfig(
    currentDesignTokens,
  );
  const merged: ProductStudioDisplayAssignmentsConfig = {
    ...DEFAULT_PRODUCT_STUDIO_DISPLAY_ASSIGNMENTS,
    ...currentConfig,
    ...(isRecord(nextConfig) ? nextConfig : {}),
    desktopStudioPageId: String(
      (isRecord(nextConfig)
        ? nextConfig.desktopStudioPageId
        : currentConfig.desktopStudioPageId) || "",
    ).trim(),
    mobileStudioPageId: String(
      (isRecord(nextConfig)
        ? nextConfig.mobileStudioPageId
        : currentConfig.mobileStudioPageId) || "",
    ).trim(),
  };

  return {
    ...root,
    pdpStudio: {
      ...pdpStudio,
      productDisplayAssignments: {
        ...merged,
        updatedAt: new Date().toISOString(),
      },
    },
  };
};

const rootFrom = (
  designTokens: StorefrontSettings["designTokens"],
): AnyRecord => (isRecord(designTokens) ? designTokens : {});
