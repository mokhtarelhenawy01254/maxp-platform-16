/**
 * Studio Theme Serializer
 * Serializes, exports, validates, and initializes complete 14-page StorefrontTheme JSONs
 * matching the canonical themes/<slug>.json schema and validate-theme-file standards.
 */

import {
  StorefrontTheme,
  StorefrontThemeTokens,
  StorefrontPageConfig,
  StorefrontSectionConfig,
} from "../../types/theme.types";
import { STOREFRONT_THEME_PRESETS, DEFAULT_STOREFRONT_THEME_ID } from "../../themes/index";
import { hexToHslTriplet, isValidHslTriplet } from "./hslColorBridge";

export const STANDARD_THEME_PAGES = [
  "home", "shop", "pdp", "cart", "checkout", "thank-you",
  "collections", "sale", "shipping", "returns", "contact",
  "privacy", "terms", "registration", "size-guide",
] as const;

export const MANDATORY_THEME_ROOT_KEYS = [
  "id", "name", "direction", "tokens", "header", "footer", "pages",
] as const;

export const MANDATORY_PAGE_KEYS = ["home", "shop", "pdp", "cart", "checkout"] as const;

export const DEFAULT_SEMANTIC_COLORS = {
  primary: "215 28% 17%", primaryForeground: "0 0% 100%",
  secondary: "210 20% 96%", secondaryForeground: "215 28% 17%",
  accent: "217 91% 60%", accentForeground: "0 0% 100%",
  background: "0 0% 100%", foreground: "215 28% 17%",
  muted: "210 20% 96%", mutedForeground: "215 16% 47%",
  border: "214 32% 91%", card: "0 0% 100%", cardForeground: "215 28% 17%",
  ring: "217 91% 60%",
};

export interface ExportFullStorefrontThemeOptions {
  themeId?: string;
  themeName?: string;
  direction?: "ltr" | "rtl";
  tokens?: Record<string, any>;
  header?: Record<string, any>;
  footer?: Record<string, any>;
  pages?: Record<string, any>;
  pageOverrides?: Record<string, any>;
  global?: Record<string, any>;
  seo?: Record<string, any>;
}

const cleanSection = (sec: unknown): string | StorefrontSectionConfig => {
  if (typeof sec === "string") return sec.trim();
  if (!sec || typeof sec !== "object") return { type: "info-content" };

  const raw = sec as Record<string, any>;
  const type = String(raw.type || raw.id || "info-content").trim();
  const variant = raw.variant || raw.settings?.variant || raw.config?.variant;

  const mergedSettings: Record<string, any> = {
    ...(raw.config && typeof raw.config === "object" ? raw.config : {}),
    ...(raw.settings && typeof raw.settings === "object" ? raw.settings : {}),
  };
  delete mergedSettings.variant;
  delete mergedSettings._id;
  delete mergedSettings.$$runtimeId;

  const result: StorefrontSectionConfig = { type };
  if (variant && variant !== "default") result.variant = String(variant).trim();
  if (Object.keys(mergedSettings).length > 0) result.settings = mergedSettings;
  return result;
};

