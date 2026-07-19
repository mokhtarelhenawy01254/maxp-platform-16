import type { StorefrontSettings } from "../services/storefrontSettingsService";

export type LayoutVisibilityMode = "inherit" | "show" | "hide";

export interface StorefrontLayoutMenuItem {
  id: string;
  label: string;
  path: string;
  highlight?: boolean;
}

export interface StorefrontLayoutStudioConfig {
  topBar: {
    visible: LayoutVisibilityMode;
    style: "minimal" | "promo" | "info";
    message: string;
  };
  header: {
    visible: LayoutVisibilityMode;
    style: "classic" | "centered" | "split";
    sticky: boolean;
  };
  menu: {
    visible: LayoutVisibilityMode;
    style: "classic" | "mega" | "minimal";
    mobileStyle: "drawer" | "bottom-sheet" | "fullscreen";
    showSearch: boolean;
    showCart: boolean;
    items: StorefrontLayoutMenuItem[];
  };
  hero: {
    visible: LayoutVisibilityMode;
    style: "solid" | "gradient" | "image";
    title: string;
  };
  breadcrumb: {
    visible: LayoutVisibilityMode;
    style: "inline" | "boxed" | "pills";
  };
  footer: {
    visible: LayoutVisibilityMode;
    style: "columns" | "minimal" | "stacked" | "elite";
  };
  sidebars: {
    visible: LayoutVisibilityMode;
    style: "none" | "left" | "right" | "dual" | "offcanvas";
  };
}

export type StorefrontLayoutScope =
  | "global"
  | "shop"
  | "product"
  | "cart"
  | "checkout";

export interface StorefrontLayoutStudioPreset {
  id: string;
  name: string;
  scope: StorefrontLayoutScope;
  config: StorefrontLayoutStudioConfig;
}

export interface StorefrontLayoutStudioWorkspace {
  baseConfig: StorefrontLayoutStudioConfig;
  overrides: Partial<
    Record<Exclude<StorefrontLayoutScope, "global">, StorefrontLayoutStudioConfig>
  >;
  presets: StorefrontLayoutStudioPreset[];
}

export interface StorefrontFooterContentConfig {
  aboutStore: string;
  showAboutStore: boolean;
  email: string;
  showEmail: boolean;
  phone: string;
  showPhone: boolean;
  address: string;
  showAddress: boolean;
  showQuickLinks: boolean;
  showCopyright: boolean;
  copyrightText: string;
}

export interface StorefrontHeaderContentConfig {
  brandName: string;
  showBrandName: boolean;
  showBrandIcon: boolean;
  brandIcon: string;
}

export interface StorefrontMenuContentConfig {
  mobileMenuTitle: string;
  showSearchLabel: boolean;
  searchLabel: string;
  showCartLabel: boolean;
  cartLabel: string;
  showCartTotal: boolean;
}

export interface StorefrontTopBarContentConfig {
  secondaryText: string;
  showSecondaryText: boolean;
  ctaLabel: string;
  ctaPath: string;
  showCta: boolean;
}

export interface StorefrontHeroContentConfig {
  subtitle: string;
  showSubtitle: boolean;
  ctaLabel: string;
  ctaPath: string;
  showCta: boolean;
}

type AnyRecord = Record<string, unknown>;
type TypedRecord<T extends object> = Partial<T> & AnyRecord;

const isRecord = (value: unknown): value is AnyRecord =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const asTypedRecord = <T extends object>(value: unknown): TypedRecord<T> =>
  (isRecord(value) ? (value as TypedRecord<T>) : {});

const parseVisibility = (value: unknown): LayoutVisibilityMode =>
  value === "show" || value === "hide" || value === "inherit"
    ? value
    : "inherit";

export const defaultStorefrontLayoutStudioConfig = (): StorefrontLayoutStudioConfig => ({
  topBar: {
    visible: "show",
    style: "promo",
    message: "شحن مجاني للطلبات أعلى من 999 جنيه",
  },
  header: {
    visible: "show",
    style: "classic",
    sticky: true,
  },
  menu: {
    visible: "show",
    style: "classic",
    mobileStyle: "drawer",
    showSearch: true,
    showCart: true,
    items: [
      { id: "home", label: "الرئيسية", path: "/home" },
      { id: "shop", label: "المتجر", path: "/shop" },
      { id: "offers", label: "العروض", path: "/offers", highlight: true },
    ],
  },
  hero: {
    visible: "inherit",
    style: "gradient",
    title: "Storefront Collection",
  },
  breadcrumb: {
    visible: "show",
    style: "inline",
  },
  footer: {
    visible: "show",
    style: "columns",
  },
  sidebars: {
    visible: "inherit",
    style: "none",
  },
});

