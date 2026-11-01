// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { buildCheckoutOrderPayload } from "../hooks/useCheckout";
import type { CheckoutData } from "../hooks/useCheckout";
import type { CartItem } from "../store/useCartStore";

describe("buildCheckoutOrderPayload", () => {
  it("maps storefront checkout data to the public orders contract", () => {
    const data: CheckoutData = {
      customerName: "Mokhtar Demo",
      email: "mokhtar@example.com",
      phone: "+201000000000",
      address: "12 Nile Street",
      city: "Nasr City",
      governorate: "Cairo",
      notes: "Leave at reception",
      paymentMethod: "cod",
    };

    const items: CartItem[] = [
      {
        id: "item_1",
        productId: "prod_1",
        variantId: "variant_black",
        name: "Studio Tote",
        price: 199,
        quantity: 2,
        imageUrl: "https://example.com/tote.jpg",
        attributes: {
          Color: "Black",
        },
      },
    ];

    const payload = buildCheckoutOrderPayload(
      {
        ...data,
        shippingCost: 35,
        subtotal: 398,
        total: 433,
      },
      items,
      398,
      "cmp_demo",
    );

    expect(payload.companyId).toBe("cmp_demo");
    expect(payload.guestName).toBe("Mokhtar Demo");
    expect(payload.guestEmail).toBe("mokhtar@example.com");
    expect(payload.guestPhone).toBe("+201000000000");
    expect(payload.shippingAddress).toEqual({
      address: "12 Nile Street",
      addressLine1: "12 Nile Street",
      street: "12 Nile Street",
      city: "Nasr City",
      governorate: "Cairo",
    });
    expect(payload.paymentMethod).toBe("cod");
    expect(payload.notes).toBe("Leave at reception");
    expect(payload.subtotal).toBe(398);
    expect(payload.shippingCost).toBe(35);
    expect(payload.total).toBe(433);
    expect(payload.items).toEqual([
      {
        productId: "prod_1",
        variantId: "variant_black",
        name: "Studio Tote",
        price: 199,
        quantity: 2,
        attributes: {
          Color: "Black",
        },
        productColor: "Black",
        color: "Black",
        image: "https://example.com/tote.jpg",
        productImage: "https://example.com/tote.jpg",
      },
    ]);
  });

  it("does not require companyId for subdomain storefronts", () => {
    const data: CheckoutData = {
      customerName: "Guest Customer",
      email: "",
      phone: "01000000000",
      address: "45 Corniche",
      city: "Alexandria",
      governorate: "Alexandria",
      paymentMethod: "wallet",
    };

    const payload = buildCheckoutOrderPayload(data, [], 0);

    expect(payload.companyId).toBeUndefined();
    expect(payload.guestName).toBe("Guest Customer");
    expect(payload.guestEmail).toBe("");
    expect(payload.paymentMethod).toBe("wallet");
  });
  it("preserves Arabic attributes (اللون and المقاسات) in checkout payload", () => {
    const data: CheckoutData = {
      customerName: "أحمد تجربة",
      email: "ahmed@example.com",
      phone: "01012345678",
      address: "15 المعادي",
      city: "القاهرة",
      governorate: "القاهرة",
      paymentMethod: "cod",
      shippingCost: 65,
      subtotal: 1845,
      total: 1910,
    };

    const items: CartItem[] = [
      {
        id: "item_arabic",
        productId: "prod_arabic",
        variantId: "var_arabic",
        name: "طقم Balloon",
        price: 1845,
        quantity: 1,
        attributes: {
          "اللون": "رمادي",
          "المقاسات": "XL",
        },
      },
    ];

    const payload = buildCheckoutOrderPayload(data, items, 1845, "cmp_soco");

    expect(payload.shippingCost).toBe(65);
    expect(payload.total).toBe(1910);
    expect(payload.items[0].productColor).toBe("رمادي");
    expect(payload.items[0].color).toBe("رمادي");
    expect(payload.items[0].productSize).toBe("XL");
    expect(payload.items[0].size).toBe("XL");
    expect(payload.items[0].variantId).toBe("var_arabic");
  });

  it("handles products without variants smoothly without error", () => {
    const data: CheckoutData = {
      customerName: "عميل بدون متغيرات",
      email: "",
      phone: "01000000000",
      address: "عنوان بسيط",
      city: "الجيزة",
      governorate: "الجيزة",
      paymentMethod: "cod",
      shippingCost: 50,
      subtotal: 300,
      total: 350,
    };

    const items: CartItem[] = [
      {
        id: "item_simple",
        productId: "prod_simple",
        name: "منتج بسيط",
        price: 300,
        quantity: 1,
      },
    ];

    const payload = buildCheckoutOrderPayload(data, items, 300, "cmp_test");

    expect(payload.shippingCost).toBe(50);
    expect(payload.total).toBe(350);
    expect(payload.items[0].productId).toBe("prod_simple");
    expect(payload.items[0].variantId).toBeUndefined();
    expect(payload.items[0].productColor).toBeUndefined();
    expect(payload.items[0].productSize).toBeUndefined();
  });
});