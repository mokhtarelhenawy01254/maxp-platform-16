/**
 * Tests for LLM-classified slot fallback (replacing deterministic regex for customer channels)
 */

const {
  _getDeterministicReadToolParams,
  _getDeterministicReadToolExecution,
  _getDeterministicWriteToolExecution,
  _getModelClassifiedReadToolParams,
  _getModelClassifiedReadToolExecution,
  _getModelClassifiedWriteToolParams,
  _getModelClassifiedWriteToolExecution,
  _getModelClassifiedHandoffExecution,
  _firstNonEmptySlot,
} = require('../../services/aiAgent/executors/intentExecutionRouter');
const orderDraftEngine = require('../../services/aiAgent/executors/orderDraftEngine');
const adminDeterministicParamParser = require('../../services/aiAgent/executors/adminDeterministicParamParser');

describe('_firstNonEmptySlot', () => {
  test('returns first non-empty value from slot names', () => {
    const slots = { productName: 'فستان', name: 'قميص' };
    expect(_firstNonEmptySlot(slots, ['productName', 'name'])).toBe('فستان');
  });

  test('skips empty strings and null', () => {
    const slots = { productName: '', name: null, query: 'حذاء' };
    expect(_firstNonEmptySlot(slots, ['productName', 'name', 'query'])).toBe('حذاء');
  });

  test('returns undefined when no slots match', () => {
    const slots = {};
    expect(_firstNonEmptySlot(slots, ['productName', 'name'])).toBeUndefined();
  });
});

describe('_getModelClassifiedReadToolParams', () => {
  test('extracts inventory.check params from classification slots', () => {
    const relevancePlan = {
      classification: {
        slots: {
          productName: 'فستان',
          productSize: '42',
          productColor: 'أزرق',
        },
      },
    };
    const params = _getModelClassifiedReadToolParams('inventory.check', relevancePlan);
    expect(params).toEqual({
      productNameOrSku: 'فستان',
      productSize: '42',
      productColor: 'أزرق',
    });
  });

  test('extracts inventory.check params from top-level slots', () => {
    const relevancePlan = {
      slots: {
        productNameOrSku: 'حذاء',
        size: '40',
      },
    };
    const params = _getModelClassifiedReadToolParams('inventory.check', relevancePlan);
    expect(params).toEqual({
      productNameOrSku: 'حذاء',
      productSize: '40',
    });
  });

  test('returns null when no product name found', () => {
    const relevancePlan = {
      classification: {
        slots: { productSize: '42' },
      },
    };
    const params = _getModelClassifiedReadToolParams('inventory.check', relevancePlan);
    expect(params).toBeNull();
  });

  test('extracts product.search params', () => {
    const relevancePlan = {
      classification: {
        slots: { productName: 'فستان صيفي' },
      },
    };
    const params = _getModelClassifiedReadToolParams('product.search', relevancePlan);
    expect(params).toEqual({ query: 'فستان صيفي', limit: 5 });
  });

  test('extracts order.lookup params', () => {
    const relevancePlan = {
      classification: {
        slots: { orderNumber: 'ORD-12345-01' },
      },
    };
    const params = _getModelClassifiedReadToolParams('order.lookup', relevancePlan);
    expect(params).toEqual({ orderNumber: 'ORD-12345-01' });
  });

  test('extracts shipping.rates params', () => {
    const relevancePlan = {
      classification: {
        slots: { governorate: 'القاهرة', city: 'مدينة نصر' },
      },
    };
    const params = _getModelClassifiedReadToolParams('shipping.rates', relevancePlan);
    expect(params).toEqual({
      governorate: 'القاهرة',
      city: 'مدينة نصر',
    });
  });

  test('returns null for unknown tool', () => {
    const relevancePlan = { classification: { slots: {} } };
    const params = _getModelClassifiedReadToolParams('unknown.tool', relevancePlan);
    expect(params).toBeNull();
  });
});

