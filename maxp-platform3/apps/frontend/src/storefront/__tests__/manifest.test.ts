import { describe, expect, it } from "vitest";
import {
  getStorefrontSectionComponentKey,
  getStorefrontSectionLabel,
  isStorefrontSectionAllowedOnPage,
  isStorefrontSectionKnown,
} from "../sections/manifest";

describe("storefront section manifest", () => {
  it("resolves legacy section aliases to their canonical component keys", () => {
    expect(getStorefrontSectionComponentKey("shop-hero")).toBe("hero-banner");
    expect(getStorefrontSectionComponentKey("shop-product-grid")).toBe(
      "product-grid",
    );
  });

  it("knows modern shared sections that are used by theme presets", () => {
    expect(isStorefrontSectionKnown("hero-sidebar")).toBe(true);
    expect(isStorefrontSectionKnown("tech-grid")).toBe(true);
    expect(isStorefrontSectionKnown("story-parallax")).toBe(true);
    expect(isStorefrontSectionKnown("pdp-checkout")).toBe(true);
    expect(isStorefrontSectionKnown("quantity-offers")).toBe(true);
    expect(getStorefrontSectionLabel("hero-sidebar")).toBe("بنر مع شريط جانبي");
  });

  it("enforces page scoping only for sections that declare it", () => {
    expect(isStorefrontSectionAllowedOnPage("product-gallery", "pdp")).toBe(true);
    expect(isStorefrontSectionAllowedOnPage("pdp-checkout", "pdp")).toBe(true);
    expect(isStorefrontSectionAllowedOnPage("quantity-offers", "pdp")).toBe(true);
    expect(isStorefrontSectionAllowedOnPage("quantity-offers", "checkout")).toBe(false);
    expect(isStorefrontSectionAllowedOnPage("pdp-checkout", "checkout")).toBe(false);
    expect(isStorefrontSectionAllowedOnPage("product-gallery", "cart")).toBe(false);
    expect(isStorefrontSectionAllowedOnPage("newsletter", "about-us")).toBe(true);
  });
});
