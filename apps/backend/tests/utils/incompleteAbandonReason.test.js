const { detectAbandonReason } = require('../../utils/incompleteAbandonReason');

describe('detectAbandonReason', () => {
  const baseCart = {
    items: JSON.stringify([{ productId: 'p1', quantity: 1 }]),
    total: 100,
    status: 'active',
  };

  describe('checkoutError codes (new)', () => {
    const makeCart = (errorCode, errorMessage = 'test error') => ({
      ...baseCart,
      checkoutData: JSON.stringify({
        customerName: 'أحمد',
        phone: '01012345678',
        address: 'شارع التحرير',
        city: 'القاهرة',
        governorate: 'القاهرة',
        paymentMethod: 'cash',
        _checkoutError: {
          code: errorCode,
          message: errorMessage,
          failedAt: new Date().toISOString(),
        },
      }),
    });

    test('stock_insufficient', () => {
      const result = detectAbandonReason(makeCart('stock_insufficient', 'المخزون غير كافي: product1. المتوفر: 0'));
      expect(result.code).toBe('stock_insufficient');
      expect(result.evidence[0]).toContain('المخزون');
    });

    test('product_not_found', () => {
      const result = detectAbandonReason(makeCart('product_not_found', 'المنتج غير موجود: product1'));
      expect(result.code).toBe('product_not_found');
    });

    test('dropshipping_unavailable', () => {
      const result = detectAbandonReason(makeCart('dropshipping_unavailable'));
      expect(result.code).toBe('dropshipping_unavailable');
    });

    test('variant_not_found', () => {
      const result = detectAbandonReason(makeCart('variant_not_found'));
      expect(result.code).toBe('variant_not_found');
    });

    test('minimum_order_not_met', () => {
      const result = detectAbandonReason(makeCart('minimum_order_not_met'));
      expect(result.code).toBe('minimum_order_not_met');
    });

    test('missing_required_fields', () => {
      const result = detectAbandonReason(makeCart('missing_required_fields'));
      expect(result.code).toBe('missing_required_fields');
    });

    test('invalid_cart_data', () => {
      const result = detectAbandonReason(makeCart('invalid_cart_data'));
      expect(result.code).toBe('invalid_cart_data');
    });

    test('invalid_quantity', () => {
      const result = detectAbandonReason(makeCart('invalid_quantity'));
      expect(result.code).toBe('invalid_quantity');
    });

    test('empty_cart', () => {
      const result = detectAbandonReason(makeCart('empty_cart'));
      expect(result.code).toBe('empty_cart');
    });

    test('no_cart_data', () => {
      const result = detectAbandonReason(makeCart('no_cart_data'));
      expect(result.code).toBe('no_cart_data');
    });
  });

  describe('fallback to inference (existing logic)', () => {
    test('no_checkout when no checkout data', () => {
      const result = detectAbandonReason({ ...baseCart, checkoutData: null });
      expect(result.code).toBe('no_checkout');
    });

    test('no_phone when phone missing', () => {
      const result = detectAbandonReason({
        ...baseCart,
        checkoutData: JSON.stringify({ customerName: 'أحمد', address: 'شارع' }),
      });
      expect(result.code).toBe('no_phone');
    });

    test('partial_shipping when address missing', () => {
      const result = detectAbandonReason({
        ...baseCart,
        checkoutData: JSON.stringify({
          customerName: 'أحمد',
          phone: '01012345678',
          city: 'القاهرة',
          governorate: 'القاهرة',
        }),
      });
      expect(result.code).toBe('partial_shipping');
      expect(result.evidence).toContain('address');
    });

    test('no_payment when paymentMethod missing', () => {
      const result = detectAbandonReason({
        ...baseCart,
        checkoutData: JSON.stringify({
          customerName: 'أحمد',
          phone: '01012345678',
          address: 'شارع التحرير',
          city: 'القاهرة',
          governorate: 'القاهرة',
        }),
      });
      expect(result.code).toBe('no_payment');
    });

    test('lost when status is lost', () => {
      const result = detectAbandonReason({
        ...baseCart,
        status: 'lost',
        checkoutData: JSON.stringify({
          customerName: 'أحمد',
          phone: '01012345678',
          address: 'شارع التحرير',
          city: 'القاهرة',
          governorate: 'القاهرة',
          paymentMethod: 'cash',
        }),
      });
      expect(result.code).toBe('lost');
    });

    test('not_submitted when everything filled', () => {
      const result = detectAbandonReason({
        ...baseCart,
        checkoutStartedAt: new Date(Date.now() - 600000).toISOString(),
        checkoutUpdatedAt: new Date(Date.now() - 300000).toISOString(),
        checkoutData: JSON.stringify({
          customerName: 'أحمد',
          phone: '01012345678',
          address: 'شارع التحرير',
          city: 'القاهرة',
          governorate: 'القاهرة',
          paymentMethod: 'cash',
        }),
      });
      expect(result.code).toBe('not_submitted');
    });
  });

  describe('checkoutError takes priority over inference', () => {
    test('even with complete checkout data, error code wins', () => {
      const result = detectAbandonReason({
        ...baseCart,
        checkoutData: JSON.stringify({
          customerName: 'أحمد',
          phone: '01012345678',
          address: 'شارع التحرير',
          city: 'القاهرة',
          governorate: 'القاهرة',
          paymentMethod: 'cash',
          _checkoutError: { code: 'stock_insufficient', message: 'out of stock' },
        }),
      });
      expect(result.code).toBe('stock_insufficient');
    });
  });
});