describe('_getModelClassifiedReadToolExecution', () => {
  const nativeTools = [
    {
      function: { name: 'agenttool__inventory_check' },
      metadata: { internalName: 'inventory.check' },
    },
    {
      function: { name: 'agenttool__product_search' },
      metadata: { internalName: 'product.search' },
    },
  ];

  test('returns execution when slots are available (no source gate)', () => {
    const relevancePlan = {
      requiresTool: true,
      primaryTool: 'inventory.check',
      classification: {
        slots: { productName: 'فستان', productSize: '42' },
      },
    };
    const execution = _getModelClassifiedReadToolExecution(relevancePlan, nativeTools);
    expect(execution).toEqual({
      tool: 'inventory.check',
      nativeName: 'agenttool__inventory_check',
      params: { productNameOrSku: 'فستان', productSize: '42' },
    });
  });

  test('works regardless of relevancePlan.source', () => {
    const relevancePlan = {
      requiresTool: true,
      primaryTool: 'inventory.check',
      source: 'any-source',  // NOT 'llm-classifier'
      classification: {
        slots: { productName: 'فستان' },
      },
    };
    const execution = _getModelClassifiedReadToolExecution(relevancePlan, nativeTools);
    expect(execution).not.toBeNull();
    expect(execution.tool).toBe('inventory.check');
  });

  test('returns null when requiresTool is false', () => {
    const relevancePlan = {
      requiresTool: false,
      primaryTool: 'inventory.check',
      classification: { slots: { productName: 'فستان' } },
    };
    const execution = _getModelClassifiedReadToolExecution(relevancePlan, nativeTools);
    expect(execution).toBeNull();
  });

  test('returns null for write tools', () => {
    const relevancePlan = {
      requiresTool: true,
      primaryTool: 'order.create_draft',
      classification: { slots: { productName: 'فستان' } },
    };
    const execution = _getModelClassifiedReadToolExecution(relevancePlan, nativeTools);
    expect(execution).toBeNull();
  });
});

describe('_getModelClassifiedWriteToolParams', () => {
  test('extracts order.create_draft params from classification slots', () => {
    const relevancePlan = {
      classification: {
        slots: {
          productName: 'فستان',
          customerName: 'أحمد',
          customerPhone: '01012345678',
          productPrice: 200,
          productColor: 'أحمر',
          productSize: 'M',
          quantity: 2,
          city: 'القاهرة',
        },
      },
    };
    const params = _getModelClassifiedWriteToolParams('order.create_draft', relevancePlan);
    expect(params).toEqual({
      productName: 'فستان',
      customerName: 'أحمد',
      customerPhone: '01012345678',
      productPrice: 200,
      productColor: 'أحمر',
      productSize: 'M',
      quantity: 2,
      city: 'القاهرة',
    });
  });

  test('extracts params from top-level slots', () => {
    const relevancePlan = {
      slots: {
        productName: 'قميص',
        phone: '01098765432',
      },
    };
    const params = _getModelClassifiedWriteToolParams('order.create_draft', relevancePlan);
    expect(params).toEqual({
      productName: 'قميص',
      customerPhone: '01098765432',
    });
  });

  test('returns null when productName is missing', () => {
    const relevancePlan = {
      classification: {
        slots: {
          customerName: 'أحمد',
          customerPhone: '01012345678',
        },
      },
    };
    const params = _getModelClassifiedWriteToolParams('order.create_draft', relevancePlan);
    expect(params).toBeNull();
  });

  test('returns null when customerPhone is missing', () => {
    const relevancePlan = {
      classification: {
        slots: {
          productName: 'فستان',
          customerName: 'أحمد',
        },
      },
    };
    const params = _getModelClassifiedWriteToolParams('order.create_draft', relevancePlan);
    expect(params).toBeNull();
  });

  test('returns null for unknown tool', () => {
    const relevancePlan = { classification: { slots: {} } };
    const params = _getModelClassifiedWriteToolParams('unknown.tool', relevancePlan);
    expect(params).toBeNull();
  });
});

