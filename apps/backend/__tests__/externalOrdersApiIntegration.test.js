const express = require('express');
const request = require('supertest');

// Mock sharedDatabase before requiring router
const mockPrisma = {
  order: {
    findMany: jest.fn(),
    count: jest.fn(),
    findFirst: jest.fn(),
  },
};

jest.mock('../services/sharedDatabase', () => ({
  getSharedPrismaClientAsync: jest.fn().mockResolvedValue(mockPrisma),
}));

// Mock merchantApiAuth middleware to inject tenant context
jest.mock('../middleware/merchantApiAuth', () => {
  const actual = jest.requireActual('../middleware/merchantApiAuth');
  return {
    ...actual,
    merchantApiAuth: (req, _res, next) => {
      // Default to company_A unless header overrides for multi-tenant testing
      const companyId = req.headers['x-test-company-id'] || 'company_A';
      req.merchantCredential = {
        id: 'cred_test_123',
        companyId,
        scopes: ['orders:read'],
      };
      next();
    },
    requireScope: () => (req, res, next) => next(),
  };
});

const router = require('../routes/externalApiV1Routes');

const app = express();
app.use(express.json());
app.use('/api/v1/public/ext', router);

describe('External Orders API Integration (/api/v1/public/ext/orders)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('(أ) أوردر عليه metadata كاملة → كل مفاتيح attribution بتظهر صح', () => {
    it('returns all 11 attribution keys correctly populated in GET /orders and GET /orders/:id', async () => {
      const fullOrder = {
        id: 'ord_full_1',
        orderNumber: '1001',
        status: 'DELIVERED',
        customStatusCode: null,
        paymentStatus: 'PAID',
        paymentMethod: 'CASH',
        subtotal: 1000,
        tax: 0,
        shipping: 50,
        discount: 100,
        total: 950,
        currency: 'EGP',
        customerName: 'سارة أحمد',
        customerPhone: '01099887766',
        customerEmail: 'sara@example.com',
        city: 'القاهرة',
        governorate: 'القاهرة',
        notes: 'ملاحظة خاصة',
        confirmedAt: new Date('2026-10-18T10:00:00.000Z'),
        createdAt: new Date('2026-10-18T09:00:00.000Z'),
        updatedAt: new Date('2026-10-19T14:00:00.000Z'),
        metadata: JSON.stringify({
          attribution: {
            utm_source: 'snapchat',
            utm_medium: 'story_ads',
            utm_campaign: 'autumn_collection',
            utm_term: 'winter_jacket',
            utm_content: 'video_30s',
            campaignId: 'snap_camp_444',
            adSetId: 'snap_adset_555',
            adId: 'snap_ad_666',
            fbclid: 'snap_fbclid_dummy',
            gclid: 'snap_gclid_dummy',
          },
          couponCode: 'AUTUMN20',
        }),
        orderItems: [
          { id: 'item_1', productId: 'p1', quantity: 2, price: 500, productName: 'جاكيت شتوي' },
        ],
        shipments: [
          {
            collectedAt: new Date('2026-10-19T14:00:00.000Z'),
            collectedAmount: 950,
            createdAt: new Date('2026-10-18T12:00:00.000Z'),
          },
        ],
        statusHistory: [],
        returnRequests: [],
      };

      mockPrisma.order.findMany.mockResolvedValue([fullOrder]);
      mockPrisma.order.count.mockResolvedValue(1);
      mockPrisma.order.findFirst.mockResolvedValue(fullOrder);

      // 1. Check List Endpoint
      const listRes = await request(app).get('/api/v1/public/ext/orders');
      expect(listRes.status).toBe(200);
      expect(listRes.body.success).toBe(true);
      expect(listRes.body.data).toHaveLength(1);

      const listRow = listRes.body.data[0];
      expect(listRow.totalQuantity).toBe(2);
      expect(listRow.deliveredAt).toBe('2026-10-19T14:00:00.000Z');
      expect(listRow.collectedCodAmount).toBe(950);
      expect(listRow.confirmedAt).toBe('2026-10-18T10:00:00.000Z');
      expect(listRow.rejectionReason).toBeNull();
      expect(listRow.attribution).toEqual({
        utmSource: 'snapchat',
        utmMedium: 'story_ads',
        utmCampaign: 'autumn_collection',
        utmTerm: 'winter_jacket',
        utmContent: 'video_30s',
        campaignId: 'snap_camp_444',
        adSetId: 'snap_adset_555',
        adId: 'snap_ad_666',
        fbclid: 'snap_fbclid_dummy',
        gclid: 'snap_gclid_dummy',
        couponCode: 'AUTUMN20',
      });

      // 2. Check Detail Endpoint
      const detailRes = await request(app).get('/api/v1/public/ext/orders/ord_full_1');
      expect(detailRes.status).toBe(200);
      expect(detailRes.body.success).toBe(true);

      const detail = detailRes.body.data;
      expect(detail.id).toBe('ord_full_1');
      expect(detail.items).toHaveLength(1);
      expect(detail.items[0]).toEqual({
        id: 'item_1',
        productId: 'p1',
        quantity: 2,
        price: 500,
        productName: 'جاكيت شتوي',
      });
      expect(detail.totalQuantity).toBe(2);
      expect(detail.deliveredAt).toBe('2026-10-19T14:00:00.000Z');
      expect(detail.collectedCodAmount).toBe(950);
      expect(detail.confirmedAt).toBe('2026-10-18T10:00:00.000Z');
      expect(detail.attribution).toEqual(listRow.attribution);
    });
  });

  describe('(ب) أوردر بدون metadata → كلها null (مش أخطاء)', () => {
    it('returns all attribution keys as null without throwing errors', async () => {
      const bareOrder = {
        id: 'ord_bare_2',
        orderNumber: '1002',
        status: 'PENDING',
        customStatusCode: null,
        paymentStatus: 'PENDING',
        paymentMethod: 'CASH',
        subtotal: 300,
        tax: 0,
        shipping: 40,
        discount: 0,
        total: 340,
        currency: 'EGP',
        customerName: 'محمود سامي',
        customerPhone: '01200001111',
        customerEmail: null,
        city: 'المنصورة',
        governorate: 'الدقهلية',
        notes: null,
        confirmedAt: null,
        createdAt: new Date('2026-10-20T08:00:00.000Z'),
        updatedAt: new Date('2026-10-20T08:00:00.000Z'),
        metadata: null,
        orderItems: [],
        shipments: [],
        statusHistory: [],
        returnRequests: [],
      };

      mockPrisma.order.findMany.mockResolvedValue([bareOrder]);
      mockPrisma.order.count.mockResolvedValue(1);
      mockPrisma.order.findFirst.mockResolvedValue(bareOrder);

      const listRes = await request(app).get('/api/v1/public/ext/orders');
      expect(listRes.status).toBe(200);

      const row = listRes.body.data[0];
      expect(row.totalQuantity).toBe(0);
      expect(row.deliveredAt).toBeNull();
      expect(row.collectedCodAmount).toBeNull();
      expect(row.confirmedAt).toBeNull();
      expect(row.rejectionReason).toBeNull();
      expect(row.attribution).toEqual({
        utmSource: null,
        utmMedium: null,
        utmCampaign: null,
        utmTerm: null,
        utmContent: null,
        campaignId: null,
        adSetId: null,
        adId: null,
        fbclid: null,
        gclid: null,
        couponCode: null,
      });

      const detailRes = await request(app).get('/api/v1/public/ext/orders/ord_bare_2');
      expect(detailRes.status).toBe(200);
      expect(detailRes.body.data.attribution).toEqual(row.attribution);
      expect(detailRes.body.data.items).toEqual([]);
    });
  });

  describe('(ج) أوردر بمرتجع → rejectionReason مظبوط', () => {
    it('returns rejectionReason from ReturnRequest when present', async () => {
      const returnedOrder = {
        id: 'ord_ret_3',
        orderNumber: '1003',
        status: 'RETURNED',
        customStatusCode: null,
        paymentStatus: 'REFUNDED',
        paymentMethod: 'CASH',
        subtotal: 400,
        shipping: 50,
        discount: 0,
        total: 450,
        currency: 'EGP',
        customerName: 'كريم خالد',
        customerPhone: '01511223344',
        city: 'طنطا',
        governorate: 'الغربية',
        confirmedAt: new Date('2026-10-15T10:00:00.000Z'),
        createdAt: new Date('2026-10-14T09:00:00.000Z'),
        metadata: null,
        orderItems: [{ quantity: 1 }],
        shipments: [],
        statusHistory: [],
        returnRequests: [
          {
            rejectionReason: 'العميل عاين الشحنة ورفض الاستلام لعدم مناسبة اللون',
            reasonId: 'REASON_COLOR',
            returnReason: { reason: 'لون غير مناسب' },
          },
        ],
      };

      mockPrisma.order.findMany.mockResolvedValue([returnedOrder]);
      mockPrisma.order.count.mockResolvedValue(1);

      const res = await request(app).get('/api/v1/public/ext/orders');
      expect(res.status).toBe(200);
      expect(res.body.data[0].rejectionReason).toBe('العميل عاين الشحنة ورفض الاستلام لعدم مناسبة اللون');
    });

    it('falls back to customStatusCode when order is CANCELLED without a ReturnRequest', async () => {
      const cancelledOrder = {
        id: 'ord_canc_4',
        orderNumber: '1004',
        status: 'CANCELLED',
        customStatusCode: 'CUSTOMER_NO_ANSWER_3_DAYS',
        paymentStatus: 'FAILED',
        paymentMethod: 'CASH',
        subtotal: 600,
        shipping: 50,
        discount: 0,
        total: 650,
        currency: 'EGP',
        customerName: 'منى يوسف',
        customerPhone: '01055554444',
        city: 'أسيوط',
        governorate: 'أسيوط',
        confirmedAt: null,
        createdAt: new Date('2026-10-12T11:00:00.000Z'),
        metadata: null,
        orderItems: [{ quantity: 2 }],
        shipments: [],
        statusHistory: [],
        returnRequests: [],
      };

      mockPrisma.order.findMany.mockResolvedValue([cancelledOrder]);
      mockPrisma.order.count.mockResolvedValue(1);

      const res = await request(app).get('/api/v1/public/ext/orders');
      expect(res.status).toBe(200);
      expect(res.body.data[0].rejectionReason).toBe('CUSTOMER_NO_ANSWER_3_DAYS');
    });
  });

  describe('(د) عزل الشركات — أوردر شركة A ما يظهرش لشركة B', () => {
    it('strictly applies companyId filter to findMany based on credential companyId', async () => {
      mockPrisma.order.findMany.mockResolvedValue([]);
      mockPrisma.order.count.mockResolvedValue(0);

      // Call as company_A
      await request(app)
        .get('/api/v1/public/ext/orders')
        .set('x-test-company-id', 'company_A');

      expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            companyId: 'company_A',
          }),
        }),
      );

      // Call as company_B
      await request(app)
        .get('/api/v1/public/ext/orders')
        .set('x-test-company-id', 'company_B');

      expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            companyId: 'company_B',
          }),
        }),
      );
    });

    it('returns 404 when company_A requests an order that belongs to company_B', async () => {
      // Mock findFirst returning null because companyId does not match in database query
      mockPrisma.order.findFirst.mockResolvedValue(null);

      const res = await request(app)
        .get('/api/v1/public/ext/orders/ord_belonging_to_company_b')
        .set('x-test-company-id', 'company_A');

      expect(res.status).toBe(404);
      expect(res.body).toEqual({
        success: false,
        code: 'NOT_FOUND',
        message: 'الطلب غير موجود',
      });

      // Verify that findFirst was called with companyId: 'company_A'
      expect(mockPrisma.order.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            companyId: 'company_A',
          }),
        }),
      );
    });
  });

  describe('Delivery timestamp from OrderStatusHistory fallback', () => {
    it('uses latest DELIVERED status transition when shipment has no collectedAt', async () => {
      const deliveredViaHistory = {
        id: 'ord_hist_5',
        orderNumber: '1005',
        status: 'DELIVERED',
        customStatusCode: null,
        paymentStatus: 'PAID',
        paymentMethod: 'CASH',
        subtotal: 500,
        shipping: 50,
        discount: 0,
        total: 550,
        currency: 'EGP',
        customerName: 'طارق نبيل',
        customerPhone: '01022334455',
        city: 'الفيوم',
        governorate: 'الفيوم',
        confirmedAt: new Date('2026-10-10T10:00:00.000Z'),
        createdAt: new Date('2026-10-10T09:00:00.000Z'),
        metadata: null,
        orderItems: [{ quantity: 1 }],
        shipments: [{ collectedAt: null, collectedAmount: null }],
        statusHistory: [
          { status: 'DELIVERED', createdAt: new Date('2026-10-13T16:45:00.000Z') },
        ],
        returnRequests: [],
      };

      mockPrisma.order.findMany.mockResolvedValue([deliveredViaHistory]);
      mockPrisma.order.count.mockResolvedValue(1);

      const res = await request(app).get('/api/v1/public/ext/orders');
      expect(res.status).toBe(200);
      expect(res.body.data[0].deliveredAt).toBe('2026-10-13T16:45:00.000Z');
      expect(res.body.data[0].collectedCodAmount).toBeNull();
    });
  });
});
