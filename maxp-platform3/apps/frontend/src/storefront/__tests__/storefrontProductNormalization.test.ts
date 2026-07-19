// @vitest-environment jsdom

import { describe, expect, it } from "vitest";

import { normalizeStorefrontProduct } from "../hooks/useProducts";

describe("normalizeStorefrontProduct", () => {
  it("parses numeric product and variant prices from preview/admin payloads", () => {
    const normalizedProduct = normalizeStorefrontProduct({
      id: "product-1",
      name: "Classic Watch",
      description: "",
      price: "4500",
      comparePrice: "5850",
      slug: "classic-watch",
      images: ["/watch.jpg"],
      productVariants: [
        {
          id: "variant-1",
          name: "Black / 42",
          price: "4500",
          comparePrice: "5625",
          attributes: {
            color: "Black",
            size: "42",
          },
        },
      ],
    } as any);

    expect(normalizedProduct.price).toBe(4500);
    expect(normalizedProduct.comparePrice).toBe(5850);
    expect(normalizedProduct.productVariants?.[0]?.price).toBe(4500);
    expect(normalizedProduct.productVariants?.[0]?.comparePrice).toBe(5625);
  });
});