describe('_getModelClassifiedWriteToolExecution', () => {
  const nativeTools = [
    {
      function: { name: 'agenttool__order_create_draft' },
      metadata: { internalName: 'order.create_draft' },
    },
  ];

  test('returns execution for order.create_draft with valid slots', () => {
    const relevancePlan = {
      requiresTool: true,
      primaryTool: 'order.create_draft',
      classification: {
        slots: {
          productName: 'فستان',
          customerName: 'أحمد',
          customerPhone: '01012345678',
        },
      },
    };
    const execution = _getModelClassifiedWriteToolExecution(relevancePlan, nativeTools);
    expect(execution).toEqual({
      tool: 'order.create_draft',
      nativeName: 'agenttool__order_create_draft',
      params: {
        productName: 'فستان',
        customerName: 'أحمد',
        customerPhone: '01012345678',
      },
    });
  });

  test('returns null when slots are incomplete', () => {
    const relevancePlan = {
      requiresTool: true,
      primaryTool: 'order.create_draft',
      classification: {
        slots: { productName: 'فستان' },  // missing phone
      },
    };
    const execution = _getModelClassifiedWriteToolExecution(relevancePlan, nativeTools);
    expect(execution).toBeNull();
  });

  test('returns null when requiresTool is false', () => {
    const relevancePlan = {
      requiresTool: false,
      primaryTool: 'order.create_draft',
      classification: {
        slots: {
          productName: 'فستان',
          customerName: 'أحمد',
          customerPhone: '01012345678',
        },
      },
    };
    const execution = _getModelClassifiedWriteToolExecution(relevancePlan, nativeTools);
    expect(execution).toBeNull();
  });
});

describe('_getModelClassifiedHandoffExecution', () => {
  const nativeTools = [
    {
      function: { name: 'agenttool__agent_handoff' },
      metadata: { internalName: 'agent.handoff' },
    },
  ];

  test('builds human handoff from model-classified support intent', () => {
    const relevancePlan = {
      requiresTool: true,
      primaryTool: 'agent.handoff',
      intent: 'support.refund',
    };

    const execution = _getModelClassifiedHandoffExecution(
      relevancePlan,
      'عايز ارجع الطلب رقم 123',
      nativeTools,
      { conversationId: 'conv_1', customerId: 'cust_1' },
    );

    expect(execution).toEqual({
      tool: 'agent.handoff',
      nativeName: 'agenttool__agent_handoff',
      params: {
        targetType: 'human',
        reason: 'customer_refund_request',
        summary: 'عايز ارجع الطلب رقم 123',
        conversationId: 'conv_1',
        customerId: 'cust_1',
        priority: 'medium',
      },
    });
  });

  test('does not route non-support model intents to handoff', () => {
    const relevancePlan = {
      requiresTool: true,
      primaryTool: 'agent.handoff',
      intent: 'inventory.check',
    };

    expect(_getModelClassifiedHandoffExecution(relevancePlan, '', nativeTools, {})).toBeNull();
  });
});

describe('customer channel deterministic parser guard', () => {
  test('admin deterministic parser module refuses direct customer-channel extraction', () => {
    const message = 'هل Swan High Skotch متاح مقاس 42 لون أسود؟';

    expect(adminDeterministicParamParser._parseInventoryCheckParams(message, { channel: 'FACEBOOK' })).toBeNull();
    expect(adminDeterministicParamParser._parseOrderLookupParams('اوردر رقم 12345', { channel: 'MESSENGER' })).toBeNull();
    expect(adminDeterministicParamParser._parseShippingRateParams('الشحن للقاهرة بكام؟', { channel: 'WA' })).toBeNull();
  });

  test('blocks inventory regex extraction for customer channels', () => {
    const relevancePlan = {
      requiresTool: true,
      primaryTool: 'inventory.check',
      intent: 'inventory',
    };
    const message = 'هل Swan High Skotch متاح مقاس 42 لون أسود؟';
    const customerContext = { channel: 'FACEBOOK' };

    expect(_getDeterministicReadToolParams('inventory.check', message, relevancePlan, customerContext)).toBeNull();
    expect(_getDeterministicReadToolExecution(relevancePlan, message, [], customerContext)).toBeNull();
  });

  test('blocks order draft regex extraction for customer channels', () => {
    const message = 'اعمل اوردر فستان مقاس M لون أحمر اسمي أحمد رقمي 01012345678 السعر 200';

    expect(orderDraftEngine._parseOrderDraftParams(message, { channel: 'WHATSAPP' })).toBeNull();
    expect(orderDraftEngine._parseOrderDraftParams(message, { isCustomerReplyChannel: true })).toBeNull();
  });

  test('blocks deterministic write repair for customer channels', () => {
    const relevancePlan = {
      requiresTool: true,
      primaryTool: 'order.create_draft',
      intent: 'orders.create_draft',
    };
    const message = 'اعمل اوردر فستان مقاس M لون أحمر اسمي أحمد رقمي 01012345678 السعر 200';

    expect(_getDeterministicWriteToolExecution(relevancePlan, message, [], {
      intentContext: { channel: 'FACEBOOK' },
    })).toBeNull();
  });
});
