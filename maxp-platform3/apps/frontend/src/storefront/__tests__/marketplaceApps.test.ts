// @vitest-environment jsdom

import { describe, expect, it } from "vitest";

import {
  getStorefrontFreeShippingPromotion,
  getStorefrontMarketplaceAppSettings,
  isStorefrontMarketplaceAppEnabled,
} from "../utils/marketplaceApps";
import type { StorefrontSettings } from "../hooks/useStorefrontSettings";

describe("storefront marketplace app helpers", () => {
  it("reads enabled state and settings from storefront.apps", () => {
    const settings = {
      company: {
        id: "company-1",
        name: "Test Store",
        slug: "test-store",
        logo: null,
        currency: "EGP",
        settings: {},
      },
      storefront: {
        apps: {
          "quantity-offers-pro": {
            enabled: true,
            status: "ACTIVE",
            settings: {
              modules: {
                renderOnProductPage: true,
              },
              copy: {
                title: "عروض الكميات",
              },
            },
          },
        },
        storefrontFeatures: {
          quickViewEnabled: true,
          comparisonEnabled: true,
          wishlistEnabled: true,
          recentlyViewedEnabled: true,
          advancedFiltersEnabled: true,
          productCardStyle: "style-1",
          gridAddToCartIcon: "cart",
          gridDiscountBanner: false,
        },
        settings: {
          storeName: "Test Store",
          currency: "EGP",
        },
      },
      templateId: null,
      lastUpdated: new Date().toISOString(),
    } satisfies StorefrontSettings;

    expect(
      isStorefrontMarketplaceAppEnabled(settings, "quantity-offers-pro"),
    ).toBe(true);
    expect(
      getStorefrontMarketplaceAppSettings(settings, "quantity-offers-pro"),
    ).toEqual(
      expect.objectContaining({
        modules: expect.objectContaining({
          renderOnProductPage: true,
        }),
        copy: expect.objectContaining({
          title: "عروض الكميات",
        }),
      }),
    );
  });

  it("marks conversion-suite free shipping as eligible once subtotal reaches the configured amount", () => {
    const settings = {
      company: {
        id: "company-1",
        name: "Swan",
        slug: "swan",
        logo: null,
        currency: "EGP",
        settings: {},
      },
      storefront: {
        apps: {
          "conversion-suite": {
            enabled: true,
            status: "ACTIVE",
            settings: {
              modules: {
                freeShippingBar: true,
              },
              thresholds: {
                freeShippingAmount: 799,
              },
            },
          },
        },
        storefrontFeatures: {
          quickViewEnabled: true,
          comparisonEnabled: true,
          wishlistEnabled: true,
          recentlyViewedEnabled: true,
          advancedFiltersEnabled: true,
          productCardStyle: "style-1",
          gridAddToCartIcon: "cart",
          gridDiscountBanner: false,
        },
        settings: {
          storeName: "Swan",
          currency: "EGP",
        },
      },
      templateId: null,
      lastUpdated: new Date().toISOString(),
    } satisfies StorefrontSettings;

    expect(getStorefrontFreeShippingPromotion(settings, 1028)).toEqual(
      expect.objectContaining({
        enabled: true,
        eligible: true,
        threshold: 799,
        remaining: 0,
      }),
    );
    expect(getStorefrontFreeShippingPromotion(settings, 700)).toEqual(
      expect.objectContaining({
        enabled: true,
        eligible: false,
        threshold: 799,
        remaining: 99,
      }),
    );
  });

  it("enables men shoes conversion upsells in marketplace preview", () => {
    window.history.replaceState(
      {},
      "",
      "/home?previewTheme=men-shoes-eg&previewSource=marketplace",
    );

    const settings = {
      company: {
        id: "company-1",
        name: "Test Store",
        slug: "test-store",
        logo: null,
        currency: "EGP",
        settings: {},
      },
      storefront: {
        isPreview: true,
        settings: {
          storeName: "Test Store",
          currency: "EGP",
          isPreview: true,
        },
      },
      templateId: null,
      lastUpdated: new Date().toISOString(),
    } satisfies StorefrontSettings;

    expect(
      isStorefrontMarketplaceAppEnabled(settings, "conversion-suite"),
    ).toBe(true);

    expect(
      getStorefrontMarketplaceAppSettings(settings, "conversion-suite"),
    ).toEqual(
      expect.objectContaining({
        modules: expect.objectContaining({
          crossSell: true,
          boughtTogether: true,
        }),
        copy: expect.objectContaining({
          cartUpsellTitle: "منتجات تكمّل الطلب قبل الدفع",
          chooseOptionsLabel: "اختر المقاس",
        }),
      }),
    );
  });

  it("enables Solea Femme conversion upsells with shoes-first copy in marketplace preview", () => {
    window.history.replaceState(
      {},
      "",
      "/home?previewTheme=solea-femme&previewSource=marketplace",
    );

    const settings = {
      company: {
        id: "company-1",
        name: "Test Store",
        slug: "test-store",
        logo: null,
        currency: "EGP",
        settings: {},
      },
      storefront: {
        isPreview: true,
        settings: {
          storeName: "Test Store",
          currency: "EGP",
          isPreview: true,
        },
      },
      templateId: null,
      lastUpdated: new Date().toISOString(),
    } satisfies StorefrontSettings;

    expect(
      isStorefrontMarketplaceAppEnabled(settings, "conversion-suite"),
    ).toBe(true);

    expect(
      getStorefrontMarketplaceAppSettings(settings, "conversion-suite"),
    ).toEqual(
      expect.objectContaining({
        modules: expect.objectContaining({
          crossSell: true,
          boughtTogether: true,
        }),
        copy: expect.objectContaining({
          cartUpsellTitle: "موديلات تكمل قرارك",
          boughtTogetherTitle: "توليفة تكمل الحذاء",
          chooseOptionsLabel: "اختاري المقاس أو اللون",
          postPurchaseUpsellBadge: "بعد تأكيد الطلب",
        }),
      }),
    );
  });

  it("tunes conversion-suite defaults for pc-hub-eg marketplace preview", () => {
    window.history.replaceState(
      {},
      "",
      "/home?previewTheme=pc-hub-eg&previewSource=marketplace",
    );

    const settings = {
      company: {
        id: "company-1",
        name: "Test Store",
        slug: "test-store",
        logo: null,
        currency: "EGP",
        settings: {},
      },
      storefront: {
        isPreview: true,
        settings: {
          storeName: "Test Store",
          currency: "EGP",
          isPreview: true,
        },
      },
      templateId: null,
      lastUpdated: new Date().toISOString(),
    } satisfies StorefrontSettings;

    expect(
      getStorefrontMarketplaceAppSettings(settings, "conversion-suite"),
    ).toEqual(
      expect.objectContaining({
        modules: expect.objectContaining({
          saleCountdown: false,
          exitIntentPopup: false,
          fakeSalePopup: false,
          freeShippingBar: false,
          crossSell: true,
          boughtTogether: true,
        }),
      }),
    );
  });

  it("localizes Elegant Luxe estimated delivery copy in marketplace preview", () => {
    window.history.replaceState(
      {},
      "",
      "/home?previewTheme=elegant-luxe&previewSource=marketplace",
    );

    const settings = {
      company: {
        id: "company-1",
        name: "Test Store",
        slug: "test-store",
        logo: null,
        currency: "EGP",
        settings: {},
      },
      storefront: {
        isPreview: true,
        settings: {
          storeName: "Test Store",
          currency: "EGP",
          isPreview: true,
        },
      },
      templateId: null,
      lastUpdated: new Date().toISOString(),
    } satisfies StorefrontSettings;

    expect(
      getStorefrontMarketplaceAppSettings(settings, "conversion-suite"),
    ).toEqual(
      expect.objectContaining({
        estimatedDelivery: expect.objectContaining({
          label: "موعد الوصول المتوقع",
        }),
      }),
    );
  });

  it("disables conversion-suite entirely for elessi-signal-deck marketplace preview", () => {
    window.history.replaceState(
      {},
      "",
      "/home?previewTheme=elessi-signal-deck&previewSource=marketplace",
    );

    const settings = {
      company: {
        id: "company-1",
        name: "Test Store",
        slug: "test-store",
        logo: null,
        currency: "EGP",
        settings: {},
      },
      storefront: {
        isPreview: true,
        settings: {
          storeName: "Test Store",
          currency: "EGP",
          isPreview: true,
        },
      },
      templateId: null,
      lastUpdated: new Date().toISOString(),
    } satisfies StorefrontSettings;

    expect(
      isStorefrontMarketplaceAppEnabled(settings, "conversion-suite"),
    ).toBe(false);
  });

  it("disables conversion-suite entirely for elessi-glow-routine marketplace preview", () => {
    window.history.replaceState(
      {},
      "",
      "/home?previewTheme=elessi-glow-routine&previewSource=marketplace",
    );

    const settings = {
      company: {
        id: "company-1",
        name: "Test Store",
        slug: "test-store",
        logo: null,
        currency: "EGP",
        settings: {},
      },
      storefront: {
        isPreview: true,
        settings: {
          storeName: "Test Store",
          currency: "EGP",
          isPreview: true,
        },
      },
      templateId: null,
      lastUpdated: new Date().toISOString(),
    } satisfies StorefrontSettings;

    expect(
      isStorefrontMarketplaceAppEnabled(settings, "conversion-suite"),
    ).toBe(false);
  });

  it("does not crash when marketplace preview mode has no previewTheme", () => {
    window.history.replaceState({}, "", "/home?previewSource=marketplace");

    const settings = {
      company: {
        id: "company-1",
        name: "Test Store",
        slug: "test-store",
        logo: null,
        currency: "EGP",
        settings: {},
      },
      storefront: {
        isPreview: true,
        settings: {
          storeName: "Test Store",
          currency: "EGP",
          isPreview: true,
        },
      },
      templateId: null,
      lastUpdated: new Date().toISOString(),
    } satisfies StorefrontSettings;

    expect(() =>
      isStorefrontMarketplaceAppEnabled(settings, "conversion-suite"),
    ).not.toThrow();
    expect(
      isStorefrontMarketplaceAppEnabled(settings, "conversion-suite"),
    ).toBe(true);
  });

  it("keeps style-store family previews on the calm conversion copy branch", () => {
    window.history.replaceState(
      {},
      "",
      "/home?previewTheme=modern-minimal&previewSource=marketplace",
    );

    const settings = {
      company: {
        id: "company-1",
        name: "Test Store",
        slug: "test-store",
        logo: null,
        currency: "EGP",
        settings: {},
      },
      storefront: {
        isPreview: true,
        settings: {
          storeName: "Test Store",
          currency: "EGP",
          isPreview: true,
        },
      },
      templateId: null,
      lastUpdated: new Date().toISOString(),
    } satisfies StorefrontSettings;

    expect(() =>
      getStorefrontMarketplaceAppSettings(settings, "conversion-suite"),
    ).not.toThrow();
    expect(
      getStorefrontMarketplaceAppSettings(settings, "conversion-suite"),
    ).toEqual(
      expect.objectContaining({
        copy: expect.objectContaining({
          cartUpsellTitle: "اختيارات مع نفس الجو",
          crossSellTitle: "اختيارات قريبة",
          boughtTogetherTitle: "يليق معه أيضًا",
          chooseOptionsLabel: "اختاري اللون أو المقاس",
        }),
      }),
    );
  });

  it("keeps rose-boutique-eg marketplace preview calm and editorial", () => {
    window.history.replaceState(
      {},
      "",
      "/home?previewTheme=rose-boutique-eg&previewSource=marketplace",
    );

    const settings = {
      company: {
        id: "company-1",
        name: "Test Store",
        slug: "test-store",
        logo: null,
        currency: "EGP",
        settings: {},
      },
      storefront: {
        isPreview: true,
        settings: {
          storeName: "Test Store",
          currency: "EGP",
          isPreview: true,
        },
      },
      templateId: null,
      lastUpdated: new Date().toISOString(),
    } satisfies StorefrontSettings;

    expect(
      getStorefrontMarketplaceAppSettings(settings, "conversion-suite"),
    ).toEqual(
      expect.objectContaining({
        modules: expect.objectContaining({
          saleCountdown: false,
          exitIntentPopup: false,
          lowStockNotice: false,
          bulkSavings: false,
          fakeVisitorCounter: false,
          fakeSalePopup: false,
          soldCounter: false,
          estimatedDelivery: false,
          freeShippingBar: false,
          backInStock: false,
          trustedBadges: false,
          purchaseFomo: false,
          inactiveTab: false,
          crossSell: true,
          boughtTogether: true,
        }),
        copy: expect.objectContaining({
          cartUpsellTitle: "اختيارات تكمل اللوك",
          crossSellTitle: "قطع قريبة من اختيارك",
          boughtTogetherTitle: "يلائم القطعة",
          chooseOptionsLabel: "اختاري المقاس أو اللون",
        }),
      }),
    );
  });

  it("keeps atelier-nova marketplace preview calm and gallery-led", () => {
    window.history.replaceState(
      {},
      "",
      "/home?previewTheme=atelier-nova&previewSource=marketplace",
    );

    const settings = {
      company: {
        id: "company-1",
        name: "Test Store",
        slug: "test-store",
        logo: null,
        currency: "EGP",
        settings: {},
      },
      storefront: {
        isPreview: true,
        settings: {
          storeName: "Test Store",
          currency: "EGP",
          isPreview: true,
        },
      },
      templateId: null,
      lastUpdated: new Date().toISOString(),
    } satisfies StorefrontSettings;

    expect(
      getStorefrontMarketplaceAppSettings(settings, "conversion-suite"),
    ).toEqual(
      expect.objectContaining({
        modules: expect.objectContaining({
          saleCountdown: false,
          exitIntentPopup: false,
          lowStockNotice: false,
          bulkSavings: false,
          fakeVisitorCounter: false,
          fakeSalePopup: false,
          soldCounter: false,
          estimatedDelivery: false,
          freeShippingBar: false,
          backInStock: false,
          trustedBadges: false,
          purchaseFomo: false,
          inactiveTab: false,
          crossSell: true,
          boughtTogether: true,
        }),
        copy: expect.objectContaining({
          cartUpsellBadge: "يكمل اللوك",
          cartUpsellTitle: "قطع تكمل نفس الإيقاع",
          crossSellTitle: "قطع قريبة من هذه القطعة",
          boughtTogetherTitle: "يكتمل معها",
          chooseOptionsLabel: "اختاري اللون أو المقاس",
        }),
      }),
    );
  });

  it("does not crash for kids-play marketplace preview settings", () => {
    window.history.replaceState(
      {},
      "",
      "/home?previewTheme=kids-play&previewSource=marketplace",
    );

    const settings = {
      company: {
        id: "company-1",
        name: "Test Store",
        slug: "test-store",
        logo: null,
        currency: "EGP",
        settings: {},
      },
      storefront: {
        isPreview: true,
        settings: {
          storeName: "Test Store",
          currency: "EGP",
          isPreview: true,
        },
      },
      templateId: null,
      lastUpdated: new Date().toISOString(),
    } satisfies StorefrontSettings;

    expect(() =>
      getStorefrontMarketplaceAppSettings(settings, "conversion-suite"),
    ).not.toThrow();
    expect(
      getStorefrontMarketplaceAppSettings(settings, "conversion-suite"),
    ).toEqual(
      expect.objectContaining({
        modules: expect.any(Object),
        copy: expect.any(Object),
      }),
    );
  });
});
