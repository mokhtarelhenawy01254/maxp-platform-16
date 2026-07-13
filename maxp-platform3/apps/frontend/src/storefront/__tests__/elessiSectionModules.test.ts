// @vitest-environment jsdom

import { describe, expect, it } from "vitest";

import * as FeaturedCollectionsModule from "../sections/FeaturedCollections";
import * as HeroBannerModule from "../sections/HeroBanner";
import * as ProductGalleryModule from "../sections/ProductGallery";
import * as ProductGridModule from "../sections/ProductGrid";
import * as ProductInfoModule from "../sections/ProductInfo";
import * as RelatedProductsModule from "../sections/RelatedProducts";
import * as ReviewsSectionModule from "../sections/ReviewsSection";
import * as ShopCommandBarModule from "../sections/ShopCommandBar";

describe("Elessi section modules", () => {
  it("loads the section modules touched by the Elessi pack without import-time failures", () => {
    expect(HeroBannerModule).toBeTruthy();
    expect(FeaturedCollectionsModule).toBeTruthy();
    expect(ShopCommandBarModule).toBeTruthy();
    expect(ProductGridModule).toBeTruthy();
    expect(ProductGalleryModule).toBeTruthy();
    expect(ProductInfoModule).toBeTruthy();
    expect(RelatedProductsModule).toBeTruthy();
    expect(ReviewsSectionModule).toBeTruthy();
  });
});
