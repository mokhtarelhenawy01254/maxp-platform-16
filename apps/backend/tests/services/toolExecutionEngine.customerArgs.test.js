const {
  _validateCustomerToolCallParams,
} = require('../../legacy-ai-agent/aiAgent/executors/toolExecutionEngine');

describe('toolExecutionEngine customer tool argument guard', () => {
  test('blocks customer product.search without product query args', () => {
    expect(_validateCustomerToolCallParams('product.search', {})).toEqual({
      valid: false,
      error: 'CUSTOMER_TOOL_ARGS_MISSING_PRODUCT_QUERY',
    });
  });

  test('blocks customer inventory.check without product name args', () => {
    expect(_validateCustomerToolCallParams('inventory.check', { productSize: '42' })).toEqual({
      valid: false,
      error: 'CUSTOMER_TOOL_ARGS_MISSING_PRODUCT_NAME',
    });
  });

  test('allows explicit previous-product references with conversation memory', () => {
    expect(_validateCustomerToolCallParams('product.search', {
      referencesPreviousProduct: true,
      conversationId: 'conv_123',
    })).toEqual({ valid: true });
    expect(_validateCustomerToolCallParams('inventory.check', {
      referencesPreviousProduct: true,
      conversationId: 'conv_123',
      productSize: '42',
    })).toEqual({ valid: true });
  });

  test('blocks customer order writes without required structured slots', () => {
    expect(_validateCustomerToolCallParams('order.create_draft', { productName: 'Shoe' })).toEqual({
      valid: false,
      error: 'CUSTOMER_TOOL_ARGS_MISSING_REQUIRED_ORDER_SLOTS',
    });
  });

  test('allows complete customer tool args', () => {
    expect(_validateCustomerToolCallParams('product.search', { query: 'Shoe' })).toEqual({ valid: true });
    expect(_validateCustomerToolCallParams('inventory.check', { productNameOrSku: 'Shoe' })).toEqual({ valid: true });
    expect(_validateCustomerToolCallParams('order.create_draft', {
      productName: 'Shoe',
      customerPhone: '01012345678',
    })).toEqual({ valid: true });
  });
});