export function createBlankStorefrontTheme(
  themeId: string,
  themeName: string,
  direction: "rtl" | "ltr" = "rtl"
): StorefrontTheme {
  const safeId = (themeId || "custom-theme").toLowerCase().replace(/[^a-z0-9_-]/g, "-");
  const safeName = themeName || themeId || "Custom Theme";

  const defaultPageSections: Record<string, string[]> = {
    home: ["promo-strip", "hero-banner", "featured-products"],
    shop: ["category-strip", "product-grid"],
    pdp: ["product-info", "features-bar"],
    cart: ["cart-items"],
    checkout: ["checkout-form"],
    "thank-you": ["order-confirmation"],
    collections: ["featured-collections"],
    sale: ["promo-strip", "product-grid"],
    registration: ["account-portal"],
  };

  const pages: Record<string, StorefrontPageConfig> = {};
  STANDARD_THEME_PAGES.forEach((pk) => {
    const types = defaultPageSections[pk] || ["info-content"];
    pages[pk] = { sections: types.map((t) => ({ type: t })) };
  });

  return {
    id: safeId,
    name: safeName,
    direction,
    tokens: {
      colors: { ...DEFAULT_SEMANTIC_COLORS },
      typography: { headingFont: "Cairo", bodyFont: "Tajawal", baseSize: "16px", direction },
      shape: { borderRadius: "0.75rem", buttonRadius: "0.5rem" },
      productCard: { borderRadius: "0.75rem", buttonRadius: "0.5rem", surfaceOpacity: "1" },
    },
    header: {
      brandName: safeName, showSearch: true, showCart: true,
      navigation: [
        { label: "الرئيسية", to: "/" }, { label: "المتجر", to: "/shop" },
        { label: "التصنيفات", to: "/collections" }, { label: "العروض", to: "/sale" },
      ],
    },
    footer: {
      description: `متجر ${safeName} لتجربة تسوق متكاملة وسريعة.`,
      copyrightText: `© ${new Date().getFullYear()} ${safeName}`,
      socialLinks: {},
      navigation: [
        { title: "التسوق", links: [{ label: "كل المنتجات", to: "/shop" }, { label: "العروض", to: "/sale" }] },
        { title: "الدعم", links: [{ label: "الشحن والتوصيل", to: "/shipping" }, { label: "الاستبدال والاسترجاع", to: "/returns" }] },
      ],
      legalLinks: [{ label: "سياسة الخصوصية", to: "/privacy" }, { label: "الشروط والأحكام", to: "/terms" }],
    },
    pages: pages as any,
  };
}

export function exportFullStorefrontTheme(options: ExportFullStorefrontThemeOptions): StorefrontTheme {
  const targetId = options.themeId || DEFAULT_STOREFRONT_THEME_ID;
  const basePreset: StorefrontTheme =
    STOREFRONT_THEME_PRESETS[targetId] ||
    createBlankStorefrontTheme(targetId, options.themeName || targetId, options.direction || "rtl");

  const direction = options.direction || options.tokens?.typography?.direction || basePreset.direction || "rtl";
  const name = options.themeName || basePreset.name || targetId;

  // 1. Normalize Colors to HSL triplets
  const inputColors = options.tokens?.colors || {};
  const baseColors = basePreset.tokens?.colors || DEFAULT_SEMANTIC_COLORS;
  const finalColors: Record<string, string> = {};

  Object.keys(DEFAULT_SEMANTIC_COLORS).forEach((colorKey) => {
    const rawVal = inputColors[colorKey] ?? (baseColors as any)[colorKey];
    if (typeof rawVal === "string" && rawVal.trim()) {
      finalColors[colorKey] = isValidHslTriplet(rawVal) ? rawVal.trim() : hexToHslTriplet(rawVal);
    } else {
      finalColors[colorKey] = (DEFAULT_SEMANTIC_COLORS as any)[colorKey];
    }
  });

  // 2. Normalize Typography & Shapes
  const finalTokens: StorefrontThemeTokens = {
    colors: finalColors as any,
    typography: {
      headingFont: options.tokens?.typography?.headingFont || basePreset.tokens?.typography?.headingFont || "Cairo",
      bodyFont: options.tokens?.typography?.bodyFont || basePreset.tokens?.typography?.bodyFont || "Tajawal",
      baseSize: options.tokens?.typography?.baseSize || options.tokens?.typography?.baseFontSize || "16px",
      direction,
    },
    shape: {
      borderRadius: options.tokens?.shape?.borderRadius || basePreset.tokens?.shape?.borderRadius || "0.75rem",
      buttonRadius: options.tokens?.shape?.buttonRadius || basePreset.tokens?.shape?.buttonRadius || "0.5rem",
    },
    productCard: {
      borderRadius: options.tokens?.productCard?.borderRadius || "0.75rem",
      buttonRadius: options.tokens?.productCard?.buttonRadius || "0.5rem",
      surfaceOpacity: options.tokens?.productCard?.surfaceOpacity || "1",
    },
  };

  // 3. Header & Footer
  const finalHeader = {
    ...(basePreset.header || {}), ...(options.header || {}),
    brandName: options.header?.brandName || basePreset.header?.brandName || name,
  };
  const finalFooter = {
    ...(basePreset.footer || {}), ...(options.footer || {}),
    copyrightText: options.footer?.copyrightText || basePreset.footer?.copyrightText || `© ${new Date().getFullYear()} ${name}`,
  };

  // 4. Consolidate all 14+ pages with pageOverrides
  const pageSourceKeys = new Set<string>([
    ...STANDARD_THEME_PAGES,
    ...Object.keys(basePreset.pages || {}),
    ...Object.keys(options.pages || {}),
    ...Object.keys(options.pageOverrides || {}),
  ]);

  const finalPages: Record<string, StorefrontPageConfig> = {};
  pageSourceKeys.forEach((pageKey) => {
    const sourcePage = options.pageOverrides?.[pageKey] || options.pages?.[pageKey] || basePreset.pages?.[pageKey];
    if (!sourcePage) {
      finalPages[pageKey] = { sections: [{ type: "info-content" }] };
      return;
    }
    const rawSections = Array.isArray(sourcePage.sections) ? sourcePage.sections : [];
    const cleaned = rawSections.map(cleanSection);
    finalPages[pageKey] = {
      sections: cleaned.length > 0 ? cleaned : [{ type: "info-content" }],
      ...(sourcePage.layoutHint ? { layoutHint: sourcePage.layoutHint } : {}),
      ...(sourcePage.pageGoal ? { pageGoal: sourcePage.pageGoal } : {}),
    };
  });

  return {
    id: targetId, name, direction, tokens: finalTokens,
    header: finalHeader as any, footer: finalFooter as any, pages: finalPages as any,
    ...(options.seo || basePreset.seo ? { seo: options.seo || basePreset.seo } : {}),
  };
}

