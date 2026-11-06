/**
 * SHIP-W14 Acceptance Test Suite
 * 1) التسعير بالمدينة وأولوية التسعير (بطاقة عميل مدينة -> بطاقة عميل محافظة -> منطقة مدينة -> منطقة محافظة -> رفض)
 * 2) باقات الحجم الشهرية (ClientPricingPackage: FLAT / PER_SHIPMENT / Overage)
 * 3) استجابة quote ومصدر التسعير (priceSource & source)
 * 4) CRUD الباقات عبر API /shipping-portal/packages و /shipping-portal/packages/quote
 * 5) إنشاء شحنة بباكج مع حفظ pricingPackageId و priceSource تلقائياً
 */

let mockUser = {
  id: 'usr-admin-w14',
  companyId: 'company-w14',
  role: 'SUPER_ADMIN',
  name: 'W14 Admin',
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

// Mock resolveShippingQuoteForGovernorate
const mockZoneResolver = jest.fn();
jest.mock('../../controller/shippingZoneController', () => {
  const original = jest.requireActual('../../controller/shippingZoneController');
  return {
    ...original,
    resolveShippingQuoteForGovernorate: (...args) => mockZoneResolver(...args),
  };
});

// Shared in-memory mock database
const dbState = {
  packages: [],
  clientRateCards: [],
  shippingZones: [],
  shipments: [],
  merchants: [],
  clientProfiles: [],
};

const mockPrisma = {
  merchant: {
    findFirst: jest.fn(async ({ where }) => {
      return dbState.merchants.find((m) => {
        if (where.id && m.id !== where.id) return false;
        if (where.companyId && m.companyId !== where.companyId) return false;
        if (where.email && m.email !== where.email) return false;
        return true;
      }) || null;
    }),
    findMany: jest.fn(async ({ where }) => {
      return dbState.merchants.filter((m) => {
        if (where.companyId && m.companyId !== where.companyId) return false;
        if (where.id && where.id.in && !where.id.in.includes(m.id)) return false;
        return true;
      });
    }),
  },
  clientPricingPackage: {
    findFirst: jest.fn(async ({ where }) => {
      return dbState.packages
        .filter((p) => {
          if (where.id && p.id !== where.id) return false;
          if (where.companyId && p.companyId !== where.companyId) return false;
          if (where.merchantId && p.merchantId !== where.merchantId) return false;
          if (where.isActive !== undefined && p.isActive !== where.isActive) return false;
          return true;
        })
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0] || null;
    }),
    findMany: jest.fn(async ({ where }) => {
      return dbState.packages.filter((p) => {
        if (where.companyId && p.companyId !== where.companyId) return false;
        if (where.merchantId && p.merchantId !== where.merchantId) return false;
        if (where.isActive !== undefined && p.isActive !== where.isActive) return false;
        return true;
      });
    }),
    create: jest.fn(async ({ data }) => {
      const created = { id: `pkg-${Date.now()}`, ...data, createdAt: new Date(), updatedAt: new Date() };
      dbState.packages.push(created);
      return created;
    }),
    update: jest.fn(async ({ where, data }) => {
      const idx = dbState.packages.findIndex((p) => p.id === where.id);
      if (idx === -1) throw new Error('Package not found');
      dbState.packages[idx] = { ...dbState.packages[idx], ...data, updatedAt: new Date() };
      return dbState.packages[idx];
    }),
    delete: jest.fn(async ({ where }) => {
      const idx = dbState.packages.findIndex((p) => p.id === where.id);
      if (idx !== -1) dbState.packages.splice(idx, 1);
      return { success: true };
    }),
  },
  clientRateCard: {
    findFirst: jest.fn(async ({ where }) => {
      return dbState.clientRateCards.find((c) => {
        if (where.companyId && c.companyId !== where.companyId) return false;
        if (where.merchantId && c.merchantId !== where.merchantId) return false;
        if (where.name && c.name !== where.name) return false;
        return true;
      }) || null;
    }),
    findMany: jest.fn(async ({ where }) => {
      return dbState.clientRateCards.filter((c) => {
        if (where.companyId && c.companyId !== where.companyId) return false;
        if (where.merchantId && c.merchantId !== where.merchantId) return false;
        if (where.isActive !== undefined && c.isActive !== where.isActive) return false;
        if (where.OR) {
          const matchesOr = where.OR.some((clause) => {
            if (clause.cityName && 'not' in clause.cityName) return c.cityName != null;
            if (clause.cities && 'not' in clause.cities) return c.cities != null;
            if (clause.governorateCode !== undefined) return c.governorateCode === clause.governorateCode;
            return false;
          });
          if (!matchesOr) return false;
        }
        return true;
      });
    }),
  },
  shippingZone: {
    findMany: jest.fn(async ({ where }) => {
      return dbState.shippingZones.filter((z) => {
        if (where.companyId && z.companyId !== where.companyId) return false;
        if (where.isActive !== undefined && z.isActive !== where.isActive) return false;
        if (where.cities && where.cities.not !== null) return z.cities != null;
        return true;
      });
    }),
  },
  shipment: {
    count: jest.fn(async ({ where }) => {
      return dbState.shipments.filter((s) => {
        if (where.companyId && s.companyId !== where.companyId) return false;
        if (where.merchantId && s.merchantId !== where.merchantId) return false;
        if (where.status && where.status.notIn && where.status.notIn.includes(s.status)) return false;
        return true;
      }).length;
    }),
    findFirst: jest.fn(async () => null),
    create: jest.fn(async ({ data }) => {
      const created = { id: `ship-${Date.now()}`, ...data, createdAt: new Date() };
      dbState.shipments.push(created);
      return created;
    }),
  },
  shipmentEvent: {
    create: jest.fn(async ({ data }) => ({ id: `ev-${Date.now()}`, ...data })),
  },
  clientProfile: {
    findMany: jest.fn(async () => dbState.clientProfiles),
    create: jest.fn(async ({ data }) => {
      dbState.clientProfiles.push(data);
      return data;
    }),
  },
};

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: () => mockPrisma,
}));