export const defaultStorefrontFooterContentConfig =
  (): StorefrontFooterContentConfig => ({
    aboutStore:
      "نحن متجرك ونقدم أفضل المنتجات والخدمات لعملائنا الكرام.",
    showAboutStore: true,
    email: "",
    showEmail: true,
    phone: "",
    showPhone: true,
    address: "",
    showAddress: true,
    showQuickLinks: true,
    showCopyright: true,
    copyrightText: "© {year} متجرك. جميع الحقوق محفوظة.",
  });

export const defaultStorefrontHeaderContentConfig =
  (): StorefrontHeaderContentConfig => ({
    brandName: "",
    showBrandName: true,
    showBrandIcon: true,
    brandIcon: "💎",
  });

export const defaultStorefrontMenuContentConfig =
  (): StorefrontMenuContentConfig => ({
    mobileMenuTitle: "القائمة",
    showSearchLabel: false,
    searchLabel: "بحث",
    showCartLabel: false,
    cartLabel: "السلة",
    showCartTotal: true,
  });

export const defaultStorefrontTopBarContentConfig =
  (): StorefrontTopBarContentConfig => ({
    secondaryText: "",
    showSecondaryText: false,
    ctaLabel: "تسوق الآن",
    ctaPath: "/shop",
    showCta: false,
  });

export const defaultStorefrontHeroContentConfig =
  (): StorefrontHeroContentConfig => ({
    subtitle: "",
    showSubtitle: true,
    ctaLabel: "اكتشف المنتجات",
    ctaPath: "/shop",
    showCta: false,
  });

const asString = (value: unknown, fallback: string): string => {
  const text = String(value ?? "").trim();
  return text || fallback;
};

const asOptionalString = (value: unknown, fallback = ""): string =>
  typeof value === "string" ? value.trim() : fallback;

const asBool = (value: unknown, fallback: boolean): boolean =>
  typeof value === "boolean" ? value : fallback;

export const parseStorefrontFooterContentConfig = (
  designTokens: StorefrontSettings["designTokens"],
): StorefrontFooterContentConfig => {
  const defaults = defaultStorefrontFooterContentConfig();
  const root = asTypedRecord<{
    footerContentStudio: StorefrontFooterContentConfig;
  }>(designTokens);
  const source = asTypedRecord<StorefrontFooterContentConfig>(
    root.footerContentStudio,
  );

  return {
    aboutStore: asString(source.aboutStore, defaults.aboutStore),
    showAboutStore: asBool(source.showAboutStore, defaults.showAboutStore),
    email: asString(source.email, defaults.email),
    showEmail: asBool(source.showEmail, defaults.showEmail),
    phone: asString(source.phone, defaults.phone),
    showPhone: asBool(source.showPhone, defaults.showPhone),
    address: asString(source.address, defaults.address),
    showAddress: asBool(source.showAddress, defaults.showAddress),
    showQuickLinks: asBool(source.showQuickLinks, defaults.showQuickLinks),
    showCopyright: asBool(source.showCopyright, defaults.showCopyright),
    copyrightText: asString(source.copyrightText, defaults.copyrightText),
  };
};

export const mergeStorefrontFooterContentIntoDesignTokens = (
  designTokens: StorefrontSettings["designTokens"],
  patch: Partial<StorefrontFooterContentConfig>,
): StorefrontSettings["designTokens"] => {
  const root = isRecord(designTokens) ? designTokens : {};
  const current = parseStorefrontFooterContentConfig(designTokens);
  const next = {
    ...current,
    ...patch,
  };

  return {
    ...root,
    footerContentStudio: {
      ...next,
      updatedAt: new Date().toISOString(),
    },
  };
};

export const parseStorefrontHeaderContentConfig = (
  designTokens: StorefrontSettings["designTokens"],
): StorefrontHeaderContentConfig => {
  const defaults = defaultStorefrontHeaderContentConfig();
  const root = asTypedRecord<{
    headerContentStudio: StorefrontHeaderContentConfig;
  }>(designTokens);
  const source = asTypedRecord<StorefrontHeaderContentConfig>(
    root.headerContentStudio,
  );

  return {
    brandName: asOptionalString(source.brandName, defaults.brandName),
    showBrandName: asBool(source.showBrandName, defaults.showBrandName),
    showBrandIcon: asBool(source.showBrandIcon, defaults.showBrandIcon),
    brandIcon: asString(source.brandIcon, defaults.brandIcon),
  };
};

