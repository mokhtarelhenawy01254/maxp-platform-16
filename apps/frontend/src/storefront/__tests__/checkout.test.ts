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
        image: "https://example.com/tote.jpg",
        productImage: "https://example.com/tote.jpg",
        attributes: {
          Color: "Black",
        },
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
});
