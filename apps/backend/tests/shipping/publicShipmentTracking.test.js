/**
 * Public Shipment Tracking Acceptance Tests (SHIP-W3)
 *
 * Verifies Acceptance Criteria 1, 2, 3:
 * 1. GET /api/v1/public/shipments/track/<waybill> without Authorization -> 200 (not 401),
 *    zero prices/costs/margins/COD, masked recipient name and phone, no street address.
 * 2. Non-existent waybill -> 404 in Arabic. 21 requests/minute from same IP -> 429.
 * 3. GET /api/v1/public/shipments/track/<waybill> with Bearer token of Company B -> exact same public payload (zero leak).
 * 4. globalSecurity.isPublicRoute guard test proving whitelist behavior.
 */

const mockPrisma = {
  shipment: {
    findFirst: jest.fn(),
  },
};

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: () => mockPrisma,
  getSharedPrismaClientAsync: async () => mockPrisma,
}));

const express = require('express');
const request = require('supertest');
const { isPublicRoute, globalAuthentication } = require('../../middleware/globalSecurity');
const publicShipmentTrackingRoutes = require('../../routes/publicShipmentTrackingRoutes');
const { maskRecipientName, maskPhone } = require('../../controller/publicShipmentTrackingController');

const app = express();
app.use(express.json());
app.use('/api/v1/public/shipments', publicShipmentTrackingRoutes);

const resetRateLimiter = async () => {
  if (publicShipmentTrackingRoutes.publicTrackingLimiter?.resetKey) {
    await publicShipmentTrackingRoutes.publicTrackingLimiter.resetKey('127.0.0.1');
    await publicShipmentTrackingRoutes.publicTrackingLimiter.resetKey('::ffff:127.0.0.1');
    await publicShipmentTrackingRoutes.publicTrackingLimiter.resetKey('::1');
  }
};

