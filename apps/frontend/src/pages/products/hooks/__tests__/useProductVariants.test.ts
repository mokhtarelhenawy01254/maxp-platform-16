import { renderHook, act } from "@testing-library/react";
import { useProductVariants } from "../useProductVariants";

jest.mock("../../../../utils/apiHelpers", () => ({
  uploadFiles: jest.fn(),
  deleteFile: jest.fn(),
}));

jest.mock("../../../../utils/imageUrl", () => ({
  normalizeImagePath: (value: string) => value,
}));

describe("useProductVariants - Pricing Settings Inheritance", () => {
  it("initializes a new variant with default pricing settings from product", () => {
    const defaultPricing = {
      price: 250,
      comparePrice: 300,
      cost: 150,
      shippingClass: "express",
      lowStockThreshold: 3,
    };

    const { result } = renderHook(() =>
      useProductVariants(true, defaultPricing)
    );

    act(() => {
      result.current.addVariant();
    });

    expect(result.current.variants).toHaveLength(1);
    const variant = result.current.variants[0];
    expect(variant.price).toBe(250);
    expect(variant.comparePrice).toBe(300);
    expect(variant.cost).toBe(150);
    expect(variant.shippingClass).toBe("express");
    expect(variant.lowStockThreshold).toBe(3);
  });

  it("allows merchant to customize variant price freely without being overwritten", () => {
    const defaultPricing = {
      price: 200,
      comparePrice: 250,
      cost: 100,
    };

    const { result } = renderHook(() =>
      useProductVariants(true, defaultPricing)
    );

    act(() => {
      result.current.addVariant();
    });

    expect(result.current.variants[0].price).toBe(200);

    // Merchant customizes this variant's price
    act(() => {
      result.current.updateVariant(0, "price", 280);
    });

    expect(result.current.variants[0].price).toBe(280);
  });

  it("applies default pricing settings when generating variations from attributes", () => {
    const defaultPricing = {
      price: 180,
      comparePrice: 220,
      cost: 90,
    };

    const { result } = renderHook(() =>
      useProductVariants(true, defaultPricing)
    );

    // Set attributes
    act(() => {
      result.current.setAttributes([
        {
          id: "attr_size",
          name: "Size",
          slug: "size",
          values: ["M", "L"],
          visible: true,
          forVariations: true,
        },
      ]);
    });

    act(() => {
      result.current.generateVariations("PROD-SKU");
    });

    expect(result.current.variants).toHaveLength(2);
    expect(result.current.variants[0].price).toBe(180);
    expect(result.current.variants[0].comparePrice).toBe(220);
    expect(result.current.variants[0].cost).toBe(90);

    expect(result.current.variants[1].price).toBe(180);
    expect(result.current.variants[1].comparePrice).toBe(220);
    expect(result.current.variants[1].cost).toBe(90);
  });

  it("syncWithProductPricing syncs all variants or a target variant", () => {
    let currentPricing = { price: 300, comparePrice: 400, cost: 200 };
    const { result, rerender } = renderHook(
      ({ pricing }) => useProductVariants(true, pricing),
      { initialProps: { pricing: currentPricing } }
    );

    act(() => {
      result.current.addVariant();
      result.current.addVariant();
    });

    // Merchant changed variant 0 to custom price
    act(() => {
      result.current.updateVariant(0, "price", 350);
    });

    expect(result.current.variants[0].price).toBe(350);
    expect(result.current.variants[1].price).toBe(300);

    // Product price changed to 500
    currentPricing = { price: 500, comparePrice: 600, cost: 250 };
    rerender({ pricing: currentPricing });

    // Sync only variant 0
    act(() => {
      result.current.syncWithProductPricing(0);
    });
    expect(result.current.variants[0].price).toBe(500);

    // Sync all
    act(() => {
      result.current.syncWithProductPricing();
    });
    expect(result.current.variants[0].price).toBe(500);
    expect(result.current.variants[1].price).toBe(500);
  });

  it("sync_product_pricing bulk action applies base pricing to all variants", () => {
    const defaultPricing = { price: 450, comparePrice: 500, cost: 300 };
    const { result } = renderHook(() =>
      useProductVariants(true, defaultPricing)
    );

    act(() => {
      result.current.addVariant();
      result.current.addVariant();
    });

    // Modify prices
    act(() => {
      result.current.updateVariant(0, "price", 100);
      result.current.updateVariant(1, "price", 120);
    });

    // Apply bulk action
    act(() => {
      result.current.handleBulkActionChange("sync_product_pricing");
    });
    act(() => {
      result.current.applyBulkAction();
    });

    expect(result.current.variants[0].price).toBe(450);
    expect(result.current.variants[1].price).toBe(450);
  });

  it("batchUpdateVariants updates multiple variant fields at once", () => {
    const { result } = renderHook(() => useProductVariants(true));

    act(() => {
      result.current.addVariant();
      result.current.addVariant();
      result.current.addVariant();
    });

    act(() => {
      result.current.batchUpdateVariants([0, 2], {
        image: "https://example.com/test-batch.jpg",
        images: ["https://example.com/test-batch.jpg"],
      });
    });

    expect(result.current.variants[0].image).toBe("https://example.com/test-batch.jpg");
    expect(result.current.variants[0].images).toEqual(["https://example.com/test-batch.jpg"]);
    expect(result.current.variants[1].image).toBeUndefined();
    expect(result.current.variants[2].image).toBe("https://example.com/test-batch.jpg");
  });

  it("generateVariations preserves existing variant ID and pricing when combination matches", () => {
    const { result } = renderHook(() => useProductVariants(true, { price: 100 }));

    // Simulate an existing variant loaded from DB
    act(() => {
      result.current.setVariants([
        {
          id: "var_existing_m",
          name: "M",
          type: "combination",
          sku: "SKU-M",
          price: 250,
          comparePrice: 300,
          cost: 120,
          images: ["https://example.com/m.jpg"],
          stock: 15,
          trackInventory: true,
          isActive: true,
          sortOrder: 0,
          attributeValues: { size: "M" },
        },
      ]);
      result.current.setAttributes([
        {
          id: "attr_size",
          name: "Size",
          slug: "size",
          values: ["M", "L"],
          visible: true,
          forVariations: true,
        },
      ]);
    });

    act(() => {
      result.current.generateVariations("SKU");
    });

    expect(result.current.variants).toHaveLength(2);

    // Existing variant M must keep its ID, price, stock, images
    const variantM = result.current.variants.find((v) => v.name === "M");
    expect(variantM).toBeDefined();
    expect(variantM?.id).toBe("var_existing_m");
    expect(variantM?.price).toBe(250);
    expect(variantM?.stock).toBe(15);
    expect(variantM?.images).toEqual(["https://example.com/m.jpg"]);

    // New variant L must be created with default pricing and without ID
    const variantL = result.current.variants.find((v) => v.name === "L");
    expect(variantL).toBeDefined();
    expect(variantL?.id).toBeUndefined();
    expect(variantL?.price).toBe(100);

    // No variants were deleted
    expect(result.current.deletedVariantIds).toHaveLength(0);
  });

  it("generateVariations tracks removed variant IDs in deletedVariantIds when an attribute value is removed", () => {
    const { result } = renderHook(() => useProductVariants(true, { price: 100 }));

    act(() => {
      result.current.setVariants([
        {
          id: "var_m",
          name: "M",
          type: "combination",
          attributeValues: { size: "M" },
          isActive: true,
          sortOrder: 0,
        },
        {
          id: "var_l",
          name: "L",
          type: "combination",
          attributeValues: { size: "L" },
          isActive: true,
          sortOrder: 1,
        },
      ]);
      // Merchant removed "L", only "M" remains
      result.current.setAttributes([
        {
          id: "attr_size",
          name: "Size",
          slug: "size",
          values: ["M"],
          visible: true,
          forVariations: true,
        },
      ]);
    });

    act(() => {
      result.current.generateVariations("SKU");
    });

    expect(result.current.variants).toHaveLength(1);
    expect(result.current.variants[0].id).toBe("var_m");

    // var_l must be tracked in deletedVariantIds so backend deletes it on save!
    expect(result.current.deletedVariantIds).toContain("var_l");
  });
});
