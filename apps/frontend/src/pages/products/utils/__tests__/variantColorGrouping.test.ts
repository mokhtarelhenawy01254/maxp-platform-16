import {
  isColorAttributeName,
  normalizeArabicString,
  detectGroupingAttributes,
  extractVariantGroupValue,
  groupVariantsByColor,
} from "../variantColorGrouping";
import { ProductAttribute, ProductVariant } from "../../types";

describe("variantColorGrouping Utility", () => {
  describe("isColorAttributeName", () => {
    it("identifies color attribute names in Arabic and English", () => {
      expect(isColorAttributeName("color")).toBe(true);
      expect(isColorAttributeName("Color")).toBe(true);
      expect(isColorAttributeName("اللون")).toBe(true);
      expect(isColorAttributeName("لون المنتج")).toBe(true);
      expect(isColorAttributeName("colour")).toBe(true);
      expect(isColorAttributeName("size")).toBe(false);
      expect(isColorAttributeName("المقاس")).toBe(false);
    });
  });

  describe("extractVariantGroupValue", () => {
    it("extracts color from attributeValues", () => {
      const variant: ProductVariant = {
        name: "Variant 1",
        type: "combination",
        sku: "SKU-1",
        stock: 10,
        trackInventory: true,
        isActive: true,
        sortOrder: 0,
        images: [],
        attributeValues: {
          color: "أبيض",
          size: "38",
        },
      };

      const result = extractVariantGroupValue(variant, "color");
      expect(result.groupValue).toBe("أبيض");
      expect(result.secondaryLabel).toBe("38");
    });

    it("extracts color from variant name with standard hyphen delimiter", () => {
      const variant: ProductVariant = {
        name: "ابيض - 37",
        type: "combination",
        sku: "SKU-1",
        stock: 10,
        trackInventory: true,
        isActive: true,
        sortOrder: 0,
        images: [],
      };

      const result = extractVariantGroupValue(variant);
      expect(result.groupValue).toBe("ابيض");
      expect(result.secondaryLabel).toBe("37");
    });

    it("recognizes color even when size comes first in variant name", () => {
      const variant: ProductVariant = {
        name: "42 - أسود",
        type: "combination",
        sku: "SKU-2",
        stock: 5,
        trackInventory: true,
        isActive: true,
        sortOrder: 0,
        images: [],
      };

      const result = extractVariantGroupValue(variant);
      expect(result.groupValue).toBe("أسود");
      expect(result.secondaryLabel).toBe("42");
    });
  });

  describe("groupVariantsByColor", () => {
    it("groups variants by color correctly with sizes and images", () => {
      const variants: ProductVariant[] = [
        {
          name: "ابيض - 37",
          type: "combination",
          sku: "W-37",
          stock: 10,
          trackInventory: true,
          isActive: true,
          sortOrder: 0,
          images: [],
          image: "https://example.com/white.jpg",
        },
        {
          name: "ابيض - 38",
          type: "combination",
          sku: "W-38",
          stock: 15,
          trackInventory: true,
          isActive: true,
          sortOrder: 1,
          images: [],
        },
        {
          name: "اسود - 37",
          type: "combination",
          sku: "B-37",
          stock: 8,
          trackInventory: true,
          isActive: true,
          sortOrder: 2,
          images: [],
        },
        {
          name: "اسود - 38",
          type: "combination",
          sku: "B-38",
          stock: 12,
          trackInventory: true,
          isActive: true,
          sortOrder: 3,
          images: [],
          image: "https://example.com/black.jpg",
        },
      ];

      const groups = groupVariantsByColor(variants);

      expect(groups).toHaveLength(2);

      const whiteGroup = groups.find((g) => g.name.includes("ابيض"));
      expect(whiteGroup).toBeDefined();
      expect(whiteGroup?.items).toHaveLength(2);
      expect(whiteGroup?.currentImage).toBe("https://example.com/white.jpg");
      expect(whiteGroup?.imagesCount).toBe(1);
      expect(whiteGroup?.items[0].secondaryLabel).toBe("37");
      expect(whiteGroup?.items[1].secondaryLabel).toBe("38");

      const blackGroup = groups.find((g) => g.name.includes("اسود"));
      expect(blackGroup).toBeDefined();
      expect(blackGroup?.items).toHaveLength(2);
      expect(blackGroup?.currentImage).toBe("https://example.com/black.jpg");
    });

    it("respects explicit attributes list if provided", () => {
      const attributes: ProductAttribute[] = [
        {
          id: "attr_color",
          name: "اللون",
          slug: "color",
          values: ["أحمر", "أزرق"],
          visible: true,
          forVariations: true,
        },
        {
          id: "attr_size",
          name: "المقاس",
          slug: "size",
          values: ["S", "M"],
          visible: true,
          forVariations: true,
        },
      ];

      const variants: ProductVariant[] = [
        {
          name: "أحمر - S",
          type: "combination",
          sku: "R-S",
          stock: 5,
          trackInventory: true,
          isActive: true,
          sortOrder: 0,
          images: [],
          attributeValues: { color: "أحمر", size: "S" },
        },
        {
          name: "أحمر - M",
          type: "combination",
          sku: "R-M",
          stock: 5,
          trackInventory: true,
          isActive: true,
          sortOrder: 1,
          images: [],
          attributeValues: { color: "أحمر", size: "M" },
        },
        {
          name: "أزرق - S",
          type: "combination",
          sku: "B-S",
          stock: 5,
          trackInventory: true,
          isActive: true,
          sortOrder: 2,
          images: [],
          attributeValues: { color: "أزرق", size: "S" },
        },
      ];

      const groups = groupVariantsByColor(variants, attributes, "color");
      expect(groups).toHaveLength(2);
      const redGroup = groups.find((g) => g.name === "أحمر");
      expect(redGroup?.items).toHaveLength(2);
      const blueGroup = groups.find((g) => g.name === "أزرق");
      expect(blueGroup?.items).toHaveLength(1);
    });
  });
});
