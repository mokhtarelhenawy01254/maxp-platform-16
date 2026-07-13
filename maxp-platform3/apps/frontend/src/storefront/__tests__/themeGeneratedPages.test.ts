import { describe, expect, it } from "vitest";

import {
  cloneStorefrontTheme,
  collectStorefrontThemeLinkedPageReferences,
  getGeneratedStorefrontThemePages,
  getStorefrontThemePreset,
  STOREFRONT_THEME_PRESETS,
} from "../themes";
import { ELESSI_PACK_THEME_IDS } from "../themes/elessiPack";

const getSectionType = (section: unknown) => {
  if (typeof section === "string") {
    return section;
  }

  if (!section || typeof section !== "object" || Array.isArray(section)) {
    return "";
  }

  return typeof (section as { type?: unknown }).type === "string"
    ? ((section as { type?: string }).type ?? "")
    : "";
};

const getSectionSettings = (section: unknown) => {
  if (!section || typeof section !== "object" || Array.isArray(section)) {
    return undefined;
  }

  return (section as { settings?: Record<string, unknown> }).settings;
};

describe("generated storefront theme pages", () => {
  it("fills commerce and trust routes for thin catalog themes", () => {
    const rawTheme = cloneStorefrontTheme(STOREFRONT_THEME_PRESETS["electronics-demo"]!);
    const generatedPages = getGeneratedStorefrontThemePages(rawTheme);
    const normalizedTheme = getStorefrontThemePreset("electronics-demo");

    expect(Object.keys(generatedPages)).toEqual(
      expect.arrayContaining([
        "collections",
        "sale",
        "thank-you",
      ]),
    );

    expect(normalizedTheme.pages.collections).toBeTruthy();
    expect(normalizedTheme.pages.sale).toBeTruthy();
    expect(normalizedTheme.pages["thank-you"]).toBeTruthy();

    expect(normalizedTheme.pages.collections?.sections.map(getSectionType)).toEqual([
      "featured-collections",
      "product-grid",
    ]);
    expect(normalizedTheme.pages.sale?.sections.map(getSectionType)).toEqual([
      "promo-strip",
      "offer-bento",
      "product-grid",
    ]);
    expect(normalizedTheme.pages["thank-you"]?.sections.map(getSectionType)).toContain(
      "order-confirmation",
    );
    expect(
      getSectionSettings(normalizedTheme.pages.sale?.sections[2])?.saleOnly,
    ).toBe(true);
    expect(normalizedTheme.pages["thank-you"]?.sections[0]).toEqual(
      expect.objectContaining({
        type: "order-confirmation",
        variant: "command-aftercare",
      }),
    );
  });

  it("strengthens electronics-demo commerce pages with richer tech-specific sections", () => {
    const normalizedTheme = getStorefrontThemePreset("electronics-demo");

    expect(normalizedTheme.pages.shop?.sections.map(getSectionType)).toEqual([
      "hero-banner",
      "shopping-intents",
      "shop-command-bar",
      "filters-sidebar",
      "product-grid",
      "shop-promo-rail",
    ]);
    expect(normalizedTheme.pages.pdp?.sections.map(getSectionType)).toEqual([
      "product-gallery",
      "product-info",
      "bought-together",
      "reviews",
      "related-products",
    ]);
    expect(normalizedTheme.pages.cart?.sections.map(getSectionType)).toEqual([
      "cart-items",
      "order-summary",
    ]);
    expect(normalizedTheme.pages.cart?.sections[0]).toEqual(
      expect.objectContaining({
        type: "cart-items",
        variant: "command-cart",
      }),
    );
    expect(normalizedTheme.pages.checkout?.sections.map(getSectionType)).toEqual([
      "promo-strip",
      "cart-items",
      "checkout-form",
      "payment",
      "order-summary",
    ]);
    expect(
      getSectionSettings(normalizedTheme.pages.checkout?.sections[3])?.showSummaryCard,
    ).toBe(false);
    expect(normalizedTheme.pages["thank-you"]?.sections[0]).toEqual(
      expect.objectContaining({
        type: "order-confirmation",
        variant: "command-aftercare",
      }),
    );
  });

  it("keeps every Elessi pack theme covered with generated support pages", () => {
    ELESSI_PACK_THEME_IDS.forEach((themeId) => {
      const rawTheme = cloneStorefrontTheme(STOREFRONT_THEME_PRESETS[themeId]!);
      const generatedPages = Object.keys(getGeneratedStorefrontThemePages(rawTheme));
      const theme = getStorefrontThemePreset(themeId);

      expect(theme.pages.collections).toBeTruthy();
      expect(theme.pages.sale).toBeTruthy();
      expect(theme.pages["thank-you"]).toBeTruthy();
      generatedPages.forEach((pageKey) => {
        expect(theme.pages[pageKey]).toBeTruthy();
      });
    });
  });

  it("covers pharmacy support routes for max-care-go", () => {
    const rawTheme = cloneStorefrontTheme(STOREFRONT_THEME_PRESETS["max-care-go"]!);
    const generatedPages = getGeneratedStorefrontThemePages(rawTheme);
    const normalizedTheme = getStorefrontThemePreset("max-care-go");

    expect(Object.keys(generatedPages)).toEqual(
      expect.arrayContaining([
        "prescription",
        "rx",
        "shipping",
        "privacy",
        "terms",
      ]),
    );

    expect(normalizedTheme.pages.prescription?.sections.map(getSectionType)).toEqual([
      "promo-strip",
      "info-content",
    ]);
    expect(normalizedTheme.pages.rx?.sections.map(getSectionType)).toEqual([
      "promo-strip",
      "info-content",
    ]);
    expect(
      getSectionSettings(
        normalizedTheme.pages.checkout?.sections.find(
          (section) => getSectionType(section) === "payment",
        ),
      )?.showSummaryCard,
    ).toBe(false);
  });

  it("preserves manual theme-owned page definitions", () => {
    const rawTheme = cloneStorefrontTheme(STOREFRONT_THEME_PRESETS["modern-minimal"]!);
    const normalizedTheme = getStorefrontThemePreset("modern-minimal");
    const rawThankYou = rawTheme.pages["thank-you"]?.sections[0];
    const normalizedThankYou = normalizedTheme.pages["thank-you"]?.sections[0];

    expect(getGeneratedStorefrontThemePages(rawTheme)).toEqual({});
    expect(normalizedTheme.pages.collections).toEqual(rawTheme.pages.collections);
    expect(normalizedTheme.pages.sale).toEqual(rawTheme.pages.sale);
    expect(getSectionType(normalizedThankYou)).toBe(getSectionType(rawThankYou));
    expect(getSectionSettings(normalizedThankYou)?.title).toBe(
      getSectionSettings(rawThankYou)?.title,
    );
    expect(getSectionSettings(normalizedThankYou)?.description).toBe(
      getSectionSettings(rawThankYou)?.description,
    );
  });

  it("keeps Elegant Luxe fully manual with no generated support-page fallback", () => {
    const rawTheme = cloneStorefrontTheme(STOREFRONT_THEME_PRESETS["elegant-luxe"]!);
    const normalizedTheme = getStorefrontThemePreset("elegant-luxe");
    const serializedPages = JSON.stringify(normalizedTheme.pages);
    const rejectedImageIds = [
      "1515886657613-9f3515b0c78f",
      "1529139574466-a303027c1d8b",
      "1512436991641-6745cdb1723f",
      "1521572267360-ee0c2909d518",
    ];

    expect(getGeneratedStorefrontThemePages(rawTheme)).toEqual({});
    expect(normalizedTheme.pages.collections?.pageGoal).toBe("discovery");
    expect(normalizedTheme.pages.sale?.pageGoal).toBe("conversion");
    expect(normalizedTheme.pages.lookbook?.pageGoal).toBe("discovery");
    expect(normalizedTheme.pages["size-guide"]?.sections.map(getSectionType)).toEqual([
      "size-guide",
    ]);
    expect(normalizedTheme.pages.shipping?.sections.map(getSectionType)).toEqual([
      "info-content",
    ]);
    expect(normalizedTheme.pages.returns?.sections.map(getSectionType)).toEqual([
      "info-content",
    ]);
    expect(normalizedTheme.pages.contact?.sections.map(getSectionType)).toEqual([
      "info-content",
    ]);
    expect(normalizedTheme.pages.privacy?.sections.map(getSectionType)).toEqual([
      "info-content",
    ]);
    expect(normalizedTheme.pages.terms?.sections.map(getSectionType)).toEqual([
      "info-content",
    ]);
    expect(normalizedTheme.pages["thank-you"]?.sections[0]).toEqual(
      expect.objectContaining({
        type: "order-confirmation",
        variant: "boutique-aftercare",
      }),
    );
    rejectedImageIds.forEach((imageId) => {
      expect(serializedPages).not.toContain(imageId);
    });
  });

  it("covers multi-segment linked routes through generated page keys", () => {
    const linkedPages = collectStorefrontThemeLinkedPageReferences(
      STOREFRONT_THEME_PRESETS["airlume-ai"]!,
    );
    const normalizedTheme = getStorefrontThemePreset("airlume-ai");

    expect(linkedPages).toContainEqual(
      expect.objectContaining({
        slug: "auth/login",
        to: "/auth/login",
        supportedByDynamicPage: true,
      }),
    );
    expect(normalizedTheme.pages["auth/login"]).toBeTruthy();
  });
});
