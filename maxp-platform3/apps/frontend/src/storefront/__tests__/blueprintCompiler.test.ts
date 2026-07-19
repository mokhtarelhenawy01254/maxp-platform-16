import { describe, expect, it } from "vitest";
import {
  compileStorefrontBlueprint,
  shopOrbitBlueprint,
  validateStorefrontBlueprint,
} from "../blueprints";
import type { StorefrontTemplateBlueprint } from "../blueprints";

describe("storefront blueprint compiler", () => {
  it("compiles a blueprint into normalized design tokens and a valid theme", () => {
    const compiled = compileStorefrontBlueprint(shopOrbitBlueprint);

    expect(compiled.theme.id).toBe("shop-orbit");
    expect(compiled.theme.name).toBe("Shop Orbit");
    expect(compiled.theme.tokens.colors.primary).toBe("226 100% 58%");
    expect(compiled.theme.pages.shop.sections).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "shop-command-bar" }),
        "filters-sidebar",
        expect.objectContaining({ type: "product-grid", variant: "overlay-card" }),
        expect.objectContaining({ type: "shop-promo-rail" }),
        expect.objectContaining({ type: "newsletter", variant: "minimal" }),
      ]),
    );
    expect(compiled.theme.pages.shop.layoutHint).toBe("commerce-3col");
    expect(compiled.designTokens).toEqual(
      expect.objectContaining({
        themeId: "modern-minimal",
        colors: expect.objectContaining({
          primary: "226 100% 58%",
        }),
        pageOverrides: expect.objectContaining({
          shop: expect.objectContaining({
            sections: expect.any(Array),
            layoutHint: "commerce-3col",
          }),
        }),
        blueprint: expect.objectContaining({
          id: "shop-orbit",
          source: expect.objectContaining({
            kind: "stitch",
          }),
          layoutHints: expect.objectContaining({
            shop: "commerce-3col",
          }),
        }),
      }),
    );
    expect(compiled.layoutHints.shop).toBe("commerce-3col");
  });

  it("converts blueprint page definitions into normalized page overrides", () => {
    const blueprint: StorefrontTemplateBlueprint = {
      id: "quick-blueprint",
      name: "Quick Blueprint",
      baseThemeId: "modern-minimal",
      pages: {
        sale: {
          sections: ["hero-banner", "product-grid"],
          layoutHint: "stack",
        },
      },
    };

    const compiled = compileStorefrontBlueprint(blueprint);

    expect(compiled.pageOverrides).toEqual({
      sale: {
        sections: ["product-grid", "hero-banner"],
        layoutHint: "stack",
        pageGoal: "discovery",
        compositionPolicy: {
          pageGoal: "discovery",
          preserveManualOrder: false,
          enforceTrustSignals: true,
        },
      },
    });
    expect(compiled.layoutHints).toEqual({
      sale: "stack",
    });
  });

  it("preserves and infers page goals for core funnel pages", () => {
    const compiled = compileStorefrontBlueprint(shopOrbitBlueprint);

    expect(compiled.pageOverrides.home?.pageGoal).toBe("conversion");
    expect(compiled.pageOverrides.shop?.pageGoal).toBe("discovery");
    expect(compiled.pageOverrides.collections?.pageGoal).toBe("discovery");
    expect(compiled.pageOverrides.pdp?.pageGoal).toBe("trust");
  });

  it("applies composition policy metadata for trust-sensitive pages", () => {
    const compiled = compileStorefrontBlueprint(shopOrbitBlueprint);

    expect(compiled.pageOverrides.home?.compositionPolicy?.enforceTrustSignals).toBe(true);
    expect(compiled.pageOverrides.shop?.compositionPolicy?.pageGoal).toBe("discovery");
    expect(compiled.pageOverrides.pdp?.layoutHint).toBe("product-detail");
    expect(compiled.pageOverrides.pdp?.sections).toHaveLength(4);
  });

  it("reports invalid blueprint sections before compilation", () => {
    const invalidBlueprint: StorefrontTemplateBlueprint = {
      id: "broken-blueprint",
      name: "Broken Blueprint",
      baseThemeId: "modern-minimal",
      pages: {
        cart: {
          sections: ["product-gallery"],
        },
      },
    };

    const errors = validateStorefrontBlueprint(invalidBlueprint);

    expect(errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Theme page "cart" cannot use section "product-gallery".'),
        expect.stringContaining("القسم product-gallery غير مخصص للاستخدام داخل صفحة cart."),
      ]),
    );
  });
});
