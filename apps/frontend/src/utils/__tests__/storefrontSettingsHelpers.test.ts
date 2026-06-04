import { DEFAULT_STOREFRONT_THEME_ID } from "../../storefront/themes";
import {
  getErrorMessage,
  getSectionType,
  getStorefrontContentSignature,
  getStorefrontPageSignature,
  resolveStorefrontThemeId,
} from "../storefrontSettingsHelpers";

describe("storefrontSettingsHelpers", () => {
  describe("resolveStorefrontThemeId", () => {
    it("prefers the trimmed explicit theme id", () => {
      expect(
        resolveStorefrontThemeId({
          themeId: "  luxe-dark  ",
          designTokens: { themeId: "fallback-theme" },
        }),
      ).toBe("luxe-dark");
    });

    it("falls back to design token theme id when top-level value is empty", () => {
      expect(
        resolveStorefrontThemeId({
          themeId: "   ",
          designTokens: { themeId: "catalog-theme" },
        }),
      ).toBe("catalog-theme");
    });

    it("falls back to the default storefront theme id", () => {
      expect(resolveStorefrontThemeId({ themeId: "", designTokens: {} })).toBe(
        DEFAULT_STOREFRONT_THEME_ID,
      );
    });
  });

  describe("signatures", () => {
    it("builds a stable content signature from content overrides", () => {
      const signature = getStorefrontContentSignature({
        designTokens: {
          contentOverrides: {
            home: {
              sections: {
                "hero-banner": {
                  title: "متجر راقي",
                  subtitle: "أفضل عروض الأسبوع",
                },
              },
            },
          },
        },
      });

      expect(signature).toContain('"home"');
      expect(signature).toContain('"hero-banner"');
      expect(signature).toContain("متجر راقي");
    });

    it("changes the page signature when page override sections change", () => {
      const baseline = getStorefrontPageSignature({
        designTokens: {
          pageOverrides: {
            shop: {
              sections: ["hero", "catalog-grid"],
            },
          },
        },
      });

      const changed = getStorefrontPageSignature({
        designTokens: {
          pageOverrides: {
            shop: {
              sections: ["hero", "catalog-grid", "faq"],
            },
          },
        },
      });

      expect(changed).not.toBe(baseline);
      expect(changed).toContain('"faq"');
    });
  });

  describe("getErrorMessage", () => {
    it("extracts and trims the backend error message", () => {
      expect(
        getErrorMessage(
          {
            response: {
              data: {
                message: "  تعذّر حفظ القالب  ",
              },
            },
          },
          "fallback",
        ),
      ).toBe("تعذّر حفظ القالب");
    });

    it("returns the fallback when the shape is missing", () => {
      expect(getErrorMessage(new Error("boom"), "fallback")).toBe("fallback");
    });
  });

  describe("getSectionType", () => {
    it("accepts raw section ids and object sections", () => {
      expect(getSectionType("hero-banner")).toBe("hero-banner");
      expect(getSectionType({ type: "featured-products" })).toBe(
        "featured-products",
      );
    });

    it("returns an empty string for unsupported values", () => {
      expect(getSectionType({ id: "missing-type" })).toBe("");
      expect(getSectionType(null)).toBe("");
    });
  });
});
