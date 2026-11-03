/**
 * Standalone Shipment & Policy Engine Acceptance Tests (SHIP-W1A)
 * Covers:
 * 1. Standalone parcel creation without orderId -> 201 + trackingNumber + event CREATED
 * 2. Weight 2.5 + rate card (base 70, baseWeight 1, extraKg 10) -> 80
 * 3. COD 450 -> codAmount=450 saved, collectedAmount remains null
 * 4. English governorate 'Alexandria' -> normalized to 'الإسكندرية'
 * 5. Uncovered governorate -> 400 with Arabic error message
 * 6. Cross-tenant isolation on shipment -> 404/403
 * 7. Legacy order-based shipment creation (regression)
 */

const mockPrisma = {
  shipment: {
    count: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  shipmentEvent: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
  shippingPolicySettings: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
  },
  clientRateCard: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
  },
  merchant: {
    findFirst: jest.fn(),
  },
  order: {
    findFirst: jest.fn(),
  },
  shippingCompany: {
    findFirst: jest.fn(),
  },
  shippingZone: {
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
    req.user = { ...mockUser };
    next();
  },
}));

jest.mock('../../middleware/checkAppAccess', () => {
  const checkAppAccess = () => (req, res, next) => next();
  checkAppAccess.checkAppAccess = checkAppAccess;
  return checkAppAccess;
});

// Mock shippingZoneController's resolveShippingQuoteForGovernorate
const mockZoneResolver = jest.fn();
jest.mock('../../controller/shippingZoneController', () => {
  const original = jest.requireActual('../../controller/shippingZoneController');
  return {
    ...original,
    resolveShippingQuoteForGovernorate: (...args) => mockZoneResolver(...args),
  };
});

const express = require('express');
const request = require('supertest');

const shippingPortalRoutes = require('../../routes/shippingPortalRoutes');
const shipmentsRoutes = require('../../routes/shipmentsRoutes');
const { quotePrice } = require('../../services/shipping/policyService');

const app = express();
app.use(express.json());
app.use('/api/v1/shipping-portal', shippingPortalRoutes);
app.use('/api/v1/shipments', shipmentsRoutes);