export function validateFullStorefrontThemeJSON(json: unknown): {
  valid: boolean;
  errors: string[];
  theme?: StorefrontTheme;
} {
  const errors: string[] = [];
  if (!json || typeof json !== "object" || Array.isArray(json)) {
    return { valid: false, errors: ["محتوى القالب يجب أن يكون كائن JSON صالح (Valid Object)."] };
  }
  const raw = json as Record<string, any>;

  MANDATORY_THEME_ROOT_KEYS.forEach((key) => {
    if (!(key in raw)) errors.push(`الحقل الرئيسي الإلزامي مفقود: "${key}"`);
  });

  if (raw.direction !== "ltr" && raw.direction !== "rtl") {
    errors.push(`الاتجاه يجب أن يكون إما "ltr" أو "rtl"، القيمة المستلمة: "${raw.direction}"`);
  }

  if (!raw.tokens || typeof raw.tokens !== "object") {
    errors.push('كائن الرموز "tokens" مفقود في القالب.');
  } else {
    const colors = raw.tokens.colors;
    if (!colors || typeof colors !== "object") {
      errors.push('كائن ألوان الهوية "tokens.colors" مفقود.');
    } else {
      ["primary", "secondary", "accent", "background", "foreground"].forEach((c) => {
        if (!colors[c] || typeof colors[c] !== "string" || !colors[c].trim()) {
          errors.push(`لون السمة الإلزامي مفقود: "tokens.colors.${c}"`);
        }
      });
    }
  }

  if (!raw.pages || typeof raw.pages !== "object") {
    errors.push('كائن الصفحات "pages" مفقود في تعريف القالب.');
  } else {
    MANDATORY_PAGE_KEYS.forEach((pk) => {
      if (!raw.pages[pk] || typeof raw.pages[pk] !== "object") {
        errors.push(`الصفحة الإلزامية مفقودة من القالب: "pages.${pk}"`);
      }
    });
  }

  if (errors.length > 0) return { valid: false, errors };
  return { valid: true, errors: [], theme: raw as StorefrontTheme };
}
