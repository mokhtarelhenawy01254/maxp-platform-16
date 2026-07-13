import { describe, expect, it } from "vitest";

import { getStorefrontThemePreset } from "../themes";
import { ELESSI_PACK_THEME_IDS } from "../themes/elessiPack";

type SectionShape = {
  type?: string;
  variant?: string;
};

const asSection = (value: unknown): SectionShape | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as SectionShape)
    : null;

const getVariant = (section: unknown) => asSection(section)?.variant || "";

const normalizeFont = (value: unknown) =>
  typeof value === "string"
    ? value.split(",")[0]!.replace(/["']/g, "").trim().toLowerCase()
    : "";

const parseHsl = (value: unknown) => {
  if (typeof value !== "string") {
    return { h: 0, s: 0, l: 0 };
  }

  const numbers = value.match(/-?\d+(?:\.\d+)?/g)?.map(Number) || [];
  return {
    h: numbers[0] ?? 0,
    s: numbers[1] ?? 0,
    l: numbers[2] ?? 0,
  };
};

const getPaletteFamily = (themeId: string) => {
  const theme = getStorefrontThemePreset(themeId);
  const background = parseHsl(theme.tokens.colors.background);
  const primary = parseHsl(theme.tokens.colors.primary);
  const accent = parseHsl(theme.tokens.colors.accent);

  const backgroundTone =
    background.l >= 97 ? "paper" : background.l >= 93 ? "soft" : "dense";
  const backgroundTemperature =
    background.h >= 18 && background.h <= 55
      ? "warm"
      : background.h >= 80 && background.h <= 165
        ? "green"
        : background.h >= 180 && background.h <= 255
          ? "cool"
          : "neutral";
  const accentFamily =
    accent.h >= 10 && accent.h <= 42
      ? "amber"
      : accent.h >= 43 && accent.h <= 95
        ? "citrus"
        : accent.h >= 96 && accent.h <= 170
          ? "green"
          : accent.h >= 171 && accent.h <= 255
            ? "blue"
            : accent.h >= 320
              ? "rose"
              : "earth";
  const contrastLevel = primary.l <= 18 ? "ink" : primary.l <= 28 ? "deep" : "soft";

  return `${backgroundTone}-${backgroundTemperature}-${accentFamily}-${contrastLevel}`;
};

const getCoreSignature = (themeId: string) => {
  const theme = getStorefrontThemePreset(themeId);
  const homeSections = theme.pages.home.sections;
  const shopSections = theme.pages.shop.sections;
  const pdpSections = theme.pages.pdp.sections;

  return [
    getVariant(homeSections[0]),
    getVariant(homeSections[1]),
    getVariant(homeSections[2]),
    getVariant(shopSections[0]),
    getVariant(shopSections[1]),
    getVariant(pdpSections[0]),
    getVariant(pdpSections[1]),
    getVariant(pdpSections[2]),
    getVariant(pdpSections[3]),
  ].join("|");
};

const getVisualSignature = (themeId: string) => {
  const theme = getStorefrontThemePreset(themeId);

  return [
    normalizeFont(theme.tokens.typography.headingFont),
    normalizeFont(theme.tokens.typography.bodyFont),
    theme.tokens.shape.borderRadius,
    theme.tokens.shape.buttonRadius,
    theme.tokens.productCard.borderRadius,
    theme.tokens.productCard.buttonRadius,
    theme.header.variant,
    theme.footer.variant,
    getPaletteFamily(themeId),
  ].join("|");
};

const getAxes = (themeId: string) =>
  `${getCoreSignature(themeId)}|${getVisualSignature(themeId)}`.split("|");

describe("Elessi protocol guards", () => {
  it("keeps every Elessi pack theme on Elessi-only core surfaces", () => {
    ELESSI_PACK_THEME_IDS.forEach((themeId) => {
      const theme = getStorefrontThemePreset(themeId);
      const sections = [
        ...theme.pages.home.sections,
        ...theme.pages.shop.sections,
        ...theme.pages.pdp.sections,
      ];

      sections.forEach((section) => {
        const variant = getVariant(section);
        if (variant) {
          expect(variant.startsWith("elessi-")).toBe(true);
        }
      });
    });
  });

  it("keeps each Elessi theme perceptibly distinct from the other nine", () => {
    const signatures = ELESSI_PACK_THEME_IDS.map((themeId) => ({
      themeId,
      signature: `${getCoreSignature(themeId)}|${getVisualSignature(themeId)}`,
    }));

    expect(new Set(signatures.map((entry) => entry.signature)).size).toBe(
      ELESSI_PACK_THEME_IDS.length,
    );

    for (let i = 0; i < ELESSI_PACK_THEME_IDS.length; i += 1) {
      for (let j = i + 1; j < ELESSI_PACK_THEME_IDS.length; j += 1) {
        const leftThemeId = ELESSI_PACK_THEME_IDS[i]!;
        const rightThemeId = ELESSI_PACK_THEME_IDS[j]!;
        const leftAxes = getAxes(leftThemeId);
        const rightAxes = getAxes(rightThemeId);
        const diffCount = leftAxes.filter(
          (axis, axisIndex) => axis !== rightAxes[axisIndex],
        ).length;

        expect(diffCount).toBeGreaterThanOrEqual(8);
      }
    }
  });

  it("preserves a fixed 3/2/4 commerce structure instead of drifting into generic multipurpose page sprawl", () => {
    ELESSI_PACK_THEME_IDS.forEach((themeId) => {
      const theme = getStorefrontThemePreset(themeId);

      expect(theme.pages.home.sections).toHaveLength(3);
      expect(theme.pages.shop.sections).toHaveLength(2);
      expect(theme.pages.pdp.sections).toHaveLength(4);
      expect(theme.pages.cart.sections).toEqual(["cart-items", "order-summary"]);
      expect(theme.pages.checkout.sections).toEqual([
        "cart-items",
        "checkout-form",
        "payment",
        "order-summary",
      ]);
    });
  });
});
