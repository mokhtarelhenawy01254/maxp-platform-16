export type StorefrontRuntimeLayoutPage =
  | "homepage"
  | "shop"
  | "pdp"
  | "cart"
  | "checkout";

type SupportedPages = Record<StorefrontRuntimeLayoutPage, boolean>;

type ThemeTokens = {
  colors?: {
    primary?: string;
    secondary?: string;
    accent?: string;
    background?: string;
    card?: string;
    foreground?: string;
    muted?: string;
    border?: string;
  };
  typography?: {
    heading?: string;
    body?: string;
  };
};

type ThemePreview = {
  language?: "ar" | "en";
  currency?: string;
  direction?: "rtl" | "ltr";
  preset?: "luxury" | "minimal" | "tech" | "fashion" | "default";
};

export type ThemeManifestSnapshot = {
  id: string;
  name: string;
  version: string;
  description?: string;
  supportedPages: SupportedPages;
  tokens?: ThemeTokens;
  preview?: ThemePreview;
  supportedFeatures?: Record<string, boolean>;
};

type StorefrontLayoutFamily = {
  id: string;
  homepage: string;
  shop: string;
  pdp: string;
  cart: string;
  checkout: string;
  supportedPages: SupportedPages;
  manifest: ThemeManifestSnapshot;
  aliases?: string[];
};

type ResolveOptions = {
  fallback?: string;
  scope?: string;
  warn?: boolean;
};

const DEFAULT_SUPPORTED_PAGES: SupportedPages = {
  homepage: true,
  shop: true,
  pdp: true,
  cart: true,
  checkout: true,
};

const buildFamily = (
  id: string,
  name: string,
  options: Partial<StorefrontLayoutFamily> & {
    aliases?: string[];
    preview?: ThemePreview;
    tokens?: ThemeTokens;
    description?: string;
  } = {},
): StorefrontLayoutFamily => {
  const supportedPages = {
    ...DEFAULT_SUPPORTED_PAGES,
    ...(options.supportedPages || {}),
  };

  return {
    id,
    homepage: options.homepage || id,
    shop: options.shop || id,
    pdp: options.pdp || id,
    cart: options.cart || id,
    checkout: options.checkout || id,
    supportedPages,
    aliases: options.aliases || [],
    manifest: {
      id,
      name,
      version: "1.0.0",
      description: options.description || `${name} storefront runtime theme`,
      supportedPages,
      preview: {
        language: "ar",
        currency: "EGP",
        direction: "rtl",
        preset: "default",
        ...(options.preview || {}),
      },
      tokens: {
        colors: {
          primary: "#111827",
          secondary: "#e5e7eb",
          accent: "#475569",
          background: "#ffffff",
          card: "#f8fafc",
          foreground: "#0f172a",
          muted: "#64748b",
          border: "#e2e8f0",
          ...(options.tokens?.colors || {}),
        },
        typography: {
          heading: "\"IBM Plex Sans Arabic\", sans-serif",
          body: "\"IBM Plex Sans Arabic\", sans-serif",
          ...(options.tokens?.typography || {}),
        },
      },
      supportedFeatures: {
        quickView: true,
        wishlist: true,
        newsletter: true,
      },
    },
  };
};

export const STOREFRONT_LAYOUT_FAMILIES: Record<string, StorefrontLayoutFamily> = {
  default: buildFamily("default", "Default", {
    aliases: ["standard", "vogue", "main-product"],
    preview: { preset: "minimal" },
  }),
  elessi: buildFamily("elessi", "Elessi", {
    preview: { preset: "fashion" },
    tokens: {
      colors: {
        primary: "#111111",
        accent: "#b91c1c",
      },
    },
  }),
  "aura-zen": buildFamily("aura-zen", "Aura Zen", {
    aliases: ["aura-chic"],
    preview: { preset: "minimal" },
    tokens: {
      colors: {
        primary: "#1d4ed8",
        accent: "#0ea5e9",
      },
    },
  }),
  "ethereal-glow": buildFamily("ethereal-glow", "Ethereal Glow", {
    preview: { preset: "fashion" },
    tokens: {
      colors: {
        primary: "#7c3aed",
        accent: "#ec4899",
      },
    },
  }),
  "atelier-nova": buildFamily("atelier-nova", "Atelier Nova", {
    preview: { preset: "luxury" },
    tokens: {
      colors: {
        primary: "#0f172a",
        accent: "#c084fc",
      },
    },
  }),
  "rose-atelier": buildFamily("rose-atelier", "Rose Atelier", {
    preview: { preset: "fashion" },
    tokens: {
      colors: {
        primary: "#881337",
        accent: "#fb7185",
      },
    },
  }),
  "cairo-sole-pro": buildFamily("cairo-sole-pro", "Cairo Sole Pro", {
    preview: { preset: "tech" },
    tokens: {
      colors: {
        primary: "#14532d",
        accent: "#22c55e",
      },
    },
  }),
  "vogue-elite": buildFamily("vogue-elite", "Vogue Elite", {
    aliases: ["femme-chic"],
    preview: { preset: "luxury" },
    tokens: {
      colors: {
        primary: "#3f3f46",
        accent: "#d4a373",
      },
    },
  }),
};

