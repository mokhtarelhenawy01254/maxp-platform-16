/**
 * @module intentExecutionRouter.test
 * @description Tests for intent execution router - tool routing from classifier contract.
 */

const {
  _getModelClassifiedReadToolParams,
  _getModelClassifiedWriteToolParams,
  _firstNonEmptySlot,
} = require('../../legacy-ai-agent/aiAgent/executors/intentExecutionRouter');

describe('Intent Execution Router - Classifier Contract', () => {
  describe('_firstNonEmptySlot', () => {
    test('returns first non-empty slot value', () => {
      const slots = { a: 'value1', b: 'value2' };
      expect(_firstNonEmptySlot(slots, ['a', 'b'])).toBe('value1');
    });

    test('skips empty values', () => {
      const slots = { a: '', b: 'value2' };
      expect(_firstNonEmptySlot(slots, ['a', 'b'])).toBe('value2');
    });

    test('skips null values', () => {
      const slots = { a: null, b: 'value2' };
      expect(_firstNonEmptySlot(slots, ['a', 'b'])).toBe('value2');
    });

    test('skips undefined values', () => {
      const slots = { a: undefined, b: 'value2' };
      expect(_firstNonEmptySlot(slots, ['a', 'b'])).toBe('value2');
    });

    test('returns undefined when all slots are empty', () => {
      const slots = { a: '', b: null };
      expect(_firstNonEmptySlot(slots, ['a', 'b'])).toBeUndefined();
    });

    test('returns undefined when no slots match', () => {
      const slots = { x: 'value' };
      expect(_firstNonEmptySlot(slots, ['a', 'b'])).toBeUndefined();
    });
  });

  describe('_getModelClassifiedReadToolParams', () => {
    test('extracts product.search params from classifier slots', () => {
      const relevancePlan = {
        classification: {
          slots: { productName: 't-shirt' },
        },
      };
      const params = _getModelClassifiedReadToolParams('product.search', relevancePlan);
      expect(params).toEqual({ query: 't-shirt', limit: 5 });
    });

    test('extracts inventory.check params from classifier slots', () => {
      const relevancePlan = {
        classification: {
          slots: {
            productName: 't-shirt',
            productSize: 'L',
            productColor: 'black',
          },
        },
      };
      const params = _getModelClassifiedReadToolParams('inventory.check', relevancePlan);
      expect(params).toEqual({
        productNameOrSku: 't-shirt',
        productSize: 'L',
        productColor: 'black',
      });
    });

    test('extracts order.lookup params from classifier slots', () => {
      const relevancePlan = {
        classification: {
          slots: { orderNumber: '12345' },
        },
      };
      const params = _getModelClassifiedReadToolParams('order.lookup', relevancePlan);
      expect(params).toEqual({ orderNumber: '12345' });
    });

    test('extracts shipping.rates params from classifier slots', () => {
      const relevancePlan = {
        classification: {
          slots: { city: 'Cairo' },
        },
      };
      const params = _getModelClassifiedReadToolParams('shipping.rates', relevancePlan);
      expect(params).toEqual({ governorate: 'Cairo' });
    });

    test('returns null when required slot is missing', () => {
      const relevancePlan = {
        classification: {
          slots: {},
        },
      };
      const params = _getModelClassifiedReadToolParams('product.search', relevancePlan);
      expect(params).toBeNull();
    });

    test('uses relevancePlan.slots as fallback', () => {
      const relevancePlan = {
        slots: { productName: 'shoes' },
      };
      const params = _getModelClassifiedReadToolParams('product.search', relevancePlan);
      expect(params).toEqual({ query: 'shoes', limit: 5 });
    });

    test('passes referencesPreviousProduct from classifier slots', () => {
      const searchPlan = {
        classification: {
          slots: { productName: 'last shown product', referencesPreviousProduct: true },
        },
      };
      expect(_getModelClassifiedReadToolParams('product.search', searchPlan)).toEqual({
        query: 'last shown product',
        limit: 5,
        referencesPreviousProduct: true,
      });

      const inventoryPlan = {
        classification: {
          slots: {
            productName: 'last shown product',
            productSize: '42',
            referencesPreviousProduct: true,
          },
        },
      };
      expect(_getModelClassifiedReadToolParams('inventory.check', inventoryPlan)).toEqual({
        productNameOrSku: 'last shown product',
        productSize: '42',
        referencesPreviousProduct: true,
      });
    });
  });

  describe('_getModelClassifiedWriteToolParams', () => {
    test('extracts order.create_draft params from classifier slots', () => {
      const relevancePlan = {
        classification: {
          slots: {
            productName: 't-shirt',
            customerName: 'Ahmed',
            customerPhone: '01012345678',
            productPrice: 100,
            productColor: 'black',
            productSize: 'L',
            quantity: 2,
            city: 'Cairo',
          },
        },
      };
      const params = _getModelClassifiedWriteToolParams('order.create_draft', relevancePlan);
      expect(params).toEqual({
        productName: 't-shirt',
        customerName: 'Ahmed',
        customerPhone: '01012345678',
        productPrice: 100,
        productColor: 'black',
        productSize: 'L',
        quantity: 2,
        city: 'Cairo',
      });
    });

    test('extracts order.create_confirmed params from classifier slots', () => {
      const relevancePlan = {
        classification: {
          slots: {
            productName: 't-shirt',
            customerName: 'Ahmed',
            customerPhone: '01012345678',
            confirmedByCustomer: true,
          },
        },
      };
      const params = _getModelClassifiedWriteToolParams('order.create_confirmed', relevancePlan);
      expect(params).toEqual({
        productName: 't-shirt',
        customerName: 'Ahmed',
        customerPhone: '01012345678',
        confirmedByCustomer: true,
      });
    });

    test('returns null when required productName is missing', () => {
      const relevancePlan = {
        classification: {
          slots: {
            customerName: 'Ahmed',
            customerPhone: '01012345678',
          },
        },
      };
      const params = _getModelClassifiedWriteToolParams('order.create_draft', relevancePlan);
      expect(params).toBeNull();
    });

    test('returns null when required customerPhone is missing', () => {
      const relevancePlan = {
        classification: {
          slots: {
            productName: 't-shirt',
            customerName: 'Ahmed',
          },
        },
      };
      const params = _getModelClassifiedWriteToolParams('order.create_draft', relevancePlan);
      expect(params).toBeNull();
    });

    test('uses relevancePlan.slots as fallback', () => {
      const relevancePlan = {
        slots: {
          productName: 'shoes',
          customerName: 'Sara',
          customerPhone: '01123456789',
        },
      };
      const params = _getModelClassifiedWriteToolParams('order.create_draft', relevancePlan);
      expect(params.productName).toBe('shoes');
      expect(params.customerName).toBe('Sara');
      expect(params.customerPhone).toBe('01123456789');
    });
  });
});
