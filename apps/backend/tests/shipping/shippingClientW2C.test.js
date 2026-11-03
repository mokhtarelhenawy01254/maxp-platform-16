/**
 * Shipping Client Portal (SHIP-W2C) Acceptance Tests
 * Validates:
 * 1. GET /shipments returns only client's shipments (scoped)
 * 2. GET /shipments/:id returns 404 (not 403) for another client's shipment
 * 3. POST /shipments without merchantId auto-assigns user's merchantId
 * 4. Passing a different merchantId in body returns 403
 * 5. GET /rate-card returns only client's cards with zero internal cost fields
 * 6. POST /pickups creates pickup for client, GET /pickups scoped
 * 7. Inactive merchant or missing merchantId returns 403
 * 8. clientPortalEnabled=false returns 403 with code PORTAL_DISABLED
 */

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
  },
  merchant: {
    findFirst: jest.fn(),
  },
  shipment: {
    count: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    aggregate: jest.fn(),
  },
  shipmentEvent: {
    create: jest.fn(),
  },
  pickupRequest: {
    findMany: jest.fn(),
    create: jest.fn(),
  },
  clientRateCard: {
    findMany: jest.fn(),
  },
  shippingPolicySettings: {
    findUnique: jest.fn(),
  },
};

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: () => mockPrisma,
  getSharedPrismaClientAsync: async () => mockPrisma,
}));

let mockUser = {
  id: 'user-client-a',
  companyId: 'company-shipping-1',
  role: 'SHIPPING_CLIENT',
  merchantId: 'merchant-a',
  firstName: 'Ahmed',
  lastName: 'Merchant',
  email: 'client-a@example.com',
};

jest.mock('../../utils/verifyToken', () => ({
  authenticateToken: (req, res, next) => {
    req.user = { ...mockUser };
    next();
  },
}));

jest.mock('../../middleware/checkAppAccess', () => () => (req, res, next) => next());

jest.mock('../../services/shipping/policyService', () => {
  const original = jest.requireActual('../../services/shipping/policyService');
  return {
    ...original,
    quotePrice: jest.fn().mockResolvedValue({
      price: 55,
      currency: 'EGP',
      source: 'RATE_CARD',
      rateCardId: 'rc-1',
      governorate: 'القاهرة',
      breakdown: { actualWeightKg: 1, basePrice: 55, total: 55 },
    }),
  };
});

const express = require('express');
const request = require('supertest');
const shippingClientRoutes = require('../../routes/shippingClientRoutes');

const app = express();
app.use(express.json());
app.use('/api/v1/shipping-client', shippingClientRoutes);

