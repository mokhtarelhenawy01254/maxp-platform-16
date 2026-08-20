jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(() => mockPrisma),
  safeQuery: jest.fn(),
}));

jest.mock('../../services/wooCommerceAutoExportService', () => ({
  getWooCommerceAutoExportService: jest.fn(() => ({
    exportOrderAsync: jest.fn(),
  })),
}));

jest.mock('../../services/tenantContext', () => ({
  run: (_tenantId, callback) => callback(),
}));

jest.mock('../../utils/planLimitPayloads', () => ({
  ensureWithinPlanLimit: () => ({ allowed: true }),
}));

jest.mock('../../services/affiliateService', () => ({
  getOrCreateAffiliateForCompany: jest.fn(() =>
    Promise.resolve({ id: 'aff-1', affiliateCode: 'AFF123' })
  ),
}));

jest.mock('../../services/orderService', () => ({
  generateOrderNumber: jest.fn(() => Promise.resolve('ORD-TEST-123')),
}));

jest.mock('../../services/commissionService', () => ({
  calculateCommissions: jest.fn(() => Promise.resolve()),
}));

jest.mock('../../services/whatsapp/WhatsAppNotificationService', () => ({
  sendOrderCreatedNotification: jest.fn(() => Promise.resolve()),
}));

jest.mock('../../services/socketService', () => ({
  sendToCompany: jest.fn(() => Promise.resolve()),
}));

const mockPrisma = {
  order: {
    findUnique: jest.fn().mockResolvedValue(null),
    findFirst: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue({
      id: 'provider-order-1',
      orderNumber: 'ORD-TEST-123-AFF-1234',
      total: 300,
      shipping: 0,
      createdAt: new Date(),
    }),
  },
  guestOrder: {
    findUnique: jest.fn(),
  },
  companyConnection: {
    findMany: jest.fn(),
  },
  customer: {
    upsert: jest.fn().mockResolvedValue({
      id: 'provider-customer-1',
      firstName: 'Test',
      phone: '01000000000',
    }),
  },
  product: {
    findUnique: jest.fn(),
  },
};

const internalSyncService = require('../../services/internalSyncService');

