const router = require('../routes/orders');

describe('Order Source Filter Condition Map (buildRegularSourceCondition)', () => {
  const buildRegularSourceCondition = router._buildRegularSourceCondition;

  test('should export buildRegularSourceCondition on router', () => {
    expect(typeof buildRegularSourceCondition).toBe('function');
  });

  describe('Affiliate Direct source filtering', () => {
    test('returns orderSource: AFFILIATE_DIRECT for "affiliate_direct"', () => {
      const condition = buildRegularSourceCondition('affiliate_direct');
      expect(condition).toEqual({ orderSource: 'AFFILIATE_DIRECT' });
    });

    test('returns orderSource: AFFILIATE_DIRECT for "affiliate-direct"', () => {
      const condition = buildRegularSourceCondition('affiliate-direct');
      expect(condition).toEqual({ orderSource: 'AFFILIATE_DIRECT' });
    });

    test('returns orderSource: AFFILIATE_DIRECT for "affiliatedirect"', () => {
      const condition = buildRegularSourceCondition('affiliatedirect');
      expect(condition).toEqual({ orderSource: 'AFFILIATE_DIRECT' });
    });

    test('handles case-insensitivity for affiliate direct', () => {
      expect(buildRegularSourceCondition('AFFILIATE_DIRECT')).toEqual({ orderSource: 'AFFILIATE_DIRECT' });
      expect(buildRegularSourceCondition('Affiliate_Direct')).toEqual({ orderSource: 'AFFILIATE_DIRECT' });
    });
  });

  describe('Regular order source filtering', () => {
    test('returns orderSource: REGULAR for "regular"', () => {
      const condition = buildRegularSourceCondition('regular');
      expect(condition).toEqual({ orderSource: 'REGULAR' });
    });

    test('handles case-insensitivity for regular', () => {
      expect(buildRegularSourceCondition('REGULAR')).toEqual({ orderSource: 'REGULAR' });
      expect(buildRegularSourceCondition('Regular')).toEqual({ orderSource: 'REGULAR' });
    });
  });

  describe('Standard existing sources', () => {
    test('handles manual orders', () => {
      const condition = buildRegularSourceCondition('manual');
      expect(condition).toHaveProperty('OR');
      expect(Array.isArray(condition.OR)).toBe(true);
    });

    test('handles ai_conversation orders', () => {
      const condition = buildRegularSourceCondition('ai_conversation');
      expect(condition).toHaveProperty('AND');
      expect(Array.isArray(condition.AND)).toBe(true);
    });

    test('handles storefront orders', () => {
      const condition = buildRegularSourceCondition('storefront');
      expect(condition).toHaveProperty('OR');
    });

    test('handles woocommerce orders', () => {
      const condition = buildRegularSourceCondition('woocommerce');
      expect(condition).toHaveProperty('OR');
    });

    test('handles pos orders', () => {
      const condition = buildRegularSourceCondition('pos');
      expect(condition).toHaveProperty('OR');
    });

    test('handles api orders', () => {
      const condition = buildRegularSourceCondition('api');
      expect(condition).toHaveProperty('OR');
    });

    test('handles import orders', () => {
      const condition = buildRegularSourceCondition('import');
      expect(condition).toHaveProperty('OR');
    });

    test('handles unknown orders', () => {
      const condition = buildRegularSourceCondition('unknown');
      expect(condition).toHaveProperty('AND');
    });
  });
});
