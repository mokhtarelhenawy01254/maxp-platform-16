// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import {
  buildStorefrontQaPackLinks,
  buildStorefrontQaPackMarkdown,
  buildStorefrontQaWalkthrough,
} from "../utils/previewWalkthrough";

const installMockStorage = () => {
  let store: Record<string, string> = {};
  const storage = {
    getItem: (key: string) => (key in store ? store[key] : null),
    setItem: (key: string, value: string) => {
      store[key] = String(value);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };

  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: storage,
  });
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: storage,
  });
};

describe("buildStorefrontQaWalkthrough", () => {
  installMockStorage();

  it("builds an ordered QA walkthrough with shared preview params", () => {
    const steps = buildStorefrontQaWalkthrough({
      customDomain: "preview.example.com",
      previewTheme: "solea-femme",
      previewSource: "settings",
      availablePageKeys: [
        "home",
        "shop",
        "sale",
        "collections",
        "lookbook",
        "size-guide",
        "pdp",
        "cart",
        "checkout",
      ],
      categoryId: "heels",
      sortValue: "price-desc",
      priceRangeValue: "50-100",
      productSlugOrId: "crystal-heel",
    });

    expect(steps.map((step) => step.id)).toEqual([
      "home",
      "shop",
      "sale",
      "collections",
      "lookbook",
      "size-guide",
      "pdp",
      "cart",
      "checkout",
    ]);

    expect(steps.find((step) => step.id === "shop")?.href).toBe(
      "https://preview.example.com/shop?category=heels&sortBy=price&sortOrder=desc&minPrice=50&maxPrice=100&previewTheme=solea-femme&previewSource=settings",
    );
    expect(steps.find((step) => step.id === "pdp")?.href).toBe(
      "https://preview.example.com/product/crystal-heel?previewTheme=solea-femme&previewSource=settings",
    );
  });

  it("skips unavailable pages and product walkthrough when pdp context is missing", () => {
    const steps = buildStorefrontQaWalkthrough({
      companySlug: "cmp_1",
      availablePageKeys: ["home", "shop", "cart", "checkout"],
    });

    expect(steps.map((step) => step.id)).toEqual([
      "home",
      "shop",
      "cart",
      "checkout",
    ]);
  });

  it("formats walkthrough steps as shareable links and markdown", () => {
    const steps = buildStorefrontQaWalkthrough({
      customDomain: "preview.example.com",
      previewTheme: "solea-femme",
      previewSource: "settings",
      availablePageKeys: ["home", "shop", "checkout"],
      categoryId: "heels",
      sortValue: "price-desc",
    });

    expect(buildStorefrontQaPackLinks(steps)).toContain(
      "1. الرئيسية: https://preview.example.com/?previewTheme=solea-femme&previewSource=settings",
    );

    const markdown = buildStorefrontQaPackMarkdown({
      themeName: "Solea Femme",
      themeId: "solea-femme",
      storeName: "Demo Store",
      generatedAt: "2026-03-26 06:15",
      steps,
    });

    expect(markdown).toContain("# Solea Femme - solea-femme");
    expect(markdown).toContain("- Store: Demo Store");
    expect(markdown).toContain("## 2. المتجر");
    expect(markdown).toContain("Checkpoint: راجعي الفلاتر والشبكة وعرض التصنيف المختار.");
  });

  it("builds local QA walkthrough links through the /store namespace when companyId is available", () => {
    const steps = buildStorefrontQaWalkthrough({
      companyId: "cmp_1",
      companySlug: "merchant-preview",
      previewTheme: "solea-femme",
      previewSource: "settings",
      availablePageKeys: ["home", "shop"],
      categoryId: "heels",
    });

    const homeStep = steps.find((step) => step.id === "home");
    const shopStep = steps.find((step) => step.id === "shop");

    expect(homeStep?.href).toContain("/store?");
    expect(homeStep?.href).toContain("companyId=cmp_1");
    expect(homeStep?.href).toContain("previewTheme=solea-femme");
    expect(shopStep?.href).toContain("/store/shop?");
    expect(shopStep?.href).toContain("category=heels");
  });
});
