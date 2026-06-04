export interface ThemeHeaderOptions {
  sticky: boolean;
  transparentOnHome: boolean;
  showSearch: boolean;
  showCart: boolean;
  showNavLinks: boolean;
}

export interface ThemeFooterOptions {
  showFooter: boolean;
  showNewsletter: boolean;
  showContactBlock: boolean;
  showPolicyLinks: boolean;
  compactMode: boolean;
  /** Visual design variant for the footer — maps to runtimeVariant or previewShell.footerStyle in manifest */
  footerStyle: "default" | "vogue" | "bold" | "magazine" | "creative" | "elite" | "luxe";
}

export interface ThemeShopOptions {
  showPageHeading: boolean;
  showFiltersSidebar: boolean;
  showSortDropdown: boolean;
  showQuickView: boolean;
  productsPerRowDesktop: number;
  productsPerRowMobile: number;
  productCardStyle?: string;
}

export interface ThemeProductOptions {
  showBreadcrumb: boolean;
  showSizeGuide: boolean;
  showRelatedProducts: boolean;
  showRecentlyViewed: boolean;
  showStickyAddToCart: boolean;
  showNavigation: boolean;
}

export interface ThemeCompareWishlistOptions {
  enableComparison: boolean;
  enableWishlist: boolean;
}

export interface ThemeCartOptions {
  showFreeShippingBanner: boolean;
  showContinueShopping: boolean;
  showEstimatedShippingText: boolean;
}

export interface ThemeCheckoutOptions {
  enableCoupons: boolean;
  showOrderNotes: boolean;
  allowCashOnDelivery: boolean;
  showGuestEmailField: boolean;
  showCityField: boolean;
}

export interface ThemeMarketingOptions {
  showBlogLinkInNav: boolean;
  showNewsletterPopup: boolean;
}

export interface ThemeOptionsConfig {
  header: ThemeHeaderOptions;
  footer: ThemeFooterOptions;
  shop: ThemeShopOptions;
  product: ThemeProductOptions;
  compareWishlist: ThemeCompareWishlistOptions;
  cart: ThemeCartOptions;
  checkout: ThemeCheckoutOptions;
  marketing: ThemeMarketingOptions;
}

export const DEFAULT_THEME_OPTIONS: ThemeOptionsConfig = {
  header: {
    sticky: true,
    transparentOnHome: true,
    showSearch: true,
    showCart: true,
    showNavLinks: true,
  },
  footer: {
    showFooter: true,
    showNewsletter: true,
    showContactBlock: true,
    showPolicyLinks: true,
    compactMode: false,
    footerStyle: "default",
  },
  shop: {
    showPageHeading: true,
    showFiltersSidebar: true,
    showSortDropdown: true,
    showQuickView: true,
    productsPerRowDesktop: 4,
    productsPerRowMobile: 1,
    productCardStyle: undefined,
  },
  product: {
    showBreadcrumb: true,
    showSizeGuide: true,
    showRelatedProducts: true,
    showRecentlyViewed: true,
    showStickyAddToCart: true,
    showNavigation: true,
  },
  compareWishlist: {
    enableComparison: true,
    enableWishlist: true,
  },
  cart: {
    showFreeShippingBanner: true,
    showContinueShopping: true,
    showEstimatedShippingText: true,
  },
  checkout: {
    enableCoupons: true,
    showOrderNotes: true,
    allowCashOnDelivery: true,
    showGuestEmailField: true,
    showCityField: true,
  },
  marketing: {
    showBlogLinkInNav: true,
    showNewsletterPopup: true,
  },
};

type ThemeOptionsSectionKey =
  | "header"
  | "footer"
  | "shop"
  | "product"
  | "compareWishlist"
  | "cart"
  | "checkout"
  | "marketing";

type ThemeOptionsSource = {
  themeOptions?: unknown;
  header?: unknown;
  footer?: unknown;
  shop?: unknown;
  product?: unknown;
  compareWishlist?: unknown;
  cart?: unknown;
  checkout?: unknown;
  marketing?: unknown;
};

type JsonRecord = Record<string, unknown>;

