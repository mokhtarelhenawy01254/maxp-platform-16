import type {
  StorefrontPageLayout,
  StorefrontThemeProductCardTokens,
} from "../storefront/types/theme.types";

export type ShopLayoutType = "grid" | "list";
export type ShopSidebarPosition = "left" | "right" | "top" | "none";
export type ShopProductCardVariant =
  | "default"
  | "vogue"
  | "minimal"
  | "creative"
  | "brutal"
  | "fashion"
  | "glass"
  | "list";

export type ShopProductCardStylePack =
  | "fashion-pack"
  | "premium-pack"
  | "catalog-pack"
  | "glass-pack";

export type ShopLayoutPattern = "default" | "classic" | "editorial" | "velvet-vine";
export type ShopPaginationType = "numbers" | "load-more" | "infinite";
export type ShopCategoryStyle = "list" | "dropdown";
export type ShopPriceStyle = "slider" | "range-inputs";
export type ShopImageHoverAction = "zoom" | "second-image" | "none";
export type ShopButtonStyle = "solid" | "outline" | "icon-only";

type UnknownRecord = Record<string, unknown>;

const SHOP_DESKTOP_GRID_CLASS_MAP: Record<number, string> = {
  1: "xl:grid-cols-1",
  2: "xl:grid-cols-2",
  3: "xl:grid-cols-3",
  4: "xl:grid-cols-4",
  5: "xl:grid-cols-5",
  6: "xl:grid-cols-6",
};

const SHOP_MOBILE_GRID_CLASS_MAP: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-2 sm:grid-cols-3",
};

const LAYOUT_PATTERNS: readonly ShopLayoutPattern[] = [
  "default",
  "classic",
  "editorial",
  "velvet-vine",
];

const SIDEBAR_POSITIONS: readonly ShopSidebarPosition[] = [
  "left",
  "right",
  "top",
  "none",
];

const PAGINATION_TYPES: readonly ShopPaginationType[] = [
  "numbers",
  "load-more",
  "infinite",
];

const IMAGE_HOVER_ACTIONS: readonly ShopImageHoverAction[] = [
  "zoom",
  "second-image",
  "none",
];

const BUTTON_STYLES: readonly ShopButtonStyle[] = [
  "solid",
  "outline",
  "icon-only",
];

const PRODUCT_CARD_VARIANTS: readonly ShopProductCardVariant[] = [
  "default",
  "vogue",
  "minimal",
  "creative",
  "brutal",
  "fashion",
  "glass",
  "list",
];

const PRODUCT_CARD_TOKEN_KEYS: Array<keyof StorefrontThemeProductCardTokens> = [
  "borderRadius",
  "boxShadow",
  "hoverShadow",
  "badgeRadius",
  "buttonRadius",
  "surfaceOpacity",
];

const SHOP_PRODUCT_CARD_STYLE_PACK_BEHAVIORS: Record<
  ShopProductCardStylePack,
  Partial<ShopPageStudioConfig>
> = {
  "fashion-pack": {
    layoutPattern: "editorial",
    layout: {
      type: "grid",
      desktopColumns: 3,
      mobileColumns: 2,
      sidebarPosition: "none",
      paginationType: "load-more",
    },
    productCard: {
      variant: "fashion",
      buttonStyle: "solid",
      imageHoverAction: "second-image",
      showBadges: true,
      showAddToCart: true,
      showComparePrice: true,
      showRating: true,
    },
  },
  "premium-pack": {
    layoutPattern: "classic",
    layout: {
      type: "grid",
      desktopColumns: 3,
      mobileColumns: 2,
      sidebarPosition: "left",
      paginationType: "numbers",
    },
    productCard: {
      variant: "brutal",
      buttonStyle: "solid",
      imageHoverAction: "second-image",
      showBadges: true,
      showAddToCart: true,
      showComparePrice: true,
      showRating: true,
    },
  },
  "catalog-pack": {
    layoutPattern: "classic",
    layout: {
      type: "list",
      desktopColumns: 4,
      mobileColumns: 1,
      sidebarPosition: "left",
      paginationType: "numbers",
    },
    productCard: {
      variant: "list",
      buttonStyle: "outline",
      imageHoverAction: "none",
      showBadges: true,
      showAddToCart: true,
      showComparePrice: true,
      showRating: false,
    },
  },
  "glass-pack": {
    layoutPattern: "editorial",
    layout: {
      type: "grid",
      desktopColumns: 4,
      mobileColumns: 2,
      sidebarPosition: "top",
      paginationType: "load-more",
    },
    productCard: {
      variant: "glass",
      buttonStyle: "solid",
      imageHoverAction: "zoom",
      showBadges: true,
      showAddToCart: true,
      showComparePrice: true,
      showRating: false,
    },
  },
};

