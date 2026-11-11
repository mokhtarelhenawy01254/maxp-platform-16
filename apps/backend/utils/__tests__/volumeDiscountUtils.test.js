const {
  applyVolumeDiscount,
  calculateCartVolumeDiscounts,
  calculateVolumeDiscountPricing,
  getApplicableVolumeDiscount,
  getVolumeDiscountsFromMetadata,
  buildMetadataWithVolumeDiscounts,
} = require('../volumeDiscountUtils');

describe('volumeDiscountUtils', () => {
  describe('applyVolumeDiscount (Unified Function)', () => {
    const discounts = [
      {
        id: 'tier-2',
        minQuantity: 2,
        maxQuantity: 2,
        discountType: 'fixed',
        discountValue: 24, // 300 - 24 = 276
        isActive: true,
      },
      {
        id: 'tier-3',
        minQuantity: 3,
        maxQuantity: null,
        discountType: 'fixed',
        discountValue: 36, // 300 - 36 = 264
        isActive: true,
      },
    ];

    test('applies 2-piece offer for swan-sneaker-11 (300 unit price -> 276 each, total 552)', () => {
      const result = applyVolumeDiscount({
        unitPrice: 300,
        quantity: 2,
        discounts,
      });

      expect(result.appliedDiscount).toBeDefined();
      expect(result.baseUnitPrice).toBe(300);
      expect(result.effectiveUnitPrice).toBe(276);
      expect(result.baseSubtotal).toBe(600);
      expect(result.lineSubtotal).toBe(552);
      expect(result.totalDiscount).toBe(48);
      expect(calculateVolumeDiscountPricing).toBe(applyVolumeDiscount);
    });

    test('supports metadata quantityOffers with unitPrice or totalPrice (swan-sneaker-11 ×2 = 552)', () => {
      const fromUnitPrice = applyVolumeDiscount({
        unitPrice: 300,
        quantity: 2,
        metadata: {
          quantityOffers: [{ id: 'qo-2', quantity: 2, unitPrice: 276, isActive: true }],
        },
      });
      expect(fromUnitPrice.effectiveUnitPrice).toBe(276);
      expect(fromUnitPrice.lineSubtotal).toBe(552);
      expect(fromUnitPrice.totalDiscount).toBe(48);

      const fromTotalPrice = applyVolumeDiscount({
        unitPrice: 300,
        quantity: 2,
        metadata: {
          quantityOffers: [{ id: 'qo-2-tot', quantity: 2, totalPrice: 552, isActive: true }],
        },
      });
      expect(fromTotalPrice.effectiveUnitPrice).toBe(276);
      expect(fromTotalPrice.lineSubtotal).toBe(552);
      expect(fromTotalPrice.totalDiscount).toBe(48);

      const fromPct = applyVolumeDiscount({
        unitPrice: 300,
        quantity: 2,
        metadata: {
          quantityOffers: [{ id: 'qo-2-pct', minQuantity: 2, discountPercent: 8, isActive: true }],
        },
      });
      expect(fromPct.effectiveUnitPrice).toBe(276);
      expect(fromPct.lineSubtotal).toBe(552);
    });

    test('applies 3-piece offer (300 unit price with 36 discount -> 264 each, total 792)', () => {
      const result = applyVolumeDiscount({
        unitPrice: 300,
        quantity: 3,
        discounts,
      });

      expect(result.appliedDiscount).toBeDefined();
      expect(result.baseUnitPrice).toBe(300);
      expect(result.effectiveUnitPrice).toBe(264);
      expect(result.baseSubtotal).toBe(900);
      expect(result.lineSubtotal).toBe(792);
      expect(result.totalDiscount).toBe(108);
    });

    test('zero regression: 1 piece has no discount and preserves regular price', () => {
      const result = applyVolumeDiscount({
        unitPrice: 300,
        quantity: 1,
        discounts,
      });

      expect(result.appliedDiscount).toBeNull();
      expect(result.effectiveUnitPrice).toBe(300);
      expect(result.lineSubtotal).toBe(300);
      expect(result.totalDiscount).toBe(0);
    });

    test('zero regression: product with no volume discounts preserves regular price for any quantity', () => {
      const result = applyVolumeDiscount({
        unitPrice: 300,
        quantity: 5,
        discounts: [],
      });

      expect(result.appliedDiscount).toBeNull();
      expect(result.effectiveUnitPrice).toBe(300);
      expect(result.lineSubtotal).toBe(1500);
      expect(result.totalDiscount).toBe(0);
    });

    test('ignores inactive discounts and normalizes uppercase discountType when discounts array is passed directly', () => {
      const result = applyVolumeDiscount({
        unitPrice: 300,
        quantity: 2,
        discounts: [
          { id: 'inactive-2', minQuantity: 2, discountType: 'fixed', discountValue: 100, isActive: false },
          { id: 'pct-2', minQuantity: 2, discountType: 'PERCENTAGE', discountValue: 8, isActive: true },
        ],
      });

      expect(result.appliedDiscount?.id).toBe('pct-2');
      expect(result.appliedDiscount?.discountType).toBe('percentage');
      expect(result.effectiveUnitPrice).toBe(276);
      expect(result.lineSubtotal).toBe(552);
    });
  });

  describe('Cart & Order Creation Parity (calculateCartVolumeDiscounts)', () => {
    const product = {
      id: 'swan-sneaker-11',
      price: 300,
      metadata: JSON.stringify({
        quantityOffers: [{ id: 'offer-2', quantity: 2, unitPrice: 276, isActive: true }],
      }),
    };

    test('cart subtotal equals order total (552) for single-line qty=2 and split multi-variant qty=1+1', () => {
      const singleLineCart = calculateCartVolumeDiscounts([
        { productId: 'swan-sneaker-11', basePrice: 300, quantity: 2, product },
      ]);
      expect(singleLineCart.subtotal).toBe(552);
      expect(singleLineCart.baseSubtotal).toBe(600);
      expect(singleLineCart.totalDiscount).toBe(48);

      const splitVariantCart = calculateCartVolumeDiscounts([
        {
          productId: 'swan-sneaker-11',
          variantId: 'v-41',
          basePrice: 300,
          quantity: 1,
          product,
          quantityOffer: { groupId: 'grp-1', offerId: 'offer-2', offerQuantity: 2 },
        },
        {
          productId: 'swan-sneaker-11',
          variantId: 'v-42',
          basePrice: 300,
          quantity: 1,
          product,
          quantityOffer: { groupId: 'grp-1', offerId: 'offer-2', offerQuantity: 2 },
        },
      ]);
      expect(splitVariantCart.subtotal).toBe(552);
      expect(splitVariantCart.subtotal).toBe(singleLineCart.subtotal);

      const decrementedCart = calculateCartVolumeDiscounts([
        { productId: 'swan-sneaker-11', price: 276, basePrice: 300, quantity: 1, product },
      ]);
      expect(decrementedCart.subtotal).toBe(300);
      expect(decrementedCart.totalDiscount).toBe(0);
    });

    test('zero regression for cart item without volume discount', () => {
      const plainProduct = { id: 'plain-1', price: 300, metadata: '{}' };
      const plainCart = calculateCartVolumeDiscounts([
        { productId: 'plain-1', basePrice: 300, quantity: 2, product: plainProduct },
      ]);
      expect(plainCart.subtotal).toBe(600);
      expect(plainCart.totalDiscount).toBe(0);
    });
  });

  describe('Single Source of Truth', () => {
    test('prioritizes quantityOffers when both quantityOffers and volumeDiscounts exist in metadata', () => {
      const conflictingMetadata = {
        quantityOffers: [
          {
            id: 'qo-2',
            quantity: 2,
            unitPrice: 276, // 300 - 276 = 24 discount
            isActive: true,
          },
        ],
        volumeDiscounts: [
          {
            id: 'vd-2',
            minQuantity: 2,
            maxQuantity: null,
            discountType: 'fixed',
            discountValue: 10, // Conflicting old discount
            isActive: true,
          },
        ],
      };

      const discounts = getVolumeDiscountsFromMetadata(conflictingMetadata, {
        activeOnly: true,
        basePrice: 300,
      });

      expect(discounts.length).toBe(1);
      expect(discounts[0].discountValue).toBe(24);
      expect(discounts[0].minQuantity).toBe(2);
    });

    test('falls back to volumeDiscounts if quantityOffers only contains 1-piece entries', () => {
      const metadata = {
        quantityOffers: [{ id: 'qo-1', quantity: 1, unitPrice: 300, isActive: true }],
        volumeDiscounts: [
          { id: 'vd-2', minQuantity: 2, discountType: 'fixed', discountValue: 24, isActive: true },
        ],
      };
      const discounts = getVolumeDiscountsFromMetadata(metadata, {
        activeOnly: true,
        basePrice: 300,
      });
      expect(discounts.length).toBe(1);
      expect(discounts[0].discountValue).toBe(24);
    });

    test('buildMetadataWithVolumeDiscounts removes quantityOffers to prevent conflicting sources', () => {
      const existingMetadata = {
        notes: 'test',
        quantityOffers: [{ id: 'q1', quantity: 2, unitPrice: 250 }],
      };

      const updatedJson = buildMetadataWithVolumeDiscounts(existingMetadata, [
        { minQuantity: 2, discountType: 'fixed', discountValue: 50 },
      ]);

      const parsed = JSON.parse(updatedJson);
      expect(parsed.notes).toBe('test');
      expect(parsed.volumeDiscounts).toBeDefined();
      expect(parsed.volumeDiscounts.length).toBe(1);
      expect(parsed.quantityOffers).toBeUndefined();
    });
  });
});