describe('internalSyncService pushOrderToProvider variant preservation', () => {
  let logSpy;
  let errorSpy;

  beforeEach(() => {
    jest.clearAllMocks();

    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
  });

  test('keeps color/size and maps to the provider variant for -AFF- pushed orders', async () => {
    mockPrisma.guestOrder.findUnique.mockResolvedValue({
      id: 'guest-order-1',
      orderNumber: 'ORD-449376-637',
      guestEmail: 'customer@example.com',
      guestPhone: '01000000000',
      guestName: 'Test Customer',
      items: JSON.stringify([
        {
          name: 'Hoodie',
          productId: 'local-product-1',
          variantId: 'consumer-variant-39',
          quantity: 1,
          price: 300,
          productColor: '╪ú╪¿┘è╪╢',
          productSize: '39',
          image: 'img-consumer.jpg',
        },
      ]),
      total: 300,
      shippingCost: 0,
      discountAmount: 0,
      finalTotal: 300,
      shippingAddress: JSON.stringify({
        governorate: 'Cairo',
        city: 'Nasr City',
        address: 'Street 1',
      }),
      paymentMethod: 'CASH',
      status: 'PENDING',
      companyId: 'consumer-1',
    });

    mockPrisma.companyConnection.findMany.mockResolvedValue([
      { id: 'conn-1', consumerId: 'consumer-1', providerId: 'provider-1', status: 'ACTIVE' },
    ]);

    mockPrisma.product.findUnique.mockImplementation(({ where }) => {
      if (where.id === 'local-product-1') {
        return Promise.resolve({
          id: 'local-product-1',
          name: 'Hoodie',
          source: 'internal',
          externalId: 'provider-product-1',
          sku: 'H-1',
          price: 300,
          cost: 200,
          images: '["img-local.jpg"]',
        });
      }
      if (where.id === 'provider-product-1') {
        return Promise.resolve({
          id: 'provider-product-1',
          name: 'Hoodie',
          sku: 'H-1',
          price: 300,
          cost: 200,
          images: '["img-provider.jpg"]',
          productVariants: [
            {
              id: 'prov-v-black-39',
              name: '╪ú╪│┘ê╪» - 39',
              metadata: JSON.stringify({
                attributeValues: { '╪º┘ä┘ä┘ê┘å': '╪ú╪│┘ê╪»', '╪º┘ä┘à┘é╪º╪│': '39' },
              }),
            },
            {
              id: 'prov-v-white-39',
              name: '╪ú╪¿┘è╪╢ - 39',
              metadata: JSON.stringify({
                attributeValues: { '╪º┘ä┘ä┘ê┘å': '╪ú╪¿┘è╪╢', '╪º┘ä┘à┘é╪º╪│': '39' },
              }),
            },
          ],
        });
      }
      return Promise.resolve(null);
    });

    await expect(
      internalSyncService.pushOrderToProvider('guest-order-1', 'consumer-1')
    ).resolves.toBeUndefined();

    expect(mockPrisma.order.create).toHaveBeenCalledTimes(1);

    const createArgs = mockPrisma.order.create.mock.calls[0][0];
    expect(createArgs.data.orderNumber).toBe('ORD-TEST-123-AFF-er-1');

    const pushedItems = createArgs.data.orderItems.create;
    expect(pushedItems).toHaveLength(1);
    expect(pushedItems[0]).toMatchObject({
      productColor: '╪ú╪¿┘è╪╢',
      productSize: '39',
      variantId: 'prov-v-white-39',
      productImage: 'img-consumer.jpg',
    });
    expect(pushedItems[0].variantId).not.toBe('consumer-variant-39');

    const customerArgs = mockPrisma.customer.upsert.mock.calls[0][0];
    expect(customerArgs.where).toEqual({
      whatsappId_companyId: {
        whatsappId: '01000000000',
        companyId: 'provider-1',
      },
    });
  });

  test('still creates provider order items without a variant when none matches', async () => {
    mockPrisma.guestOrder.findUnique.mockResolvedValue({
      id: 'guest-order-2',
      orderNumber: 'ORD-112233',
      guestEmail: 'c@example.com',
      guestPhone: '01100000000',
      guestName: 'Test Customer',
      items: JSON.stringify([
        {
          name: 'Hoodie',
          productId: 'local-product-1',
          variantId: 'consumer-variant-99',
          quantity: 1,
          price: 300,
          productColor: '╪ú╪¡┘à╪▒',
          productSize: '41',
        },
      ]),
      total: 300,
      shippingCost: 0,
      discountAmount: 0,
      finalTotal: 300,
      shippingAddress: '{"governorate":"Cairo"}',
      paymentMethod: 'CASH',
      status: 'PENDING',
      companyId: 'consumer-1',
    });

    mockPrisma.companyConnection.findMany.mockResolvedValue([
      { id: 'conn-1', consumerId: 'consumer-1', providerId: 'provider-1', status: 'ACTIVE' },
    ]);

    mockPrisma.product.findUnique.mockImplementation(({ where }) => {
      if (where.id === 'local-product-1') {
        return Promise.resolve({
          id: 'local-product-1',
          name: 'Hoodie',
          source: 'internal',
          externalId: 'provider-product-1',
          sku: 'H-1',
          price: 300,
          cost: 200,
          images: null,
        });
      }
      if (where.id === 'provider-product-1') {
        return Promise.resolve({
          id: 'provider-product-1',
          name: 'Hoodie',
          sku: 'H-1',
          price: 300,
          cost: 200,
          images: null,
          productVariants: [
            {
              id: 'prov-v-white-39',
              name: '╪ú╪¿┘è╪╢ - 39',
              metadata: JSON.stringify({
                attributeValues: { '╪º┘ä┘ä┘ê┘å': '╪ú╪¿┘è╪╢', '╪º┘ä┘à┘é╪º╪│': '39' },
              }),
            },
          ],
        });
      }
      return Promise.resolve(null);
    });

    await expect(
      internalSyncService.pushOrderToProvider('guest-order-2', 'consumer-1')
    ).resolves.toBeUndefined();

    const pushedItems = mockPrisma.order.create.mock.calls[0][0].data.orderItems.create;
    expect(pushedItems[0]).toMatchObject({
      productColor: '╪ú╪¡┘à╪▒',
      productSize: '41',
      variantId: null,
    });
  });
});
