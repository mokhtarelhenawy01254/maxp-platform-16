import { describe, expect, it } from "vitest";
import { getStorefrontThemePreset } from "../themes";
import {
  applyStorefrontContentOverrides,
  buildStorefrontHomeContentOverrides,
  getStorefrontContentOverridesFromDesignTokens,
  getStorefrontHomeContentDraft,
  normalizeStorefrontContentOverrides,
  serializeStorefrontContentOverrides,
  upsertStorefrontContentOverridesInDesignTokens,
} from "../utils/contentOverrides";

describe("storefront content overrides", () => {
  it("normalizes and round-trips homepage content overrides through design tokens", () => {
    const draft = {
      hero: {
        visible: true,
        title: "Ramadan Edit",
        subtitle: "Elegant drops for the season",
        ctaText: "Shop Now",
        ctaLink: "/shop",
        secondaryCtaText: "",
        secondaryCtaLink: "",
        backgroundImage: "https://example.com/hero.jpg",
      },
      featuredProducts: {
        visible: true,
        title: "Best Sellers",
      },
      newsletter: {
        visible: false,
        title: "",
        subtitle: "Get weekly drops",
      },
    };

    const overrides = buildStorefrontHomeContentOverrides(draft);
    const designTokens = upsertStorefrontContentOverridesInDesignTokens({}, overrides);
    const extractedOverrides =
      getStorefrontContentOverridesFromDesignTokens(designTokens);
    const extractedDraft = getStorefrontHomeContentDraft(designTokens);

    expect(normalizeStorefrontContentOverrides(extractedOverrides)).toEqual({
      home: {
        sections: {
          "hero-banner": {
            title: "Ramadan Edit",
            subtitle: "Elegant drops for the season",
            ctaText: "Shop Now",
            ctaLink: "/shop",
            backgroundImage: "https://example.com/hero.jpg",
          },
          "featured-products": {
            title: "Best Sellers",
          },
          newsletter: {
            hidden: true,
            subtitle: "Get weekly drops",
          },
        },
      },
    });

    expect(extractedDraft.hero.title).toBe("Ramadan Edit");
    expect(extractedDraft.hero.ctaLink).toBe("/shop");
    expect(extractedDraft.hero.backgroundImage).toBe(
      "https://example.com/hero.jpg",
    );
    expect(extractedDraft.featuredProducts.title).toBe("Best Sellers");
    expect(extractedDraft.newsletter.visible).toBe(false);
    expect(extractedDraft.newsletter.subtitle).toBe("Get weekly drops");
  });

  it("applies section settings overrides on top of preset sections", () => {
    const theme = getStorefrontThemePreset("modern-minimal");
    const resolved = applyStorefrontContentOverrides(theme, {
      home: {
        sections: {
          "hero-banner": {
            title: "Capsule '26",
          },
          newsletter: {
            title: "Stay in Touch",
          },
        },
      },
    });

    const hero = (resolved.pages.home.sections || []).find(
      (s) => (typeof s === "string" ? s : s.type) === "hero-banner",
    );
    expect(hero).toEqual(
      expect.objectContaining({
        type: "hero-banner",
        settings: expect.objectContaining({
          title: "Capsule '26",
        }),
      }),
    );

    const newsletter = (resolved.pages.home.sections || []).find(
      (s) => (typeof s === "string" ? s : s.type) === "newsletter",
    );
    expect(newsletter).toEqual(
      expect.objectContaining({
        type: "newsletter",
        settings: expect.objectContaining({
          title: "Stay in Touch",
        }),
      }),
    );
  });

  it("removes only content overrides when the draft is cleared", () => {
    const designTokens = upsertStorefrontContentOverridesInDesignTokens(
      {
        themeId: "modern-minimal",
        colors: {
          primary: "10 10% 10%",
        },
      },
      buildStorefrontHomeContentOverrides({
        hero: {
          visible: true,
          title: "Ramadan Edit",
          subtitle: "",
          ctaText: "",
          ctaLink: "",
          secondaryCtaText: "",
          secondaryCtaLink: "",
          backgroundImage: "",
        },
        featuredProducts: {
          visible: true,
          title: "",
        },
        newsletter: {
          visible: true,
          title: "",
          subtitle: "",
        },
      }),
    );

    const clearedTokens = upsertStorefrontContentOverridesInDesignTokens(
      designTokens,
      {},
    );

    expect(clearedTokens).toEqual({
      themeId: "modern-minimal",
      colors: {
        primary: "10 10% 10%",
      },
    });
    expect(serializeStorefrontContentOverrides(clearedTokens)).toBe("{}");
  });
});
