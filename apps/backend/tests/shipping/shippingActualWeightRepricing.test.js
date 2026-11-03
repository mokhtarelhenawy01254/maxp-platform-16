/**
 * SHIP-W2.1 Acceptance Tests: Actual Weight Inward Hub Repricing
 *
 * Verifies:
 * 1. 2kg -> 3.4kg: weight=3.4, cost increases by 20 (base 1kg + 10/kg extra -> 2 extra units = 20),
 *    declaredWeightKg preserved in metadata (2.0), ShipmentEvent(WEIGHT_ADJUSTED) = 1.
 * 2. 3kg -> 2kg: weight=2.0, cost decreases by 10, ShipmentEvent records negative financial difference (-10).
 * 3. Receive without actualWeight -> old behavior preserved (weight and cost remain as is, HUB_RECEIVED).
 * 4. GET /api/v1/shipping-portal/shipments/:id returns weight=3.4, cost, declaredWeightKg=2.0, actualWeightKg=3.4.
 * 5. Multi-tenant isolation: 404 for shipment belonging to another company.
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
  shippingBranch: {
    findFirst: jest.fn(),
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
  id: 'user-ship-w2-1',
  companyId: 'company-w2-1',
  role: 'OPERATIONS_MANAGER',
  name: 'Hub Specialist',
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

describe('SHIP-W2.1: Actual Weight Inward Hub Repricing Acceptance Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = {
      id: 'user-ship-w2-1',
      companyId: 'company-w2-1',
      role: 'OPERATIONS_MANAGER',
      name: 'Hub Specialist',
    };

    mockPrisma.shippingBranch.findFirst.mockResolvedValue({
      id: 'branch-cairo-hub',
      companyId: 'company-w2-1',
      name: 'هاَب القاهرة',
      code: 'CAI-HUB',
    });

    // Rate card contract: Base 50 EGP for 1.0 kg, 10 EGP per extra kg, 0 COD fee
    mockPrisma.clientRateCard.findMany.mockResolvedValue([
      {
        id: 'rc-cairo-standard',
        name: 'عقد القاهرة القياسي',
        governorateCode: 'القاهرة',
        basePrice: 50,
        baseWeightKg: 1.0,
        extraKgPrice: 10,
        codFeeFixed: 0,
        codFeePercent: 0,
        isActive: true,
      },
    ]);
  });

  // Acceptance Criterion 1: 2kg -> 3.4kg
  it('Criterion 1: 2kg declared -> 3.4kg actual updates weight to 3.4, increases cost by 20, preserves declaredWeightKg, logs WEIGHT_ADJUSTED event', async () => {
    // Initial shipment: 2kg declared -> cost 60 (base 50 + 1 extra unit @ 10)
    const initialShipment = {
      id: 'ship-w2-1-alpha',
      companyId: 'company-w2-1',
      merchantId: 'merchant-cairo-1',
      trackingNumber: 'TRK-W21-1001',
      barcode: 'BAR-W21-1001',
      status: 'PENDING',
      weight: 2.0,
      cost: 60,
      codAmount: 50,
      destinationGovernorate: 'القاهرة',
      branchId: null,
      metadata: JSON.stringify({ pricingSource: 'RATE_CARD', declaredWeightKg: 2.0 }),
    };

    mockPrisma.shipment.findFirst.mockResolvedValue(initialShipment);

    mockPrisma.shipment.update.mockImplementation(({ where, data }) => {
      return Promise.resolve({
        ...initialShipment,
        ...data,
      });
    });

    mockPrisma.shipmentEvent.create.mockResolvedValue({ id: 'evt-w21-01' });

    const res = await request(app)
      .post('/api/v1/shipping-portal/shipments/ship-w2-1-alpha/receive')
      .send({
        branchId: 'branch-cairo-hub',
        actualWeight: 3.4,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // 1. weight is updated to 3.4
    expect(res.body.shipment.weight).toBe(3.4);
    expect(res.body.shipment.actualWeight).toBe(3.4);
    expect(res.body.shipment.actualWeightKg).toBe(3.4);

    // 2. original declared weight preserved
    expect(res.body.shipment.declaredWeightKg).toBe(2.0);

    // 3. cost updated: base 50 + ceil(3.4 - 1.0 = 2.4 => 3) * 10 = 50 + 30 = 80
    // cost increased by 20 (80 - 60)
    expect(res.body.shipment.cost).toBe(80);
    expect(res.body.priceAdjustment).toBe(20);

    // 4. ShipmentEvent recorded with WEIGHT_ADJUSTED, from/to and financial impact
    expect(mockPrisma.shipmentEvent.create).toHaveBeenCalledTimes(1);
    expect(mockPrisma.shipmentEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          companyId: 'company-w2-1',
          shipmentId: 'ship-w2-1-alpha',
          toStatus: 'RECEIVED_AT_HUB',
          reasonCode: 'WEIGHT_ADJUSTED',
          metadata: expect.stringContaining('"financialImpact":20'),
        }),
      })
    );

    // Check parsed event metadata
    const eventCall = mockPrisma.shipmentEvent.create.mock.calls[0][0];
    const eventMeta = JSON.parse(eventCall.data.metadata);
    expect(eventMeta.from.weight).toBe(2.0);
    expect(eventMeta.to.weight).toBe(3.4);
    expect(eventMeta.from.cost).toBe(60);
    expect(eventMeta.to.cost).toBe(80);
    expect(eventMeta.priceAdjustment).toBe(20);
    expect(eventMeta.declaredWeightKg).toBe(2.0);
    expect(eventMeta.actualWeightKg).toBe(3.4);
  });

  // Acceptance Criterion 2: 3kg -> 2kg (actual weight lower -> price decreases)
  it('Criterion 2: 3kg declared -> 2.0kg actual updates weight to 2.0, decreases cost by 10, records negative difference', async () => {
    // Initial shipment: 3kg declared -> cost 70 (base 50 + 2 extra units @ 10)
    const initialShipment = {
      id: 'ship-w2-1-beta',
      companyId: 'company-w2-1',
      merchantId: 'merchant-cairo-1',
      trackingNumber: 'TRK-W21-1002',
      barcode: 'BAR-W21-1002',
      status: 'PENDING',
      weight: 3.0,
      cost: 70,
      codAmount: 0,
      destinationGovernorate: 'القاهرة',
      branchId: null,
      metadata: JSON.stringify({ pricingSource: 'RATE_CARD' }),
    };

    mockPrisma.shipment.findFirst.mockResolvedValue(initialShipment);

    mockPrisma.shipment.update.mockImplementation(({ where, data }) => {
      return Promise.resolve({
        ...initialShipment,
        ...data,
      });
    });

    mockPrisma.shipmentEvent.create.mockResolvedValue({ id: 'evt-w21-02' });

    const res = await request(app)
      .post('/api/v1/shipping-portal/shipments/ship-w2-1-beta/receive')
      .send({
        branchId: 'branch-cairo-hub',
        actualWeight: 2.0,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // 1. weight is updated to 2.0
    expect(res.body.shipment.weight).toBe(2.0);
    expect(res.body.shipment.actualWeight).toBe(2.0);

    // 2. declaredWeightKg preserved from initial weight (3.0)
    expect(res.body.shipment.declaredWeightKg).toBe(3.0);

    // 3. cost updated: base 50 + (2.0 - 1.0 = 1) * 10 = 60
    // cost decreased by 10 (60 - 70 = -10)
    expect(res.body.shipment.cost).toBe(60);
    expect(res.body.priceAdjustment).toBe(-10);

    // 4. ShipmentEvent recorded with negative impact
    const eventCall = mockPrisma.shipmentEvent.create.mock.calls[0][0];
    expect(eventCall.data.reasonCode).toBe('WEIGHT_ADJUSTED');
    const eventMeta = JSON.parse(eventCall.data.metadata);
    expect(eventMeta.financialImpact).toBe(-10);
    expect(eventMeta.from.cost).toBe(70);
    expect(eventMeta.to.cost).toBe(60);
  });

  // Acceptance Criterion 3: Receive without actualWeight -> old behavior (weight and cost unchanged)
  it('Criterion 3: Receive without actualWeight preserves existing weight and cost, logs HUB_RECEIVED', async () => {
    const initialShipment = {
      id: 'ship-w2-1-gamma',
      companyId: 'company-w2-1',
      merchantId: 'merchant-cairo-1',
      trackingNumber: 'TRK-W21-1003',
      barcode: 'BAR-W21-1003',
      status: 'PENDING',
      weight: 2.5,
      cost: 65,
      codAmount: 100,
      destinationGovernorate: 'القاهرة',
      branchId: null,
      metadata: JSON.stringify({ pricingSource: 'RATE_CARD' }),
    };

    mockPrisma.shipment.findFirst.mockResolvedValue(initialShipment);

    mockPrisma.shipment.update.mockImplementation(({ where, data }) => {
      return Promise.resolve({
        ...initialShipment,
        ...data,
      });
    });

    mockPrisma.shipmentEvent.create.mockResolvedValue({ id: 'evt-w21-03' });

    const res = await request(app)
      .post('/api/v1/shipping-portal/shipments/ship-w2-1-gamma/receive')
      .send({
        branchId: 'branch-cairo-hub',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Weight and cost must NOT change
    expect(res.body.shipment.weight).toBe(2.5);
    expect(res.body.shipment.cost).toBe(65);
    expect(res.body.priceAdjustment).toBe(0);

    // Event should be HUB_RECEIVED
    const eventCall = mockPrisma.shipmentEvent.create.mock.calls[0][0];
    expect(eventCall.data.reasonCode).toBe('HUB_RECEIVED');
  });

  // Acceptance Criterion 4: GET /api/v1/shipping-portal/shipments/:id returns updated weight and report fields
  it('Criterion 4: GET /api/v1/shipping-portal/shipments/:id reflects adjusted weight and report fields', async () => {
    mockPrisma.shipment.findFirst.mockResolvedValue({
      id: 'ship-w2-1-delta',
      companyId: 'company-w2-1',
      trackingNumber: 'TRK-W21-1004',
      status: 'RECEIVED_AT_HUB',
      branchId: 'branch-cairo-hub',
      weight: 3.4,
      actualWeight: 3.4,
      cost: 80,
      priceAdjustment: 20,
      metadata: JSON.stringify({ declaredWeightKg: 2.0, actualWeightKg: 3.4 }),
      events: [],
    });

    const res = await request(app)
      .get('/api/v1/shipping-portal/shipments/ship-w2-1-delta');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('RECEIVED_AT_HUB');
    expect(res.body.data.weight).toBe(3.4);
    expect(res.body.data.actualWeight).toBe(3.4);
    expect(res.body.data.cost).toBe(80);
    expect(res.body.data.declaredWeightKg).toBe(2.0);
    expect(res.body.data.actualWeightKg).toBe(3.4);
  });

  // Acceptance Criterion 5: Cross-tenant isolation
  it('Criterion 5: Receiving shipment from another company returns 404', async () => {
    mockPrisma.shipment.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/v1/shipping-portal/shipments/other-company-shipment/receive')
      .send({ actualWeight: 3.4 });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});
