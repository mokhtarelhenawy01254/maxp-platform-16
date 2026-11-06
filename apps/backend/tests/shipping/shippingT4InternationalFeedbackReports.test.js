/**
 * SHIP-T4 Acceptance Tests:
 * 1. Convert shipment to international -> intl acknowledgment PENDING.
 *    Attempt assigning to delivery run -> 409 INTL_ACK_PENDING.
 *    Approve acknowledgment -> assign to run -> 200/201.
 * 2. 5-star rating via token -> 201; re-submitting same token -> 409; feedback report shows avg=5, count=1.
 * 3. Geo report: 2 shipments Cairo/Nasr City + 1 Giza -> 2 rows with correct counts.
 * 4. Best sellers report: order with 2 items -> 2 rows with quantities and values.
 * 5. Missions report: delivery run with 3 shipments (2 delivered, 1 failed) -> accurate row.
 * 6. Format=csv for all reports.
 */

const express = require('express');
const request = require('supertest');

const mockPrisma = {
  shipment: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    count: jest.fn(),
  },
  internationalAcknowledgment: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    upsert: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  shipmentFeedback: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  deliveryRun: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  courier: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
  order: {
    findFirst: jest.fn(),
  },
  installedApp: {
    findFirst: jest.fn(),
  },
  shipmentEvent: {
    create: jest.fn(),
  },
  $transaction: jest.fn((callback) => callback(mockPrisma)),
};

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: () => mockPrisma,
  getSharedPrismaClientAsync: async () => mockPrisma,
}));

let mockUser = {
  id: 'user-ops-t4',
  companyId: 'company-t4',
  role: 'OPERATIONS',
  name: 'T4 Operations Manager',
};

jest.mock('../../utils/verifyToken', () => ({
  authenticateToken: (req, res, next) => {
    req.user = { ...mockUser };
    next();
  },
  requireRole: (allowedRoles) => (req, res, next) => {
    if (!allowedRoles.includes(req.user?.role)) {
      return res.status(403).json({ success: false, message: 'غير مصرح' });
    }
    next();
  },
}));

const appAccessMw = (req, res, next) => next();
const appAccessFn = () => appAccessMw;
appAccessFn.checkAppAccess = appAccessFn;
jest.mock('../../middleware/checkAppAccess', () => appAccessFn);

// Build Express app with all SHIP-T4 routes
const app = express();
app.use(express.json());

const shippingPortalRoutes = require('../../routes/shippingPortalRoutes');
const shippingReportsRoutes = require('../../routes/shippingReportsRoutes');
const publicFeedbackRoutes = require('../../routes/publicFeedbackRoutes');
const internationalReviewRoutes = require('../../routes/internationalReviewRoutes');
const courierRoutes = require('../../routes/courierRoutes');

app.use('/api/v1/shipping-portal', shippingPortalRoutes);
app.use('/api/v1/shipping-reports', shippingReportsRoutes);
app.use('/api/v1/public/feedback', publicFeedbackRoutes);
app.use('/public/feedback', publicFeedbackRoutes);
app.use('/api/v1/international', internationalReviewRoutes);
app.use('/international', internationalReviewRoutes);
app.use('/api/v1/couriers', courierRoutes);

