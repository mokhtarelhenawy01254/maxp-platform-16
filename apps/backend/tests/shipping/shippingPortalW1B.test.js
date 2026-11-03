/**
 * Shipping Portal W1B Backend Acceptance Tests
 * Covers:
 * 1. Cancel shipment: PENDING status -> 200 + CANCELLED status + ShipmentEvent recorded
 * 2. Cancel shipment: Non-PENDING (e.g. DELIVERED / IN_TRANSIT) -> 400 error
 * 3. Rate cards CRUD: create with merchant and governorate -> 201
 * 4. Rate cards CRUD: list with joined merchant details -> 200
 * 5. Rate cards CRUD: update and delete -> 200
 */

const mockPrisma = {
  shipment: {
    findFirst: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
    findMany: jest.fn(),
    aggregate: jest.fn(),
  },
  shipmentEvent: {
    create: jest.fn(),
  },
  clientRateCard: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  merchant: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
  },
};

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: () => mockPrisma,
  getSharedPrismaClientAsync: async () => mockPrisma,
}));

let mockUser = {
  id: 'user-test-1',
  companyId: 'company-test-1',
  role: 'MANAGER',
  name: 'Admin User',
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

describe('Shipping Portal W1B Backend API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = {
      id: 'user-test-1',
      companyId: 'company-test-1',
      role: 'MANAGER',
      name: 'Admin User',
    };
  });

  describe('DELETE /api/v1/shipping-portal/shipments/:id/cancel', () => {
    it('cancels PENDING shipment and records ShipmentEvent', async () => {
      mockPrisma.shipment.findFirst.mockResolvedValue({
        id: 'ship-101',
        companyId: 'company-test-1',
        status: 'PENDING',
        trackingNumber: 'TRK-PENDING-1',
      });

      mockPrisma.shipment.update.mockResolvedValue({
        id: 'ship-101',
        companyId: 'company-test-1',
        status: 'CANCELLED',
        trackingNumber: 'TRK-PENDING-1',
      });

      mockPrisma.shipmentEvent.create.mockResolvedValue({
        id: 'evt-cancel-1',
        shipmentId: 'ship-101',
        toStatus: 'CANCELLED',
      });

      const res = await request(app)
        .delete('/api/v1/shipping-portal/shipments/ship-101/cancel')
        .send({ reason: 'طلب العميل إلغاء الأوردر' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('CANCELLED');

      expect(mockPrisma.shipment.update).toHaveBeenCalledWith({
        where: { id: 'ship-101' },
        data: { status: 'CANCELLED' },
      });

      expect(mockPrisma.shipmentEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            shipmentId: 'ship-101',
            fromStatus: 'PENDING',
            toStatus: 'CANCELLED',
            reasonCode: 'CANCELLED_BY_ADMIN',
          }),
        })
      );
    });

    it('rejects cancellation when shipment status is not PENDING', async () => {
      mockPrisma.shipment.findFirst.mockResolvedValue({
        id: 'ship-102',
        companyId: 'company-test-1',
        status: 'OUT_FOR_DELIVERY',
      });

      const res = await request(app)
        .delete('/api/v1/shipping-portal/shipments/ship-102/cancel')
        .send({ reason: 'محاولة إلغاء' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('PENDING');
      expect(mockPrisma.shipment.update).not.toHaveBeenCalled();
    });
  });

  describe('Rate Cards CRUD', () => {
    it('creates client rate card with normalized governorate', async () => {
      mockPrisma.merchant.findFirst.mockResolvedValue({
        id: 'merch-1',
        name: 'متجر النور',
        companyId: 'company-test-1',
      });

      mockPrisma.clientRateCard.findFirst.mockResolvedValue(null);

      mockPrisma.clientRateCard.create.mockResolvedValue({
        id: 'rc-1',
        companyId: 'company-test-1',
        merchantId: 'merch-1',
        name: 'تسعير القاهرة الكبرى',
        governorateCode: 'القاهرة',
        basePrice: 65,
        baseWeightKg: 1,
        extraKgPrice: 10,
        codFeeFixed: 5,
        codFeePercent: 0,
        returnFee: 25,
        isActive: true,
      });

      const res = await request(app)
        .post('/api/v1/shipping-portal/rate-cards')
        .send({
          merchantId: 'merch-1',
          name: 'تسعير القاهرة الكبرى',
          governorateCode: 'Cairo',
          basePrice: 65,
          baseWeightKg: 1,
          extraKgPrice: 10,
          codFeeFixed: 5,
          returnFee: 25,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.basePrice).toBe(65);
      expect(mockPrisma.clientRateCard.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            merchantId: 'merch-1',
            governorateCode: 'القاهرة',
            basePrice: 65,
          }),
        })
      );
    });

    it('lists rate cards and joins merchant details', async () => {
      mockPrisma.clientRateCard.findMany.mockResolvedValue([
        {
          id: 'rc-1',
          companyId: 'company-test-1',
          merchantId: 'merch-1',
          name: 'تسعير القاهرة',
          governorateCode: 'القاهرة',
          basePrice: 65,
          isActive: true,
        },
      ]);

      mockPrisma.merchant.findMany.mockResolvedValue([
        {
          id: 'merch-1',
          name: 'متجر النور',
          phone: '01012345678',
          email: 'nour@example.com',
        },
      ]);

      const res = await request(app).get('/api/v1/shipping-portal/rate-cards');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].merchant.name).toBe('متجر النور');
    });

    it('deletes a rate card successfully', async () => {
      mockPrisma.clientRateCard.findFirst.mockResolvedValue({
        id: 'rc-1',
        companyId: 'company-test-1',
      });
      mockPrisma.clientRateCard.delete.mockResolvedValue({ id: 'rc-1' });

      const res = await request(app).delete('/api/v1/shipping-portal/rate-cards/rc-1');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockPrisma.clientRateCard.delete).toHaveBeenCalledWith({ where: { id: 'rc-1' } });
    });
  });
});
