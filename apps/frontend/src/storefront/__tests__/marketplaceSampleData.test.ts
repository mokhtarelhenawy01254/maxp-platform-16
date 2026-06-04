import { describe, expect, it } from "vitest";

import { getMarketplacePreviewProducts } from "../preview/marketplaceSampleData";

describe("marketplaceSampleData", () => {
  it("keeps Solea Femme marketplace preview shoes-first and image-aligned", () => {
    const preview = getMarketplacePreviewProducts({ limit: 20 }, "solea-femme");

    expect(preview).toBeTruthy();

    const products = preview?.data || [];
    const categoryIds = products.map((product) => product.categoryId);
    const categoryLeadImages = {
      sneakers: products.find((product) => product.categoryId === "daily-sneakers")
        ?.mainImage,
      flats: products.find((product) => product.categoryId === "soft-flats")
        ?.mainImage,
      heels: products.find((product) => product.categoryId === "evening-heels")
        ?.mainImage,
      sandals: products.find((product) => product.categoryId === "open-sandals")
        ?.mainImage,
    };

    expect(products).toHaveLength(5);
    expect(categoryIds).not.toContain("bags-accessories");
    expect(categoryIds).toEqual(
      expect.arrayContaining([
        "daily-sneakers",
        "soft-flats",
        "evening-heels",
        "open-sandals",
      ]),
    );
    expect(Object.values(categoryLeadImages).every(Boolean)).toBe(true);
    expect(new Set(Object.values(categoryLeadImages)).size).toBe(4);
  });
});
