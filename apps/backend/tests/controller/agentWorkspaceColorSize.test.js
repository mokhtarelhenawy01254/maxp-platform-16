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

describe('agentWorkspaceController.updateOrderItems — color and size editing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('successfully matches variant by new color and size, and updates notes & metadata', async () => {
    const createdItems = [];
    let updatedOrderData = null;

    const tx = {
      orderItem: {
        deleteMany: jest.fn().mockResolvedValue({}),
        create: jest.fn(({ data }) => {
          createdItems.push(data);
          return Promise.resolve({ id: 'item-new-1', ...data });
        })
      },
      product: {
        findUnique: jest.fn().mockResolvedValue({ id: 'prod-dash', companyId: 'company-1' })
      },
      productVariant: {
        findUnique: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'var-black-37',
            productId: 'prod-dash',
            sku: 'SW210-BLACK-37',
            name: 'ابيض بتطعيم اسود - 37',
            metadata: JSON.stringify({ attributeValues: { 'اللون': 'ابيض بتطعيم اسود', 'المقاس': '37' } })
          },
          {
            id: 'var-black-38',
            productId: 'prod-dash',
            sku: 'SW210-BLACK-38',
            name: 'ابيض بتطعيم اسود - 38',
            metadata: JSON.stringify({ attributeValues: { 'اللون': 'ابيض بتطعيم اسود', 'المقاس': '38' } })
          }
        ])
      },
      order: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'order-1',
          companyId: 'company-1',
          orderNumber: 'ORD-972252-594',
          shippingAddress: 'القاهرة',
          notes: 'رقم هاتف بديل: 01005305944\nاختيار المنتج: اللون: ابيض بتطعيم اسود - المقاس: 37\nعرض خاص'
        }),
        update: jest.fn().mockImplementation(({ data }) => {
          updatedOrderData = data;
          return Promise.resolve({});
        })
      },
      guestOrder: {
        findFirst: jest.fn().mockResolvedValue(null)
      }
    };

    getSharedPrismaClient.mockReturnValue({
      order: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'order-1',
          companyId: 'company-1',
          orderNumber: 'ORD-972252-594',
          shippingAddress: 'القاهرة',
          notes: 'رقم هاتف بديل: 01005305944\nاختيار المنتج: اللون: ابيض بتطعيم اسود - المقاس: 37\nعرض خاص'
        })
      },
      guestOrder: {
        findFirst: jest.fn().mockResolvedValue(null)
      },
      orderAssignment: {
        findFirst: jest.fn().mockResolvedValue({ guestOrderId: null, orderId: 'order-1', isActive: true })
      },
      $transaction: jest.fn((cb) => cb(tx))
    });

    const res = createResponse();
    await agentWorkspaceController.updateOrderItems({
      params: { id: 'order-1' },
      user: { id: 'user-1', role: 'ADMIN', effectiveCompanyId: 'company-1', companyId: 'company-1' },
      body: {
        items: [
          {
            productId: 'prod-dash',
            productName: 'Dash',
            quantity: 1,
            price: 620,
            productColor: 'ابيض بتطعيم اسود',
            productSize: '38'
          }
        ],
        shipping: 70,
        discount: 0
      }
    }, res);

    expect(res.statusCode).toBe(200);
    expect(res.payload.success).toBe(true);
    expect(createdItems).toHaveLength(1);

    // Verify variant matching
    expect(createdItems[0].variantId).toBe('var-black-38');
    expect(createdItems[0].productSku).toBe('SW210-BLACK-38');
    expect(createdItems[0].productColor).toBe('ابيض بتطعيم اسود');
    expect(createdItems[0].productSize).toBe('38');

    // Verify metadata attributeValues
    const meta = JSON.parse(createdItems[0].metadata);
    expect(meta.attributeValues['اللون']).toBe('ابيض بتطعيم اسود');
    expect(meta.attributeValues['المقاس']).toBe('38');

    // Verify order notes was synced with new selection
    expect(updatedOrderData.notes).toContain('المقاس: 38');
    expect(res.payload.data.items[0].productSize).toBe('38');
  });

  test('getProductVariants returns mapped variants with color and size', async () => {
    getSharedPrismaClient.mockReturnValue({
      product: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'prod-dash',
          name: 'Dash',
          price: 620,
          mainImage: '/img.png',
          productVariants: [
            {
              id: 'var-1',
              name: 'ابيض بتطعيم اسود - 38',
              sku: 'SW-1',
              price: 620,
              stock: 10,
              metadata: JSON.stringify({ attributeValues: { 'اللون': 'ابيض بتطعيم اسود', 'المقاس': '38' } })
            }
          ]
        })
      }
    });

    const res = createResponse();
    await agentWorkspaceController.getProductVariants({
      params: { id: 'prod-dash' },
      user: { companyId: 'company-1' }
    }, res);

    expect(res.statusCode).toBe(200);
    expect(res.payload.success).toBe(true);
    expect(res.payload.data.variants).toHaveLength(1);
    expect(res.payload.data.variants[0].color).toBe('ابيض بتطعيم اسود');
    expect(res.payload.data.variants[0].size).toBe('38');
  });

  test('clears variantId to null when custom color/size does not match any variant', async () => {
    const createdItems = [];
    const tx = {
      orderItem: {
        deleteMany: jest.fn().mockResolvedValue({}),
        create: jest.fn(({ data }) => {
          createdItems.push(data);
          return Promise.resolve({ id: 'item-custom-1', ...data });
        })
      },
      product: {
        findUnique: jest.fn().mockResolvedValue({ id: 'prod-dash', companyId: 'company-1' })
      },
      productVariant: {
        findUnique: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'var-black-37',
            productId: 'prod-dash',
            sku: 'SW210-BLACK-37',
            name: 'ابيض بتطعيم اسود - 37',
            metadata: JSON.stringify({ attributeValues: { 'اللون': 'ابيض بتطعيم اسود', 'المقاس': '37' } })
          }
        ])
      },
      order: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'order-1',
          companyId: 'company-1',
          orderNumber: 'ORD-972252-594',
          shippingAddress: 'القاهرة',
          notes: ''
        }),
        update: jest.fn().mockResolvedValue({})
      },
      guestOrder: {
        findFirst: jest.fn().mockResolvedValue(null)
      }
    };

    getSharedPrismaClient.mockReturnValue({
      order: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'order-1',
          companyId: 'company-1',
          orderNumber: 'ORD-972252-594',
          shippingAddress: 'القاهرة',
          notes: ''
        })
      },
      guestOrder: {
        findFirst: jest.fn().mockResolvedValue(null)
      },
      orderAssignment: {
        findFirst: jest.fn().mockResolvedValue({ guestOrderId: null, orderId: 'order-1', isActive: true })
      },
      $transaction: jest.fn((cb) => cb(tx))
    });

    const res = createResponse();
    await agentWorkspaceController.updateOrderItems({
      params: { id: 'order-1' },
      user: { id: 'user-1', role: 'ADMIN', effectiveCompanyId: 'company-1', companyId: 'company-1' },
      body: {
        items: [
          {
            productId: 'prod-dash',
            variantId: 'var-black-37', // Old variant id
            productName: 'Dash',
            quantity: 1,
            price: 620,
            productColor: 'بنفسجي خاص', // custom unmatched color
            productSize: '45' // custom unmatched size
          }
        ],
        shipping: 70,
        discount: 0
      }
    }, res);

    expect(res.statusCode).toBe(200);
    expect(res.payload.success).toBe(true);
    expect(createdItems).toHaveLength(1);
    // Variant ID should be nullified since custom color/size doesn't match the old variant
    expect(createdItems[0].variantId).toBeNull();
    expect(createdItems[0].productColor).toBe('بنفسجي خاص');
    expect(createdItems[0].productSize).toBe('45');
  });
});