describe('Shipping Client Portal (SHIP-W2C) Backend Acceptance Tests', () => {
  const activeMerchantA = {
    id: 'merchant-a',
    companyId: 'company-shipping-1',
    name: 'تاجر الأناقة',
    email: 'client-a@example.com',
    phone: '01012345678',
    address: 'شارع المعز، القاهرة',
    isActive: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = {
      id: 'user-client-a',
      companyId: 'company-shipping-1',
      role: 'SHIPPING_CLIENT',
      merchantId: 'merchant-a',
      firstName: 'Ahmed',
      lastName: 'Merchant',
      email: 'client-a@example.com',
    };

    // Default policy: clientPortalEnabled = true
    mockPrisma.shippingPolicySettings.findUnique.mockResolvedValue({
      companyId: 'company-shipping-1',
      clientPortalEnabled: true,
    });

    // Default merchant: active
    mockPrisma.merchant.findFirst.mockResolvedValue(activeMerchantA);
  });

  // Acceptance Criterion 1
  test('1. GET /shipments returns only Client A shipments (scoped)', async () => {
    mockPrisma.shipment.count.mockResolvedValue(2);
    mockPrisma.shipment.findMany.mockResolvedValue([
      { id: 'ship-1', trackingNumber: 'TRK-101', recipientName: 'مستلم 1', status: 'PENDING' },
      { id: 'ship-2', trackingNumber: 'TRK-102', recipientName: 'مستلم 2', status: 'DELIVERED' },
    ]);

    const res = await request(app).get('/api/v1/shipping-client/shipments');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(2);

    // Verify Prisma query was strictly scoped to merchant-a and companyId
    expect(mockPrisma.shipment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          companyId: 'company-shipping-1',
          merchantId: 'merchant-a',
        }),
      })
    );
  });

  // Acceptance Criterion 2
  test('2. GET /shipments/:id returns 404 (not 403) for Client B shipment', async () => {
    // findFirst returns null because shipment belongs to merchant-b
    mockPrisma.shipment.findFirst.mockResolvedValue(null);

    const res = await request(app).get('/api/v1/shipping-client/shipments/ship-b-999');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('الشحنة غير موجودة');
    expect(mockPrisma.shipment.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 'ship-b-999',
          companyId: 'company-shipping-1',
          merchantId: 'merchant-a',
        }),
      })
    );
  });

  // Acceptance Criterion 3
  test('3. POST /shipments without merchantId auto-assigns user merchantId', async () => {
    mockPrisma.shipment.create.mockResolvedValue({
      id: 'ship-new-1',
      trackingNumber: 'TRK-NEW-1',
      merchantId: 'merchant-a',
      recipientName: 'محمود السيد',
      status: 'PENDING',
      cost: 55,
    });
    mockPrisma.shipmentEvent.create.mockResolvedValue({});

    const res = await request(app)
      .post('/api/v1/shipping-client/shipments')
      .send({
        recipientName: 'محمود السيد',
        recipientPhone: '01122334455',
        destinationGovernorate: 'القاهرة',
        destinationAddress: 'مدينة نصر، حي السفارات',
        codAmount: 350,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(mockPrisma.shipment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          merchantId: 'merchant-a',
          recipientName: 'محمود السيد',
          companyId: 'company-shipping-1',
        }),
      })
    );
  });

  // Acceptance Criterion 4
  test('4. POST /shipments attempting to pass merchant-b returns 403', async () => {
    const res = await request(app)
      .post('/api/v1/shipping-client/shipments')
      .send({
        merchantId: 'merchant-b',
        recipientName: 'متجر آخر',
        recipientPhone: '01000000000',
        destinationGovernorate: 'الجيزة',
        destinationAddress: 'الدقي',
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(mockPrisma.shipment.create).not.toHaveBeenCalled();
  });

  // Acceptance Criterion 5
  test('5. GET /rate-card returns only client cards with zero internal cost fields', async () => {
    mockPrisma.clientRateCard.findMany.mockResolvedValue([
      {
        id: 'rc-1',
        name: 'شحن القاهرة الكبرى',
        governorateCode: 'القاهرة',
        basePrice: 50,
        baseWeightKg: 1,
        extraKgPrice: 5,
        codFeeFixed: 0,
        codFeePercent: 0,
        returnFee: 25,
        minWeight: 0,
        maxWeight: 30,
        isActive: true,
      },
    ]);

    const res = await request(app).get('/api/v1/shipping-client/rate-card');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);

    const card = res.body.data[0];
    expect(card.name).toBe('شحن القاهرة الكبرى');
    // Ensure zero internal cost fields exist
    expect(card.internalCost).toBeUndefined();
    expect(card.courierCommission).toBeUndefined();
    expect(card.profitMargin).toBeUndefined();

    expect(mockPrisma.clientRateCard.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          companyId: 'company-shipping-1',
          merchantId: 'merchant-a',
          isActive: true,
        }),
      })
    );
  });

  // Acceptance Criterion 6
  test('6. POST /pickups creates for client A, and GET /pickups is strictly scoped', async () => {
    mockPrisma.pickupRequest.create.mockResolvedValue({
      id: 'pck-1',
      pickupNumber: 'PCK-20261103-1234',
      merchantId: 'merchant-a',
      contactName: 'أحمد التاجر',
      status: 'REQUESTED',
    });

    const createRes = await request(app)
      .post('/api/v1/shipping-client/pickups')
      .send({
        scheduledDate: '2026-11-04',
        timeSlot: '10:00 - 14:00',
        contactName: 'أحمد التاجر',
        contactPhone: '01012345678',
        pickupAddress: 'مخزن العبور',
        governorate: 'القليوبية',
        expectedParcels: 10,
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.success).toBe(true);
    expect(mockPrisma.pickupRequest.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          merchantId: 'merchant-a',
          contactName: 'أحمد التاجر',
        }),
      })
    );

    mockPrisma.pickupRequest.findMany.mockResolvedValue([
      { id: 'pck-1', pickupNumber: 'PCK-20261103-1234', status: 'REQUESTED' },
    ]);

    const listRes = await request(app).get('/api/v1/shipping-client/pickups');
    expect(listRes.status).toBe(200);
    expect(mockPrisma.pickupRequest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          companyId: 'company-shipping-1',
          merchantId: 'merchant-a',
        }),
      })
    );
  });

  // Acceptance Criterion 7
  test('7. Client with missing merchantId or inactive merchant returns 403', async () => {
    // Case A: Missing merchantId
    mockUser.merchantId = null;
    mockPrisma.user.findUnique.mockResolvedValue({ merchantId: null });

    const resNoMerchant = await request(app).get('/api/v1/shipping-client/shipments');
    expect(resNoMerchant.status).toBe(403);
    expect(resNoMerchant.body.message).toContain('merchantId مفقود');

    // Case B: Inactive merchant
    mockUser.merchantId = 'merchant-inactive';
    mockPrisma.merchant.findFirst.mockResolvedValue({
      id: 'merchant-inactive',
      isActive: false,
    });

    const resInactive = await request(app).get('/api/v1/shipping-client/shipments');
    expect(resInactive.status).toBe(403);
    expect(resInactive.body.message).toContain('حساب العميل موقوف');
  });

  // Acceptance Criterion 8
  test('8. clientPortalEnabled=false returns 403 with code PORTAL_DISABLED', async () => {
    mockPrisma.shippingPolicySettings.findUnique.mockResolvedValue({
      companyId: 'company-shipping-1',
      clientPortalEnabled: false,
    });

    const res = await request(app).get('/api/v1/shipping-client/shipments');
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('PORTAL_DISABLED');
  });

  // Summary & Me
  test('9. GET /me and GET /summary return scoped data and KPIs', async () => {
    const meRes = await request(app).get('/api/v1/shipping-client/me');
    expect(meRes.status).toBe(200);
    expect(meRes.body.data.user.merchantId).toBe('merchant-a');
    expect(meRes.body.data.merchant.name).toBe('تاجر الأناقة');

    mockPrisma.shipment.count
      .mockResolvedValueOnce(50) // total
      .mockResolvedValueOnce(40) // delivered
      .mockResolvedValueOnce(5)  // returned
      .mockResolvedValueOnce(5); // pending

    mockPrisma.shipment.aggregate.mockResolvedValue({
      _sum: { codAmount: 18500 },
    });

    mockPrisma.shipment.findMany.mockResolvedValue([
      { id: 's-1', trackingNumber: 'TRK-1', status: 'DELIVERED', codAmount: 500 },
    ]);

    const summaryRes = await request(app).get('/api/v1/shipping-client/summary');
    expect(summaryRes.status).toBe(200);
    expect(summaryRes.body.data.totalShipments).toBe(50);
    expect(summaryRes.body.data.deliveredCount).toBe(40);
    expect(summaryRes.body.data.returnedCount).toBe(5);
    expect(summaryRes.body.data.deliveryRate).toBe(89); // 40 / (40 + 5) = 88.88% -> 89%
    expect(summaryRes.body.data.estimatedPendingCod).toBe(18500);
    expect(summaryRes.body.data.recentShipments).toHaveLength(1);
  });
});