describe('SHIP-T4 Acceptance Suite', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockPrisma.$transaction.mockImplementation((callback) => callback(mockPrisma));
    mockPrisma.courier.findFirst.mockResolvedValue({
      id: 'courier-1',
      companyId: 'company-t4',
      name: 'طارق الكابتن',
      documentsStatus: 'VERIFIED',
    });
  });

  describe('Scenario 1: International Shipment & Delivery Run Guard', () => {
    it('converts shipment to international with PENDING acknowledgment', async () => {
      mockPrisma.shipment.findFirst.mockResolvedValue({
        id: 'ship-intl-1',
        companyId: 'company-t4',
        status: 'PENDING',
        recipientName: 'أحمد الإماراتي',
        declaredValue: 2500,
      });

      mockPrisma.shipment.update.mockResolvedValue({
        id: 'ship-intl-1',
        isInternational: true,
        destinationCountry: 'UAE',
        destinationCityIntl: 'Dubai',
        customsValue: 2500,
        intlAckStatus: 'PENDING',
      });

      mockPrisma.internationalAcknowledgment.upsert.mockResolvedValue({
        id: 'ack-1',
        shipmentId: 'ship-intl-1',
        companyId: 'company-t4',
        customerName: 'أحمد الإماراتي',
        customsValue: 2500,
        status: 'PENDING',
      });

      const res = await request(app)
        .post('/api/v1/shipping-portal/shipments/ship-intl-1/international')
        .send({
          destinationCountry: 'UAE',
          destinationCityIntl: 'Dubai',
          customsValue: 2500,
          customerName: 'أحمد الإماراتي',
          contentDescription: 'ملابس قطنية فاخرة',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.shipment.isInternational).toBe(true);
      expect(res.body.shipment.intlAckStatus).toBe('PENDING');
      expect(res.body.acknowledgment.status).toBe('PENDING');
    });

    it('rejects assigning unapproved international shipment to run with 409 INTL_ACK_PENDING', async () => {
      mockPrisma.shipment.findMany.mockResolvedValue([
        {
          id: 'ship-intl-1',
          companyId: 'company-t4',
          status: 'PENDING',
          isInternational: true,
          intlAckStatus: 'PENDING',
          trackingNumber: 'TRK-INTL-001',
          order: { total: 2500, status: 'confirmed' },
        },
      ]);

      const res = await request(app)
        .post('/api/v1/couriers/runs')
        .send({
          courierId: 'courier-1',
          shipmentIds: ['ship-intl-1'],
        });

      expect(res.status).toBe(409);
      expect(res.body.code).toBe('INTL_ACK_PENDING');
    });

    it('allows assigning shipment to run after approving customs acknowledgment (201)', async () => {
      // Step A: Approve the acknowledgment
      mockPrisma.internationalAcknowledgment.findFirst.mockResolvedValue({
        id: 'ack-1',
        shipmentId: 'ship-intl-1',
        companyId: 'company-t4',
        status: 'PENDING',
        shipment: { id: 'ship-intl-1', status: 'PENDING' },
      });

      mockPrisma.internationalAcknowledgment.update.mockResolvedValue({
        id: 'ack-1',
        shipmentId: 'ship-intl-1',
        status: 'APPROVED',
        reviewedBy: 'T4 Operations Manager',
      });

      mockPrisma.shipment.update.mockResolvedValue({
        id: 'ship-intl-1',
        intlAckStatus: 'APPROVED',
      });

      const reviewRes = await request(app)
        .patch('/api/v1/international/ack-1/review')
        .send({ status: 'APPROVED', notes: 'تم فحص البوليصة الجمركية' });

      expect(reviewRes.status).toBe(200);
      expect(reviewRes.body.success).toBe(true);
      expect(reviewRes.body.acknowledgment.status).toBe('APPROVED');

      // Step B: Now assign to run -> succeeds with 201
      mockPrisma.shipment.findMany.mockResolvedValue([
        {
          id: 'ship-intl-1',
          companyId: 'company-t4',
          status: 'PENDING',
          isInternational: true,
          intlAckStatus: 'APPROVED',
          trackingNumber: 'TRK-INTL-001',
          order: { total: 2500, status: 'confirmed' },
        },
      ]);
      mockPrisma.deliveryRun.count.mockResolvedValue(0);
      mockPrisma.deliveryRun.create.mockResolvedValue({
        id: 'run-1',
        companyId: 'company-t4',
        runNumber: 'RUN-20261106-001',
        status: 'DISPATCHED',
      });
      mockPrisma.shipment.updateMany.mockResolvedValue({ count: 1 });

      const assignRes = await request(app)
        .post('/api/v1/couriers/runs')
        .send({
          courierId: 'courier-1',
          shipmentIds: ['ship-intl-1'],
        });

      expect(assignRes.status).toBe(201);
      expect(assignRes.body.success).toBe(true);
      expect(assignRes.body.data.id).toBe('run-1');
    });
  });

  describe('Scenario 2: Customer Feedback & Duplicate Prevention', () => {
    it('submits 5-star rating via token -> 201', async () => {
      mockPrisma.shipmentFeedback.findUnique.mockResolvedValue({
        id: 'fb-1',
        token: 'token-5star-valid',
        shipmentId: 'ship-100',
        companyId: 'company-t4',
        submittedAt: null,
      });

      mockPrisma.shipmentFeedback.findFirst.mockResolvedValue(null);

      mockPrisma.shipmentFeedback.update.mockResolvedValue({
        id: 'fb-1',
        token: 'token-5star-valid',
        rating: 5,
        comment: 'خدمة ممتازة وسريعة جداً',
        tags: 'سرعة التوصيل,تعامل المندوب',
        submittedAt: new Date(),
      });

      const res = await request(app)
        .post('/public/feedback/token-5star-valid')
        .send({
          rating: 5,
          comment: 'خدمة ممتازة وسريعة جداً',
          tags: ['سرعة التوصيل', 'تعامل المندوب'],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.feedback.rating).toBe(5);
    });

    it('rejects re-submitting the same token with 409', async () => {
      mockPrisma.shipmentFeedback.findUnique.mockResolvedValue({
        id: 'fb-1',
        token: 'token-5star-valid',
        shipmentId: 'ship-100',
        companyId: 'company-t4',
        submittedAt: new Date('2026-11-06T10:00:00Z'),
        rating: 5,
      });

      const res = await request(app)
        .post('/public/feedback/token-5star-valid')
        .send({
          rating: 4,
          comment: 'محاولة تعديل مرفوضة',
        });

      expect(res.status).toBe(409);
      expect(res.body.code).toBe('FEEDBACK_ALREADY_SUBMITTED');
    });

    it('feedback report returns averageRating = 5 and totalCount = 1', async () => {
      mockPrisma.shipmentFeedback.findMany.mockResolvedValue([
        {
          id: 'fb-1',
          companyId: 'company-t4',
          shipmentId: 'ship-100',
          token: 'token-5star-valid',
          rating: 5,
          comment: 'خدمة ممتازة وسريعة جداً',
          tags: 'سرعة التوصيل',
          channel: 'WHATSAPP',
          submittedAt: new Date('2026-11-06T10:00:00Z'),
          shipment: {
            id: 'ship-100',
            trackingNumber: 'TRK-100',
            recipientName: 'منى محمود',
            recipientPhone: '01011112222',
            destinationCity: 'القاهرة',
            status: 'DELIVERED',
          },
        },
      ]);

      const res = await request(app)
        .get('/api/v1/shipping-reports/feedback');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.totalCount).toBe(1);
      expect(res.body.averageRating).toBe(5);
      expect(res.body.distribution['5']).toBe(1);
      expect(res.body.worstShipments.length).toBe(1);
    });
  });

  describe('Scenario 3: Geographic Distribution Report', () => {
    it('returns 2 rows: Cairo/Nasr City (2 shipments) + Giza (1 shipment)', async () => {
      const now = new Date('2026-11-06T12:00:00Z');
      const yesterday = new Date('2026-11-05T12:00:00Z');

      mockPrisma.shipment.findMany.mockResolvedValue([
        {
          id: 's-cairo-1',
          destinationGovernorate: 'القاهرة',
          destinationCity: 'مدينة نصر',
          destinationAddress: 'عباس العقاد',
          status: 'DELIVERED',
          createdAt: yesterday,
          updatedAt: now,
        },
        {
          id: 's-cairo-2',
          destinationGovernorate: 'القاهرة',
          destinationCity: 'مدينة نصر',
          destinationAddress: 'مكرم عبيد',
          status: 'RETURNED',
          createdAt: yesterday,
          updatedAt: now,
        },
        {
          id: 's-giza-1',
          destinationGovernorate: 'الجيزة',
          destinationCity: 'الدقي',
          destinationAddress: 'شارع التحرير',
          status: 'DELIVERED',
          createdAt: yesterday,
          updatedAt: now,
        },
      ]);

      const res = await request(app)
        .get('/api/v1/shipping-reports/geo');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.rows.length).toBe(2);

      const cairoRow = res.body.rows.find((r) => r.city === 'مدينة نصر');
      const gizaRow = res.body.rows.find((r) => r.city === 'الدقي');

      expect(cairoRow).toBeDefined();
      expect(cairoRow.totalShipments).toBe(2);
      expect(cairoRow.deliveredCount).toBe(1);
      expect(cairoRow.rtoCount).toBe(1);

      expect(gizaRow).toBeDefined();
      expect(gizaRow.totalShipments).toBe(1);
      expect(gizaRow.deliveredCount).toBe(1);
      expect(gizaRow.rtoCount).toBe(0);
    });

    it('exports geo report as CSV when format=csv', async () => {
      mockPrisma.shipment.findMany.mockResolvedValue([]);
      const res = await request(app)
        .get('/api/v1/shipping-reports/geo?format=csv');

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
    });
  });

  describe('Scenario 4: Best Sellers Report', () => {
    it('returns 2 rows with quantities from order with 2 items', async () => {
      mockPrisma.shipment.findMany.mockResolvedValue([
        {
          id: 'ship-order-1',
          order: {
            id: 'ord-1',
            items: [
              {
                id: 'item-1',
                productName: 'حذاء كلاسيك جلد',
                quantity: 2,
                price: 500,
                total: 1000,
              },
              {
                id: 'item-2',
                productName: 'حزام جلد طبيعي',
                quantity: 3,
                price: 150,
                total: 450,
              },
            ],
          },
        },
      ]);

      const res = await request(app)
        .get('/api/v1/shipping-reports/best-sellers');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.rows.length).toBe(2);

      const belt = res.body.rows.find((r) => r.productName === 'حزام جلد طبيعي');
      const shoes = res.body.rows.find((r) => r.productName === 'حذاء كلاسيك جلد');

      expect(belt.quantity).toBe(3);
      expect(belt.totalValue).toBe(450);
      expect(shoes.quantity).toBe(2);
      expect(shoes.totalValue).toBe(1000);
    });

    it('falls back to «غير متاح» when shipments have no order items', async () => {
      mockPrisma.shipment.findMany.mockResolvedValue([
        {
          id: 'ship-no-order',
          codAmount: 350,
          pieces: 1,
          order: null,
        },
      ]);

      const res = await request(app)
        .get('/api/v1/shipping-reports/best-sellers');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.rows[0].productName).toBe('غير متاح');
      expect(res.body.rows[0].quantity).toBe(1);
      expect(res.body.rows[0].totalValue).toBe(350);
    });
  });

  describe('Scenario 5: Delivery Missions Report', () => {
    it('returns accurate mission row for run with 3 shipments (2 delivered, 1 failed)', async () => {
      mockPrisma.deliveryRun.findMany.mockResolvedValue([
        {
          id: 'run-alpha',
          runNumber: 'RUN-20261106-99',
          status: 'COMPLETED',
          dispatchDate: new Date('2026-11-06T08:00:00Z'),
          settledAt: new Date('2026-11-06T12:00:00Z'),
          totalShipments: 3,
          totalCODCollected: 1400,
          courier: {
            id: 'c-1',
            name: 'طارق الكابتن',
            phone: '01234567890',
          },
          shipments: [
            { id: 's1', status: 'DELIVERED', collectedAmount: 600 },
            { id: 's2', status: 'DELIVERED', collectedAmount: 800 },
            { id: 's3', status: 'FAILED', collectedAmount: 0 },
          ],
        },
      ]);

      const res = await request(app)
        .get('/api/v1/shipping-reports/missions');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.rows.length).toBe(1);

      const row = res.body.rows[0];
      expect(row.runNumber).toBe('RUN-20261106-99');
      expect(row.courierName).toBe('طارق الكابتن');
      expect(row.totalShipments).toBe(3);
      expect(row.deliveredCount).toBe(2);
      expect(row.failedCount).toBe(1);
      expect(row.collectedAmount).toBe(1400);
      expect(row.durationHours).toBe(4);
    });
  });
});
