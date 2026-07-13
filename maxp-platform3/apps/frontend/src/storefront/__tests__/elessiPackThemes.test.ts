import { describe, expect, it } from "vitest";

import { getStorefrontThemePreset, STOREFRONT_THEME_PRESETS } from "../themes";
import { ELESSI_PACK_THEME_IDS } from "../themes/elessiPack";

const getSectionVariant = (section: unknown) => {
  if (!section || typeof section !== "object" || Array.isArray(section)) {
    return null;
  }

  return typeof (section as { variant?: unknown }).variant === "string"
    ? ((section as { variant?: string }).variant ?? null)
    : null;
};

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

describe("Elessi pack themes", () => {
  it("registers all 10 Elessi themes in the storefront preset registry", () => {
    expect(ELESSI_PACK_THEME_IDS).toHaveLength(10);

    ELESSI_PACK_THEME_IDS.forEach((themeId) => {
      expect(STOREFRONT_THEME_PRESETS[themeId]).toBeTruthy();
    });
  });

  it("keeps the Elessi theme pack wired to Elessi-only home, shop, and PDP variants", () => {
    ELESSI_PACK_THEME_IDS.forEach((themeId) => {
      const theme = getStorefrontThemePreset(themeId);
      const homeSections = theme.pages.home.sections;
      const shopSections = theme.pages.shop.sections;
      const pdpSections = theme.pages.pdp.sections;

      homeSections.forEach((section) => {
        const sectionType = getSectionType(section);
        const variant = getSectionVariant(section);

        if (
          sectionType === "hero-banner" ||
          sectionType === "featured-collections" ||
          sectionType === "featured-products"
        ) {
          expect(variant?.startsWith("elessi-")).toBe(true);
        }
      });

      shopSections.forEach((section) => {
        const sectionType = getSectionType(section);
        const variant = getSectionVariant(section);

        if (sectionType === "shop-command-bar" || sectionType === "product-grid") {
          expect(variant?.startsWith("elessi-")).toBe(true);
        }
      });

      pdpSections.forEach((section) => {
        const sectionType = getSectionType(section);
        const variant = getSectionVariant(section);

        if (
          sectionType === "product-gallery" ||
          sectionType === "product-info" ||
          sectionType === "related-products" ||
          sectionType === "reviews"
        ) {
          expect(variant?.startsWith("elessi-")).toBe(true);
        }
      });
    });
  });
});
