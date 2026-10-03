const mockPrisma = {
  shipment: {
    count: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    groupBy: jest.fn(),
    aggregate: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  order: {
    findFirst: jest.fn(),
    findMany: jest.fn().mockResolvedValue([]),
    groupBy: jest.fn().mockResolvedValue([]),
  },
  shippingCompany: {
    findFirst: jest.fn(),
  },
};

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: () => mockPrisma,
}));

jest.mock('../../utils/verifyToken', () => ({
  authenticateToken: (req, res, next) => {
    req.user = { id: 'test-user-1', companyId: 'test-company-1', role: 'MANAGER' };
    next();
  },
}));

const express = require('express');
const request = require('supertest');

const shipmentsRoutes = require('../../routes/shipmentsRoutes');

const app = express();
app.use(express.json());
app.use('/api/v1/shipments', shipmentsRoutes);

describe('Unified Shipments Routes (/api/v1/shipments)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/shipments', () => {
    it('returns paginated shipments and status metrics summary', async () => {
      mockPrisma.shipment.count.mockResolvedValue(42);
      mockPrisma.shipment.findMany.mockResolvedValue([
        {
          id: 'ship-1',
          trackingNumber: 'AWB-1001',
          status: 'IN_TRANSIT',
          carrierType: 'TURBO',
          shippingCompany: { id: 'c-1', name: 'Turbo' },
          order: { id: 'o-1', orderNumber: 'ORD-1001', total: 500, customer: { name: 'Ali' } },
        },
      ]);
      mockPrisma.shipment.groupBy.mockResolvedValue([
        { status: 'IN_TRANSIT', _count: { id: 10 } },
        { status: 'DELIVERED', _count: { id: 30 } },
        { status: 'RETURNED', _count: { id: 2 } },
      ]);
      mockPrisma.shipment.aggregate.mockResolvedValue({
        _sum: { cost: 1200 },
      });

      const res = await request(app)
        .get('/api/v1/shipments')
        .query({ page: 1, limit: 10 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.pagination).toEqual({
        total: 42,
        page: 1,
        limit: 10,
        totalPages: 5,
      });
      // The handler now derives inTransit/delivered/returned from carrier stage counts
      // (allCarrierShipments + classifyShipmentStage), not from shipment.groupBy.
      // 'IN_TRANSIT' without a turbo status classifies as 'incomplete', so the aggregate
      // stage counters are 0 for this single mocked row; statusCounts still comes from groupBy.
      expect(res.body.summary).toEqual(
        expect.objectContaining({
          totalShipments: 42,
          inTransit: 0,
          delivered: 0,
          returned: 0,
          pendingRemittanceAmount: 1200,
          statusCounts: {
            IN_TRANSIT: 10,
            DELIVERED: 30,
            RETURNED: 2,
          },
          carrierStatusCounts: expect.objectContaining({
            all: 1,
            incomplete: 1,
          }),
        })
      );
    });

    it('filters shipments by shippingCompanyId', async () => {
      mockPrisma.shipment.count.mockResolvedValue(5);
      mockPrisma.shipment.findMany.mockResolvedValue([]);
      mockPrisma.shipment.groupBy.mockResolvedValue([]);
      mockPrisma.shipment.aggregate.mockResolvedValue({ _sum: { cost: 0 } });

      const res = await request(app)
        .get('/api/v1/shipments')
        .query({ shippingCompanyId: 'comp-xyz' });

      expect(res.status).toBe(200);
      expect(mockPrisma.shipment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            companyId: 'test-company-1',
            shippingCompanyId: 'comp-xyz',
          }),
        }),
      );
    });
  });

  describe('POST /api/v1/shipments/create', () => {
    it('creates a new shipment for an order', async () => {
      mockPrisma.order.findFirst.mockResolvedValue({
        id: 'ord-123',
        companyId: 'test-company-1',
        total: 600,
        shippingCost: 50,
      });
      mockPrisma.shippingCompany.findFirst.mockResolvedValue({
        id: 'carrier-1',
        providerKey: 'MANUAL',
        integrationMode: 'MANUAL',
      });
      mockPrisma.shipment.findFirst.mockResolvedValue(null);
      mockPrisma.shipment.create.mockResolvedValue({
        id: 'new-ship-1',
        orderId: 'ord-123',
        shippingCompanyId: 'carrier-1',
        trackingNumber: 'TRK-MANUAL-1',
        carrierType: 'MANUAL',
        status: 'PENDING',
      });

      const res = await request(app)
        .post('/api/v1/shipments/create')
        .send({
          orderId: 'ord-123',
          shippingCompanyId: 'carrier-1',
          trackingNumber: 'TRK-MANUAL-1',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockPrisma.shipment.create).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/shipments/:id/cancel', () => {
    it('cancels shipment and records metadata', async () => {
      mockPrisma.shipment.findFirst.mockResolvedValue({
        id: 'ship-to-cancel',
        companyId: 'test-company-1',
        carrierType: 'MANUAL',
        metadata: '{}',
      });
      mockPrisma.shipment.update.mockResolvedValue({
        id: 'ship-to-cancel',
        status: 'CANCELLED',
      });

      const res = await request(app)
        .post('/api/v1/shipments/ship-to-cancel/cancel')
        .send({ reason: 'Out of stock' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockPrisma.shipment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'ship-to-cancel' },
          data: expect.objectContaining({ status: 'CANCELLED' }),
        }),
      );
    });
  });
});
