const mockPrisma = {
  shippingCompany: { findMany: jest.fn() },
  shipment: { findMany: jest.fn(), updateMany: jest.fn() },
  order: { findMany: jest.fn(), update: jest.fn() },
};

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: () => mockPrisma,
}));

const {
  getSummary,
  listOrders,
  settle,
  unsettle,
} = require('../../controller/shippingSettlementController');

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const baseReq = (overrides = {}) => ({
  user: { id: 'u-1', companyId: 'c-1' },
  query: {},
  body: {},
  headers: {},
  ...overrides,
});

describe('shippingSettlementController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getSummary', () => {
    test('merges Shipment-based companies with the virtual Turbo company', async () => {
      mockPrisma.shippingCompany.findMany.mockResolvedValue([
        { id: 'sc-1', name: 'ShipCo', providerKey: 'MANUAL' },
      ]);
      mockPrisma.shipment.findMany.mockResolvedValue([
        {
          id: 's-1',
          shippingCompanyId: 'sc-1',
          status: 'DELIVERED',
          settlementStatus: 'PENDING',
          order: { total: 200, status: 'DELIVERED' },
        },
      ]);
      mockPrisma.order.findMany.mockResolvedValue([
        {
          id: 'o-1',
          total: 150,
          status: 'DELIVERED',
          turboShipmentStatus: 'delivered',
          turboMetadata: '{}',
        },
        {
          id: 'o-2',
          total: 100,
          status: 'PROCESSING',
          turboShipmentStatus: 'processing',
          turboMetadata: '{}',
        },
      ]);

      const res = mockRes();
      await getSummary(baseReq(), res);

      expect(res.status).not.toHaveBeenCalled();
      const data = res.json.mock.calls[0][0].data;
      expect(data).toHaveLength(2);

      const shipCo = data.find((item) => item.company.id === 'sc-1');
      expect(shipCo.deliveredShipments).toBe(1);
      expect(shipCo.pendingAmount).toBe(200);

      const turbo = data.find((item) => item.company.id === 'TURBO');
      expect(turbo).toBeDefined();
      expect(turbo.company.name).toBe('Turbo Express');
      expect(turbo.totalShipments).toBe(2);
      expect(turbo.deliveredShipments).toBe(1);
      expect(turbo.pendingAmount).toBe(150);
      expect(turbo.settledShipments).toBe(0);
    });

    test('counts settled Turbo orders via turboMetadata settlementStatus', async () => {
      mockPrisma.shippingCompany.findMany.mockResolvedValue([]);
      mockPrisma.shipment.findMany.mockResolvedValue([]);
      mockPrisma.order.findMany.mockResolvedValue([
        {
          id: 'o-1',
          total: 150,
          status: 'DELIVERED',
          turboShipmentStatus: 'delivered',
          turboMetadata: JSON.stringify({ settlementStatus: 'SETTLED' }),
        },
      ]);

      const res = mockRes();
      await getSummary(baseReq(), res);

      const data = res.json.mock.calls[0][0].data;
      const turbo = data.find((item) => item.company.id === 'TURBO');
      expect(turbo.settledShipments).toBe(1);
      expect(turbo.settledAmount).toBe(150);
      expect(turbo.deliveredShipments).toBe(0);
      expect(turbo.pendingAmount).toBe(0);
    });

    test('does not render a Turbo card when there are no Turbo orders', async () => {
      mockPrisma.shippingCompany.findMany.mockResolvedValue([]);
      mockPrisma.shipment.findMany.mockResolvedValue([]);
      mockPrisma.order.findMany.mockResolvedValue([]);

      const res = mockRes();
      await getSummary(baseReq(), res);

      expect(res.json.mock.calls[0][0].data).toHaveLength(0);
    });
  });

  describe('listOrders', () => {
    test('returns mixed SHIPMENT + TURBO entries sorted by createdAt desc', async () => {
      mockPrisma.shipment.findMany.mockResolvedValue([
        {
          id: 's-1',
          trackingNumber: 'TRK-1',
          externalShipmentId: null,
          status: 'DELIVERED',
          cost: 30,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          settlementStatus: 'PENDING',
          settledAt: null,
          order: {
            orderNumber: 'ORD-1',
            customerName: 'Cust A',
            customerPhone: '010',
            total: 200,
            shipping: 30,
            status: 'DELIVERED',
          },
        },
      ]);
      mockPrisma.order.findMany.mockResolvedValue([
        {
          id: 'o-1',
          orderNumber: 'ORD-2',
          customerName: 'Cust B',
          customerPhone: '011',
          total: 150,
          shipping: 40,
          status: 'DELIVERED',
          turboShipmentId: 'TB-1',
          turboTrackingNumber: 'TB-1',
          turboShipmentStatus: 'remitted',
          turboMetadata: '{}',
          createdAt: new Date('2026-01-02T00:00:00.000Z'),
        },
      ]);

      const res = mockRes();
      await listOrders(baseReq({ query: { page: '1', limit: '20' } }), res);

      const body = res.json.mock.calls[0][0];
      expect(body.success).toBe(true);
      expect(body.pagination.total).toBe(2);
      expect(body.data[0].sourceType).toBe('TURBO');
      expect(body.data[0].delivered).toBe(true);
      expect(body.data[0].order.orderNumber).toBe('ORD-2');
      expect(body.data[1].sourceType).toBe('SHIPMENT');
    });

    test('shippingCompanyId=TURBO loads only Turbo orders (skips Shipment query)', async () => {
      const res = mockRes();
      await listOrders(
        baseReq({ query: { page: '1', limit: '20', shippingCompanyId: 'TURBO' } }),
        res,
      );

      expect(mockPrisma.shipment.findMany).not.toHaveBeenCalled();
      expect(mockPrisma.order.findMany).toHaveBeenCalledTimes(1);
    });

    test('filters TURBO rows by settlementStatus via turboMetadata', async () => {
      mockPrisma.order.findMany.mockResolvedValue([
        {
          id: 'o-1',
          orderNumber: 'ORD-1',
          customerName: 'C',
          customerPhone: null,
          total: 150,
          shipping: 40,
          status: 'DELIVERED',
          turboShipmentId: 'TB-1',
          turboTrackingNumber: 'TB-1',
          turboShipmentStatus: 'delivered',
          turboMetadata: JSON.stringify({ settlementStatus: 'SETTLED' }),
          createdAt: new Date('2026-01-02T00:00:00.000Z'),
        },
      ]);

      const res = mockRes();
      await listOrders(
        baseReq({ query: { page: '1', limit: '20', shippingCompanyId: 'TURBO', settlementStatus: 'PENDING' } }),
        res,
      );

      expect(res.json.mock.calls[0][0].pagination.total).toBe(0);
    });
  });

  describe('settle', () => {
    test('settles delivered Turbo orders by company and skips non-delivered', async () => {
      mockPrisma.order.findMany.mockResolvedValue([
        {
          id: 'o-1',
          status: 'DELIVERED',
          turboShipmentStatus: 'delivered',
          turboMetadata: '{}',
        },
        {
          id: 'o-2',
          status: 'PROCESSING',
          turboShipmentStatus: 'processing',
          turboMetadata: '{}',
        },
      ]);
      mockPrisma.order.update.mockImplementation(async ({ where, data }) => ({ id: where.id, ...data }));

      const res = mockRes();
      await settle(baseReq({ body: { shippingCompanyId: 'TURBO' } }), res);

      expect(res.json.mock.calls[0][0].data.updated).toBe(1);
      expect(mockPrisma.order.update).toHaveBeenCalledTimes(1);
      const updatedMeta = JSON.parse(mockPrisma.order.update.mock.calls[0][0].data.turboMetadata);
      expect(updatedMeta.settlementStatus).toBe('SETTLED');
      expect(updatedMeta.settledBy).toBe('u-1');
    });

    test('settles delivered Turbo orders by turboOrderIds', async () => {
      mockPrisma.order.findMany.mockResolvedValue([
        {
          id: 'o-9',
          status: 'DELIVERED',
          turboShipmentStatus: 'remitted',
          turboMetadata: '{}',
        },
      ]);

      const res = mockRes();
      await settle(baseReq({ body: { turboOrderIds: ['o-9'] } }), res);

      expect(res.json.mock.calls[0][0].data.updated).toBe(1);
      expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ id: { in: ['o-9'] } }) }),
      );
    });

    test('Shipment settle uses delivered OR (order.status OR shipment.status)', async () => {
      mockPrisma.shipment.updateMany.mockResolvedValue({ count: 1 });

      const res = mockRes();
      await settle(baseReq({ body: { shippingCompanyId: 'sc-1' } }), res);

      const where = mockPrisma.shipment.updateMany.mock.calls[0][0].where;
      expect(where.OR).toEqual([
        { order: { status: { in: ['DELIVERED', 'COMPLETED', 'REMITTED'] } } },
        { status: { in: ['DELIVERED', 'COMPLETED', 'REMITTED'] } },
      ]);
      expect(where.settlementStatus).toEqual({ not: 'SETTLED' });
      expect(res.json.mock.calls[0][0].data.updated).toBe(1);
    });

    test('returns 400 when no target is provided', async () => {
      const res = mockRes();
      await settle(baseReq({ body: {} }), res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(mockPrisma.shipment.updateMany).not.toHaveBeenCalled();
      expect(mockPrisma.order.update).not.toHaveBeenCalled();
    });
  });

  describe('unsettle', () => {
    test('clears settlement from turboMetadata for turboOrderIds', async () => {
      mockPrisma.order.findMany.mockResolvedValue([
        {
          id: 'o-1',
          turboMetadata: JSON.stringify({
            settlementStatus: 'SETTLED',
            settledAt: '2026-01-02T00:00:00.000Z',
            settledBy: 'u-1',
          }),
        },
      ]);

      const res = mockRes();
      await unsettle(baseReq({ body: { turboOrderIds: ['o-1'] } }), res);

      expect(res.json.mock.calls[0][0].data.updated).toBe(1);
      const updatedMeta = JSON.parse(mockPrisma.order.update.mock.calls[0][0].data.turboMetadata);
      expect(updatedMeta.settlementStatus).toBe('PENDING');
      expect(updatedMeta.settledAt).toBeUndefined();
      expect(updatedMeta.settledBy).toBeUndefined();
    });

    test('reverts Shipment settlement via shipmentIds', async () => {
      mockPrisma.shipment.updateMany.mockResolvedValue({ count: 2 });

      const res = mockRes();
      await unsettle(baseReq({ body: { shipmentIds: ['s-1', 's-2'] } }), res);

      expect(mockPrisma.shipment.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: { in: ['s-1', 's-2'] } }),
          data: { settlementStatus: 'PENDING', settledAt: null, settledBy: null },
        }),
      );
      expect(res.json.mock.calls[0][0].data.updated).toBe(2);
    });
  });
});
