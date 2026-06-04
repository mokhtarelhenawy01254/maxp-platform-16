/**
 * 🧪 Unit Tests: useProductVariants
 *
 * Tests the pure logic of variant selection, price resolution,
 * and availability filtering — the most critical headless hook for PDP.
 */

import { renderHook, act } from "@testing-library/react";
import { useProductVariants } from "../useProductVariants";
import type { StorefrontProduct } from "../../types/StorefrontTypes";

// ─── Test Data ──────────────────────────────────────────────

const mockProductNoVariants: StorefrontProduct = {
  id: "p1",
  name: "Simple Bag",
  price: 299,
  images: [],
  variants: [],
};

const mockProductWithVariants: StorefrontProduct = {
  id: "p2",
  name: "Luxury Shoe",
  price: 1200,
  compareAtPrice: 1500,
  images: [],
  variants: [
    {
      id: "v1",
      price: 1200,
      compareAtPrice: 1500,
      stock: 5,
      options: [
        { name: "Color", value: "Black" },
        { name: "Size", value: "42" },
      ],
    },
    {
      id: "v2",
      price: 1350,
      stock: 2,
      options: [
        { name: "Color", value: "White" },
        { name: "Size", value: "42" },
      ],
    },
    {
      id: "v3",
      price: 1200,
      stock: 0,
      options: [
        { name: "Color", value: "Black" },
        { name: "Size", value: "44" },
      ],
    },
  ],
};

// ─── Tests ───────────────────────────────────────────────────

describe("useProductVariants", () => {
  // ── No Variants ──────────────────────────────────────────
  describe("product with no variants", () => {
    it("should return empty optionGroups", () => {
      const { result } = renderHook(() =>
        useProductVariants(mockProductNoVariants)
      );
      expect(result.current.optionGroups).toEqual([]);
    });

    it("should return product base price as resolvedPrice", () => {
      const { result } = renderHook(() =>
        useProductVariants(mockProductNoVariants)
      );
      expect(result.current.resolvedPrice).toBe(299);
    });

    it("should report isValidSelection = true (no variants = always valid)", () => {
      const { result } = renderHook(() =>
        useProductVariants(mockProductNoVariants)
      );
      expect(result.current.isValidSelection).toBe(true);
    });

    it("should report hasVariants = false", () => {
      const { result } = renderHook(() =>
        useProductVariants(mockProductNoVariants)
      );
      expect(result.current.hasVariants).toBe(false);
    });
  });

  // ── With Variants ────────────────────────────────────────
  describe("product with variants", () => {
    it("should correctly group options by attribute name", () => {
      const { result } = renderHook(() =>
        useProductVariants(mockProductWithVariants)
      );
      const groups = result.current.optionGroups;
      expect(groups).toHaveLength(2);
      expect(groups.find((g) => g.name === "Color")?.values).toContain("Black");
      expect(groups.find((g) => g.name === "Color")?.values).toContain("White");
      expect(groups.find((g) => g.name === "Size")?.values).toContain("42");
      expect(groups.find((g) => g.name === "Size")?.values).toContain("44");
    });

    it("should auto-select the first variant when nothing is selected", () => {
      const { result } = renderHook(() =>
        useProductVariants(mockProductWithVariants)
      );
      expect(result.current.selectedVariant?.id).toBe("v1");
    });

    it("should resolve variant price after selection", () => {
      const { result } = renderHook(() =>
        useProductVariants(mockProductWithVariants)
      );

      act(() => {
        result.current.selectOption("Color", "White");
        result.current.selectOption("Size", "42");
      });

      expect(result.current.selectedVariant?.id).toBe("v2");
      expect(result.current.resolvedPrice).toBe(1350);
    });

    it("should resolve compareAtPrice from selected variant", () => {
      const { result } = renderHook(() =>
        useProductVariants(mockProductWithVariants)
      );

      act(() => {
        result.current.selectOption("Color", "Black");
        result.current.selectOption("Size", "42");
      });

      expect(result.current.resolvedCompareAtPrice).toBe(1500);
    });

    it("should reset selection correctly", () => {
      const { result } = renderHook(() =>
        useProductVariants(mockProductWithVariants)
      );

      act(() => {
        result.current.selectOption("Color", "White");
      });
      act(() => {
        result.current.resetSelection();
      });

      expect(result.current.selectedOptions).toEqual({});
    });

    it("should filter available Color values based on selected Size", () => {
      const { result } = renderHook(() =>
        useProductVariants(mockProductWithVariants)
      );

      act(() => {
        result.current.selectOption("Size", "44");
      });

      // Only "Black" + Size 44 exists (v3); White + 44 does NOT exist
      const availableColors = result.current.getAvailableValues("Color");
      expect(availableColors).toContain("Black");
      expect(availableColors).not.toContain("White");
    });
  });

  // ── Null / Undefined Guard ────────────────────────────────
  describe("null/undefined product guard", () => {
    it("should safely handle null product without crashing", () => {
      const { result } = renderHook(() => useProductVariants(null));
      expect(result.current.variants).toEqual([]);
      expect(result.current.resolvedPrice).toBe(0);
      expect(result.current.hasVariants).toBe(false);
    });

    it("should safely handle undefined product", () => {
      const { result } = renderHook(() => useProductVariants(undefined));
      expect(result.current.optionGroups).toEqual([]);
    });
  });
});
