const {
  isBackorderPermitted,
  getStockAvailability,
  parseMetadata,
} = require('../inventoryPolicyUtils');

describe('inventoryPolicyUtils', () => {
  describe('isBackorderPermitted', () => {
    test('returns true if product has trackInventory: false (unlimited stock)', () => {
      const product = { id: 'p1', trackInventory: false, stock: 0 };
      expect(isBackorderPermitted(product)).toBe(true);
    });

    test('returns true if product is pre-order eligible', () => {
      const product = { id: 'p1', trackInventory: true, stock: 0, isPreOrder: true, preOrderDate: null };
      expect(isBackorderPermitted(product)).toBe(true);
    });

    test('returns true if variant explicitly allows backorders via boolean or metadata', () => {
      const product = { id: 'p1', trackInventory: true, stock: 0 };
      const variant1 = { id: 'v1', stock: 0, allowBackorders: true };
      expect(isBackorderPermitted(product, variant1)).toBe(true);

      const variant2 = { id: 'v2', stock: 0, metadata: JSON.stringify({ allowBackorders: true }) };
      expect(isBackorderPermitted(product, variant2)).toBe(true);

      const variant3 = { id: 'v3', stock: 0, metadata: { allowBackorders: true } };
      expect(isBackorderPermitted(product, variant3)).toBe(true);
    });

    test('returns true if product explicitly allows backorders via boolean or metadata', () => {
      const product1 = { id: 'p1', trackInventory: true, stock: 0, allowBackorders: true };
      expect(isBackorderPermitted(product1)).toBe(true);

      const product2 = { id: 'p2', trackInventory: true, stock: 0, metadata: JSON.stringify({ allowBackorders: true }) };
      expect(isBackorderPermitted(product2)).toBe(true);
    });

    test('returns true if company settings allow out-of-stock orders storewide', () => {
      const product = { id: 'p1', trackInventory: true, stock: 0 };
      expect(isBackorderPermitted(product, null, { allowOutOfStockOrders: true })).toBe(true);
      expect(isBackorderPermitted(product, null, { allowBackorders: true })).toBe(true);
    });

    test('returns false if tracking is enabled, no pre-order, and backorders not allowed anywhere', () => {
      const product = { id: 'p1', trackInventory: true, stock: 0, isPreOrder: false };
      const variant = { id: 'v1', stock: 0, trackInventory: true };
      expect(isBackorderPermitted(product, variant)).toBe(false);
      expect(isBackorderPermitted(product)).toBe(false);
    });
  });

  describe('getStockAvailability', () => {
    test('correctly calculates purchasability for in-stock and out-of-stock products', () => {
      const inStockProduct = { id: 'p1', trackInventory: true, stock: 5 };
      expect(getStockAvailability(inStockProduct)).toEqual({
        stock: 5,
        trackInventory: true,
        hasPhysicalStock: true,
        isBackorderPermitted: false,
        isPurchasable: true,
      });

      const outOfStockNoBackorder = { id: 'p2', trackInventory: true, stock: 0 };
      expect(getStockAvailability(outOfStockNoBackorder)).toEqual({
        stock: 0,
        trackInventory: true,
        hasPhysicalStock: false,
        isBackorderPermitted: false,
        isPurchasable: false,
      });

      const outOfStockWithBackorder = { id: 'p3', trackInventory: true, stock: 0, metadata: JSON.stringify({ allowBackorders: true }) };
      expect(getStockAvailability(outOfStockWithBackorder)).toEqual({
        stock: 0,
        trackInventory: true,
        hasPhysicalStock: false,
        isBackorderPermitted: true,
        isPurchasable: true,
      });
    });
  });
});
