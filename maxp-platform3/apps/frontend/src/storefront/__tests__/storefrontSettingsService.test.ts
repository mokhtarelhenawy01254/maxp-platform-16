// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { normalizePublicSettingsPayload } from "../../services/storefrontSettingsService";

describe("storefrontSettingsService public payload normalization", () => {
  it("uses the top-level storefrontSettings payload when available", () => {
    const normalized = normalizePublicSettingsPayload(
      {
        success: true,
        data: {
          company: {
            id: "cmp_1",
            name: "Acme Store",
            currency: "USD",
            settings: { description: "Demo store" },
          },
          storefront: {
            themeId: "bold-fashion",
            designTokens: {
              colors: {
                primary: "10 80% 40%",
              },
            },
          },
          storefrontSettings: {
            id: "settings_1",
            companyId: "cmp_1",
            themeId: "elegant-luxe",
            storeName: "Acme Luxe",
            currency: "SAR",
            wishlistEnabled: false,
            designTokens: {
              themeId: "elegant-luxe",
            },
          },
        },
      },
      "cmp_1",
    );

    expect(normalized.companyId).toBe("cmp_1");
    expect(normalized.themeId).toBe("elegant-luxe");
    expect(normalized.storeName).toBe("Acme Luxe");
    expect(normalized.currency).toBe("SAR");
    expect(normalized.wishlistEnabled).toBe(false);
  });

  it("can derive storefront settings from the storefront shell payload shape", () => {
    const normalized = normalizePublicSettingsPayload(
      {
        success: true,
        data: {
          company: {
            id: "cmp_2",
            name: "Bold Company",
            currency: "EGP",
            settings: {
              description: "Egypt storefront",
            },
          },
          storefront: {
            themeId: "bold-fashion",
            designTokens: {
              themeId: "bold-fashion",
              colors: {
                primary: "20 90% 50%",
              },
            },
            settings: {
              storeName: "Bold Fashion House",
              currency: "AED",
            },
            storefrontFeatures: {
              quickViewEnabled: false,
              productCardStyle: "editorial",
              gridAddToCartIcon: "cart",
            },
          },
        },
      },
      "cmp_2",
    );

    expect(normalized.companyId).toBe("cmp_2");
    expect(normalized.themeId).toBe("bold-fashion");
    expect(normalized.storeName).toBe("Bold Fashion House");
    expect(normalized.description).toBe("Egypt storefront");
    expect(normalized.currency).toBe("AED");
    expect(normalized.quickViewEnabled).toBe(false);
    expect(normalized.productCardStyle).toBe("editorial");
    expect(normalized.gridAddToCartIcon).toBe("cart");
    expect(normalized.designTokens?.themeId).toBe("bold-fashion");
  });

  it("falls back to defaults when the payload is empty", () => {
    const normalized = normalizePublicSettingsPayload(null, "cmp_3");

    expect(normalized.companyId).toBe("cmp_3");
    expect(normalized.themeId).toBe("modern-minimal");
    expect(normalized.currency).toBe("EGP");
    expect(normalized.wishlistEnabled).toBe(true);
  });
});
