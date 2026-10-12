const createResponse = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

const mockPrisma = {
  storefrontSettings: {
    findUnique: jest.fn(),
    upsert: jest.fn()
  },
  product: {
    findFirst: jest.fn()
  },
  order: {
    findMany: jest.fn()
  },
  guestOrder: {
    findMany: jest.fn()
  }
};

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: () => mockPrisma,
  getSharedPrismaClientAsync: async () => mockPrisma,
  safeQuery: async (fn) => fn(mockPrisma)
}));

jest.mock('../../services/tenantContext', () => ({
  run: (id, fn) => fn()
}));

jest.mock('../../services/redisCacheService', () => ({
  del: jest.fn().mockResolvedValue(true)
}));

const postPurchaseOfferController = require('../../controller/postPurchaseOfferController');

describe('postPurchaseOfferController - Product Enrichment & Schema Safety', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getOffer', () => {
    it('queries mainImage (NOT imageUrl) and enriches offer with product details', async () => {
      mockPrisma.storefrontSettings.findUnique.mockResolvedValue({
        designTokens: {
          postPurchaseOffer: {
            enabled: true,
            productId: 'prod-aura-1',
            discountType: 'percentage',
            discountValue: 20
          }
        }
      });

      mockPrisma.product.findFirst.mockResolvedValue({
        id: 'prod-aura-1',
        name: 'Swan Aura',
        price: '399.00',
        comparePrice: '549.00',
        mainImage: 'https://cdn.example.com/swan-aura-main.jpg',
        images: '["https://cdn.example.com/swan-aura-alt.jpg"]',
        isActive: true,
        productVariants: [
          { id: 'var-s', name: 'Small', price: '399.00', sku: 'AURA-S', stock: 10, metadata: JSON.stringify({ options: { size: 'S' } }) }
        ]
      });

      const req = {
        companyId: 'company-swan'
      };
      const res = createResponse();

      await postPurchaseOfferController.getOffer(req, res);

      expect(mockPrisma.product.findFirst).toHaveBeenCalledWith({
        where: { id: 'prod-aura-1', companyId: 'company-swan' },
        select: expect.objectContaining({
          id: true,
          name: true,
          price: true,
          comparePrice: true,
          mainImage: true,
          images: true,
          isActive: true
        })
      });

      // Verify that imageUrl is NOT in the select query (would crash Prisma)
      const selectArg = mockPrisma.product.findFirst.mock.calls[0][0].select;
      expect(selectArg.imageUrl).toBeUndefined();
      expect(selectArg.mainImage).toBe(true);

      expect(res.json).toHaveBeenCalled();
      const responseData = res.json.mock.calls[0][0];
      expect(responseData.success).toBe(true);
      expect(responseData.data.productName).toBe('Swan Aura');
      expect(responseData.data.productImage).toBe('https://cdn.example.com/swan-aura-main.jpg');
      expect(responseData.data.product.imageUrl).toBe('https://cdn.example.com/swan-aura-main.jpg');
    });
  });

  describe('getPublicOffer', () => {
    it('returns data: null when offer is not enabled', async () => {
      mockPrisma.storefrontSettings.findUnique.mockResolvedValue({
        designTokens: {
          postPurchaseOffer: {
            enabled: false,
            productId: 'prod-aura-1'
          }
        }
      });

      const req = {
        company: { id: 'company-swan' }
      };
      const res = createResponse();

      await postPurchaseOfferController.getPublicOffer(req, res);

      expect(res.json).toHaveBeenCalledWith({ success: true, data: null });
      expect(mockPrisma.product.findFirst).not.toHaveBeenCalled();
    });

    it('queries mainImage (NOT imageUrl) and enriches active public offer', async () => {
      mockPrisma.storefrontSettings.findUnique.mockResolvedValue({
        designTokens: {
          postPurchaseOffer: {
            enabled: true,
            productId: 'prod-aura-1',
            discountType: 'percentage',
            discountValue: 20,
            originalPrice: 500
          }
        }
      });

      mockPrisma.product.findFirst.mockResolvedValue({
        id: 'prod-aura-1',
        name: 'Swan Aura',
        price: '399.00',
        comparePrice: '549.00',
        mainImage: 'https://cdn.example.com/swan-aura-main.jpg',
        images: '["https://cdn.example.com/swan-aura-alt.jpg"]',
        productVariants: [
          { id: 'var-m', name: 'Medium', price: '399.00', sku: 'AURA-M', stock: 5, metadata: JSON.stringify({ options: { size: 'M' } }) }
        ]
      });

      const req = {
        company: { id: 'company-swan' }
      };
      const res = createResponse();

      await postPurchaseOfferController.getPublicOffer(req, res);

      const selectArg = mockPrisma.product.findFirst.mock.calls[0][0].select;
      expect(selectArg.imageUrl).toBeUndefined();
      expect(selectArg.mainImage).toBe(true);

      const responseData = res.json.mock.calls[0][0];
      expect(responseData.success).toBe(true);
      expect(responseData.data.productName).toBe('Swan Aura');
      expect(responseData.data.productImage).toBe('https://cdn.example.com/swan-aura-main.jpg');
      expect(responseData.data.product.imageUrl).toBe('https://cdn.example.com/swan-aura-main.jpg');
      expect(responseData.data.product.variants).toHaveLength(1);
    });

    it('falls back to JSON images string when mainImage is empty', async () => {
      mockPrisma.storefrontSettings.findUnique.mockResolvedValue({
        designTokens: {
          postPurchaseOffer: {
            enabled: true,
            productId: 'prod-aura-2',
            discountType: 'fixed_price',
            discountValue: 250
          }
        }
      });

      mockPrisma.product.findFirst.mockResolvedValue({
        id: 'prod-aura-2',
        name: 'Swan Scarf',
        price: '300.00',
        mainImage: null,
        images: '["https://cdn.example.com/scarf-fallback.jpg"]',
        productVariants: []
      });

      const req = {
        company: { id: 'company-swan' }
      };
      const res = createResponse();

      await postPurchaseOfferController.getPublicOffer(req, res);

      const responseData = res.json.mock.calls[0][0];
      expect(responseData.success).toBe(true);
      expect(responseData.data.productImage).toBe('https://cdn.example.com/scarf-fallback.jpg');
      expect(responseData.data.product.imageUrl).toBe('https://cdn.example.com/scarf-fallback.jpg');
    });
  });

  describe('getOfferAnalytics', () => {
    it('returns structured KPIs, delivery outcomes, and variant breakdown', async () => {
      const now = new Date();
      mockPrisma.order.findMany.mockResolvedValue([
        {
          id: 'ord-1',
          orderNumber: 'ORD-101',
          customerName: 'سارة أحمد',
          customerPhone: '01011111111',
          status: 'DELIVERED',
          total: 800,
          createdAt: now,
          metadata: {
            postPurchaseOfferAccepted: true,
            postPurchaseOffer: {
              offerPrice: 350,
              productColor: 'أبيض',
              productSize: 'M',
              acceptedAt: new Date(now.getTime() + 8000).toISOString()
            }
          },
          orderItems: [
            {
              price: 350,
              quantity: 1,
              metadata: { isPostPurchaseOffer: true, addedPostPurchase: true }
            }
          ]
        }
      ]);

      mockPrisma.guestOrder.findMany.mockResolvedValue([
        {
          id: 'guest-1',
          orderNumber: 'ORD-102',
          customerName: 'محمد علي',
          customerPhone: '01022222222',
          status: 'SHIPPED',
          total: 450,
          createdAt: now,
          metadata: JSON.stringify({
            postPurchaseOfferAccepted: false
          }),
          items: JSON.stringify([
            { price: 450, quantity: 1 }
          ])
        }
      ]);

      const req = {
        user: { companyId: 'company-swan' },
        query: { period: 'today' }
      };
      const res = createResponse();

      await postPurchaseOfferController.getOfferAnalytics(req, res);

      const responseData = res.json.mock.calls[0][0];
      expect(responseData.success).toBe(true);
      expect(responseData.data.kpis.totalOrders).toBe(2);
      expect(responseData.data.kpis.offerAcceptedOrders).toBe(1);
      expect(responseData.data.kpis.acceptanceRate).toBe(50);
      expect(responseData.data.kpis.offerRevenue).toBe(350);
      expect(responseData.data.kpis.avgAcceptanceSeconds).toBe(8);
      expect(responseData.data.deliveryOutcomes.deliveredOrders).toBe(1);
      expect(responseData.data.deliveryOutcomes.deliveredOfferRevenue).toBe(350);
      expect(responseData.data.variants).toHaveLength(1);
      expect(responseData.data.variants[0].color).toBe('أبيض');
      expect(responseData.data.variants[0].size).toBe('M');
      expect(responseData.data.recentAcceptedOrders).toHaveLength(1);
    });
  });
});
