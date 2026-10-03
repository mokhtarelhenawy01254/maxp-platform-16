const mockPrisma = {
  orderItem: { findMany: jest.fn() },
  order: { findMany: jest.fn() },
  guestOrder: { findMany: jest.fn() },
  product: { findMany: jest.fn(), findFirst: jest.fn() },
};

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(() => mockPrisma),
}));

const analyticsService = require('../../services/analyticsService');

describe('analyticsService - Variations Analytics and Product Sales Variations', () => {
  const startDate = new Date('2026-09-01T00:00:00.000Z');
  const endDate = new Date('2026-09-30T23:59:59.999Z');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getProductSalesPerformance - topColor, topSize, topVariation', () => {
    test('computes topColor, topSize, and topVariation for products from both regular and guest orders', async () => {
      // Regular order items for prod-1:
      // Item 1: Blue - L (qty 3, price 100, total 300)
      // Item 2: Blue - M (qty 2, price 100, total 200)
      mockPrisma.orderItem.findMany.mockResolvedValue([
        {
          orderId: 'ord-1',
          productId: 'prod-1',
          productColor: 'أزرق',
          productSize: 'L',
          quantity: 3,
          price: 100,
          total: 300,
        },
        {
          orderId: 'ord-2',
          productId: 'prod-1',
          productColor: 'أزرق',
          productSize: 'M',
          quantity: 2,
          price: 100,
          total: 200,
        }
      ]);

      mockPrisma.order.findMany.mockResolvedValue([
        { id: 'ord-1', orderNumber: 'O-1', createdAt: new Date(), status: 'CONFIRMED' },
        { id: 'ord-2', orderNumber: 'O-2', createdAt: new Date(), status: 'DELIVERED' }
      ]);

      // Guest order for prod-1:
      // Item 3: Black - L (qty 1, price 100, total 100)
      mockPrisma.guestOrder.findMany.mockResolvedValue([
        {
          id: 'g-1',
          orderNumber: 'G-1',
          createdAt: new Date(),
          status: 'PENDING',
          items: JSON.stringify([
            { productId: 'prod-1', productColor: 'أسود', productSize: 'L', quantity: 1, price: 100, total: 100 }
          ])
        }
      ]);

      mockPrisma.product.findMany.mockResolvedValue([
        { id: 'prod-1', name: 'تيشيرت قطن', sku: 'TS-01', mainImage: null, images: [] }
      ]);

      const res = await analyticsService.getProductSalesPerformance('company-1', startDate, endDate);

      expect(res.products).toHaveLength(1);
      const prod = res.products[0];
      expect(prod.quantitySold).toBe(6); // 3 + 2 + 1
      expect(prod.revenue).toBe(600);
      expect(prod.topColor).toBe('أزرق'); // 5 blue vs 1 black
      expect(prod.topSize).toBe('L'); // 4 L vs 2 M
      expect(prod.topVariation).toBe('أزرق - L'); // 3 blue-L
    });
  });

  describe('getVariationsAnalytics', () => {
    test('returns unified sizes, colors, and topVariations with guest orders included and TRASH excluded', async () => {
      // Regular order items
      mockPrisma.orderItem.findMany.mockResolvedValue([
        {
          orderId: 'ord-1',
          productId: 'prod-1',
          productColor: 'أزرق',
          productSize: 'L',
          quantity: 5,
          price: 100,
          total: 500,
          product: { id: 'prod-1', name: 'قميص صيفي' }
        },
        {
          orderId: 'ord-2',
          productId: 'prod-1',
          productColor: 'أزرق',
          productSize: 'M',
          quantity: 3,
          price: 100,
          total: 300,
          product: { id: 'prod-1', name: 'قميص صيفي' }
        }
      ]);

      // Snapshots orders
      mockPrisma.order.findMany.mockResolvedValue([
        { id: 'ord-1', orderNumber: 'O-1', createdAt: new Date(), status: 'CONFIRMED' },
        { id: 'ord-2', orderNumber: 'O-2', createdAt: new Date(), status: 'CONFIRMED' }
      ]);

      // Guest orders: 1 valid guest order (Black - L), 1 TRASH (should be excluded!)
      mockPrisma.guestOrder.findMany.mockResolvedValue([
        {
          id: 'g-valid',
          orderNumber: 'GV-1',
          createdAt: new Date(),
          status: 'CONFIRMED',
          items: JSON.stringify([
            { productId: 'prod-1', productName: 'قميص صيفي', productColor: 'أسود', productSize: 'L', quantity: 2, price: 100, total: 200 }
          ])
        },
        {
          id: 'g-trash',
          orderNumber: 'GT-1',
          createdAt: new Date(),
          status: 'TRASH',
          items: JSON.stringify([
            { productId: 'prod-1', productName: 'قميص صيفي', productColor: 'أصفر', productSize: 'XXL', quantity: 100, price: 100, total: 10000 }
          ])
        }
      ]);

      const res = await analyticsService.getVariationsAnalytics('company-1', startDate, endDate);

      // Verify TRASH excluded: Yellow and XXL should NOT exist
      expect(res.colors.find(c => c.name === 'أصفر')).toBeUndefined();
      expect(res.sizes.find(s => s.name === 'XXL')).toBeUndefined();

      // Check colors: Blue (8 pieces, 800 revenue), Black (2 pieces, 200 revenue)
      expect(res.colors).toEqual([
        { name: 'أزرق', sales: 8, quantity: 8, revenue: 800 },
        { name: 'أسود', sales: 2, quantity: 2, revenue: 200 }
      ]);

      // Check sizes: L (7 pieces, 700 revenue), M (3 pieces, 300 revenue)
      expect(res.sizes).toEqual([
        { name: 'L', sales: 7, quantity: 7, revenue: 700 },
        { name: 'M', sales: 3, quantity: 3, revenue: 300 }
      ]);

      // Check topVariations:
      // 1) "أزرق - L": 5 sales, 500 revenue
      // 2) "أزرق - M": 3 sales, 300 revenue
      // 3) "أسود - L": 2 sales, 200 revenue
      expect(res.topVariations).toHaveLength(3);
      expect(res.topVariations[0].name).toBe('أزرق - L');
      expect(res.topVariations[0].sales).toBe(5);
      expect(res.topVariations[0].revenue).toBe(500);

      expect(res.topVariations[1].name).toBe('أزرق - M');
      expect(res.topVariations[1].sales).toBe(3);
      expect(res.topVariations[1].revenue).toBe(300);

      expect(res.topVariations[2].name).toBe('أسود - L');
      expect(res.topVariations[2].sales).toBe(2);
      expect(res.topVariations[2].revenue).toBe(200);

      // Check totals:
      expect(res.totalVariations).toBe(3);
      expect(res.totalSales).toBe(10); // 5 + 3 + 2
      expect(res.totalQuantity).toBe(10);
      expect(res.totalRevenue).toBe(1000); // 500 + 300 + 200
      expect(res.totalOrders).toBe(3); // ord-1, ord-2, g-valid
    });

    test('supports filtering by productId', async () => {
      mockPrisma.orderItem.findMany.mockResolvedValue([
        {
          orderId: 'ord-1',
          productId: 'prod-A',
          productColor: 'أحمر',
          productSize: 'M',
          quantity: 2,
          price: 150,
          total: 300,
          product: { id: 'prod-A', name: 'منتج أ' }
        }
      ]);

      mockPrisma.order.findMany.mockResolvedValue([
        { id: 'ord-1', orderNumber: 'O-1', createdAt: new Date(), status: 'CONFIRMED' }
      ]);

      mockPrisma.guestOrder.findMany.mockResolvedValue([
        {
          id: 'g-1',
          orderNumber: 'G-1',
          status: 'PENDING',
          items: JSON.stringify([
            { productId: 'prod-A', productName: 'منتج أ', productColor: 'أحمر', productSize: 'L', quantity: 1, price: 150, total: 150 },
            { productId: 'prod-B', productName: 'منتج ب', productColor: 'أخضر', productSize: 'S', quantity: 10, price: 100, total: 1000 }
          ])
        }
      ]);

      mockPrisma.product.findFirst.mockResolvedValue({ id: 'prod-A', name: 'منتج أ' });

      const res = await analyticsService.getVariationsAnalytics('company-1', startDate, endDate, 'prod-A');

      expect(mockPrisma.orderItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ productId: 'prod-A' })
        })
      );

      // prod-B item in guest order must be ignored
      expect(res.colors).toEqual([
        { name: 'أحمر', sales: 3, quantity: 3, revenue: 450 }
      ]);
      expect(res.filteredProduct).toEqual({ id: 'prod-A', name: 'منتج أ' });
    });
  });
});
