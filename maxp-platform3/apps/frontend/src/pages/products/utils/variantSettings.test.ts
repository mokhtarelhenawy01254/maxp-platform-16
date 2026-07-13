// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import type {
  ProductAttribute,
  ProductVariant,
  ProductVariantSettings,
} from "../types";
import {
  getVariantDisplaySupport,
  hydrateVariantSettings,
  normalizeVariantSettingsForSave,
} from "./variantSettings";

const colorAttribute: ProductAttribute = {
  id: "attr-color",
  name: "اللون",
  slug: "color",
  values: ["أسود", "أبيض"],
  visible: true,
  forVariations: true,
};

const pluralColorAttribute: ProductAttribute = {
  id: "attr-colors",
  name: "الألوان",
  slug: "الالوان",
  values: ["أسود", "أبيض", "بيج"],
  visible: true,
  forVariations: true,
};

const sizeAttribute: ProductAttribute = {
  id: "attr-size",
  name: "الحجم",
  slug: "size",
  values: ["S", "M"],
  visible: true,
  forVariations: true,
};

describe("variantSettings helpers", () => {
  it("falls back color thumbnails to circles when no images are available", () => {
    const settings: ProductVariantSettings = {
      styles: { اللون: "thumbnails" },
      attributeImages: {},
    };

    expect(
      normalizeVariantSettingsForSave(settings, [colorAttribute], [] as ProductVariant[])
        .styles["اللون"],
    ).toBe("circles");
  });

  it("falls back non-color thumbnails to buttons when no images are available", () => {
    const settings: ProductVariantSettings = {
      styles: { الحجم: "thumbnails" },
      attributeImages: {},
    };

    expect(
      normalizeVariantSettingsForSave(settings, [sizeAttribute], [] as ProductVariant[])
        .styles["الحجم"],
    ).toBe("buttons");
  });

  it("keeps thumbnails when custom attribute images exist", () => {
    const settings: ProductVariantSettings = {
      styles: { اللون: "thumbnails" },
      attributeImages: {
        اللون: {
          أسود: "/uploads/products/black.jpg",
        },
      },
    };

    expect(
      normalizeVariantSettingsForSave(settings, [colorAttribute], [] as ProductVariant[])
        .styles["اللون"],
    ).toBe("thumbnails");
  });

  it("counts variant images as valid thumbnail support", () => {
    const settings: ProductVariantSettings = {
      styles: { اللون: "thumbnails" },
      attributeImages: {},
    };
    const variants: ProductVariant[] = [
      {
        id: "variant-black",
        name: "أسود - S",
        type: "combination",
        sku: "SKU-1",
        images: [],
        image: "/uploads/products/black.jpg",
        stock: 1,
        trackInventory: true,
        isActive: true,
        sortOrder: 0,
        attributeValues: {
          color: "أسود",
          size: "S",
        },
      },
    ];

    const support = getVariantDisplaySupport(colorAttribute, settings, variants);

    expect(support.coveredValueCount).toBe(1);
    expect(
      normalizeVariantSettingsForSave(settings, [colorAttribute], variants).styles["اللون"],
    ).toBe("thumbnails");
  });

  it("recognizes plural Arabic color attributes as colors when normalizing display support", () => {
    const settings: ProductVariantSettings = {
      styles: { الالوان: "thumbnails" },
      attributeImages: {},
    };
    const variants: ProductVariant[] = [
      {
        id: "variant-black",
        name: "أسود - 38",
        type: "combination",
        sku: "SKU-PLURAL-1",
        images: [],
        stock: 1,
        trackInventory: true,
        isActive: true,
        sortOrder: 0,
        attributeValues: {
          الالوان: "أسود",
          المقاس: "38",
        },
      },
    ];

    const support = getVariantDisplaySupport(pluralColorAttribute, settings, variants);

    expect(support.isColorAttribute).toBe(true);
    expect(support.fallbackStyle).toBe("circles");
    expect(
      normalizeVariantSettingsForSave(settings, [pluralColorAttribute], []).styles[
        "الالوان"
      ],
    ).toBe("circles");
  });

  it("hydrates variant settings when they are stored as JSON strings", () => {
    expect(
      hydrateVariantSettings(
        JSON.stringify({
          styles: JSON.stringify({ color: "dropdown", الحجم: "buttons" }),
          attributeImages: JSON.stringify({
            اللون: {
              أسود: "/uploads/products/black.jpg",
            },
          }),
          attributeColors: JSON.stringify({
            اللون: {
              أسود: "#111",
            },
          }),
        }),
      ),
    ).toEqual({
      styles: {
        color: "dropdown",
        الحجم: "buttons",
      },
      attributeImages: {
        اللون: {
          أسود: "/uploads/products/black.jpg",
        },
      },
      attributeColors: {
        اللون: {
          أسود: "#111111",
        },
      },
    });
  });

  it("keeps custom color swatches only while a color attribute uses circles", () => {
    const settings: ProductVariantSettings = {
      styles: { اللون: "circles", الحجم: "buttons" },
      attributeImages: {},
      attributeColors: {
        اللون: {
          أسود: "#111111",
          "لون محذوف": "#ff0000",
        },
        الحجم: {
          S: "#00ff00",
        },
      },
    };

    expect(
      normalizeVariantSettingsForSave(
        settings,
        [colorAttribute, sizeAttribute],
        [] as ProductVariant[],
      ).attributeColors,
    ).toEqual({
      اللون: {
        أسود: "#111111",
      },
    });
  });
});
