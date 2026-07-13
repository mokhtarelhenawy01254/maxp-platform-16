import { describe, expect, it } from "vitest";
import { STOREFRONT_THEME_PRESETS } from "../themes";
import {
  StorefrontPageConfig,
  StorefrontSectionConfig,
  StorefrontTheme,
} from "../types/theme.types";
import {
  buildStorefrontThemePresetCatalog,
  normalizeStorefrontThemeCatalogItem,
  normalizeStorefrontThemeCatalogItems,
  StorefrontThemeCatalogItem,
} from "../themes/catalog";

type ThemeCatalogPayload = Partial<StorefrontThemeCatalogItem> &
  Record<string, unknown>;

const getThemePreset = (themeId: string): StorefrontTheme =>
  STOREFRONT_THEME_PRESETS[themeId];

const getPageSections = (
  page?: StorefrontPageConfig,
): Array<string | StorefrontSectionConfig> => page?.sections ?? [];

const isSectionConfig = (
  section: string | StorefrontSectionConfig | undefined,
): section is StorefrontSectionConfig =>
  Boolean(section) && typeof section !== "string";

const findSection = (
  sections: Array<string | StorefrontSectionConfig>,
  sectionType: string,
) =>
  sections.find(
    (section): section is StorefrontSectionConfig =>
      isSectionConfig(section) && section.type === sectionType,
  );

