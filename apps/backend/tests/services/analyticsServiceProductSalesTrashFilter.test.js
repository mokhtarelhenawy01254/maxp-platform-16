const mockPrisma = {
  orderItem: { findMany: jest.fn() },
  order: { findMany: jest.fn() },
  guestOrder: { findMany: jest.fn() },
  product: { findMany: jest.fn() },
};

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(() => mockPrisma),
}));

const analyticsService = require('../../services/analyticsService');

describe('analyticsService.getProductSalesPerformance - trash and invalid exclusion', () => {
  const startDate = new Date('2026-08-01');
  const endDate = new Date('2026-08-31');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('excludes guest orders with TRASH or CANCELLED status from top products', async () => {
    // 1 valid order item for product A
    mockPrisma.orderItem.findMany.mockResolvedValue([
      {
        orderId: 'o1',
        productId: 'prod-A',
        quantity: 2,
        price: 100,
        total: 200,
      }
    ]);

    // getAnalyticsOrderSnapshots: regularOrders & guestOrders
    mockPrisma.order.findMany.mockResolvedValue([
      { id: 'o1', orderNumber: 'ORD-1', createdAt: new Date(), total: 200, status: 'DELIVERED' }
    ]);

    // One valid guest order (1 piece) and one TRASH guest order (999 pieces)
    mockPrisma.guestOrder.findMany.mockResolvedValue([
      {
        id: 'g1',
        orderNumber: 'G-VALID',
        createdAt: new Date(),
        total: 100,
        finalTotal: 100,
        status: 'PENDING',
        items: JSON.stringify([
          { productId: 'prod-A', quantity: 1, price: 100, total: 100 }
        ])
      },
      {
        id: 'g2',
        orderNumber: 'ORD-851444-819',
        createdAt: new Date(),
        total: 498501,
        finalTotal: 498501,
        status: 'TRASH',
        items: JSON.stringify([
          { productId: 'prod-A', quantity: 999, price: 499, total: 498501 }
        ])
      },
      {
        id: 'g3',
        orderNumber: 'G-CANCELLED',
        createdAt: new Date(),
        total: 200,
        finalTotal: 200,
        status: 'CANCELLED',
        items: JSON.stringify([
          { productId: 'prod-A', quantity: 50, price: 100, total: 5000 }
        ])
      }
    ]);

    mockPrisma.product.findMany.mockResolvedValue([
      { id: 'prod-A', name: 'كوتشي سوان', sku: 'sw-1', mainImage: null, images: [] }
    ]);

    const result = await analyticsService.getProductSalesPerformance('company-1', startDate, endDate);

    // Expect the TRASH (999) and CANCELLED (50) to be completely excluded!
    // Total should be: 2 from orderItem + 1 from valid guestOrder = 3 pieces!
    expect(result.products).toHaveLength(1);
    expect(result.products[0].productId).toBe('prod-A');
    expect(result.products[0].quantitySold).toBe(3);
    expect(result.products[0].revenue).toBe(300);
    expect(result.summary.totalQuantity).toBe(3);
    expect(result.summary.totalRevenue).toBe(300);
    expect(result.summary.totalOrders).toBe(2); // o1 and G-VALID
  });

  test('passes status filter to prisma.orderItem.findMany to exclude TRASH orders', async () => {
    mockPrisma.orderItem.findMany.mockResolvedValue([]);
    mockPrisma.order.findMany.mockResolvedValue([]);
    mockPrisma.guestOrder.findMany.mockResolvedValue([]);

    await analyticsService.getProductSalesPerformance('company-1', startDate, endDate);

    expect(mockPrisma.orderItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          order: {
            is: expect.objectContaining({
              status: { notIn: ['TRASH', 'TRASH_ORDER', 'DELETED'] }
            })
          }
        })
      })
    );
  });
});
