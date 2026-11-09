const {
  applyVolumeDiscount,
  getApplicableVolumeDiscount,
  getVolumeDiscountsFromMetadata,
  buildMetadataWithVolumeDiscounts,
} = require('../volumeDiscountUtils');

describe('volumeDiscountUtils', () => {
  describe('applyVolumeDiscount', () => {
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

    test('applies 2-piece offer (300 unit price with 24 discount -> 276 each, total 552)', () => {
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
      // Must take the quantityOffers value: 300 - 276 = 24
      expect(discounts[0].discountValue).toBe(24);
      expect(discounts[0].minQuantity).toBe(2);
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
