const createConfirmedOrderExecutionService = require('../../legacy-ai-agent/aiAgent/confirmedOrderExecutionService');

function normalizeSummaryText(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = String(value)
    .replace(/[\u200f\u200e]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  return normalized || null;
}

function buildService(overrides = {}) {
  const prisma = overrides.prisma || {
    conversation: {
      findUnique: jest.fn(async () => ({ metadata: '{}' })),
      update: jest.fn(async () => ({})),
    },
  };
  const createEnhancedOrder = overrides.createEnhancedOrder || jest.fn(async () => ({
    success: true,
    order: {
      id: 'order-1',
      orderNumber: 'ORD-1001',
      total: 575,
    },
    duplicate: false,
  }));

  const service = createConfirmedOrderExecutionService({
    getPrisma: () => prisma,
    resolveOrderCreationContext: overrides.resolveOrderCreationContext || (() => ({
      hasCompleteSummary: true,
      hasValidPrice: true,
      totalPrice: 575,
      summary: {
        customer: {
          name: 'أحمد محمد',
        },
      },
    })),
    buildOrderCreationSignature: overrides.buildOrderCreationSignature || (() => 'signature-1'),
    extractLastCreatedOrderFromMetadata:
      overrides.extractLastCreatedOrderFromMetadata
      || ((metadata = {}) => metadata?.coreAi?.lastCreatedOrder || null),
    buildConfirmedOrderPayload:
      overrides.buildConfirmedOrderPayload
      || jest.fn(({ conversationId, customerId, companyId, orderContext }) => ({
        conversationId,
        customerId,
        companyId,
        total: orderContext.totalPrice,
      })),
    buildConfirmedOrderReply:
      overrides.buildConfirmedOrderReply
      || jest.fn((orderResult) => `success:${orderResult.order.orderNumber}`),
    buildConfirmedOrderFailureReply:
      overrides.buildConfirmedOrderFailureReply
      || jest.fn(() => 'failure'),
    isOrderConfirmationMessage:
      overrides.isOrderConfirmationMessage
      || jest.fn(() => true),
    checkHumanOverride:
      overrides.checkHumanOverride
      || jest.fn(async () => false),
    normalizeSummaryText,
    safeJsonParse: overrides.safeJsonParse || ((value, fallback = {}) => {
      if (!value) {
        return fallback;
      }
      try {
        return JSON.parse(value);
      } catch (error) {
        return fallback;
      }
    }),
    createEnhancedOrder,
    nowIso: overrides.nowIso || (() => '2026-05-06T12:00:00.000Z'),
    logger: overrides.logger || {
      warn: jest.fn(),
      error: jest.fn(),
    },
  });

  return {
    service,
    prisma,
    createEnhancedOrder,
  };
}

describe('confirmedOrderExecutionService', () => {
  test('short-circuits duplicate local orders from conversation metadata', async () => {
    const { service, prisma, createEnhancedOrder } = buildService({
      prisma: {
        conversation: {
          findUnique: jest.fn(async () => ({
            metadata: JSON.stringify({
              coreAi: {
                lastCreatedOrder: {
                  signature: 'signature-1',
                  orderId: 'order-dup',
                  orderNumber: 'ORD-777',
                  total: 575,
                },
              },
            }),
          })),
          update: jest.fn(async () => ({})),
        },
      },
    });

    const result = await service.createConfirmedOrderFromSummary({
      conversationId: 'conv-1',
      customerId: 'cust-1',
      companyId: 'company-1',
      contextBag: {},
    });

    expect(result).toMatchObject({
      success: true,
      duplicateLocal: true,
      signature: 'signature-1',
      order: {
        id: 'order-dup',
        orderNumber: 'ORD-777',
        total: 575,
      },
    });
    expect(createEnhancedOrder).not.toHaveBeenCalled();
    expect(prisma.conversation.update).not.toHaveBeenCalled();
  });

  test('creates confirmed orders and persists last-created-order metadata', async () => {
    const buildConfirmedOrderPayload = jest.fn(({ conversationId, total }) => ({
      conversationId,
      total,
    }));
    const prisma = {
      conversation: {
        findUnique: jest.fn(async () => ({ metadata: '{"existing":true}' })),
        update: jest.fn(async () => ({})),
      },
    };
    const { service, createEnhancedOrder } = buildService({
      prisma,
      buildConfirmedOrderPayload,
    });

    const result = await service.createConfirmedOrderFromSummary({
      conversationId: 'conv-1',
      customerId: 'cust-1',
      companyId: 'company-1',
      contextBag: {},
    });

    expect(result).toMatchObject({
      success: true,
      duplicate: false,
      signature: 'signature-1',
      order: {
        id: 'order-1',
        orderNumber: 'ORD-1001',
      },
    });
    expect(createEnhancedOrder).toHaveBeenCalledTimes(1);
    expect(prisma.conversation.update).toHaveBeenCalledTimes(1);
    const updatePayload = prisma.conversation.update.mock.calls[0][0].data.metadata;
    expect(JSON.parse(updatePayload)).toMatchObject({
      existing: true,
      coreAi: {
        lastCreatedOrder: {
          orderId: 'order-1',
          orderNumber: 'ORD-1001',
          signature: 'signature-1',
          total: 575,
          createdAt: '2026-05-06T12:00:00.000Z',
        },
        lastCreatedOrderUpdatedAt: '2026-05-06T12:00:00.000Z',
      },
    });
  });

  test('returns expected failure when order creation fails', async () => {
    const { service } = buildService({
      createEnhancedOrder: jest.fn(async () => ({
        success: false,
        message: 'unavailable',
      })),
    });

    const result = await service.createConfirmedOrderFromSummary({
      conversationId: 'conv-1',
      customerId: 'cust-1',
      companyId: 'company-1',
      contextBag: {},
    });

    expect(result).toMatchObject({
      success: false,
      reason: 'order_creation_failed',
      error: 'unavailable',
    });
  });

  test('ignores non-confirmation messages and aborted human-overridden confirmations', async () => {
    const first = buildService({
      isOrderConfirmationMessage: jest.fn(() => false),
    });

    await expect(first.service.handleConfirmedOrderCreation({
      conversationId: 'conv-1',
      customerId: 'cust-1',
      companyId: 'company-1',
      content: 'تمام',
      messageType: 'TEXT',
      contextBag: {},
      timestamp: '2026-05-06T12:00:00.000Z',
    })).resolves.toEqual({ handled: false });

    const second = buildService({
      checkHumanOverride: jest.fn(async () => true),
    });

    await expect(second.service.handleConfirmedOrderCreation({
      conversationId: 'conv-1',
      customerId: 'cust-1',
      companyId: 'company-1',
      content: 'تمام',
      messageType: 'TEXT',
      contextBag: {},
      timestamp: '2026-05-06T12:00:00.000Z',
    })).resolves.toEqual({
      handled: true,
      aborted: true,
    });
  });

  test('uses success and failure reply builders from the shared flow', async () => {
    const buildConfirmedOrderReply = jest.fn(() => 'reply-success');
    const buildConfirmedOrderFailureReply = jest.fn(() => 'reply-failure');

    const successService = buildService({
      buildConfirmedOrderReply,
      buildConfirmedOrderFailureReply,
    });

    const successResult = await successService.service.handleConfirmedOrderCreation({
      conversationId: 'conv-1',
      customerId: 'cust-1',
      companyId: 'company-1',
      content: 'تمام',
      messageType: 'TEXT',
      contextBag: {},
      timestamp: '2026-05-06T12:00:00.000Z',
    });

    expect(successResult).toMatchObject({
      handled: true,
      responseText: 'reply-success',
    });
    expect(buildConfirmedOrderReply).toHaveBeenCalledTimes(1);

    const failureService = buildService({
      createEnhancedOrder: jest.fn(async () => ({
        success: false,
        message: 'unavailable',
      })),
      buildConfirmedOrderReply,
      buildConfirmedOrderFailureReply,
    });

    const failureResult = await failureService.service.handleConfirmedOrderCreation({
      conversationId: 'conv-1',
      customerId: 'cust-1',
      companyId: 'company-1',
      content: 'تمام',
      messageType: 'TEXT',
      contextBag: {},
      timestamp: '2026-05-06T12:00:00.000Z',
    });

    expect(failureResult).toMatchObject({
      handled: true,
      responseText: 'reply-failure',
    });
    expect(buildConfirmedOrderFailureReply).toHaveBeenCalledTimes(1);
  });

  test('falls back to a generic response on unexpected execution errors', async () => {
    const logger = {
      warn: jest.fn(),
      error: jest.fn(),
    };
    const { service } = buildService({
      createEnhancedOrder: jest.fn(async () => {
        throw new Error('boom');
      }),
      resolveOrderCreationContext: () => ({
        hasCompleteSummary: true,
        hasValidPrice: true,
        summary: { customer: { name: 'أحمد محمد' } },
      }),
      logger,
    });

    const result = await service.handleConfirmedOrderCreation({
      conversationId: 'conv-1',
      customerId: 'cust-1',
      companyId: 'company-1',
      content: 'تمام',
      messageType: 'TEXT',
      contextBag: {},
      timestamp: '2026-05-06T12:00:00.000Z',
    });

    expect(result).toMatchObject({
      handled: true,
      responseText: 'تمام يا فندم، حصلت مشكلة تقنية أثناء تسجيل الأوردر حالياً، والإدارة هتكمل مع حضرتك فوراً.',
      orderResult: {
        success: false,
        reason: 'unexpected_error',
        error: 'boom',
      },
    });
    expect(logger.error).toHaveBeenCalled();
  });
});