const express = require('express');
const request = require('supertest');
const shippingPortalRoutes = require('../../routes/shippingPortalRoutes');
const { quotePrice } = require('../../services/shipping/policyService');

const app = express();
app.use(express.json());
app.use('/api/v1/shipping-portal', shippingPortalRoutes);

describe('SHIP-W14 Acceptance Gate', () => {
  const companyId = 'company-w14';
  const merchantId = 'merch-w14-001';

  beforeEach(() => {
    jest.clearAllMocks();
    dbState.packages = [];
    dbState.clientRateCards = [];
    dbState.shippingZones = [];
    dbState.shipments = [];
    dbState.merchants = [
      { id: merchantId, companyId, name: 'متجر التقنية الحديثة', email: 'tech@example.com', isActive: true },
    ];
    dbState.clientProfiles = [];

    mockZoneResolver.mockImplementation(async (comp, gov) => {
      if (gov === 'الجيزة') {
        return {
          zoneId: 'zone-giza',
          price: 65,
          deliveryTime: '2-3 أيام',
        };
      }
      if (gov === 'الإسكندرية') {
        return {
          zoneId: 'zone-alex',
          price: 60,
          deliveryTime: '1-2 أيام',
        };
      }
      return { zoneId: null, price: 0 };
    });
  });

  describe('1) القبول الرقمي 1: عميل بباكج (0-500 شحنة/شهر · 55ج/شحنة · مدن: مدينة نصر، التجمع)', () => {
    test('1.1: شحنة لمدينة نصر -> 55 (source=PACKAGE_CITY, priceSource=PACKAGE_CITY)', async () => {
      dbState.packages.push({
        id: 'pkg-w14-01',
        companyId,
        merchantId,
        name: 'باقة القاهرة والمدن الجديدة',
        monthlyVolumeFrom: 0,
        monthlyVolumeTo: 500,
        pricingMode: 'PER_SHIPMENT',
        perShipmentPrice: 55,
        overagePricePerShipment: 70,
        coverageMode: 'CITIES',
        cities: JSON.stringify(['مدينة نصر', 'التجمع']),
        governorates: null,
        isActive: true,
        createdAt: new Date(),
      });

      const quote = await quotePrice({
        companyId,
        merchantId,
        governorate: 'القاهرة',
        destinationCity: 'مدينة نصر',
        weightKg: 1,
        prisma: mockPrisma,
      });

      expect(quote.price).toBe(55);
      expect(quote.source).toBe('PACKAGE_CITY');
      expect(quote.priceSource).toBe('PACKAGE_CITY');
      expect(quote.packageId).toBe('pkg-w14-01');
      expect(quote.isOverage).toBe(false);
      expect(quote.overage).toBe(0);
    });

    test('1.2: شحنة للجيزة (خارج الباكج) -> سعر المنطقة', async () => {
      dbState.packages.push({
        id: 'pkg-w14-01',
        companyId,
        merchantId,
        name: 'باقة مدن محددة',
        monthlyVolumeFrom: 0,
        monthlyVolumeTo: 500,
        pricingMode: 'PER_SHIPMENT',
        perShipmentPrice: 55,
        coverageMode: 'CITIES',
        cities: JSON.stringify(['مدينة نصر', 'التجمع']),
        isActive: true,
        createdAt: new Date(),
      });

      const quote = await quotePrice({
        companyId,
        merchantId,
        governorate: 'الجيزة',
        destinationCity: 'الدقي',
        weightKg: 1,
        prisma: mockPrisma,
      });

      expect(quote.price).toBe(65);
      expect(quote.source).toBe('ZONE');
      expect(quote.priceSource).toBe('ZONE_GOV');
      expect(quote.zoneId).toBe('zone-giza');
    });
  });

  describe('2) القبول الرقمي 2: الشحنة 501 (تجاوز الحد الأعلى)', () => {
    test('2.1: 501 شحنة -> الشحنة الزائدة تُحسب overagePricePerShipment + تقرير overage=1', async () => {
      dbState.packages.push({
        id: 'pkg-w14-02',
        companyId,
        merchantId,
        name: 'باقة 500 شحنة',
        monthlyVolumeFrom: 0,
        monthlyVolumeTo: 500,
        pricingMode: 'PER_SHIPMENT',
        perShipmentPrice: 55,
        overagePricePerShipment: 75,
        coverageMode: 'BOTH',
        cities: JSON.stringify(['مدينة نصر', 'التجمع']),
        governorates: JSON.stringify(['القاهرة']),
        isActive: true,
        createdAt: new Date(),
      });

      // Simulate 500 shipments already created this month
      for (let i = 0; i < 500; i++) {
        dbState.shipments.push({
          id: `ship-${i}`,
          companyId,
          merchantId,
          status: 'DELIVERED',
          createdAt: new Date(),
        });
      }

      const quote = await quotePrice({
        companyId,
        merchantId,
        governorate: 'القاهرة',
        destinationCity: 'مدينة نصر',
        weightKg: 1,
        prisma: mockPrisma,
      });

      expect(quote.price).toBe(75);
      expect(quote.source).toBe('PACKAGE_CITY');
      expect(quote.priceSource).toBe('PACKAGE_CITY');
      expect(quote.isOverage).toBe(true);
      expect(quote.overage).toBe(1);
      expect(quote.currentMonthShipmentCount).toBe(500);
      expect(quote.monthlyVolumeTo).toBe(500);
    });
  });

  describe('3) القبول الرقمي 3: باقة FLAT شهري 3000ج لحد 200 شحنة', () => {
    test('3.1: 200 شحنة تكلفتهم 0 إضافي، والفاتورة الشهرية 3000', async () => {
      dbState.packages.push({
        id: 'pkg-w14-flat',
        companyId,
        merchantId,
        name: 'باقة ثابتة شهرياً',
        monthlyVolumeFrom: 0,
        monthlyVolumeTo: 200,
        pricingMode: 'PACKAGE_FLAT',
        flatMonthlyPrice: 3000,
        perShipmentPrice: 0,
        overagePricePerShipment: 40,
        coverageMode: 'BOTH',
        governorates: JSON.stringify(['القاهرة', 'الجيزة']),
        isActive: true,
        createdAt: new Date(),
      });

      // Client currently has 150 shipments (< 200)
      for (let i = 0; i < 150; i++) {
        dbState.shipments.push({
          id: `ship-${i}`,
          companyId,
          merchantId,
          status: 'PENDING',
          createdAt: new Date(),
        });
      }

      const quote = await quotePrice({
        companyId,
        merchantId,
        governorate: 'القاهرة',
        weightKg: 2,
        prisma: mockPrisma,
      });

      expect(quote.price).toBe(0);
      expect(quote.flatMonthlyPrice).toBe(3000);
      expect(quote.pricingMode).toBe('PACKAGE_FLAT');
      expect(quote.source).toBe('PACKAGE_GOV');
      expect(quote.isOverage).toBe(false);
      expect(quote.overage).toBe(0);
    });

    test('3.2: الشحنة 201 في باقة FLAT تحسب overagePricePerShipment (40ج)', async () => {
      dbState.packages.push({
        id: 'pkg-w14-flat',
        companyId,
        merchantId,
        name: 'باقة ثابتة شهرياً',
        monthlyVolumeFrom: 0,
        monthlyVolumeTo: 200,
        pricingMode: 'PACKAGE_FLAT',
        flatMonthlyPrice: 3000,
        perShipmentPrice: 0,
        overagePricePerShipment: 40,
        coverageMode: 'BOTH',
        governorates: JSON.stringify(['القاهرة']),
        isActive: true,
        createdAt: new Date(),
      });

      for (let i = 0; i < 200; i++) {
        dbState.shipments.push({
          id: `ship-${i}`,
          companyId,
          merchantId,
          status: 'DELIVERED',
          createdAt: new Date(),
        });
      }

      const quote = await quotePrice({
        companyId,
        merchantId,
        governorate: 'القاهرة',
        weightKg: 1,
        prisma: mockPrisma,
      });

      expect(quote.price).toBe(40);
      expect(quote.isOverage).toBe(true);
      expect(quote.overage).toBe(1);
    });
  });

  describe('4) القبول الرقمي 4: عميل تغطيته GOVERNORATES فقط', () => {
    test('4.1: شحنة لمدينة غير محددة تُسعّر بالمحافظة', async () => {
      dbState.packages.push({
        id: 'pkg-w14-gov',
        companyId,
        merchantId,
        name: 'باقة محافظات الدلتا',
        monthlyVolumeFrom: 0,
        monthlyVolumeTo: 1000,
        pricingMode: 'PER_SHIPMENT',
        perShipmentPrice: 48,
        coverageMode: 'GOVERNORATES',
        governorates: JSON.stringify(['الإسكندرية', 'البحيرة']),
        cities: null,
        isActive: true,
        createdAt: new Date(),
      });

      const quote = await quotePrice({
        companyId,
        merchantId,
        governorate: 'الإسكندرية',
        destinationCity: null,
        weightKg: 1,
        prisma: mockPrisma,
      });

      expect(quote.price).toBe(48);
      expect(quote.source).toBe('PACKAGE_GOV');
      expect(quote.priceSource).toBe('PACKAGE_GOV');
      expect(quote.governorate).toBe('الإسكندرية');
    });
  });

  describe('5) أولوية التسعير الكاملة (Precedence Hierarchy)', () => {
    test('5.1: بطاقة العميل (مدينة) تسبق بطاقة العميل (محافظة)', async () => {
      dbState.clientRateCards.push({
        id: 'rc-gov',
        companyId,
        merchantId,
        name: 'بطاقة القاهرة العامة',
        governorateCode: 'القاهرة',
        basePrice: 50,
        baseWeightKg: 1,
        isActive: true,
      });
      dbState.clientRateCards.push({
        id: 'rc-city',
        companyId,
        merchantId,
        name: 'بطاقة التجمع المتميزة',
        cityName: 'التجمع',
        basePrice: 42,
        baseWeightKg: 1,
        isActive: true,
      });

      const quote = await quotePrice({
        companyId,
        merchantId,
        governorate: 'القاهرة',
        destinationCity: 'التجمع الخامس',
        prisma: mockPrisma,
      });

      expect(quote.price).toBe(42);
      expect(quote.source).toBe('RATE_CARD_CITY');
      expect(quote.priceSource).toBe('RATE_CARD_CITY');
      expect(quote.rateCardId).toBe('rc-city');
    });

    test('5.2: منطقة (مدينة) تسبق منطقة (محافظة) عند عدم وجود بطاقة عميل', async () => {
      dbState.shippingZones.push({
        id: 'zone-october',
        companyId,
        name: 'منطقة 6 أكتوبر الخاصة',
        cities: JSON.stringify(['أكتوبر', 'الشيخ زايد']),
        price: 35,
        isActive: true,
      });

      const quote = await quotePrice({
        companyId,
        merchantId: null,
        governorate: 'الجيزة',
        destinationCity: 'الشيخ زايد',
        prisma: mockPrisma,
      });

      expect(quote.price).toBe(35);
      expect(quote.source).toBe('ZONE_CITY');
      expect(quote.priceSource).toBe('ZONE_CITY');
      expect(quote.zoneId).toBe('zone-october');
    });

    test('5.3: رفض المحافظة أو المدينة غير المغطاة بـ 400', async () => {
      mockZoneResolver.mockResolvedValueOnce({ zoneId: null, price: 0 });

      await expect(
        quotePrice({
          companyId,
          merchantId: null,
          governorate: 'الوادي الجديد',
          destinationCity: 'الفرافرة',
          prisma: mockPrisma,
        })
      ).rejects.toThrow('المحافظة أو المدينة غير مغطاة');
    });
  });

  describe('6) HTTP API: باقات الحجم الشهرية (/shipping-portal/packages)', () => {
    test('6.1: POST /packages creates new ClientPricingPackage', async () => {
      const res = await request(app)
        .post('/api/v1/shipping-portal/packages')
        .send({
          merchantId,
          name: 'باقة الـ 1000 شحنة',
          monthlyVolumeFrom: 0,
          monthlyVolumeTo: 1000,
          pricingMode: 'PER_SHIPMENT',
          perShipmentPrice: 50,
          overagePricePerShipment: 65,
          coverageMode: 'BOTH',
          cities: ['مدينة نصر', 'المعادي'],
          governorates: ['القاهرة'],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('باقة الـ 1000 شحنة');
      expect(res.body.data.perShipmentPrice).toBe(50);
      expect(res.body.data.monthlyVolumeTo).toBe(1000);
    });

    test('6.2: GET /packages lists packages for merchant', async () => {
      const res = await request(app)
        .get(`/api/v1/shipping-portal/packages?merchantId=${merchantId}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    test('6.3: GET /packages/quote calculates price via package', async () => {
      dbState.packages.push({
        id: 'pkg-live-quote',
        companyId,
        merchantId,
        name: 'باقة التجمع',
        monthlyVolumeFrom: 0,
        monthlyVolumeTo: 200,
        pricingMode: 'PER_SHIPMENT',
        perShipmentPrice: 52,
        overagePricePerShipment: 70,
        coverageMode: 'CITIES',
        cities: JSON.stringify(['التجمع']),
        isActive: true,
        createdAt: new Date(),
      });

      const res = await request(app)
        .get('/api/v1/shipping-portal/packages/quote')
        .query({ merchantId, city: 'التجمع', weightKg: 1 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.price).toBe(52);
      expect(res.body.data.source).toBe('PACKAGE_CITY');
      expect(res.body.data.priceSource).toBe('PACKAGE_CITY');
    });

    test('6.4: POST /shipments attaches pricingPackageId and priceSource to created parcel', async () => {
      dbState.packages.push({
        id: 'pkg-standalone-test',
        companyId,
        merchantId,
        name: 'باقة أكتوبر',
        monthlyVolumeFrom: 0,
        monthlyVolumeTo: 100,
        pricingMode: 'PER_SHIPMENT',
        perShipmentPrice: 45,
        coverageMode: 'CITIES',
        cities: JSON.stringify(['أكتوبر']),
        isActive: true,
        createdAt: new Date(),
      });

      const res = await request(app)
        .post('/api/v1/shipping-portal/shipments')
        .send({
          recipientName: 'محمود حسن',
          recipientPhone: '01012345678',
          destinationGovernorate: 'الجيزة',
          destinationCity: 'أكتوبر',
          destinationAddress: 'الحي المتميز، فيلا 12',
          merchantId,
          weightKg: 1,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.cost).toBe(45);
      expect(res.body.data.pricingPackageId).toBe('pkg-standalone-test');
      expect(res.body.data.priceSource).toBe('PACKAGE_CITY');
    });
  });
});
