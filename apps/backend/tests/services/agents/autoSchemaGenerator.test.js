const { generateSchemaFromFunction, createToolFromFunction } = require('../../../services/aiAgent/utils/autoSchemaGenerator');

describe('Auto Schema Generator', () => {
  test('generates schema from JSDoc', () => {
    function searchProducts(query, limit = 10, category = undefined) {
      /** Search products in catalog
       * @param {string} query - Search term
       * @param {number} limit - Max results
       * @param {string} category - Optional filter
       */
      return [];
    }

    const schema = generateSchemaFromFunction(searchProducts);
    expect(schema.type).toBe('object');
    expect(schema.properties.query.type).toBe('string');
    expect(schema.properties.query.description).toContain('Search term');
    expect(schema.properties.limit.type).toBe('number');
    expect(schema.required).toContain('query');
    expect(schema.required).not.toContain('category'); // Has default, so optional
  });

  test('handles enum types', () => {
    function updateStatus(status) {
      /** Update order status
       * @param {'PENDING'|'CONFIRMED'|'SHIPPED'|'DELIVERED'} status - New status
       */
      return {};
    }

    const schema = generateSchemaFromFunction(updateStatus);
    expect(schema.properties.status.enum).toEqual(['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED']);
  });

  test('createToolFromFunction wraps handler', () => {
    function myHandler(companyId, params) {
      return 'done';
    }

    const tool = createToolFromFunction('my.tool', myHandler, {
      description: 'My test tool',
      readOnly: true,
    });

    expect(tool.name).toBe('my.tool');
    expect(tool.description).toBe('My test tool');
    expect(tool.handler).toBe(myHandler);
    expect(tool.readOnly).toBe(true);
  });

  test('infers description from parameter name', () => {
    function handler(companyId, query, city) {
      return {};
    }

    const schema = generateSchemaFromFunction(handler);
    expect(schema.properties.query.description).toContain('Search query');
    expect(schema.properties.city.description).toContain('City name');
  });
});