describe('Standalone Shipment & Policy Engine (SHIP-W1A Acceptance Gate)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = {
      id: 'user-test-1',
      companyId: 'company-test-1',
      role: 'MANAGER',
      name: 'Admin User',
    };
    mockPrisma.shipmentEvent.create.mockImplementation(async ({ data }) => ({
      id: 'event-1',
      ...data,
      createdAt: new Date(),
    }));
    mockZoneResolver.mockResolvedValue({
      zoneId: 'zone-cairo-1',
      price: 50,
      deliveryTime: '2-3 أيام',
      governorate: 'القاهرة',
    });
  });

  // 1. Standalone parcel without orderId -> 201 + trackingNumber + event CREATED
  test('1. Creates standalone shipment without orderId -> 201 + trackingNumber + event CREATED', async () => {
    mockPrisma.clientRateCard.findMany.mockResolvedValue([]);
    mockPrisma.shipment.create.mockImplementation(async ({ data }) => ({
      id: 'shipment-standalone-1',
      ...data,
      createdAt: new Date(),
    }));

    const payload = {
      recipientName: 'محمود عبد الله',
      recipientPhone: '01012345678',
      governorate: 'القاهرة',
      destinationAddress: 'شارع الهرم 45، الجيزة',
      weightKg: 1.5,
      pieces: 2,
    };

    const res = await request(app)
      .post('/api/v1/shipping-portal/shipments')
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe('shipment-standalone-1');
    expect(res.body.data.trackingNumber).toBeDefined();
    expect(res.body.data.trackingNumber).toMatch(/^TRK-/);
    expect(res.body.data.status).toBe('PENDING');
    expect(res.body.data.source).toBe('PORTAL');

    // Verify ShipmentEvent CREATED recorded
    expect(mockPrisma.shipmentEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        companyId: 'company-test-1',
        shipmentId: 'shipment-standalone-1',
        toStatus: 'PENDING',
        reasonCode: 'CREATED',
      }),
    });
  });

  // 2. Weight 2.5 + rate card (base 70, baseWeight 1, extraKg 10) -> exactly 90 (SHIP-H1 ceiling: 2 extra units)
  test('2. Rate card calculation: weight 2.5 + (base 70, baseWeight 1, extraKg 10) -> exactly 90', async () => {
    mockPrisma.clientRateCard.findMany.mockResolvedValue([
      {
        id: 'card-vip-1',
        name: 'VIP Client Tier',
        companyId: 'company-test-1',
        merchantId: 'merchant-vip-1',
        governorateCode: null, // applies generally
        basePrice: 70.0,
        baseWeightKg: 1.0,
        extraKgPrice: 10.0,
        codFeeFixed: 0.0,
        codFeePercent: 0.0,
        isActive: true,
      },
    ]);

    const quote = await quotePrice({
      companyId: 'company-test-1',
      merchantId: 'merchant-vip-1',
      governorate: 'القاهرة',
      weightKg: 2.5,
      codAmount: 0,
      prisma: mockPrisma,
    });

    expect(quote.price).toBe(90);
    expect(quote.source).toBe('RATE_CARD');
    expect(quote.breakdown.basePrice).toBe(70);
    expect(quote.breakdown.extraWeightFee).toBe(20);
    expect(quote.breakdown.extraUnits).toBe(2);
    expect(quote.breakdown.total).toBe(90);

    // Also verify via HTTP POST /api/v1/shipping-portal/quote
    mockPrisma.merchant.findFirst.mockResolvedValue({
      id: 'merchant-vip-1',
      companyId: 'company-test-1',
      name: 'VIP Merchant',
    });

    const res = await request(app)
      .post('/api/v1/shipping-portal/quote')
      .send({
        merchantId: 'merchant-vip-1',
        governorate: 'القاهرة',
        weightKg: 2.5,
        codAmount: 0,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.price).toBe(90);
    expect(res.body.data.source).toBe('RATE_CARD');
  });

  // 3. COD 450 -> codAmount=450 saved, collectedAmount remains null
  test('3. COD 450 -> codAmount is saved as 450 and collectedAmount remains null', async () => {
    mockPrisma.clientRateCard.findMany.mockResolvedValue([]);
    mockPrisma.shipment.create.mockImplementation(async ({ data }) => ({
      id: 'ship-cod-450',
      ...data,
      createdAt: new Date(),
    }));

    const res = await request(app)
      .post('/api/v1/shipping-portal/shipments')
      .send({
        recipientName: 'إبراهيم حسن',
        recipientPhone: '01123456789',
        governorate: 'القاهرة',
        destinationAddress: 'مدينة نصر، الحي السابع',
        codAmount: 450,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.codAmount).toBe(450);
    expect(res.body.data.collectedAmount).toBeNull();

    // Verify DB insert payload explicitly
    expect(mockPrisma.shipment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        codAmount: 450,
        collectedAmount: null,
      }),
    });
  });

  // 4. English governorate 'Alexandria' -> normalized to 'الإسكندرية'
  test('4. English governorate "Alexandria" is normalized properly to Arabic "الإسكندرية"', async () => {
    mockPrisma.clientRateCard.findMany.mockResolvedValue([]);
    mockZoneResolver.mockResolvedValue({
      zoneId: 'zone-alex-1',
      price: 65,
      deliveryTime: '2-4 أيام',
      governorate: 'الإسكندرية',
    });

    mockPrisma.shipment.create.mockImplementation(async ({ data }) => ({
      id: 'ship-alex-1',
      ...data,
      createdAt: new Date(),
    }));

    const res = await request(app)
      .post('/api/v1/shipping-portal/shipments')
      .send({
        recipientName: 'كريم مجدي',
        recipientPhone: '01234567890',
        governorate: 'Alexandria',
        destinationAddress: 'محطة الرمل، الإسكندرية',
        weightKg: 1,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.destinationGovernorate).toBe('الإسكندرية');
    expect(mockZoneResolver).toHaveBeenCalledWith('company-test-1', 'الإسكندرية');
  });

  // 5. Uncovered governorate -> 400 with Arabic error message
  test('5. Uncovered governorate returns 400 with descriptive Arabic error message', async () => {
    mockPrisma.clientRateCard.findMany.mockResolvedValue([]);
    // Mock zone resolver returning no matched zone
    mockZoneResolver.mockResolvedValue({
      zoneId: null,
      price: 0,
      deliveryTime: 'غير محدد',
      governorate: null,
    });

    const res = await request(app)
      .post('/api/v1/shipping-portal/quote')
      .send({
        governorate: 'منطقة غير معروفة إطلاقا',
        weightKg: 1,
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBeDefined();
    // Arabic message validation
    expect(res.body.error).toMatch(/المحافظة/);
  });

  // 6. Cross-tenant isolation -> 404 when querying shipment of another company
  test('6. Cross-tenant isolation: querying shipment of another company returns 404', async () => {
    // Current user belongs to 'company-test-1', but DB finds null because of companyId filter
    mockPrisma.shipment.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .get('/api/v1/shipping-portal/shipments/other-company-shipment-id');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('الشحنة غير موجودة');

    // Assert findFirst strictly filtered by companyId
    expect(mockPrisma.shipment.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'other-company-shipment-id',
        companyId: 'company-test-1',
      },
      include: expect.any(Object),
    });
  });

  // 7. Legacy order-based shipment creation (regression)
  test('7. Legacy flow: creating shipment with orderId preserves original behavior and records event', async () => {
    mockPrisma.order.findFirst.mockResolvedValue({
      id: 'order-legacy-1',
      companyId: 'company-test-1',
      orderNumber: 'ORD-5501',
      governorate: 'الجيزة',
      city: 'الدقي',
      customerAddress: 'شارع مصدق 20',
      shipping: 55,
      currency: 'EGP',
      customer: { name: 'طارق علي' },
      orderItems: [],
    });

    mockPrisma.shippingCompany.findFirst.mockResolvedValue({
      id: 'carrier-manual-1',
      companyId: 'company-test-1',
      name: 'Manual Carrier',
      providerKey: 'MANUAL',
      integrationMode: 'MANUAL',
    });

    mockPrisma.shipment.findFirst.mockResolvedValue(null); // No existing shipment
    mockPrisma.shipment.create.mockImplementation(async ({ data }) => ({
      id: 'ship-order-legacy-1',
      ...data,
      shippingCompany: { id: 'carrier-manual-1', name: 'Manual Carrier' },
      order: { id: 'order-legacy-1', orderNumber: 'ORD-5501' },
    }));

    const res = await request(app)
      .post('/api/v1/shipments/create')
      .send({
        orderId: 'order-legacy-1',
        shippingCompanyId: 'carrier-manual-1',
        trackingNumber: 'LEGACY-AWB-100',
        manualDeliveryNotes: 'يرجى الاتصال قبل الوصول',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe('ship-order-legacy-1');
    expect(res.body.data.orderId).toBe('order-legacy-1');
    expect(res.body.data.trackingNumber).toBe('LEGACY-AWB-100');
    expect(res.body.message).toBe('تم حفظ بيانات الشحن بنجاح');

    // Event should be recorded
    expect(mockPrisma.shipmentEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        companyId: 'company-test-1',
        shipmentId: 'ship-order-legacy-1',
        toStatus: 'PENDING',
        reasonCode: 'CREATED',
      }),
    });
  });

  // 8. Standalone shipment through legacy /api/v1/shipments/create when orderId is missing
  test('8. Standalone shipment through legacy /api/v1/shipments/create without orderId returns 201', async () => {
    mockPrisma.clientRateCard.findMany.mockResolvedValue([]);
    mockZoneResolver.mockResolvedValue({
      zoneId: 'zone-giza-1',
      price: 55,
      deliveryTime: '1-2 أيام',
      governorate: 'الجيزة',
    });

    mockPrisma.shipment.create.mockImplementation(async ({ data }) => ({
      id: 'ship-legacy-standalone-1',
      ...data,
      shippingCompany: null,
    }));

    const res = await request(app)
      .post('/api/v1/shipments/create')
      .send({
        recipientName: 'سامي يوسف',
        recipientPhone: '01099887766',
        governorate: 'الجيزة',
        address: 'شارع فيصل الرئيسي',
        weight: 1.2,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe('ship-legacy-standalone-1');
    expect(res.body.data.source).toBe('SHIPMENT');
    expect(res.body.data.cost).toBe(55);
    expect(res.body.data.trackingNumber).toBeDefined();
  });
});
