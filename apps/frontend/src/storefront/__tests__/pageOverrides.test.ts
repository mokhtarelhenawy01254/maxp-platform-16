import { describe, expect, it } from "vitest";
import {
  applyStorefrontPageOverrides,
  getStorefrontPageOverridesFromDesignTokens,
  serializeStorefrontPageOverrides,
  upsertStorefrontPageOverridesInDesignTokens,
} from "../utils/pageOverrides";
import { STOREFRONT_THEME_PRESETS } from "../themes";

describe("storefront page overrides utilities", () => {
  it("reads and writes page overrides inside design tokens", () => {
    const nextDesignTokens = upsertStorefrontPageOverridesInDesignTokens(
      { themeId: "modern-minimal" },
      {
        home: {
          sections: ["featured-products", "hero-banner"],
          layoutHint: "stack",
        },
      },
    );

    expect(getStorefrontPageOverridesFromDesignTokens(nextDesignTokens)).toEqual({
      home: {
        sections: ["featured-products", "hero-banner"],
        layoutHint: "stack",
      },
    });
  });

  it("removes the pageOverrides key when overrides become empty", () => {
    const nextDesignTokens = upsertStorefrontPageOverridesInDesignTokens(
      {
        themeId: "modern-minimal",
        pageOverrides: {
          home: {
            sections: ["hero-banner"],
          },
        },
      },
      {},
    );

    expect(nextDesignTokens).toEqual({
      themeId: "modern-minimal",
    });
  });

  it("applies overrides to the resolved theme pages only", () => {
    const baseTheme = STOREFRONT_THEME_PRESETS["modern-minimal"]!;
    const nextTheme = applyStorefrontPageOverrides(baseTheme, {
      cart: {
        sections: ["order-summary", "cart-items"],
        layoutHint: "sidebar-right",
      },
    });

    expect(nextTheme.pages.cart.sections).toEqual([
      "order-summary",
      "cart-items",
    ]);
    expect(nextTheme.pages.cart.layoutHint).toBe("sidebar-right");
    expect(nextTheme.pages.home.sections).toEqual(baseTheme.pages.home.sections);
  });

  it("keeps safe custom page slugs and ignores invalid ones during serialization", () => {
    expect(
      serializeStorefrontPageOverrides({
        cart: { sections: ["cart-items"] },
        collections: { sections: ["featured-collections"] },
        "bad slug!": { sections: ["ignored"] },
      }),
    ).toBe(
      '{"cart":{"sections":["cart-items"]},"collections":{"sections":["featured-collections"]}}',
    );
  });

  it("round-trips custom pages through design tokens", () => {
    const nextDesignTokens = upsertStorefrontPageOverridesInDesignTokens(
      { themeId: "solea-femme" },
      {
        "about-us": {
          sections: ["hero-banner", "newsletter"],
        },
      },
    );

    expect(getStorefrontPageOverridesFromDesignTokens(nextDesignTokens)).toEqual({
      "about-us": {
        sections: ["hero-banner", "newsletter"],
      },
    });
  });
});
