// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";

import {
  ELESSI_PACK_MARKETPLACE_THEME_IDS,
} from "../elessiPackMarketplaceData";
import { getMarketplacePreviewCartItems } from "../marketplacePreviewCart";
import {
  createMarketplacePreviewOrderResponse,
  getMarketplacePreviewPurchaseTracking,
  getMarketplacePreviewTrackedOrder,
} from "../marketplacePreviewOrder";
import {
  getMarketplacePreviewCategories,
  getMarketplacePreviewProductReviews,
  getMarketplacePreviewProducts,
  getMarketplacePreviewRecommendations,
  hasMarketplacePreviewDataset,
  resolveMarketplacePreviewThemeId,
} from "../marketplaceSampleData";

describe("Elessi pack marketplace preview data", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/");
    window.sessionStorage.clear();
  });

  it("exposes complete marketplace datasets for every Elessi theme", () => {
    ELESSI_PACK_MARKETPLACE_THEME_IDS.forEach((themeId) => {
      window.history.replaceState(
        {},
        "",
        `/?previewTheme=${themeId}&previewSource=marketplace`,
      );

      expect(resolveMarketplacePreviewThemeId()).toBe(themeId);
      expect(hasMarketplacePreviewDataset(themeId)).toBe(true);

      const products = getMarketplacePreviewProducts({ limit: 24 })?.data || [];
      const firstProduct = products[0];

      expect(products.length).toBeGreaterThanOrEqual(6);
      expect(firstProduct?.images).toHaveLength(4);
      expect((firstProduct?.productVariants || []).length).toBeGreaterThan(0);
      expect((getMarketplacePreviewCategories() || []).length).toBeGreaterThanOrEqual(4);
      expect(
        getMarketplacePreviewRecommendations(firstProduct?.id || "", "related")?.length,
      ).toBeGreaterThanOrEqual(3);
      expect(
        getMarketplacePreviewRecommendations(
          firstProduct?.id || "",
          "boughtTogether",
        )?.length,
      ).toBeGreaterThanOrEqual(2);

      const reviews = getMarketplacePreviewProductReviews(firstProduct?.id || "");
      expect(reviews?.totalCount).toBeGreaterThanOrEqual(2);
      expect(reviews?.averageRating).toBeGreaterThan(4);
    });
  });

  it("hydrates seeded carts and tracked orders for every Elessi theme", () => {
    ELESSI_PACK_MARKETPLACE_THEME_IDS.forEach((themeId) => {
      window.history.replaceState(
        {},
        "",
        `/?previewTheme=${themeId}&previewSource=marketplace`,
      );

      const cartItems = getMarketplacePreviewCartItems();
      const purchaseTracking = getMarketplacePreviewPurchaseTracking();
      const trackedOrder = getMarketplacePreviewTrackedOrder();

      expect(cartItems).toHaveLength(3);
      expect(purchaseTracking?.items).toHaveLength(3);
      expect(trackedOrder?.items).toHaveLength(3);
      expect(purchaseTracking?.orderNumber).toMatch(/^[A-Z]{3}-2048$/);
      expect(trackedOrder?.orderNumber).toMatch(/^[A-Z]{3}-2048$/);
      expect(trackedOrder?.finalTotal).toBeGreaterThan(0);
    });
  });

  it("creates preview checkout orders for every Elessi theme without backend calls", () => {
    ELESSI_PACK_MARKETPLACE_THEME_IDS.forEach((themeId) => {
      window.history.replaceState(
        {},
        "",
        `/checkout?previewTheme=${themeId}&previewSource=marketplace`,
      );

      const response = createMarketplacePreviewOrderResponse({}, themeId);

      expect(response?.success).toBe(true);
      expect(response?.data?.preview).toBe(true);
      expect(response?.data?.items.length).toBe(3);
      expect(response?.data?.orderNumber).toMatch(/^[A-Z]{3}-\d{8}$/);
    });
  });
});