export const mergeStorefrontHeaderContentIntoDesignTokens = (
  designTokens: StorefrontSettings["designTokens"],
  patch: Partial<StorefrontHeaderContentConfig>,
): StorefrontSettings["designTokens"] => {
  const root = isRecord(designTokens) ? designTokens : {};
  const current = parseStorefrontHeaderContentConfig(designTokens);
  const next = {
    ...current,
    ...patch,
  };

  return {
    ...root,
    headerContentStudio: {
      ...next,
      updatedAt: new Date().toISOString(),
    },
  };
};

export const parseStorefrontMenuContentConfig = (
  designTokens: StorefrontSettings["designTokens"],
): StorefrontMenuContentConfig => {
  const defaults = defaultStorefrontMenuContentConfig();
  const root = asTypedRecord<{
    menuContentStudio: StorefrontMenuContentConfig;
  }>(designTokens);
  const source = asTypedRecord<StorefrontMenuContentConfig>(
    root.menuContentStudio,
  );

  return {
    mobileMenuTitle: asString(source.mobileMenuTitle, defaults.mobileMenuTitle),
    showSearchLabel: asBool(source.showSearchLabel, defaults.showSearchLabel),
    searchLabel: asString(source.searchLabel, defaults.searchLabel),
    showCartLabel: asBool(source.showCartLabel, defaults.showCartLabel),
    cartLabel: asString(source.cartLabel, defaults.cartLabel),
    showCartTotal: asBool(source.showCartTotal, defaults.showCartTotal),
  };
};

export const mergeStorefrontMenuContentIntoDesignTokens = (
  designTokens: StorefrontSettings["designTokens"],
  patch: Partial<StorefrontMenuContentConfig>,
): StorefrontSettings["designTokens"] => {
  const root = isRecord(designTokens) ? designTokens : {};
  const current = parseStorefrontMenuContentConfig(designTokens);
  const next = {
    ...current,
    ...patch,
  };

  return {
    ...root,
    menuContentStudio: {
      ...next,
      updatedAt: new Date().toISOString(),
    },
  };
};

export const parseStorefrontTopBarContentConfig = (
  designTokens: StorefrontSettings["designTokens"],
): StorefrontTopBarContentConfig => {
  const defaults = defaultStorefrontTopBarContentConfig();
  const root = asTypedRecord<{
    topBarContentStudio: StorefrontTopBarContentConfig;
  }>(designTokens);
  const source = asTypedRecord<StorefrontTopBarContentConfig>(
    root.topBarContentStudio,
  );

  return {
    secondaryText: asOptionalString(source.secondaryText, defaults.secondaryText),
    showSecondaryText: asBool(source.showSecondaryText, defaults.showSecondaryText),
    ctaLabel: asString(source.ctaLabel, defaults.ctaLabel),
    ctaPath: asString(source.ctaPath, defaults.ctaPath),
    showCta: asBool(source.showCta, defaults.showCta),
  };
};

export const mergeStorefrontTopBarContentIntoDesignTokens = (
  designTokens: StorefrontSettings["designTokens"],
  patch: Partial<StorefrontTopBarContentConfig>,
): StorefrontSettings["designTokens"] => {
  const root = isRecord(designTokens) ? designTokens : {};
  const current = parseStorefrontTopBarContentConfig(designTokens);
  const next = {
    ...current,
    ...patch,
  };

  return {
    ...root,
    topBarContentStudio: {
      ...next,
      updatedAt: new Date().toISOString(),
    },
  };
};

export const parseStorefrontHeroContentConfig = (
  designTokens: StorefrontSettings["designTokens"],
): StorefrontHeroContentConfig => {
  const defaults = defaultStorefrontHeroContentConfig();
  const root = asTypedRecord<{
    heroContentStudio: StorefrontHeroContentConfig;
  }>(designTokens);
  const source = asTypedRecord<StorefrontHeroContentConfig>(
    root.heroContentStudio,
  );

  return {
    subtitle: asOptionalString(source.subtitle, defaults.subtitle),
    showSubtitle: asBool(source.showSubtitle, defaults.showSubtitle),
    ctaLabel: asString(source.ctaLabel, defaults.ctaLabel),
    ctaPath: asString(source.ctaPath, defaults.ctaPath),
    showCta: asBool(source.showCta, defaults.showCta),
  };
};

