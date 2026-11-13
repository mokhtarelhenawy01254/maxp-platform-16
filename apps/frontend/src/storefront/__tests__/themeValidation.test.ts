import { describe, expect, it } from "vitest";
import { validateStorefrontTheme } from "../engine/themeValidation";
import { STOREFRONT_THEME_PRESETS } from "../themes";
import type { StorefrontTheme } from "../types/theme.types";

const buildValidTheme = (): StorefrontTheme => ({
  id: "test-theme",
  name: "Test Theme",
  tokens: {
    colors: {
      primary: "0 0% 9%",
      primaryForeground: "0 0% 98%",
      secondary: "0 0% 96%",
      secondaryForeground: "0 0% 9%",
      accent: "210 90% 50%",
      accentForeground: "0 0% 98%",
      background: "0 0% 100%",
      foreground: "0 0% 9%",
      muted: "0 0% 96%",
      mutedForeground: "0 0% 45%",
      border: "0 0% 89%",
      card: "0 0% 100%",
      cardForeground: "0 0% 9%",
      ring: "210 90% 50%",
    },
    typography: {
      headingFont: "Cairo, sans-serif",
      bodyFont: "Cairo, sans-serif",
      baseSize: "16px",
      direction: "rtl",
    },
    shape: {
      borderRadius: "1rem",
      buttonRadius: "999px",
    },
  },
  pages: {
    home: {
      sections: ["hero-banner", "featured-products", "newsletter"],
    },
    shop: {
      sections: ["filters-sidebar", "product-grid"],
    },
    pdp: {
      sections: ["product-gallery", "product-info", "reviews"],
    },
    cart: {
      sections: ["cart-items", "order-summary"],
    },
    checkout: {
      sections: ["checkout-form", "payment"],
    },
    lookbook: {
      sections: ["hero-banner", "lookbook-showcase", "newsletter"],
    },
  },
});

describe("validateStorefrontTheme", () => {
  it("accepts valid themes, including optional custom pages", () => {
    expect(validateStorefrontTheme(buildValidTheme())).toEqual([]);
  });

  it("flags unknown section ids", () => {
    const theme = buildValidTheme();
    theme.pages.home.sections = ["mystery-section"];

    expect(validateStorefrontTheme(theme)).toContain(
      'Theme page "home" contains unknown section "mystery-section".',
    );
  });

  it("flags sections that are attached to unsupported pages", () => {
    const theme = buildValidTheme();
    theme.pages.cart.sections = ["product-gallery"];

    expect(validateStorefrontTheme(theme)).toContain(
      'Theme page "cart" cannot use section "product-gallery".',
    );
  });

  it("accepts a commercial template that omits the system checkout page", () => {
    // Task 120-day01: checkout is a system page rendered by the shell fallback,
    // so a 6-page commercial template must pass validation without it.
    const theme = buildValidTheme();
    const pages = theme.pages as Record<string, unknown>;
    delete pages.checkout;

    expect(validateStorefrontTheme(theme)).toEqual([]);
  });

  it("still requires the commercial pages (home/shop/pdp/cart)", () => {
    const theme = buildValidTheme();
    const pages = theme.pages as Record<string, unknown>;
    delete pages.cart;

    expect(validateStorefrontTheme(theme)).toContain(
      'Theme page "cart" must define at least one section.',
    );
  });

  it("validates anjella-boutique theme preset successfully without errors", () => {
    const anjellaTheme = STOREFRONT_THEME_PRESETS["anjella-boutique"];
    expect(anjellaTheme).toBeDefined();
    expect(validateStorefrontTheme(anjellaTheme)).toEqual([]);
  });

  it("validates all registered presets in STOREFRONT_THEME_PRESETS without errors", () => {
    const presetEntries = Object.entries(STOREFRONT_THEME_PRESETS);
    expect(presetEntries.length).toBeGreaterThan(0);

    for (const [presetId, preset] of presetEntries) {
      expect(preset, `Preset "${presetId}" should be defined`).toBeDefined();
      expect(
        validateStorefrontTheme(preset),
        `Preset "${presetId}" failed validation`,
      ).toEqual([]);
    }
  });
});
