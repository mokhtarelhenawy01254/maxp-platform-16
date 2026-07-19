// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import { getMarketplacePreviewCartItems } from "../marketplacePreviewCart";

describe("marketplacePreviewCart", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/");
  });

  it("builds a legacy-matched seeded cart for vela-fashion-eg", () => {
    const legacyItems = getMarketplacePreviewCartItems("legacy-default-old");
    const items = getMarketplacePreviewCartItems("vela-fashion-eg");

    expect(items).toHaveLength(3);
    expect(items.map((item) => item.productId)).toEqual(
      legacyItems.map((item) => item.productId),
    );
    expect(items.every((item) => Number(item.price) > 0)).toBe(true);
  });

  it("builds a non-empty seeded cart for fastly-eg", () => {
    const legacyItems = getMarketplacePreviewCartItems("legacy-default-old");
    const items = getMarketplacePreviewCartItems("fastly-eg");

    expect(items).toHaveLength(3);
    expect(items.map((item) => item.productId)).toEqual(
      legacyItems.map((item) => item.productId),
    );
    expect(items.every((item) => Number(item.price) > 0)).toBe(true);
  });
});
