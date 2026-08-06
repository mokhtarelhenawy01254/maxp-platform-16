jest.mock('../../services/analyticsService', () => ({}));

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn()
}));

const { getSharedPrismaClient } = require('../../services/sharedDatabase');
const { getProductFulfillmentAnalytics } = require('../../controller/analyticsController');

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

const makeItem = (overrides) => ({
  quantity: 1,
  price: '100.00',
  total: '100.00',
  productId: 'prod-1',
  productName: 'منتج تجريبي',
  productSku: 'SKU-1',
  productImage: null,
  order: { id: 'order-1', status: 'DELIVERED' },
  product: { name: 'منتج تجريبي', sku: 'SKU-1', image: null },
  ...overrides
});

describe('analyticsController.getProductFulfillmentAnalytics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns 403 when companyId is missing', async () => {
    const res = createResponse();
    await getProductFulfillmentAnalytics({ user: {}, query: {} }, res);

    expect(res.statusCode).toBe(403);
    expect(res.payload.success).toBe(false);
  });

  test('computes per-product delivery/cancellation/return rates and summary', async () => {
    getSharedPrismaClient.mockReturnValue({
      orderItem: {
        findMany: jest.fn().mockResolvedValue([
          makeItem({ order: { id: 'order-1', status: 'DELIVERED' } }),
          makeItem({ order: { id: 'order-2', status: 'DELIVERED' }, productId: 'prod-2', productName: 'منتج ثاني', productSku: 'SKU-2', total: '50.00' }),
          makeItem({ order: { id: 'order-3', status: 'CANCELLED' } }),
          makeItem({ order: { id: 'order-4', status: 'RETURNED' } }),
          makeItem({ order: { id: 'order-5', status: 'CONFIRMED' } })
        ])
      }
    });

    const res = createResponse();
    await getProductFulfillmentAnalytics({ user: { companyId: 'company-1' }, query: { startDate: '2026-05-01', endDate: '2026-05-31' } }, res);

    expect(res.statusCode).toBe(200);
    const { summary, products } = res.payload.data;

    expect(summary.totalOrders).toBe(5);
    expect(summary.totalItems).toBe(5);
    expect(summary.deliveredItems).toBe(2);
    expect(summary.cancelledItems).toBe(1);
    expect(summary.returnedItems).toBe(1);
    expect(summary.pendingItems).toBe(1);
    expect(summary.deliveryRate).toBe(40);
    expect(summary.cancellationRate).toBe(20);
    expect(summary.returnRate).toBe(20);
    expect(summary.deliveredRevenue).toBe(150);
    expect(summary.lostRevenue).toBe(200);
    expect(summary.totalRevenue).toBe(450);

    const product1 = products.find(p => p.productId === 'prod-1');
    expect(product1).toBeDefined();
    expect(product1.totalItems).toBe(4);
    expect(product1.deliveredItems).toBe(1);
    expect(product1.cancelledItems).toBe(1);
    expect(product1.returnedItems).toBe(1);
    expect(product1.otherItems).toBe(1);
    expect(product1.deliveryRate).toBe(25);
    expect(product1.cancellationRate).toBe(25);
    expect(product1.returnRate).toBe(25);
    expect(product1.lostRevenue).toBe(200);

    const product2 = products.find(p => p.productId === 'prod-2');
    expect(product2.deliveryRate).toBe(100);
    expect(product2.deliveredRevenue).toBe(50);
    expect(product2.lostRevenue).toBe(0);
  });

  test('returns zeroed summary for empty data', async () => {
    getSharedPrismaClient.mockReturnValue({
      orderItem: {
        findMany: jest.fn().mockResolvedValue([])
      }
    });

    const res = createResponse();
    await getProductFulfillmentAnalytics({ user: { companyId: 'company-1' }, query: { period: '30' } }, res);

    expect(res.statusCode).toBe(200);
    const { summary, products } = res.payload.data;
    expect(summary.totalOrders).toBe(0);
    expect(summary.deliveryRate).toBe(0);
    expect(summary.cancellationRate).toBe(0);
    expect(summary.returnRate).toBe(0);
    expect(products).toEqual([]);
  });
});