describe("storefront theme catalog", () => {
  it("builds a preset catalog from local theme registrations", () => {
    const fallback = buildStorefrontThemePresetCatalog("bold-fashion");

    expect(fallback.length).toBeGreaterThan(0);
    expect(fallback.some((item) => item.themeId === "bold-fashion")).toBe(true);
    expect(
      fallback.find((item) => item.themeId === "bold-fashion")?.isCurrentTheme,
    ).toBe(true);
    expect(
      fallback.find((item) => item.themeId === "bold-fashion")?.canSelect,
    ).toBe(true);
    expect(
      fallback.find((item) => item.themeId === "modern-minimal")?.canSelect,
    ).toBe(false);
    expect(
      fallback.find((item) => item.themeId === "smart-bazaar")?.preview
        .imageUrl,
    ).toBe("/assets/themes/smart-bazaar/preview.png");
    expect(fallback.some((item) => item.themeId === "pc-hub-eg")).toBe(true);
    expect(fallback.some((item) => item.themeId === "hayah-modest-eg")).toBe(
      true,
    );
    expect(fallback.some((item) => item.themeId === "rihla-resort-eg")).toBe(
      true,
    );
    expect(fallback.some((item) => item.themeId === "layali-edit-eg")).toBe(
      true,
    );
    expect(fallback.some((item) => item.themeId === "legacy-default-old")).toBe(
      true,
    );
    expect(
      fallback.find((item) => item.themeId === "solea-femme")?.category
        .secondary.id,
    ).toBe("womens-shoes");
    expect(fallback.some((item) => item.themeId === "max-care-go")).toBe(true);
    expect(
      fallback.find((item) => item.themeId === "butcher-counter-eg")?.category
        .secondary.id,
    ).toBe("butcher-shop");
  });

  it("prefers non-vector preview images for preset marketplace cards", () => {
    const fallback = buildStorefrontThemePresetCatalog("bold-fashion");

    fallback.forEach((item) => {
      expect(item.preview.imageUrl, item.themeId).toBeTruthy();
      expect(item.preview.imageUrl, item.themeId).not.toMatch(
        /\.svg(?:[?#].*)?$/i,
      );
    });
  });

  it("keeps preset marketplace card previews off placeholder assets", () => {
    const fallback = buildStorefrontThemePresetCatalog("bold-fashion");

    fallback.forEach((item) => {
      expect(item.preview.imageUrl, item.themeId).not.toContain(
        "/placeholders/",
      );
    });
  });

  it("promotes reviewed marketplace cards to stronger photo previews", () => {
    const fallback = buildStorefrontThemePresetCatalog("bold-fashion");
    const expectedPreviewImages: Record<string, string> = {
      "atelier-nova": "/assets/themes/atelier-nova/preview.png",
      "restaurant-demo":
        "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&q=80&w=1600",
      "butcher-counter-eg":
        "https://images.unsplash.com/photo-1777799095908-978e9f70a872?auto=format&fit=crop&w=1600&q=80",
      "max-care-go":
        "https://images.unsplash.com/photo-1584017911766-d451b3d0e843?auto=format&fit=crop&w=1200&q=80",
      "furniture-demo":
        "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=2000",
      "electronics-demo":
        "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?auto=format&fit=crop&q=80&w=2070",
      "cafe-demo":
        "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=2000",
      "menswear-prime":
        "https://images.unsplash.com/photo-1593030761757-71fae45fa0e7?q=80&w=2000&auto=format&fit=crop",
      "fresh-cart": "/assets/themes/elessi-harvest-fold/hero-market.jpg",
      opulence: "/assets/themes/elessi-gem-atelier/jewelry-box-assortment.jpg",
      "skill-lab": "/assets/themes/pc-hub-eg/workbook-14-air.jpg",
      "turbo-parts": "/assets/themes/elessi-garage-fit/engine-bay.jpg",
      "zen-organic":
        "https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?auto=format&fit=crop&q=80&w=1400",
    };

    Object.entries(expectedPreviewImages).forEach(
      ([themeId, expectedImage]) => {
        expect(
          fallback.find((item) => item.themeId === themeId)?.preview.imageUrl,
        ).toBe(expectedImage);
      },
    );
  });

  it("keeps reviewed fashion theme descriptions tied to the right store category", () => {
    const fallback = buildStorefrontThemePresetCatalog("aura-chic");

    expect(
      fallback.find((item) => item.themeId === "aura-chic")?.description,
    ).toContain("إكسسوارات");
    expect(
      fallback.find((item) => item.themeId === "atelier-nova")?.description,
    ).toContain("بوتيك");
    expect(
      fallback.find((item) => item.themeId === "fakhama-elite")?.description,
    ).toContain("فاخرة");
    expect(
      fallback.find((item) => item.themeId === "mystic-desert")?.description,
    ).toContain("تراثية");
    expect(
      fallback.find((item) => item.themeId === "menswear-prime")?.description,
    ).toContain("رجالية");
    expect(
      fallback.find((item) => item.themeId === "cairo-stride")?.description,
    ).toContain("أحذية رجالية");
    expect(
      fallback.find((item) => item.themeId === "pc-hub-eg")?.description,
    ).toContain("كمبيوتر");
  });

  it("registers Atelier Nova with a gallery-led boutique direction", () => {
    const fallback = buildStorefrontThemePresetCatalog("atelier-nova");
    const atelier = fallback.find((item) => item.themeId === "atelier-nova");
    const preset = getThemePreset("atelier-nova");
    const homeSections = getPageSections(preset.pages.home);
    const shopSections = getPageSections(preset.pages.shop);
    const pdpSections = getPageSections(preset.pages.pdp);

    expect(atelier).toBeTruthy();
    expect(atelier?.category.secondary.id).toBe("womens-fashion");
    expect(atelier?.description).toContain("غاليري");
    expect(atelier?.preview.imageUrl).toBe(
      "/assets/themes/atelier-nova/preview.png",
    );
    expect(preset.header?.variant).toBe("fashion-retail");
    expect(findSection(homeSections, "hero-banner")?.variant).toBe(
      "style-ledger",
    );
    expect(findSection(shopSections, "shop-command-bar")?.variant).toBe(
      "minimal-toolbar",
    );
    expect(findSection(pdpSections, "product-info")?.variant).toBe(
      "style-ledger",
    );
  });

  it("registers the Closet OS preset with a capsule-wardrobe planner direction", () => {
    const fallback = buildStorefrontThemePresetCatalog("closet-os");
    const closetOs = fallback.find((item) => item.themeId === "closet-os");
    const preset = getThemePreset("closet-os");
    const homeSections = getPageSections(preset.pages.home);

    expect(closetOs).toBeTruthy();
    expect(closetOs?.category.secondary.id).toBe("capsule-wardrobe");
    expect(closetOs?.description).toContain("خزانة أسبوعية");
    expect(closetOs?.preview.imageUrl).toBe(
      "/assets/themes/closet-os/preview.jpg",
    );
    expect(preset.header?.brandName).toContain("Closet OS");
    expect(findSection(homeSections, "hero-banner")?.variant).toBe(
      "wardrobe-planner",
    );
    expect(findSection(homeSections, "featured-products")?.variant).toBe(
      "minimal-card",
    );
  });

  it("registers the Hayah modestwear preset with the layer-first hero direction", () => {
    const fallback = buildStorefrontThemePresetCatalog("hayah-modest-eg");
    const hayah = fallback.find((item) => item.themeId === "hayah-modest-eg");
    const preset = getThemePreset("hayah-modest-eg");
    const homeSections = getPageSections(preset.pages.home);

    expect(hayah).toBeTruthy();
    expect(hayah?.category.secondary.id).toBe("modest-fashion");
    expect(hayah?.description).toContain("محتشمة");
    expect(hayah?.preview.imageUrl).toBe(
      "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&q=80&w=1400",
    );
    expect(preset.header?.brandName).toContain("حياة");
    expect(findSection(homeSections, "hero-banner")?.variant).toBe(
      "modest-cascade",
    );
    expect(findSection(homeSections, "offer-bento")?.variant).toBe(
      "bundle-matrix",
    );
  });

  it("registers the butcher counter preset with fresh-cut commerce sections", () => {
    const fallback = buildStorefrontThemePresetCatalog("butcher-counter-eg");
    const butcher = fallback.find(
      (item) => item.themeId === "butcher-counter-eg",
    );
    const preset = getThemePreset("butcher-counter-eg");
    const homeSections = getPageSections(preset.pages.home);
    const shopSections = getPageSections(preset.pages.shop);
    const pdpSections = getPageSections(preset.pages.pdp);

    expect(butcher).toBeTruthy();
    expect(butcher?.category.primary.id).toBe("food");
    expect(butcher?.category.secondary.id).toBe("butcher-shop");
    expect(butcher?.description).toContain("Premium");
    expect(butcher?.preview.imageUrl).toBe(
      "https://images.unsplash.com/photo-1777799095908-978e9f70a872?auto=format&fit=crop&w=1600&q=80",
    );
    expect(preset.header?.variant).toBe("butcher-atelier");
    expect(findSection(homeSections, "hero-banner")?.variant).toBe(
      "butcher-atelier",
    );
    expect(findSection(homeSections, "features-bar")?.variant).toBe(
      "butcher-proof-board",
    );
    expect(findSection(homeSections, "featured-collections")?.variant).toBe(
      "butcher-cut-map",
    );
    expect(findSection(homeSections, "product-grid")?.variant).toBe(
      "butcher-atelier-grid",
    );
    expect(findSection(shopSections, "shop-command-bar")?.variant).toBe(
      "butcher-cut-console",
    );
    expect(findSection(shopSections, "product-grid")?.variant).toBe(
      "butcher-atelier-grid",
    );
    expect(findSection(pdpSections, "product-info")?.settings?.fitNote).toContain(
      "طريقة التقطيع",
    );
  });

  it("registers the KHEMET LUXE preset with an editorial women-shoe direction", () => {
    const fallback = buildStorefrontThemePresetCatalog("khemet-luxe-eg");
    const khemet = fallback.find((item) => item.themeId === "khemet-luxe-eg");
    const preset = getThemePreset("khemet-luxe-eg");
    const homeSections = getPageSections(preset.pages.home);
    const pdpSections = getPageSections(preset.pages.pdp);

    expect(khemet).toBeTruthy();
    expect(khemet?.category.secondary.id).toBe("womens-shoes");
    expect(khemet?.description).toContain("أحذية حريمي");
    expect(khemet?.description).toContain("فاخر");
    expect(khemet?.preview.imageUrl).toBe(
      "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&q=80&w=1400",
    );
    expect(preset.header?.variant).toBe("floating-dark");
    expect(preset.header?.transparentOnHome).toBe(true);
    expect(findSection(homeSections, "hero-banner")?.variant).toBe(
      "cinematic-plinth",
    );
    expect(findSection(homeSections, "featured-collections")?.variant).toBe(
      "gallery-columns",
    );
    expect(findSection(homeSections, "story-parallax")?.variant).toBe(
      "split-editorial",
    );
    expect(findSection(homeSections, "offer-bento")?.variant).toBe(
      "editorial-columns",
    );
    expect(findSection(homeSections, "featured-products")?.variant).toBe(
      "boutique-rail",
    );
    expect(findSection(homeSections, "features-bar")?.variant).toBe(
      "trust-strip",
    );
    expect(findSection(pdpSections, "product-gallery")?.variant).toBe(
      "elessi-showroom",
    );
    expect(findSection(pdpSections, "product-info")?.variant).toBe(
      "elessi-care-buybox",
    );
    expect(findSection(pdpSections, "reviews")?.variant).toBe(
      "elessi-story-grid",
    );
    expect(findSection(pdpSections, "related-products")?.variant).toBe(
      "elessi-complete-set",
    );
  });

  it("registers the Rihla Resort preset with the travel-postcards discovery direction", () => {
    const fallback = buildStorefrontThemePresetCatalog("rihla-resort-eg");
    const rihla = fallback.find((item) => item.themeId === "rihla-resort-eg");
    const preset = getThemePreset("rihla-resort-eg");
    const homeSections = getPageSections(preset.pages.home);
    const shopSections = getPageSections(preset.pages.shop);

    expect(rihla).toBeTruthy();
    expect(rihla?.category.secondary.id).toBe("resort-travelwear");
    expect(rihla?.description).toContain("سفر");
    expect(rihla?.preview.imageUrl).toBe(
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&q=80&w=1400",
    );
    expect(preset.header?.brandName).toContain("رحلة");
    expect(findSection(homeSections, "featured-collections")?.variant).toBe(
      "travel-postcards",
    );
    expect(findSection(shopSections, "featured-collections")?.variant).toBe(
      "travel-postcards",
    );
  });

  it("registers the Layali Edit preset with the occasion-planner shop direction", () => {
    const fallback = buildStorefrontThemePresetCatalog("layali-edit-eg");
    const layali = fallback.find((item) => item.themeId === "layali-edit-eg");
    const preset = getThemePreset("layali-edit-eg");
    const shopSections = getPageSections(preset.pages.shop);

    expect(layali).toBeTruthy();
    expect(layali?.category.secondary.id).toBe("occasion-eveningwear");
    expect(layali?.description).toContain("مناسبات");
    expect(layali?.preview.imageUrl).toBe(
      "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=80&w=1400",
    );
    expect(preset.header?.brandName).toContain("ليالي");
    expect(findSection(shopSections, "shop-command-bar")?.variant).toBe(
      "occasion-planner",
    );
    expect(findSection(shopSections, "featured-collections")?.variant).toBe(
      "occasion-ribbon",
    );
  });

  it("registers Solea Femme with a deeper shoes-first discovery shop route", () => {
    const fallback = buildStorefrontThemePresetCatalog("solea-femme");
    const solea = fallback.find((item) => item.themeId === "solea-femme");
    const preset = getThemePreset("solea-femme");
    const shopConfig = preset.pages.shop;
    const shopSections = getPageSections(shopConfig);
    const cartSections = getPageSections(preset.pages.cart);
    const pdpSections = getPageSections(preset.pages.pdp);
    const thankYouSections = getPageSections(preset.pages["thank-you"]);

    expect(solea).toBeTruthy();
    expect(solea?.category.secondary.id).toBe("womens-shoes");
    expect(shopConfig.layoutHint).toBe("commerce-3col");
    expect(findSection(shopSections, "shop-command-bar")?.variant).toBe(
      "fit-finder",
    );
    expect(findSection(shopSections, "featured-collections")?.variant).toBe(
      "occasion-ribbon",
    );
    expect(findSection(shopSections, "shop-promo-rail")?.variant).toBe(
      "stylist-rail",
    );
    expect(
      findSection(cartSections, "order-summary")?.settings?.assuranceItems,
    ).toEqual([
      "تغليف مرتب يحافظ على الحذاء حتى الاستلام",
      "تأكيد المقاس أو اللون قبل التجهيز عند الحاجة",
      "متابعة واضحة حتى الاستلام أو الاستبدال",
    ]);
    expect(findSection(pdpSections, "quantity-offers")?.variant).toBe(
      "selection-rail",
    );
    expect(findSection(pdpSections, "pdp-checkout")?.settings?.formVariant).toBe(
      "solea-femme",
    );
    expect(findSection(pdpSections, "trusted-badges")?.variant).toBe(
      "couture-minimal",
    );
    expect(findSection(pdpSections, "bought-together")?.variant).toBe(
      "pairing-rail",
    );
    expect(
      findSection(pdpSections, "bought-together")?.settings?.addBundleText,
    ).toBe("أضيفي التوليفة");
    expect(
      isSectionConfig(thankYouSections[0])
        ? thankYouSections[0].settings?.recommendedLimit
        : undefined,
    ).toBe(3);
  });

  it("registers the Legacy Default Old preset with collection-first watch routing", () => {
    const fallback = buildStorefrontThemePresetCatalog("legacy-default-old");
    const legacy = fallback.find(
      (item) => item.themeId === "legacy-default-old",
    );
    const preset = getThemePreset("legacy-default-old");
    const homeSections = getPageSections(preset.pages.home);

    expect(legacy).toBeTruthy();
    expect(legacy?.category.secondary.id).toBe("watches-accessories");
    expect(legacy?.description).toContain("EasyOrders");
    expect(legacy?.preview.imageUrl).toBe(
      "/assets/themes/legacy-default-old/preview.jpg",
    );
    expect(preset.header?.brandName).toContain("defalut-theme-old");
    expect(findSection(homeSections, "hero-banner")?.variant).toBe(
      "legacy-image-slider",
    );
    expect(findSection(homeSections, "featured-collections")?.variant).toBe(
      "legacy-circle-categories",
    );
    expect(findSection(homeSections, "product-grid")?.variant).toBe(
      "legacy-compact-listing",
    );
  });

  it("keeps the reviewed fashion preview themes branded and localized", () => {
    const presets = STOREFRONT_THEME_PRESETS;
    const previewBrandedThemes = [
      "aura-chic",
      "mystic-desert",
      "fakhama-elite",
      "elegant-luxe",
      "bold-fashion",
      "menswear-prime",
      "atelier-nova",
      "cairo-stride",
      "solea-femme",
      "modern-minimal",
    ];

    previewBrandedThemes.forEach((themeId) => {
      expect(presets[themeId]?.header?.brandName).toBeTruthy();
    });

    const menswearHero = findSection(
      getPageSections(presets["menswear-prime"]?.pages?.home),
      "hero-banner",
    );
    expect(menswearHero?.settings?.primaryCta).toBeUndefined();
    expect(menswearHero?.settings?.ctaText).toContain("ابدأ");
    expect(menswearHero?.settings?.secondaryCtaText).toContain("اللوك بوك");
  });

  it("normalizes partial API payloads against preset defaults", () => {
    const normalized = normalizeStorefrontThemeCatalogItem(
      {
        themeId: "elegant-luxe",
        name: "Elegant Luxe",
        description: "Luxury storefront",
        monthlyPrice: "299",
        pricingModel: "one_time",
        canPurchase: true,
        requiresPurchase: true,
        preview: {
          colors: ["32 51% 32%"],
          imageUrl: "/preview/custom.svg",
        },
        pageStats: {
          homeSections: 4,
        },
      } as ThemeCatalogPayload,
      "elegant-luxe",
    );

    expect(normalized.themeId).toBe("elegant-luxe");
    expect(normalized.pricingModel).toBe("ONE_TIME");
    expect(normalized.monthlyPrice).toBe(299);
    expect(normalized.canPurchase).toBe(true);
    expect(normalized.requiresPurchase).toBe(true);
    expect(normalized.preview.colors).toEqual(["32 51% 32%"]);
    expect(normalized.preview.imageUrl).toBe("/preview/custom.svg");
    expect(normalized.pageStats.homeSections).toBe(4);
    expect(normalized.pageStats.shopSections).toBeGreaterThan(0);
    expect(normalized.isCurrentTheme).toBe(true);
    expect(normalized.category.primary.id).toBe("fashion");
    expect(normalized.category.secondary.id).toBe("luxury-fashion");
  });

  it("normalizes ownership and activation state from the API payload", () => {
    const normalized = normalizeStorefrontThemeCatalogItem(
      {
        themeId: "modern-minimal",
        isOwned: true,
        canSelect: true,
        canActivate: false,
        canPurchase: false,
        requiresPurchase: false,
        requiresActivation: false,
        installationStatus: "trial",
        activePricingModel: "one_time",
        trialEndsAt: "2026-04-01T00:00:00.000Z",
      } as ThemeCatalogPayload,
      "bold-fashion",
    );

    expect(normalized.isOwned).toBe(true);
    expect(normalized.canSelect).toBe(true);
    expect(normalized.canActivate).toBe(false);
    expect(normalized.canPurchase).toBe(false);
    expect(normalized.requiresPurchase).toBe(false);
    expect(normalized.requiresActivation).toBe(false);
    expect(normalized.installationStatus).toBe("TRIAL");
    expect(normalized.activePricingModel).toBe("ONE_TIME");
    expect(normalized.trialEndsAt).toBe("2026-04-01T00:00:00.000Z");
  });

  it("does not inject a local preset card for unknown API theme ids", () => {
    const normalized = normalizeStorefrontThemeCatalogItem(
      {
        themeId: "orphan-theme",
      } as ThemeCatalogPayload,
      "bold-fashion",
    );

    expect(normalized.themeId).toBe("orphan-theme");
    expect(normalized.name).toBe("orphan-theme");
    expect(normalized.preview.imageUrl).toBe("");
    expect(normalized.pageStats.totalSections).toBe(0);
    expect(normalized.category.primary.id).toBe("general");
  });

  it("replaces stale local preview assets from the API with curated marketplace photos", () => {
    const cases = [
      {
        themeId: "fresh-cart",
        imageUrl: "/assets/themes/shop-orbit/preview.svg",
        expectedImageUrl: "/assets/themes/elessi-harvest-fold/hero-market.jpg",
      },
      {
        themeId: "bloom-studio",
        imageUrl: "/placeholders/rose-atelier/hero-soft-luxury.svg",
        expectedImageUrl:
          "https://images.unsplash.com/photo-1468327768560-75b778cbb551?auto=format&fit=crop&w=1400&q=80",
      },
      {
        themeId: "max-care-go",
        imageUrl: "/placeholders/pharmacy-preview.png",
        expectedImageUrl:
          "https://images.unsplash.com/photo-1584017911766-d451b3d0e843?auto=format&fit=crop&w=1200&q=80",
      },
      {
        themeId: "opulence",
        imageUrl: "/assets/themes/vanguard-premium/preview.svg",
        expectedImageUrl:
          "/assets/themes/elessi-gem-atelier/jewelry-box-assortment.jpg",
      },
      {
        themeId: "zen-organic",
        imageUrl: "/assets/themes/zen-organic/preview.svg",
        expectedImageUrl:
          "https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?auto=format&fit=crop&q=80&w=1400",
      },
    ];

    cases.forEach(({ themeId, imageUrl, expectedImageUrl }) => {
      const normalized = normalizeStorefrontThemeCatalogItem(
        {
          themeId,
          preview: {
            imageUrl,
          },
        } as ThemeCatalogPayload,
        "bold-fashion",
      );

      expect(normalized.preview.imageUrl).toBe(expectedImageUrl);
    });
  });

  it("accepts explicit category metadata from the API payload", () => {
    const normalized = normalizeStorefrontThemeCatalogItem(
      {
        themeId: "modern-minimal",
        category: {
          primary: {
            id: "food",
            label: "مطاعم وأغذية",
          },
          secondary: {
            id: "desserts",
            label: "حلويات",
          },
        },
      } as ThemeCatalogPayload,
      "modern-minimal",
    );

    expect(normalized.category.primary.id).toBe("food");
    expect(normalized.category.primary.label).toBe("مطاعم وأغذية");
    expect(normalized.category.secondary.id).toBe("desserts");
    expect(normalized.category.secondary.label).toBe("حلويات");
  });

  it("keeps the preset catalog resilient when a preset is missing page stats", () => {
    const presets: Record<string, unknown> = STOREFRONT_THEME_PRESETS;
    const previous = presets["broken-preview"];
    presets["broken-preview"] = {
      id: "broken-preview",
      name: "Broken Preview",
      tokens: {
        colors: {},
      },
      pages: {},
    };

    try {
      const fallback = buildStorefrontThemePresetCatalog("bold-fashion");
      const brokenTheme = fallback.find(
        (item) => item.themeId === "broken-preview",
      );

      expect(brokenTheme).toBeTruthy();
      expect(brokenTheme?.pageStats.homeSections).toBe(0);
      expect(brokenTheme?.pageStats.totalSections).toBe(0);
      expect(brokenTheme?.preview.colors).toEqual([]);
    } finally {
      if (previous) {
        presets["broken-preview"] = previous;
      } else {
        delete presets["broken-preview"];
      }
    }
  });

  it("normalizes API catalogs without injecting missing local presets", () => {
    const merged = normalizeStorefrontThemeCatalogItems(
      [
        {
          themeId: "atelier-nova",
          name: "Atelier Nova",
          description: "Custom API theme entry",
        },
      ] as ThemeCatalogPayload[],
      "atelier-nova",
    );

    expect(merged.some((item) => item.themeId === "atelier-nova")).toBe(true);
    expect(merged.some((item) => item.themeId === "airlume-ai")).toBe(false);
    expect(merged).toHaveLength(1);
  });
});