const ALIAS_TO_ID = Object.entries(STOREFRONT_LAYOUT_FAMILIES).reduce(
  (acc, [id, family]) => {
    acc[id] = id;
    (family.aliases || []).forEach((alias) => {
      acc[String(alias).trim().toLowerCase()] = id;
    });
    return acc;
  },
  {} as Record<string, string>,
);

const normalizeThemeKey = (value: unknown): string =>
  String(value || "").trim().toLowerCase();

const emitResolveWarning = (requested: string, options?: ResolveOptions) => {
  if (options?.warn === false) return;
  console.warn(
    `[ThemeRuntimeLoader] Unknown storefront layout "${requested}" in ${
      options?.scope || "runtime"
    }. Falling back to "${options?.fallback || "default"}".`,
  );
};

const resolveThemeId = (value: unknown): string | null => {
  const normalized = normalizeThemeKey(value);
  if (!normalized) return null;
  return ALIAS_TO_ID[normalized] || null;
};

export const AVAILABLE_THEME_IDS = Object.keys(STOREFRONT_LAYOUT_FAMILIES);

export const getThemeManifestSnapshot = (
  themeId: string,
): ThemeManifestSnapshot | null => {
  const resolvedId = resolveThemeId(themeId);
  if (!resolvedId) return null;
  return STOREFRONT_LAYOUT_FAMILIES[resolvedId]?.manifest || null;
};

export const loadThemeManifestById = async (
  themeId: string,
): Promise<ThemeManifestSnapshot> => {
  const manifest = getThemeManifestSnapshot(themeId);
  if (!manifest) {
    throw new Error(`Unknown theme manifest: ${themeId}`);
  }
  return manifest;
};

export const getSupportedStorefrontLayoutFamilyKeysForPage = (
  page: StorefrontRuntimeLayoutPage,
): string[] =>
  AVAILABLE_THEME_IDS.filter(
    (id) => STOREFRONT_LAYOUT_FAMILIES[id]?.supportedPages?.[page],
  );

export const resolveStorefrontLayoutFamily = (
  rawFamily: unknown,
  options: ResolveOptions = {},
): string => {
  const resolvedId = resolveThemeId(rawFamily);
  if (resolvedId) return resolvedId;

  const fallbackId = resolveThemeId(options.fallback || "default") || "default";
  emitResolveWarning(String(rawFamily || ""), options);
  return fallbackId;
};

export const findSupportedStorefrontLayoutFamily = (
  rawFamily: unknown,
  page: StorefrontRuntimeLayoutPage,
  options: ResolveOptions = {},
): StorefrontLayoutFamily | null => {
  const candidateId = resolveThemeId(rawFamily);
  if (candidateId) {
    const candidate = STOREFRONT_LAYOUT_FAMILIES[candidateId];
    if (candidate?.supportedPages?.[page]) {
      return candidate;
    }
  }

  const fallbackId = resolveThemeId(options.fallback || "default") || "default";
  const fallback = STOREFRONT_LAYOUT_FAMILIES[fallbackId];
  if (candidateId && options.warn !== false) {
    console.warn(
      `[ThemeRuntimeLoader] Layout "${candidateId}" does not support page "${page}" in ${
        options.scope || "runtime"
      }. Falling back to "${fallbackId}".`,
    );
  } else if (!candidateId) {
    emitResolveWarning(String(rawFamily || ""), options);
  }

  return fallback?.supportedPages?.[page] ? fallback : null;
};

export const resolveStorefrontLayoutFamilyForPage = (
  rawFamily: unknown,
  page: StorefrontRuntimeLayoutPage,
  options: ResolveOptions = {},
): string => {
  const family = findSupportedStorefrontLayoutFamily(rawFamily, page, options);
  return family?.id || "default";
};
