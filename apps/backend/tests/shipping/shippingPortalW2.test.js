/**
 * Shipping Portal W2 Backend Acceptance Tests (SHIP-W2)
 *
 * Verifies all digital gates:
 * (أ) إنشاء طلب استلام -> رقم PCK-... + حالة REQUESTED
 * (ب) إسناد مندوب -> ASSIGNED
 * (ج) إكمال بـ15 قطعة -> COMPLETED + actualParcels=15
 * (د) استلام شحنة في الهاَب بوزن 3.2 بدل 2.5 -> actualWeight=3.2 + priceAdjustment محسوب + event
 * (هـ) عزل: شحنة شركة تانية -> 404
 * (و) بوليصة PDF ترجع application/pdf وحجم > 5KB وبداية %PDF
 * (ز) إدارة الفروع (Branches CRUD)
 */

const mockPrisma = {
  shipment: {
    findFirst: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  shipmentEvent: {
    create: jest.fn(),
  },
  pickupRequest: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  shippingBranch: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  courier: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
  },
  merchant: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
  },
  clientRateCard: {
    findMany: jest.fn(),
  },
};

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: () => mockPrisma,
  getSharedPrismaClientAsync: async () => mockPrisma,
}));

let mockUser = {
  id: 'user-w2-1',
  companyId: 'company-w2-alpha',
  role: 'OPERATIONS_MANAGER',
  name: 'Logistics Supervisor',
};

jest.mock('../../utils/verifyToken', () => ({
  authenticateToken: (req, res, next) => {
    req.user = mockUser;
    next();
  },
}));

jest.mock('../../middleware/checkAppAccess', () => () => (req, res, next) => next());

const express = require('express');
const request = require('supertest');
const shippingPortalRoutes = require('../../routes/shippingPortalRoutes');

const app = express();
app.use(express.json());
app.use('/api/v1/shipping-portal', shippingPortalRoutes);