const asObject = (value: unknown): JsonRecord =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};

const asBoolean = (value: unknown, fallback: boolean): boolean =>
  typeof value === "boolean" ? value : fallback;

const asInteger = (
  value: unknown,
  fallback: number,
  min: number,
  max: number,
): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  const rounded = Math.round(value);
  return Math.max(min, Math.min(max, rounded));
};

const resolveThemeOptionsSource = (rawSettings: unknown): ThemeOptionsSource => {
  const settings = asObject(rawSettings);
  const nested = asObject(settings["themeOptions"]);
  if (Object.keys(nested).length > 0) {
    return nested as ThemeOptionsSource;
  }
  return settings as ThemeOptionsSource;
};

const resolveThemeSection = <T extends object>(
  source: ThemeOptionsSource,
  key: ThemeOptionsSectionKey,
): Partial<T> => asObject(source[key]) as Partial<T>;

export const normalizeThemeOptions = (rawSettings: unknown): ThemeOptionsConfig => {
  const source = resolveThemeOptionsSource(rawSettings);

  const header = resolveThemeSection<ThemeHeaderOptions>(source, "header");
  const footer = resolveThemeSection<ThemeFooterOptions>(source, "footer");
  const shop = resolveThemeSection<ThemeShopOptions>(source, "shop");
  const product = resolveThemeSection<ThemeProductOptions>(source, "product");
  const compareWishlist = resolveThemeSection<ThemeCompareWishlistOptions>(
    source,
    "compareWishlist",
  );
  const cart = resolveThemeSection<ThemeCartOptions>(source, "cart");
  const checkout = resolveThemeSection<ThemeCheckoutOptions>(source, "checkout");
  const marketing = resolveThemeSection<ThemeMarketingOptions>(source, "marketing");

  return {
    header: {
      sticky: asBoolean(header.sticky, DEFAULT_THEME_OPTIONS.header.sticky),
      transparentOnHome: asBoolean(
        header.transparentOnHome,
        DEFAULT_THEME_OPTIONS.header.transparentOnHome,
      ),
      showSearch: asBoolean(header.showSearch, DEFAULT_THEME_OPTIONS.header.showSearch),
      showCart: asBoolean(header.showCart, DEFAULT_THEME_OPTIONS.header.showCart),
      showNavLinks: asBoolean(header.showNavLinks, DEFAULT_THEME_OPTIONS.header.showNavLinks),
    },
    footer: {
      showFooter: asBoolean(footer.showFooter, DEFAULT_THEME_OPTIONS.footer.showFooter),
      showNewsletter: asBoolean(
        footer.showNewsletter,
        DEFAULT_THEME_OPTIONS.footer.showNewsletter,
      ),
      showContactBlock: asBoolean(
        footer.showContactBlock,
        DEFAULT_THEME_OPTIONS.footer.showContactBlock,
      ),
      showPolicyLinks: asBoolean(
        footer.showPolicyLinks,
        DEFAULT_THEME_OPTIONS.footer.showPolicyLinks,
      ),
      compactMode: asBoolean(footer.compactMode, DEFAULT_THEME_OPTIONS.footer.compactMode),
      footerStyle: (() => {
        const raw = String(footer.footerStyle || "").trim().toLowerCase();
        if (
          raw === "vogue" ||
          raw === "bold" ||
          raw === "magazine" ||
          raw === "creative" ||
          raw === "elite" ||
          raw === "luxe"
        ) {
          return raw as ThemeFooterOptions["footerStyle"];
        }
        return DEFAULT_THEME_OPTIONS.footer.footerStyle;
      })(),
    },
    shop: {
      showPageHeading: asBoolean(
        shop.showPageHeading,
        DEFAULT_THEME_OPTIONS.shop.showPageHeading,
      ),
      showFiltersSidebar: asBoolean(
        shop.showFiltersSidebar,
        DEFAULT_THEME_OPTIONS.shop.showFiltersSidebar,
      ),
      showSortDropdown: asBoolean(
        shop.showSortDropdown,
        DEFAULT_THEME_OPTIONS.shop.showSortDropdown,
      ),
      showQuickView: asBoolean(shop.showQuickView, DEFAULT_THEME_OPTIONS.shop.showQuickView),
      productsPerRowDesktop: asInteger(
        shop.productsPerRowDesktop,
        DEFAULT_THEME_OPTIONS.shop.productsPerRowDesktop,
        2,
        5,
      ),
      productsPerRowMobile: asInteger(
        shop.productsPerRowMobile,
        DEFAULT_THEME_OPTIONS.shop.productsPerRowMobile,
        1,
        2,
      ),
      productCardStyle: typeof shop.productCardStyle === "string" ? shop.productCardStyle : DEFAULT_THEME_OPTIONS.shop.productCardStyle,
    },
    product: {
      showBreadcrumb: asBoolean(
        product.showBreadcrumb,
        DEFAULT_THEME_OPTIONS.product.showBreadcrumb,
      ),
      showSizeGuide: asBoolean(
        product.showSizeGuide,
        DEFAULT_THEME_OPTIONS.product.showSizeGuide,
      ),
      showRelatedProducts: asBoolean(
        product.showRelatedProducts,
        DEFAULT_THEME_OPTIONS.product.showRelatedProducts,
      ),
      showRecentlyViewed: asBoolean(
        product.showRecentlyViewed,
        DEFAULT_THEME_OPTIONS.product.showRecentlyViewed,
      ),
      showStickyAddToCart: asBoolean(
        product.showStickyAddToCart,
        DEFAULT_THEME_OPTIONS.product.showStickyAddToCart,
      ),
      showNavigation: asBoolean(
        product.showNavigation,
        DEFAULT_THEME_OPTIONS.product.showNavigation,
      ),
    },
    compareWishlist: {
      enableComparison: asBoolean(
        compareWishlist.enableComparison,
        DEFAULT_THEME_OPTIONS.compareWishlist.enableComparison,
      ),
      enableWishlist: asBoolean(
        compareWishlist.enableWishlist,
        DEFAULT_THEME_OPTIONS.compareWishlist.enableWishlist,
      ),
    },
    cart: {
      showFreeShippingBanner: asBoolean(
        cart.showFreeShippingBanner,
        DEFAULT_THEME_OPTIONS.cart.showFreeShippingBanner,
      ),
      showContinueShopping: asBoolean(
        cart.showContinueShopping,
        DEFAULT_THEME_OPTIONS.cart.showContinueShopping,
      ),
      showEstimatedShippingText: asBoolean(
        cart.showEstimatedShippingText,
        DEFAULT_THEME_OPTIONS.cart.showEstimatedShippingText,
      ),
    },
    checkout: {
      enableCoupons: asBoolean(
        checkout.enableCoupons,
        DEFAULT_THEME_OPTIONS.checkout.enableCoupons,
      ),
      showOrderNotes: asBoolean(
        checkout.showOrderNotes,
        DEFAULT_THEME_OPTIONS.checkout.showOrderNotes,
      ),
      allowCashOnDelivery: asBoolean(
        checkout.allowCashOnDelivery,
        DEFAULT_THEME_OPTIONS.checkout.allowCashOnDelivery,
      ),
      showGuestEmailField: asBoolean(
        checkout.showGuestEmailField,
        DEFAULT_THEME_OPTIONS.checkout.showGuestEmailField,
      ),
      showCityField: asBoolean(
        checkout.showCityField,
        DEFAULT_THEME_OPTIONS.checkout.showCityField,
      ),
    },
    marketing: {
      showBlogLinkInNav: asBoolean(
        marketing.showBlogLinkInNav,
        DEFAULT_THEME_OPTIONS.marketing.showBlogLinkInNav,
      ),
      showNewsletterPopup: asBoolean(
        marketing.showNewsletterPopup,
        DEFAULT_THEME_OPTIONS.marketing.showNewsletterPopup,
      ),
    },
  };
};

export const extractThemeOptionsFromTemplateContent = (
  templateContent: unknown,
): ThemeOptionsConfig => {
  const content = asObject(templateContent);
  const settings = asObject(content["settings"]);
  return normalizeThemeOptions(settings);
};

