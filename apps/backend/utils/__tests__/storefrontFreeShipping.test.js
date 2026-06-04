const {
  resolveConversionSuiteFreeShippingPromotion,
} = require('../storefrontFreeShipping');

describe('resolveConversionSuiteFreeShippingPromotion', () => {
  test('applies conversion-suite free shipping when subtotal reaches the configured threshold', () => {
    const promotion = resolveConversionSuiteFreeShippingPromotion({
      rawSettings: {
        general: {
          enabled: true,
        },
        modules: {
          freeShippingBar: true,
        },
        thresholds: {
          freeShippingAmount: 799,
        },
      },
      subtotal: 1028,
    });

    expect(promotion).toMatchObject({
      enabled: true,
      eligible: true,
      threshold: 799,
      remaining: 0,
      source: 'conversion-suite',
    });
  });

  test('keeps shipping chargeable below the threshold', () => {
    const promotion = resolveConversionSuiteFreeShippingPromotion({
      rawSettings: {
        modules: {
          freeShippingBar: true,
        },
        thresholds: {
          freeShippingAmount: 799,
        },
      },
      subtotal: 700,
    });

    expect(promotion).toMatchObject({
      enabled: true,
      eligible: false,
      threshold: 799,
      remaining: 99,
    });
  });

  test('does not apply when the free-shipping bar is disabled', () => {
    const promotion = resolveConversionSuiteFreeShippingPromotion({
      rawSettings: {
        modules: {
          freeShippingBar: false,
        },
        thresholds: {
          freeShippingAmount: 799,
        },
      },
      subtotal: 1028,
    });

    expect(promotion).toMatchObject({
      enabled: false,
      eligible: false,
      threshold: 799,
    });
  });
});