export const mergeStorefrontHeroContentIntoDesignTokens = (
  designTokens: StorefrontSettings["designTokens"],
  patch: Partial<StorefrontHeroContentConfig>,
): StorefrontSettings["designTokens"] => {
  const root = isRecord(designTokens) ? designTokens : {};
  const current = parseStorefrontHeroContentConfig(designTokens);
  const next = {
    ...current,
    ...patch,
  };

  return {
    ...root,
    heroContentStudio: {
      ...next,
      updatedAt: new Date().toISOString(),
    },
  };
};

const normalizePath = (path: string): string =>
  path.startsWith("/") ? path : `/${path}`;

const parseMenuItems = (
  value: unknown,
  fallbackItems: StorefrontLayoutMenuItem[],
): StorefrontLayoutMenuItem[] => {
  const defaults = fallbackItems;
  if (!Array.isArray(value)) return defaults;
  const parsed = value
    .map((item): StorefrontLayoutMenuItem | null => {
      const source = asTypedRecord<StorefrontLayoutMenuItem>(item);
      const id = String(source.id || "").trim();
      const label = String(source.label || "").trim();
      const path = String(source.path || "").trim();
      if (!id || !label) return null;
      return {
        id,
        label,
        path: normalizePath(path || "/"),
        highlight: Boolean(source.highlight),
      };
    })
    .filter((item): item is StorefrontLayoutMenuItem => Boolean(item));
  return parsed.length ? parsed : defaults;
};

const parseConfigFromSource = (
  source: unknown,
  fallback: StorefrontLayoutStudioConfig,
): StorefrontLayoutStudioConfig => {
  const studio = asTypedRecord<StorefrontLayoutStudioConfig>(source);
  const topBar = asTypedRecord<StorefrontLayoutStudioConfig["topBar"]>(
    studio.topBar,
  );
  const header = asTypedRecord<StorefrontLayoutStudioConfig["header"]>(
    studio.header,
  );
  const menu = asTypedRecord<StorefrontLayoutStudioConfig["menu"]>(studio.menu);
  const hero = asTypedRecord<StorefrontLayoutStudioConfig["hero"]>(studio.hero);
  const breadcrumb = asTypedRecord<StorefrontLayoutStudioConfig["breadcrumb"]>(
    studio.breadcrumb,
  );
  const footer = asTypedRecord<StorefrontLayoutStudioConfig["footer"]>(
    studio.footer,
  );
  const sidebars = asTypedRecord<StorefrontLayoutStudioConfig["sidebars"]>(
    studio.sidebars,
  );

  return {
    topBar: {
      visible: parseVisibility(topBar.visible),
      style:
        topBar.style === "minimal" || topBar.style === "info" || topBar.style === "promo"
          ? topBar.style
          : fallback.topBar.style,
      message: String(topBar.message || fallback.topBar.message),
    },
    header: {
      visible: parseVisibility(header.visible),
      style:
        header.style === "centered" || header.style === "split" || header.style === "classic"
          ? header.style
          : fallback.header.style,
      sticky: typeof header.sticky === "boolean" ? header.sticky : fallback.header.sticky,
    },
    menu: {
      visible: parseVisibility(menu.visible),
      style:
        menu.style === "mega" || menu.style === "minimal" || menu.style === "classic"
          ? menu.style
          : fallback.menu.style,
      mobileStyle:
        menu.mobileStyle === "bottom-sheet" ||
          menu.mobileStyle === "fullscreen" ||
          menu.mobileStyle === "drawer"
          ? menu.mobileStyle
          : fallback.menu.mobileStyle,
      showSearch:
        typeof menu.showSearch === "boolean"
          ? menu.showSearch
          : fallback.menu.showSearch,
      showCart:
        typeof menu.showCart === "boolean" ? menu.showCart : fallback.menu.showCart,
      items: parseMenuItems(menu.items, fallback.menu.items),
    },
    hero: {
      visible: parseVisibility(hero.visible),
      style:
        hero.style === "solid" || hero.style === "image" || hero.style === "gradient"
          ? hero.style
          : fallback.hero.style,
      title: String(hero.title || fallback.hero.title),
    },
    breadcrumb: {
      visible: parseVisibility(breadcrumb.visible),
      style:
        breadcrumb.style === "boxed" ||
          breadcrumb.style === "pills" ||
          breadcrumb.style === "inline"
          ? breadcrumb.style
          : fallback.breadcrumb.style,
    },
    footer: {
      visible: parseVisibility(footer.visible),
      style:
        footer.style === "minimal" ||
          footer.style === "stacked" ||
          footer.style === "columns" ||
          footer.style === "elite"
          ? footer.style
          : fallback.footer.style,
    },
    sidebars: {
      visible: parseVisibility(sidebars.visible),
      style:
        sidebars.style === "none" ||
          sidebars.style === "left" ||
          sidebars.style === "right" ||
          sidebars.style === "dual" ||
          sidebars.style === "offcanvas"
          ? sidebars.style
          : fallback.sidebars.style,
    },
  };
};

