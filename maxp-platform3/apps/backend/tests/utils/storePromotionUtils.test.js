const { calculateDiscount, parseTiers, getApplicableTier, isItemOnSale } = require("../../utils/storePromotionUtils");

describe("storePromotionUtils", () => {
  describe("parseTiers", () => {
    test("parses valid tier array", () => {
      const tiers = parseTiers([
        { minQuantity: 2, type: "cheapest_percentage", value: 50, items: 1, label: "2 والتانية بنص التمن" },
        { minQuantity: 3, type: "cheapest_percentage", value: 100, items: 1, label: "3 والتالتة هدية" },
      ]);
      expect(tiers).toHaveLength(2);
      expect(tiers[0].minQuantity).toBe(2);
      expect(tiers[1].minQuantity).toBe(3);
    });

    test("parses JSON string", () => {
      const tiers = parseTiers(JSON.stringify([
        { minQuantity: 2, type: "all_percentage", value: 10 },
      ]));
      expect(tiers).toHaveLength(1);
      expect(tiers[0].type).toBe("all_percentage");
    });

    test("rejects invalid type", () => {
      expect(parseTiers([{ minQuantity: 2, type: "bogus", value: 50 }])).toHaveLength(0);
    });

    test("rejects zero value", () => {
      expect(parseTiers([{ minQuantity: 2, type: "all_percentage", value: 0 }])).toHaveLength(0);
    });

    test("clamps minQuantity to 1", () => {
      const tiers = parseTiers([{ minQuantity: 0, type: "all_percentage", value: 10 }]);
      expect(tiers).toHaveLength(1);
      expect(tiers[0].minQuantity).toBe(1);
    });

    test("clamps value to 100", () => {
      const tiers = parseTiers([{ minQuantity: 1, type: "all_percentage", value: 150 }]);
      expect(tiers[0].value).toBe(100);
    });

    test("handles null input", () => {
      expect(parseTiers(null)).toEqual([]);
    });

    test("handles malformed JSON string", () => {
      expect(parseTiers("not-json")).toEqual([]);
    });
  });

  describe("getApplicableTier", () => {
    const tiers = [
      { minQuantity: 2, type: "cheapest_percentage", value: 50, items: 1, isActive: true },
      { minQuantity: 3, type: "cheapest_percentage", value: 100, items: 1, isActive: true },
    ];
    test("returns null below any threshold", () => {
      expect(getApplicableTier(tiers, 1)).toBeNull();
    });
    test("returns tier 1 at qty 2", () => {
      expect(getApplicableTier(tiers, 2).minQuantity).toBe(2);
    });
    test("returns highest tier at qty 5", () => {
      expect(getApplicableTier(tiers, 5).minQuantity).toBe(3);
    });
    test("skips inactive tiers", () => {
      const inactive = [{ minQuantity: 2, type: "all_percentage", value: 10, isActive: false }];
      expect(getApplicableTier(inactive, 5)).toBeNull();
    });
  });

  describe("calculateDiscount", () => {
    const tiers = [
      { minQuantity: 2, type: "cheapest_percentage", value: 50, items: 1, label: "2 والتانية بنص التمن" },
      { minQuantity: 3, type: "cheapest_percentage", value: 100, items: 1, label: "3 والتالتة هدية" },
    ];

    test("returns 0 discount when below threshold", () => {
      const r = calculateDiscount({ cartItems: [{ productId: "a", price: 100, quantity: 1 }], tiers });
      expect(r.discount).toBe(0);
      expect(r.tier).toBeNull();
    });

    test("cheapest_percentage 50% on cheapest of 2 items", () => {
      const r = calculateDiscount({
        cartItems: [
          { productId: "a", price: 100, quantity: 1 },
          { productId: "b", price: 200, quantity: 1 },
        ],
        tiers,
      });
      expect(r.tier.minQuantity).toBe(2);
      expect(r.discount).toBe(50);
    });

    test("cheapest 100% = free cheapest item at tier 2", () => {
      const r = calculateDiscount({
        cartItems: [
          { productId: "a", price: 449, quantity: 1 },
          { productId: "b", price: 449, quantity: 1 },
          { productId: "c", price: 449, quantity: 1 },
        ],
        tiers,
      });
      expect(r.tier.minQuantity).toBe(3);
      expect(r.discount).toBe(449);
    });

    test("all_percentage applies to every unit", () => {
      const allTiers = [{ minQuantity: 2, type: "all_percentage", value: 10, items: 0 }];
      const r = calculateDiscount({
        cartItems: [{ productId: "a", price: 100, quantity: 3 }],
        tiers: allTiers,
      });
      expect(r.discount).toBe(30);
    });

    test("quantity > 1 expands to unit prices", () => {
      const r = calculateDiscount({
        cartItems: [{ productId: "a", price: 200, quantity: 3 }],
        tiers,
      });
      expect(r.tier.minQuantity).toBe(3);
      expect(r.discount).toBe(200);
    });

    test("handles empty cart", () => {
      const r = calculateDiscount({ cartItems: [], tiers });
      expect(r.discount).toBe(0);
    });

    test("handles empty tiers", () => {
      const r = calculateDiscount({ cartItems: [{ productId: "a", price: 100, quantity: 5 }], tiers: [] });
      expect(r.discount).toBe(0);
    });

    test("disableOtherDiscounts skips sale items from discount", () => {
      const r = calculateDiscount({
        cartItems: [
          { productId: "sale", price: 100, comparePrice: 200, quantity: 2 },
          { productId: "full", price: 300, quantity: 1 },
        ],
        tiers,
        disableOtherDiscounts: true,
      });
      expect(r.tier.minQuantity).toBe(3);
      expect(r.discount).toBe(300);
    });

    test("disableOtherDiscounts=false applies discount to sale items too", () => {
      const r = calculateDiscount({
        cartItems: [
          { productId: "sale", price: 100, comparePrice: 200, quantity: 2 },
          { productId: "full", price: 300, quantity: 1 },
        ],
        tiers,
        disableOtherDiscounts: false,
      });
      expect(r.discount).toBe(100);
    });

    test("isItemOnSale detects comparePrice > price", () => {
      expect(isItemOnSale({ price: 100, comparePrice: 200 })).toBe(true);
      expect(isItemOnSale({ price: 100, comparePrice: 100 })).toBe(false);
      expect(isItemOnSale({ price: 100, comparePrice: 0 })).toBe(false);
      expect(isItemOnSale({ price: 100 })).toBe(false);
    });
  });
});