describe('Public Shipment Tracking (SHIP-W3 Acceptance Gates 1-3)', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await resetRateLimiter();
  });

  describe('PII Masking Unit Logic', () => {
    test('masks recipient name properly: First Name + first letter of family name + asterisks', () => {
      expect(maskRecipientName('أحمد محمد علي')).toBe('أحمد م***');
      expect(maskRecipientName('محمود خليل')).toBe('محمود خ***');
      expect(maskRecipientName('John Doe')).toBe('John D***');
      expect(maskRecipientName('سارة')).toBe('سا***');
      expect(maskRecipientName(null)).toBeNull();
    });

    test('masks phone properly: first 3 digits + ***** + last 3 digits', () => {
      expect(maskPhone('01012345432')).toBe('010*****432');
      expect(maskPhone('+201123456789')).toBe('201*****789');
      expect(maskPhone(null)).toBeNull();
    });
  });

  describe('Criterion 1: GET /api/v1/public/shipments/track/:waybill without Authorization', () => {
    test('returns 200 without Authorization header, zero financials, and masked PII', async () => {
      const mockShipment = {
        id: 'ship-w3-100',
        barcode: 'WB-CAIRO-9921',
        trackingNumber: 'TRK-2026-X9921',
        status: 'OUT_FOR_DELIVERY',
        recipientName: 'أحمد محمد علي',
        recipientPhone: '01012345432',
        destinationGovernorate: 'القاهرة',
        destinationCity: 'مدينة نصر',
        destinationAddress: '15 شارع عباس العقاد - عمارة 4 - شقة 12',
        cost: 65.00,
        codAmount: 750.00,
        collectedAmount: 0.00,
        currency: 'EGP',
        declaredValue: 1200.00,
        clientRateCardId: 'rc-123',
        updatedAt: new Date('2026-11-03T10:30:00Z'),
        createdAt: new Date('2026-11-02T08:00:00Z'),
        events: [
          {
            id: 'ev-1',
            toStatus: 'OUT_FOR_DELIVERY',
            fromStatus: 'IN_TRANSIT',
            reasonCode: 'DISPATCHED',
            notes: 'خرج مع المندوب للتوصيل',
            createdAt: new Date('2026-11-03T09:00:00Z'),
          },
          {
            id: 'ev-2',
            toStatus: 'IN_TRANSIT',
            fromStatus: 'PENDING',
            reasonCode: 'HUB_RECEIVED',
            notes: 'تم استلام الشحنة في فرع القاهرة',
            createdAt: new Date('2026-11-02T14:00:00Z'),
          },
        ],
      };

      mockPrisma.shipment.findFirst.mockResolvedValueOnce(mockShipment);

      const res = await request(app)
        .get('/api/v1/public/shipments/track/WB-CAIRO-9921')
        .expect(200);

      expect(res.body.success).toBe(true);
      const data = res.body.data;

      // 1. Waybill & Status
      expect(data.waybill).toBe('WB-CAIRO-9921');
      expect(data.trackingNumber).toBe('TRK-2026-X9921');
      expect(data.status).toBe('OUT_FOR_DELIVERY');

      // 2. Destination
      expect(data.destinationGovernorate).toBe('القاهرة');
      expect(data.destinationCity).toBe('مدينة نصر');

      // 3. PII Masking
      expect(data.recipientName).toBe('أحمد م***');
      expect(data.recipientPhone).toBe('010*****432');

      // 4. Zero street / building number address
      expect(data.destinationAddress).toBeUndefined();
      expect(JSON.stringify(res.body)).not.toContain('عباس العقاد');
      expect(JSON.stringify(res.body)).not.toContain('شقة 12');

      // 5. Zero Prices / Costs / Margin / COD / Financials
      expect(data.cost).toBeUndefined();
      expect(data.codAmount).toBeUndefined();
      expect(data.collectedAmount).toBeUndefined();
      expect(data.currency).toBeUndefined();
      expect(data.declaredValue).toBeUndefined();
      expect(data.clientRateCardId).toBeUndefined();
      expect(data.priceAdjustment).toBeUndefined();
      expect(JSON.stringify(res.body)).not.toContain('750');
      expect(JSON.stringify(res.body)).not.toContain('65');

      // 6. Events list (up to 6)
      expect(data.events).toHaveLength(2);
      expect(data.events[0].status).toBe('OUT_FOR_DELIVERY');
      expect(data.events[0].notes).toBe('خرج مع المندوب للتوصيل');
    });
  });

  describe('Criterion 2: Non-existent waybill and Rate Limiting', () => {
    test('returns 404 with Arabic error for unknown waybill', async () => {
      mockPrisma.shipment.findFirst.mockResolvedValueOnce(null);

      const res = await request(app)
        .get('/api/v1/public/shipments/track/NON_EXISTENT_WAYBILL_123')
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('الشحنة غير موجودة أو رقم البوليصة غير صحيح');
    });

    test('enforces rate limit: 21 requests in 1 minute returns 429', async () => {
      await resetRateLimiter();

      mockPrisma.shipment.findFirst.mockResolvedValue({
        id: 'ship-1',
        barcode: 'WB-RATE-LIMIT',
        trackingNumber: 'TRK-RATE-LIMIT',
        status: 'PENDING',
        recipientName: 'علي كمال',
        recipientPhone: '01122334455',
        destinationGovernorate: 'الجيزة',
        destinationCity: 'الدقي',
        updatedAt: new Date(),
        createdAt: new Date(),
        events: [],
      });

      // Send 20 requests rapidly - all should pass (200)
      for (let i = 0; i < 20; i++) {
        const res = await request(app).get('/api/v1/public/shipments/track/WB-RATE-LIMIT');
        expect(res.status).toBe(200);
      }

      // 21st request must return 429 Too Many Requests
      const rateLimitedRes = await request(app).get('/api/v1/public/shipments/track/WB-RATE-LIMIT');
      expect(rateLimitedRes.status).toBe(429);
      expect(rateLimitedRes.body.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(rateLimitedRes.body.message).toContain('تم تجاوز الحد المسموح');
    });
  });

  describe('Criterion 3: Cross-Company Token Leak Guard', () => {
    test('calling with Authorization token of another company returns the exact same public response without leak', async () => {
      await resetRateLimiter();

      const mockShipment = {
        id: 'ship-company-alpha',
        barcode: 'WB-ALPHA-001',
        trackingNumber: 'TRK-ALPHA-001',
        status: 'DELIVERED',
        recipientName: 'محمود جمال',
        recipientPhone: '01298765432',
        destinationGovernorate: 'الإسكندرية',
        destinationCity: 'سموحة',
        updatedAt: new Date(),
        createdAt: new Date(),
        events: [],
      };

      mockPrisma.shipment.findFirst.mockResolvedValueOnce(mockShipment);

      const res = await request(app)
        .get('/api/v1/public/shipments/track/WB-ALPHA-001')
        .set('Authorization', 'Bearer fake-token-company-beta')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.waybill).toBe('WB-ALPHA-001');
      expect(res.body.data.recipientName).toBe('محمود ج***');
      expect(res.body.data.recipientPhone).toBe('012*****432');
      expect(res.body.data.cost).toBeUndefined();
      expect(res.body.data.codAmount).toBeUndefined();
    });
  });

  describe('globalSecurity Whitelist & Route Isolation Guard', () => {
    test('isPublicRoute treats GET /api/v1/public/shipments/track/* as public', () => {
      expect(isPublicRoute('GET', '/api/v1/public/shipments/track/WB-12345')).toBe(true);
      expect(isPublicRoute('GET', '/api/v1/public/shipments/track/TRK-990011')).toBe(true);
    });

    test('preserves security guard: protected shipping portal routes strictly require authentication', () => {
      expect(isPublicRoute('GET', '/api/v1/shipping-portal/shipments')).toBe(false);
      expect(isPublicRoute('POST', '/api/v1/shipping-portal/shipments')).toBe(false);
      expect(isPublicRoute('DELETE', '/api/v1/shipping-portal/shipments/123/cancel')).toBe(false);
      expect(isPublicRoute('POST', '/api/v1/shipping-portal/maintenance/run-rto')).toBe(false);
    });

    test('globalAuthentication passes unauthenticated requests for public track route', async () => {
      const req = {
        method: 'GET',
        originalUrl: '/api/v1/public/shipments/track/WB-123',
        path: '/api/v1/public/shipments/track/WB-123',
        ip: '127.0.0.1',
        headers: {},
        connection: { remoteAddress: '127.0.0.1' },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      await globalAuthentication(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();
    });
  });
});
