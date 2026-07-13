// @vitest-environment jsdom

import { describe, expect, it } from "vitest";

import { buildProductPageConversionSummaryItems } from "../productPageConversionSummaryItems";

describe("buildProductPageConversionSummaryItems", () => {
  it("maps product-page conversion modules into summary rows", () => {
    const items = buildProductPageConversionSummaryItems(
      {
        soldCounter: true,
        purchaseFomo: false,
        estimatedDelivery: true,
        stickyAddToCart: true,
      },
      true,
    );

    expect(items.find((item) => item.key === "soldCounter")?.enabled).toBe(true);
    expect(items.find((item) => item.key === "purchaseFomo")?.enabled).toBe(false);
    expect(items.find((item) => item.key === "estimatedDelivery")?.enabled).toBe(true);
    expect(items.find((item) => item.key === "stickyAddToCart")?.enabled).toBe(true);
  });

  it("turns all rows off when the app itself is not enabled", () => {
    const items = buildProductPageConversionSummaryItems(
      {
        soldCounter: true,
        purchaseFomo: true,
        estimatedDelivery: true,
        stickyAddToCart: true,
      },
      false,
    );

    expect(items.every((item) => item.enabled === false)).toBe(true);
  });
});