export interface ShopPageStudioConfig {
  layoutPattern: ShopLayoutPattern;
  layout: {
    type: ShopLayoutType;
    desktopColumns: number;
    mobileColumns: number;
    sidebarPosition: ShopSidebarPosition;
    paginationType: ShopPaginationType;
  };
  filters: {
    showSearch: boolean;
    showCategories: boolean;
    showPriceFilter: boolean;
    showSort: boolean;
    categoryStyle: ShopCategoryStyle;
    priceStyle: ShopPriceStyle;
  };
  productCard: {
    showRating: boolean;
    showAddToCart: boolean;
    showComparePrice: boolean;
    showBadges: boolean;
    imageHoverAction: ShopImageHoverAction;
    buttonStyle: ShopButtonStyle;
    variant?: ShopProductCardVariant;
    tokens?: StorefrontThemeProductCardTokens;
  };
}

export const DEFAULT_SHOP_STUDIO_CONFIG: ShopPageStudioConfig = {
  layoutPattern: "default",
  layout: {
    type: "grid",
    desktopColumns: 4,
    mobileColumns: 2,
    sidebarPosition: "left",
    paginationType: "numbers",
  },
  filters: {
    showSearch: true,
    showCategories: true,
    showPriceFilter: true,
    showSort: true,
    categoryStyle: "list",
    priceStyle: "slider",
  },
  productCard: {
    showRating: true,
    showAddToCart: true,
    showComparePrice: true,
    showBadges: true,
    imageHoverAction: "second-image",
    buttonStyle: "solid",
    variant: "default",
    tokens: {
      borderRadius: "1rem",
      boxShadow: "0 12px 34px -28px rgba(0, 0, 0, 0.14)",
      hoverShadow: "0 18px 42px -24px rgba(0, 0, 0, 0.18)",
      badgeRadius: "999px",
      buttonRadius: "999px",
      surfaceOpacity: "1",
    },
  },
};

const isObjectRecord = (value: unknown): value is UnknownRecord =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const pickObject = (value: unknown): UnknownRecord =>
  (isObjectRecord(value) ? value : {});

const pickEnumValue = <T extends string>(
  value: unknown,
  allowedValues: readonly T[],
  fallback: T,
): T =>
  typeof value === "string" && allowedValues.includes(value as T)
    ? (value as T)
    : fallback;

const pickBoolean = (value: unknown, fallback: boolean): boolean =>
  typeof value === "boolean" ? value : fallback;

