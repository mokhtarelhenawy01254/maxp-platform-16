jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn()
}));

jest.mock('../../services/orderService', () => ({
  updateGuestOrderStatus: jest.fn(),
  updateOrderStatus: jest.fn()
}));

const { getSharedPrismaClient } = require('../../services/sharedDatabase');
const agentWorkspaceController = require('../../controller/agentWorkspaceController');

const createResponse = () => {
  const response = {
    statusCode: 200,
    payload: null,
    status: jest.fn((code) => {
      response.statusCode = code;
      return response;
    }),
    json: jest.fn((payload) => {
      response.payload = payload;
      return response;
    })
  };
  return response;
};

describe('agentWorkspaceController.updateOrderItems — variant tenant isolation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('ignores a variantId belonging to another company', async () => {
    const createdItems = [];
    const tx = {
      orderItem: {
        deleteMany: jest.fn().mockResolvedValue({}),
        create: jest.fn(({ data }) => {
          createdItems.push(data);
          return Promise.resolve({});
        })
      },
      product: { findUnique: jest.fn().mockResolvedValue(null) },
      productVariant: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'v-foreign',
          productId: 'prod-foreign',
          product: { companyId: 'company-2' }
        })
      },
      order: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'order-1',
          companyId: 'company-1',
          orderNumber: 'ORD-X',
          shippingAddress: ''
        }),
        update: jest.fn().mockResolvedValue({})
      },
      guestOrder: { findFirst: jest.fn().mockResolvedValue(null) }
    };
    getSharedPrismaClient.mockReturnValue({
      order: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'order-1',
          companyId: 'company-1',
          orderNumber: 'ORD-X',
          shippingAddress: ''
        })
      },
      orderAssignment: {
        findFirst: jest.fn().mockResolvedValue({ guestOrderId: null, orderId: 'order-1' })
      },
      $transaction: jest.fn((cb) => cb(tx))
    });

    const res = createResponse();
    await agentWorkspaceController.updateOrderItems({
      params: { id: 'order-1' },
      user: { id: 'user-1', role: 'AGENT', effectiveCompanyId: 'company-1' },
      body: {
        items: [{ name: 'بند', quantity: 1, price: 10, variantId: 'v-foreign' }]
      }
    }, res);

    expect(res.statusCode).toBe(200);
    expect(res.payload.success).toBe(true);
    // المتغير الأجنبي تُهمل: البند يُنشأ بلا variantId ولا productId أجنبي
    expect(createdItems).toHaveLength(1);
    expect(createdItems[0].variantId).toBeNull();
    expect(createdItems[0].productId).toBeNull();
  });

  test('accepts a variantId of the same company', async () => {
    const createdItems = [];
    const tx = {
      orderItem: {
        deleteMany: jest.fn().mockResolvedValue({}),
        create: jest.fn(({ data }) => {
          createdItems.push(data);
          return Promise.resolve({});
        })
      },
      product: { findUnique: jest.fn().mockResolvedValue(null) },
      productVariant: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'v-local',
          productId: 'prod-local',
          product: { companyId: 'company-1' }
        })
      },
      order: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'order-1',
          companyId: 'company-1',
          orderNumber: 'ORD-X',
          shippingAddress: ''
        }),
        update: jest.fn().mockResolvedValue({})
      },
      guestOrder: { findFirst: jest.fn().mockResolvedValue(null) }
    };
    getSharedPrismaClient.mockReturnValue({
      order: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'order-1',
          companyId: 'company-1',
          orderNumber: 'ORD-X',
          shippingAddress: ''
        })
      },
      orderAssignment: {
        findFirst: jest.fn().mockResolvedValue({ guestOrderId: null, orderId: 'order-1' })
      },
      $transaction: jest.fn((cb) => cb(tx))
    });

    const res = createResponse();
    await agentWorkspaceController.updateOrderItems({
      params: { id: 'order-1' },
      user: { id: 'user-1', role: 'AGENT', effectiveCompanyId: 'company-1' },
      body: {
        items: [{ name: 'بند', quantity: 1, price: 10, variantId: 'v-local' }]
      }
    }, res);

    expect(res.statusCode).toBe(200);
    expect(createdItems[0].variantId).toBe('v-local');
    expect(createdItems[0].productId).toBe('prod-local');
  });
});