const parseScope = (value: unknown): StorefrontLayoutScope => {
  if (
    value === "global" ||
    value === "shop" ||
    value === "product" ||
    value === "cart" ||
    value === "checkout"
  ) {
    return value;
  }
  return "global";
};

const parsePresets = (
  value: unknown,
  baseConfig: StorefrontLayoutStudioConfig,
  overrides: StorefrontLayoutStudioWorkspace["overrides"],
): StorefrontLayoutStudioPreset[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item, index): StorefrontLayoutStudioPreset | null => {
      const source = asTypedRecord<StorefrontLayoutStudioPreset>(item);
      const name = String(source.name || "").trim();
      if (!name) return null;
      const scope = parseScope(source.scope);
      const fallback =
        scope === "global"
          ? baseConfig
          : overrides[scope] || baseConfig;
      const config = parseConfigFromSource(source.config, fallback);
      return {
        id: String(source.id || `layout-preset-${index + 1}`).trim(),
        name,
        scope,
        config,
      };
    })
    .filter((item): item is StorefrontLayoutStudioPreset => Boolean(item));
};

export const parseStorefrontLayoutStudioWorkspace = (
  designTokens: StorefrontSettings["designTokens"],
): StorefrontLayoutStudioWorkspace => {
  const defaults = defaultStorefrontLayoutStudioConfig();
  const root = asTypedRecord<{
    layoutStudio: StorefrontLayoutStudioConfig & {
      overrides?: Partial<Record<Exclude<StorefrontLayoutScope, "global">, unknown>>;
      presets?: unknown[];
    };
  }>(designTokens);
  const studio = asTypedRecord<
    StorefrontLayoutStudioConfig & {
      overrides?: Partial<Record<Exclude<StorefrontLayoutScope, "global">, unknown>>;
      presets?: unknown[];
    }
  >(root.layoutStudio);
  const baseConfig = parseConfigFromSource(studio, defaults);
  const rawOverrides = asTypedRecord<
    Record<Exclude<StorefrontLayoutScope, "global">, unknown>
  >(studio.overrides);
  const overrides: StorefrontLayoutStudioWorkspace["overrides"] = {};

  if (isRecord(rawOverrides.shop)) {
    overrides.shop = parseConfigFromSource(rawOverrides.shop, baseConfig);
  }
  if (isRecord(rawOverrides.product)) {
    overrides.product = parseConfigFromSource(rawOverrides.product, baseConfig);
  }
  if (isRecord(rawOverrides.cart)) {
    overrides.cart = parseConfigFromSource(rawOverrides.cart, baseConfig);
  }
  if (isRecord(rawOverrides.checkout)) {
    overrides.checkout = parseConfigFromSource(rawOverrides.checkout, baseConfig);
  }

  const presets = parsePresets(studio.presets, baseConfig, overrides);

  return {
    baseConfig,
    overrides,
    presets,
  };
};

export const parseStorefrontLayoutStudioConfig = (
  designTokens: StorefrontSettings["designTokens"],
  scope: StorefrontLayoutScope = "global",
): StorefrontLayoutStudioConfig => {
  const workspace = parseStorefrontLayoutStudioWorkspace(designTokens);
  if (scope === "global") return workspace.baseConfig;
  return workspace.overrides[scope] || workspace.baseConfig;
};

export const isLayoutSectionVisible = (mode: LayoutVisibilityMode): boolean =>
  mode !== "hide";

export const inferStorefrontLayoutScope = (
  pathname: string,
): StorefrontLayoutScope => {
  const normalized =
    pathname.length > 1 && pathname.endsWith("/")
      ? pathname.slice(0, -1)
      : pathname;

  if (
    /^\/shop\/products\/[^/]+(?:\/[^/]+)?$/.test(normalized) ||
    /^\/shop\/products-demo\/[^/]+$/.test(normalized)
  ) {
    return "product";
  }
  if (normalized === "/shop") {
    return "shop";
  }
  if (normalized === "/shop/cart") {
    return "cart";
  }
  if (normalized === "/shop/checkout") {
    return "checkout";
  }
  return "global";
};