const pickNumber = (value: unknown, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const pickProductCardTokens = (
  value: unknown,
): StorefrontThemeProductCardTokens => {
  const record = pickObject(value);

  return PRODUCT_CARD_TOKEN_KEYS.reduce((acc, key) => {
    const tokenValue = record[key];
    if (typeof tokenValue === "string" && tokenValue.trim()) {
      acc[key] = tokenValue;
    }
    return acc;
  }, {} as StorefrontThemeProductCardTokens);
};

export const hasShopStudioConfig = (
  settings?: { designTokens?: unknown } | null,
): boolean => {
  const designTokens = pickObject(settings?.designTokens);
  return isObjectRecord(designTokens["shopStudio"]);
};

export const normalizeShopStudioConfig = (
  rawConfig?: Partial<ShopPageStudioConfig> | null,
): ShopPageStudioConfig => {
  const base = pickObject(rawConfig);
  const layout = pickObject(base["layout"]);
  const filters = pickObject(base["filters"]);
  const productCard = pickObject(base["productCard"]);
  const productCardTokens = pickProductCardTokens(productCard["tokens"]);

  return {
    layoutPattern: pickEnumValue(
      base["layoutPattern"],
      LAYOUT_PATTERNS,
      DEFAULT_SHOP_STUDIO_CONFIG.layoutPattern,
    ),
    layout: {
      type: pickEnumValue(layout["type"], ["grid", "list"], "grid"),
      desktopColumns: pickNumber(
        layout["desktopColumns"],
        DEFAULT_SHOP_STUDIO_CONFIG.layout.desktopColumns,
      ),
      mobileColumns: pickNumber(
        layout["mobileColumns"],
        DEFAULT_SHOP_STUDIO_CONFIG.layout.mobileColumns,
      ),
      sidebarPosition: pickEnumValue(
        layout["sidebarPosition"],
        SIDEBAR_POSITIONS,
        DEFAULT_SHOP_STUDIO_CONFIG.layout.sidebarPosition,
      ),
      paginationType: pickEnumValue(
        layout["paginationType"],
        PAGINATION_TYPES,
        DEFAULT_SHOP_STUDIO_CONFIG.layout.paginationType,
      ),
    },
    filters: {
      showSearch: pickBoolean(
        filters["showSearch"],
        DEFAULT_SHOP_STUDIO_CONFIG.filters.showSearch,
      ),
      showCategories: pickBoolean(
        filters["showCategories"],
        DEFAULT_SHOP_STUDIO_CONFIG.filters.showCategories,
      ),
      showPriceFilter: pickBoolean(
        filters["showPriceFilter"],
        DEFAULT_SHOP_STUDIO_CONFIG.filters.showPriceFilter,
      ),
      showSort: pickBoolean(
        filters["showSort"],
        DEFAULT_SHOP_STUDIO_CONFIG.filters.showSort,
      ),
      categoryStyle: pickEnumValue(
        filters["categoryStyle"],
        ["list", "dropdown"],
        DEFAULT_SHOP_STUDIO_CONFIG.filters.categoryStyle,
      ),
      priceStyle: pickEnumValue(
        filters["priceStyle"],
        ["slider", "range-inputs"],
        DEFAULT_SHOP_STUDIO_CONFIG.filters.priceStyle,
      ),
    },
    productCard: {
      showRating: pickBoolean(
        productCard["showRating"],
        DEFAULT_SHOP_STUDIO_CONFIG.productCard.showRating,
      ),
      showAddToCart: pickBoolean(
        productCard["showAddToCart"],
        DEFAULT_SHOP_STUDIO_CONFIG.productCard.showAddToCart,
      ),
      showComparePrice: pickBoolean(
        productCard["showComparePrice"],
        DEFAULT_SHOP_STUDIO_CONFIG.productCard.showComparePrice,
      ),
      showBadges: pickBoolean(
        productCard["showBadges"],
        DEFAULT_SHOP_STUDIO_CONFIG.productCard.showBadges,
      ),
      imageHoverAction: pickEnumValue(
        productCard["imageHoverAction"],
        IMAGE_HOVER_ACTIONS,
        DEFAULT_SHOP_STUDIO_CONFIG.productCard.imageHoverAction,
      ),
      buttonStyle: pickEnumValue(
        productCard["buttonStyle"],
        BUTTON_STYLES,
        DEFAULT_SHOP_STUDIO_CONFIG.productCard.buttonStyle,
      ),
      variant: pickEnumValue(
        productCard["variant"],
        PRODUCT_CARD_VARIANTS,
        DEFAULT_SHOP_STUDIO_CONFIG.productCard.variant || "default",
      ),
      tokens: {
        ...DEFAULT_SHOP_STUDIO_CONFIG.productCard.tokens,
        ...productCardTokens,
      },
    },
  };
};

export const extractShopStudioConfig = (
  settings?: { designTokens?: unknown } | null,
): ShopPageStudioConfig => {
  const designTokens = pickObject(settings?.designTokens);
  const shopStudio = pickObject(designTokens["shopStudio"]);
  return normalizeShopStudioConfig(shopStudio);
};

export const mergeShopStudioIntoDesignTokens = (
  currentDesignTokens: unknown,
  nextConfig: Partial<ShopPageStudioConfig>,
): UnknownRecord => {
  const safeDesignTokens = pickObject(currentDesignTokens);
  const currentShopStudio = pickObject(safeDesignTokens["shopStudio"]);

  const merged: UnknownRecord = {
    ...currentShopStudio,
    ...(nextConfig.layoutPattern ? { layoutPattern: nextConfig.layoutPattern } : {}),
    ...(nextConfig.layout
      ? { layout: { ...pickObject(currentShopStudio["layout"]), ...nextConfig.layout } }
      : {}),
    ...(nextConfig.filters
      ? { filters: { ...pickObject(currentShopStudio["filters"]), ...nextConfig.filters } }
      : {}),
    ...(nextConfig.productCard
      ? {
          productCard: {
            ...pickObject(currentShopStudio["productCard"]),
            ...nextConfig.productCard,
            ...(nextConfig.productCard.tokens
              ? {
                  tokens: {
                    ...pickProductCardTokens(pickObject(currentShopStudio["productCard"])["tokens"]),
                    ...nextConfig.productCard.tokens,
                  },
                }
              : {}),
          },
        }
      : {}),
  };

  return {
    ...safeDesignTokens,
    shopStudio: normalizeShopStudioConfig(merged),
  };
};

export const getDefaultShopStudioConfig = (): ShopPageStudioConfig => ({
  ...DEFAULT_SHOP_STUDIO_CONFIG,
  layout: { ...DEFAULT_SHOP_STUDIO_CONFIG.layout },
  filters: { ...DEFAULT_SHOP_STUDIO_CONFIG.filters },
  productCard: {
    ...DEFAULT_SHOP_STUDIO_CONFIG.productCard,
    tokens: { ...DEFAULT_SHOP_STUDIO_CONFIG.productCard.tokens },
  },
});

export const getShopProductCardStylePackBehavior = (
  pack: ShopProductCardStylePack,
): Partial<ShopPageStudioConfig> => {
  const config = SHOP_PRODUCT_CARD_STYLE_PACK_BEHAVIORS[pack];
  return {
    ...(config.layoutPattern ? { layoutPattern: config.layoutPattern } : {}),
    ...(config.layout ? { layout: { ...config.layout } } : {}),
    ...(config.filters ? { filters: { ...config.filters } } : {}),
    ...(config.productCard ? { productCard: { ...config.productCard } } : {}),
  };
};

export const applyShopProductCardStylePack = (
  currentDesignTokens: unknown,
  pack: ShopProductCardStylePack,
): UnknownRecord =>
  mergeShopStudioIntoDesignTokens(
    currentDesignTokens,
    getShopProductCardStylePackBehavior(pack),
  );

const clampColumnCount = (value: number, min: number, max: number): number => {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
};

export const resolveShopGridClassName = (
  config?: Partial<ShopPageStudioConfig> | null,
): string => {
  const normalized = normalizeShopStudioConfig(config);
  if (normalized.layout.type === "list") {
    return "grid grid-cols-1 gap-5";
  }

  const mobileColumns = clampColumnCount(normalized.layout.mobileColumns, 1, 3);
  const desktopColumns = clampColumnCount(normalized.layout.desktopColumns, 1, 6);

  return [
    "grid gap-5",
    SHOP_MOBILE_GRID_CLASS_MAP[mobileColumns] || SHOP_MOBILE_GRID_CLASS_MAP[2],
    "lg:grid-cols-2",
    SHOP_DESKTOP_GRID_CLASS_MAP[desktopColumns] || SHOP_DESKTOP_GRID_CLASS_MAP[4],
  ]
    .filter(Boolean)
    .join(" ");
};

export const resolveShopProductCardVariant = (
  config?: Partial<ShopPageStudioConfig> | null,
  fallback: ShopProductCardVariant = "default",
): ShopProductCardVariant => {
  const normalized = normalizeShopStudioConfig(config);
  return normalized.productCard.variant || fallback;
};

export const resolveShopProductCardTokens = (
  config?: Partial<ShopPageStudioConfig> | null,
): StorefrontThemeProductCardTokens => {
  const normalized = normalizeShopStudioConfig(config);
  return normalized.productCard.tokens || {};
};

export const resolveShopPageLayoutHint = (
  config?: Partial<ShopPageStudioConfig> | null,
  fallback: StorefrontPageLayout = "sidebar-left",
): StorefrontPageLayout => {
  const normalized = normalizeShopStudioConfig(config);

  if (normalized.layout.sidebarPosition === "right") {
    return "sidebar-right";
  }

  if (
    normalized.layout.sidebarPosition === "none" ||
    normalized.layout.sidebarPosition === "top"
  ) {
    return "stack";
  }

  return fallback;
};
