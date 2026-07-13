import { describe, expect, it } from "vitest";
import { validateStorefrontTheme } from "../engine/themeValidation";
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

  it("allows cart-items to be attached to checkout pages", () => {
    const theme = buildValidTheme();
    theme.pages.checkout.sections = ["cart-items", "checkout-form", "payment"];

    expect(validateStorefrontTheme(theme)).toEqual([]);
  });
});