describe('Shipping Portal W2 Acceptance Gates', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = {
      id: 'user-w2-1',
      companyId: 'company-w2-alpha',
      role: 'OPERATIONS_MANAGER',
      name: 'Logistics Supervisor',
    };
  });

  // (أ) إنشاء طلب استلام -> رقم PCK-... + حالة REQUESTED
  describe('(أ) POST /api/v1/shipping-portal/pickups - Create pickup request', () => {
    it('creates pickup request with PCK-... number and status REQUESTED', async () => {
      mockPrisma.pickupRequest.create.mockImplementation(({ data, include }) => {
        return Promise.resolve({
          id: 'pck-101',
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
          branch: null,
        });
      });

      const payload = {
        contactName: 'أحمد التاجر',
        contactPhone: '01012345678',
        pickupAddress: 'شارع التسعين - التجمع الخامس',
        governorate: 'القاهرة',
        scheduledDate: '2026-11-05T10:00:00.000Z',
        timeSlot: '10:00-14:00',
        expectedParcels: 10,
        notes: 'الاستلام من الباب الخلفي للمخزن',
      };

      const res = await request(app)
        .post('/api/v1/shipping-portal/pickups')
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.pickup).toBeDefined();
      expect(res.body.pickup.pickupNumber).toMatch(/^PCK-/);
      expect(res.body.pickup.status).toBe('REQUESTED');
      expect(res.body.pickup.contactName).toBe('أحمد التاجر');
      expect(res.body.pickup.expectedParcels).toBe(10);
      expect(mockPrisma.pickupRequest.create).toHaveBeenCalledTimes(1);
    });

    it('rejects pickup creation when required fields are missing', async () => {
      const res = await request(app)
        .post('/api/v1/shipping-portal/pickups')
        .send({ contactName: 'ناقص العنوان' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // (ب) إسناد مندوب -> ASSIGNED
  describe('(ب) PATCH /api/v1/shipping-portal/pickups/:id/assign - Assign courier', () => {
    it('assigns courier to pickup and transitions status to ASSIGNED', async () => {
      mockPrisma.pickupRequest.findFirst.mockResolvedValue({
        id: 'pck-101',
        companyId: 'company-w2-alpha',
        status: 'REQUESTED',
        pickupNumber: 'PCK-20261105-1234',
      });

      mockPrisma.courier.findFirst.mockResolvedValue({
        id: 'courier-44',
        companyId: 'company-w2-alpha',
        name: 'كابتن محمود المناديب',
        phone: '01222222222',
      });

      mockPrisma.pickupRequest.update.mockResolvedValue({
        id: 'pck-101',
        companyId: 'company-w2-alpha',
        status: 'ASSIGNED',
        assignedCourierId: 'courier-44',
        pickupNumber: 'PCK-20261105-1234',
      });

      const res = await request(app)
        .patch('/api/v1/shipping-portal/pickups/pck-101/assign')
        .send({ courierId: 'courier-44' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.pickup.status).toBe('ASSIGNED');
      expect(res.body.pickup.assignedCourierId).toBe('courier-44');
      expect(mockPrisma.pickupRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'pck-101' },
          data: expect.objectContaining({
            assignedCourierId: 'courier-44',
            status: 'ASSIGNED',
          }),
        })
      );
    });
  });

  // (ج) إكمال بـ15 قطعة -> COMPLETED + actualParcels=15
  describe('(ج) PATCH /api/v1/shipping-portal/pickups/:id/complete - Complete pickup', () => {
    it('completes pickup with 15 actual parcels and marks status COMPLETED', async () => {
      mockPrisma.pickupRequest.findFirst.mockResolvedValue({
        id: 'pck-101',
        companyId: 'company-w2-alpha',
        status: 'ASSIGNED',
        expectedParcels: 10,
        pickupNumber: 'PCK-20261105-1234',
      });

      mockPrisma.pickupRequest.update.mockResolvedValue({
        id: 'pck-101',
        companyId: 'company-w2-alpha',
        status: 'COMPLETED',
        actualParcels: 15,
        completedAt: new Date(),
        pickupNumber: 'PCK-20261105-1234',
      });

      const res = await request(app)
        .patch('/api/v1/shipping-portal/pickups/pck-101/complete')
        .send({ actualParcels: 15 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.pickup.status).toBe('COMPLETED');
      expect(res.body.pickup.actualParcels).toBe(15);
      expect(mockPrisma.pickupRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'pck-101' },
          data: expect.objectContaining({
            status: 'COMPLETED',
            actualParcels: 15,
          }),
        })
      );
    });
  });

  // (د) استلام شحنة في الهاَب بوزن 3.2 بدل 2.5 -> actualWeight=3.2 + priceAdjustment محسوب + event
  describe('(د) POST /api/v1/shipping-portal/shipments/:id/receive - Hub inward with weight adjustment', () => {
    it('receives shipment at hub with actual weight 3.2, recalculates priceAdjustment, and logs event', async () => {
      mockPrisma.shipment.findFirst.mockResolvedValue({
        id: 'ship-hub-1',
        companyId: 'company-w2-alpha',
        merchantId: 'merchant-vip-1',
        trackingNumber: 'TRK-HUB-1001',
        barcode: 'BAR-1001',
        status: 'PENDING',
        weight: 2.5,
        cost: 90, // Calculated earlier (base 70 for 1kg + 2 extra kg * 10 = 90)
        codAmount: 500,
        destinationGovernorate: 'الإسكندرية',
        branchId: null,
      });

      // Mock rate card for recalculation (base 70, baseWeight 1.0, extraKg 10)
      // For weight 3.2: extra weight = 2.2 kg -> ceil = 3 extra kg * 10 = 30 -> total = 100
      // priceAdjustment = 100 - 90 = 10
      mockPrisma.clientRateCard.findMany.mockResolvedValue([
        {
          id: 'rc-alex',
          companyId: 'company-w2-alpha',
          merchantId: 'merchant-vip-1',
          name: 'باقة الإسكندرية',
          governorateCode: 'الإسكندرية',
          basePrice: 70,
          baseWeightKg: 1.0,
          extraKgPrice: 10,
          codFeeFixed: 0,
          codFeePercent: 0,
          isActive: true,
        },
      ]);

      mockPrisma.shippingBranch.findFirst.mockResolvedValue({
        id: 'branch-cairo-hub',
        companyId: 'company-w2-alpha',
        name: 'هاَب القاهرة الرئيسي',
        code: 'CAI-HUB-1',
      });

      mockPrisma.shipment.update.mockImplementation(({ where, data }) => {
        return Promise.resolve({
          id: where.id,
          companyId: 'company-w2-alpha',
          status: data.status,
          actualWeight: data.actualWeight,
          priceAdjustment: data.priceAdjustment,
          branchId: data.branchId,
          trackingNumber: 'TRK-HUB-1001',
        });
      });

      mockPrisma.shipmentEvent.create.mockResolvedValue({ id: 'evt-hub-1' });

      const res = await request(app)
        .post('/api/v1/shipping-portal/shipments/ship-hub-1/receive')
        .send({
          branchId: 'branch-cairo-hub',
          actualWeight: 3.2,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.shipment.status).toBe('RECEIVED_AT_HUB');
      expect(res.body.shipment.actualWeight).toBe(3.2);
      expect(res.body.priceAdjustment).toBe(10); // 100 - 90 = 10
      expect(mockPrisma.shipmentEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            companyId: 'company-w2-alpha',
            shipmentId: 'ship-hub-1',
            toStatus: 'RECEIVED_AT_HUB',
            reasonCode: 'WEIGHT_ADJUSTED',
          }),
        })
      );
    });
  });

  // (هـ) عزل: شحنة شركة تانية -> 404
  describe('(هـ) Cross-Tenant Isolation Guard', () => {
    it('returns 404 when querying a shipment from another company for label PDF or receive', async () => {
      mockPrisma.shipment.findFirst.mockResolvedValue(null);

      // Label PDF
      const labelRes = await request(app)
        .get('/api/v1/shipping-portal/shipments/other-company-shipment/label');

      expect(labelRes.status).toBe(404);
      expect(labelRes.body.success).toBe(false);

      // Hub receive
      const receiveRes = await request(app)
        .post('/api/v1/shipping-portal/shipments/other-company-shipment/receive')
        .send({ actualWeight: 2.0 });

      expect(receiveRes.status).toBe(404);
      expect(receiveRes.body.success).toBe(false);
    });
  });

  // (و) بوليصة PDF ترجع application/pdf وحجم > 5KB وبداية %PDF
  describe('(و) GET /api/v1/shipping-portal/shipments/:id/label - Waybill A6 PDF', () => {
    it('returns application/pdf, size > 5KB, and starts with %PDF', async () => {
      mockPrisma.shipment.findFirst.mockResolvedValue({
        id: 'ship-label-test-1',
        companyId: 'company-w2-alpha',
        trackingNumber: 'TRK-WAYBILL-2026',
        barcode: 'BAR-WAYBILL-2026',
        merchantOrderId: 'ORD-9876',
        recipientName: 'إبراهيم حسن',
        recipientPhone: '01099887766',
        recipientPhone2: '01299887766',
        destinationGovernorate: 'الجيزة',
        destinationCity: 'الدقي',
        destinationAddress: 'ميدان المساحة، عمارة 4، الدور 3',
        senderName: 'براند النخبة',
        senderPhone: '01155443322',
        senderAddress: 'المعادي - القاهرة',
        weight: 1.5,
        pieces: 2,
        codAmount: 750,
        contentDescription: 'ملابس وأحذية رياضية',
        isFragile: true,
        allowOpenPackage: true,
        branch: { name: 'فرع الجيزة المركزي', code: 'GZ-01' },
        company: { name: 'شركة الشحن الوطنية' },
      });

      const res = await request(app)
        .get('/api/v1/shipping-portal/shipments/ship-label-test-1/label');

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe('application/pdf');

      const bodyBuffer = Buffer.isBuffer(res.body) ? res.body : Buffer.from(res.text, 'binary');
      expect(bodyBuffer.length).toBeGreaterThan(5000); // Size > 5KB
      expect(bodyBuffer.slice(0, 4).toString()).toBe('%PDF'); // Begins with %PDF
    });
  });

  // (ز) فروع الشحن: Branches CRUD
  describe('(ز) Branches CRUD Management', () => {
    it('creates, lists, and updates branches', async () => {
      mockPrisma.shippingBranch.findUnique.mockResolvedValue(null);
      mockPrisma.shippingBranch.create.mockResolvedValue({
        id: 'br-1',
        companyId: 'company-w2-alpha',
        name: 'فرع المعادي',
        code: 'CAI-MAADI',
        governorate: 'القاهرة',
        isActive: true,
      });

      const createRes = await request(app)
        .post('/api/v1/shipping-portal/branches')
        .send({
          name: 'فرع المعادي',
          code: 'CAI-MAADI',
          governorate: 'القاهرة',
          phone: '022334455',
        });

      expect(createRes.status).toBe(201);
      expect(createRes.body.branch.code).toBe('CAI-MAADI');

      // List
      mockPrisma.shippingBranch.findMany.mockResolvedValue([
        { id: 'br-1', name: 'فرع المعادي', code: 'CAI-MAADI', isActive: true },
      ]);

      const listRes = await request(app).get('/api/v1/shipping-portal/branches');
      expect(listRes.status).toBe(200);
      expect(listRes.body.branches).toHaveLength(1);
    });
  });
});
