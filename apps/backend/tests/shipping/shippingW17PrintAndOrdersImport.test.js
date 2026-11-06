/**
 * SHIP-W17: Printing (Waybill/Invoice/Copies/Batch) & Full Orders Excel Import Tests
 */

const request = require('supertest');
const express = require('express');
const XLSX = require('xlsx');

const mockPrisma = {
  shipment: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    count: jest.fn(),
  },
  order: {
    findFirst: jest.fn(),
    create: jest.fn(),
    count: jest.fn(),
  },
  orderItem: {
    create: jest.fn(),
  },
  customer: {
    findFirst: jest.fn(),
    create: jest.fn(),
  },
  merchant: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
  },
  clientRateCard: {
    findMany: jest.fn(),
  },
  shippingZone: {
    findMany: jest.fn(),
  },
  shippingBranch: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
  },
  shipmentEvent: {
    create: jest.fn(),
  },
  shippingPolicySettings: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    upsert: jest.fn(),
  },
  clientPricingPackage: {
    findFirst: jest.fn(),
  },
};

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: () => mockPrisma,
  getSharedPrismaClientAsync: async () => mockPrisma,
}));

let mockUser = {
  id: 'user-w17-tester',
  companyId: 'company-w17-main',
  role: 'OPERATIONS_MANAGER',
};

jest.mock('../../utils/verifyToken', () => ({
  authenticateToken: (req, _res, next) => {
    req.user = mockUser;
    next();
  },
  requireRole: () => (_req, _res, next) => next(),
}));

jest.mock('../../middleware/checkAppAccess', () => () => (_req, _res, next) => next());

const mockZoneResolver = jest.fn();
jest.mock('../../controller/shippingZoneController', () => {
  const original = jest.requireActual('../../controller/shippingZoneController');
  return {
    ...original,
    resolveShippingQuoteForGovernorate: (...args) => mockZoneResolver(...args),
  };
});

const shippingPortalRoutes = require('../../routes/shippingPortalRoutes');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api/v1/shipping-portal', shippingPortalRoutes);

// Binary parser helper for Supertest
const binaryParser = (res, callback) => {
  res.setEncoding('binary');
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    callback(null, Buffer.from(data, 'binary'));
  });
};

describe('SHIP-W17 Acceptance Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = {
      id: 'user-w17-tester',
      companyId: 'company-w17-main',
      role: 'OPERATIONS_MANAGER',
    };
    mockPrisma.shippingZone.findMany.mockResolvedValue([]);
    mockPrisma.shippingBranch.findFirst.mockResolvedValue({ id: 'branch-1', name: 'فرع الإسكندرية', code: 'ALX-01' });
    mockPrisma.shippingBranch.findMany.mockResolvedValue([{ id: 'branch-1', name: 'فرع الإسكندرية', code: 'ALX-01' }]);
    mockPrisma.clientRateCard.findMany.mockResolvedValue([]);
    mockPrisma.shippingPolicySettings.findUnique.mockResolvedValue(null);
    mockPrisma.clientPricingPackage.findFirst.mockResolvedValue(null);
    mockZoneResolver.mockImplementation((_companyId, gov) => {
      const served = ['القاهرة', 'الإسكندرية', 'الجيزة', 'الشرقية'];
      if (served.includes(gov)) {
        return Promise.resolve({
          zoneId: 'zone-w17-valid',
          price: 45,
          deliveryTime: '24-48 hours',
        });
      }
      return Promise.resolve(null);
    });
  });

  const sampleShipment = {
    id: 'ship-w17-001',
    companyId: 'company-w17-main',
    trackingNumber: 'TRK-W17-1001',
    barcode: 'BARW171001',
    merchantOrderId: 'ORD-W17-900',
    recipientName: 'أحمد محمود مصطفى',
    recipientPhone: '01012345678',
    recipientPhone2: '01198765432',
    destinationGovernorate: 'الإسكندرية',
    destinationCity: 'سموحة',
    destinationAddress: 'شارع فوزي معاذ عمارة 15',
    senderName: 'براند الأناقة',
    senderPhone: '01233445566',
    senderAddress: 'المعادي - القاهرة',
    weight: 2.5,
    pieces: 2,
    codAmount: 750,
    cost: 50,
    contentDescription: 'ملابس وأحذية',
    branch: { name: 'فرع الإسكندرية', code: 'ALX-01' },
    company: { id: 'company-w17-main', name: 'MaxP Express', phone: '19000', address: 'القاهرة' },
    order: {
      id: 'ord-w17-001',
      items: [
        { productName: 'قميص أبيض قطن', quantity: 1, price: 350, total: 350 },
        { productName: 'حذاء كاجوال', quantity: 1, price: 400, total: 400 },
      ],
    },
  };

  // 1. Waybill Single A6
  describe('1. GET /shipping-portal/shipments/:id/print?template=WAYBILL', () => {
    it('returns A6 PDF buffer with application/pdf and content disposition', async () => {
      mockPrisma.shipment.findFirst.mockResolvedValue(sampleShipment);

      const res = await request(app)
        .get('/api/v1/shipping-portal/shipments/ship-w17-001/print?template=WAYBILL')
        .expect(200);

      expect(res.headers['content-type']).toBe('application/pdf');
      expect(res.headers['content-disposition']).toContain('waybill-TRK-W17-1001.pdf');
      expect(res.body.length).toBeGreaterThan(5000);
      expect(res.body.slice(0, 4).toString('ascii')).toBe('%PDF');
    });
  });

  // 2. Copies=2 gives 2 pages
  describe('2. GET /shipping-portal/shipments/:id/print?copies=2', () => {
    it('duplicates pages and returns exactly 2 pages in PDF', async () => {
      mockPrisma.shipment.findFirst.mockResolvedValue(sampleShipment);

      const res = await request(app)
        .get('/api/v1/shipping-portal/shipments/ship-w17-001/print?template=WAYBILL&copies=2')
        .expect(200);

      const pdfText = res.body.toString('utf8');
      const pageMatches = pdfText.match(/\/Type\s*\/Page\b/g) || [];
      expect(pageMatches.length).toBe(2);
    });
  });

  // 3. Invoice Template
  describe('3. GET /shipping-portal/shipments/:id/print?template=INVOICE', () => {
    it('generates COD invoice PDF with header invoice-', async () => {
      mockPrisma.shipment.findFirst.mockResolvedValue(sampleShipment);

      const res = await request(app)
        .get('/api/v1/shipping-portal/shipments/ship-w17-001/print?template=INVOICE')
        .expect(200);

      expect(res.headers['content-type']).toBe('application/pdf');
      expect(res.headers['content-disposition']).toContain('invoice-TRK-W17-1001.pdf');
      expect(res.body.length).toBeGreaterThan(4000);
      const pdfText = res.body.toString('utf8');
      expect(pdfText.match(/\/Type\s*\/Page\b/g)?.length).toBe(1);
    });
  });

  // 4. Pickup Slip Template
  describe('4. GET /shipping-portal/shipments/:id/print?template=PICKUP_SLIP', () => {
    it('generates pickup slip PDF with header pickup_slip-', async () => {
      mockPrisma.shipment.findFirst.mockResolvedValue(sampleShipment);

      const res = await request(app)
        .get('/api/v1/shipping-portal/shipments/ship-w17-001/print?template=PICKUP_SLIP')
        .expect(200);

      expect(res.headers['content-type']).toBe('application/pdf');
      expect(res.headers['content-disposition']).toContain('pickup_slip-TRK-W17-1001.pdf');
      expect(res.body.length).toBeGreaterThan(4000);
    });
  });

  // 5. Batch 10 Shipments
  describe('5. POST /shipping-portal/print/batch', () => {
    it('merges 10 shipments into a single 10-page PDF', async () => {
      const tenShipments = Array.from({ length: 10 }).map((_, i) => ({
        ...sampleShipment,
        id: `ship-batch-${i + 1}`,
        trackingNumber: `TRK-BATCH-${1000 + i}`,
      }));
      mockPrisma.shipment.findMany.mockResolvedValue(tenShipments);

      const shipmentIds = tenShipments.map((s) => s.id);
      const res = await request(app)
        .post('/api/v1/shipping-portal/print/batch')
        .send({ shipmentIds, template: 'WAYBILL', copies: 1 })
        .expect(200);

      expect(res.headers['content-type']).toBe('application/pdf');
      expect(res.headers['content-disposition']).toContain('batch-waybill-10.pdf');
      const pdfText = res.body.toString('utf8');
      const pageMatches = pdfText.match(/\/Type\s*\/Page\b/g) || [];
      expect(pageMatches.length).toBe(10);
    });

    it('rejects batch requests exceeding 100 shipments with 400', async () => {
      const tooManyIds = Array.from({ length: 105 }).map((_, i) => `id-${i}`);
      const res = await request(app)
        .post('/api/v1/shipping-portal/print/batch')
        .send({ shipmentIds: tooManyIds, template: 'WAYBILL' })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('100');
    });
  });

  // 6. Template Download
  describe('6. GET /shipping-portal/orders/import-template', () => {
    it('returns valid XLSX template with correct content-type and sheets', async () => {
      const res = await request(app)
        .get('/api/v1/shipping-portal/orders/import-template')
        .buffer(true)
        .parse(binaryParser)
        .expect(200);

      expect(res.headers['content-type']).toBe(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      expect(res.headers['content-disposition']).toContain('orders_import_template.xlsx');

      const wb = XLSX.read(res.body, { type: 'buffer' });
      expect(wb.SheetNames).toContain('الأوردرات والطرود');
      expect(wb.SheetNames).toContain('تعليمات الاستيراد');
    });
  });

  // 7. 50 Rows Import Acceptance Gate (47 Success + 3 Errors)
  describe('7. POST /shipping-portal/orders/import - 50 rows scenario (47 success + 3 failed)', () => {
    it('correctly creates 47 Order+Shipment pairs and reports 3 failed with PHONE_REQUIRED, GOV_NOT_SERVED, DUPLICATE', async () => {
      mockPrisma.clientRateCard.findMany.mockResolvedValue([]);
      mockPrisma.shippingPolicySettings.findUnique.mockResolvedValue({
        companyId: 'company-w17-main',
        rateCardMode: 'RATE_CARD_THEN_ZONE',
      });
      mockPrisma.clientPricingPackage.findFirst.mockResolvedValue(null);

      // Customer mock
      mockPrisma.customer.findFirst.mockResolvedValue(null);
      mockPrisma.customer.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: `cust-${Math.random().toString(36).slice(2, 7)}`, ...data })
      );

      // Order mock
      mockPrisma.order.findFirst.mockResolvedValue(null);
      mockPrisma.order.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: `ord-${Math.random().toString(36).slice(2, 7)}`, ...data })
      );
      mockPrisma.orderItem.create.mockResolvedValue({ id: 'item-1' });

      // Shipment mock
      mockPrisma.shipment.findFirst.mockResolvedValue(null);
      mockPrisma.shipment.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: `ship-${Math.random().toString(36).slice(2, 7)}`, ...data })
      );
      mockPrisma.shipmentEvent.create.mockResolvedValue({ id: 'event-1' });

      // Construct 50 rows
      const rows = [];

      // 47 valid rows
      for (let i = 1; i <= 47; i++) {
        rows.push({
          orderNumber: `ORD-TEST-${1000 + i}`,
          customerName: `عميل تجريبي ${i}`,
          customerPhone: `010${String(10000000 + i).slice(1)}`,
          governorate: i % 2 === 0 ? 'القاهرة' : 'الجيزة',
          city: 'مدينة نصر',
          address: `شارع رقم ${i}`,
          items: `تيشيرت مقاس L x ${i % 3 + 1}`,
          total: 500 + i * 10,
          codAmount: 500 + i * 10,
          weightKg: 1.5,
          pieces: 1,
          clientReference: `REF-VALID-${1000 + i}`,
        });
      }

      // Row 48: Missing Phone -> PHONE_REQUIRED
      rows.push({
        orderNumber: 'ORD-TEST-FAIL-1',
        customerName: 'عميل بدون هاتف',
        customerPhone: '',
        governorate: 'القاهرة',
        address: 'عنوان ما',
        items: 'صنف 1',
        total: 500,
      });

      // Row 49: Unserved governorate -> GOV_NOT_SERVED
      rows.push({
        orderNumber: 'ORD-TEST-FAIL-2',
        customerName: 'عميل في محافظة وهمية',
        customerPhone: '01011112222',
        governorate: 'محافظة_غير_موجودة_نهائيا',
        address: 'عنوان ما',
        items: 'صنف 2',
        total: 400,
      });

      // Row 50: Duplicate orderNumber (matches row 1) -> DUPLICATE
      rows.push({
        orderNumber: 'ORD-TEST-1001', // duplicate of row 1
        customerName: 'عميل مكرر',
        customerPhone: '01033334444',
        governorate: 'القاهرة',
        address: 'عنوان ما',
        items: 'صنف 3',
        total: 300,
      });

      expect(rows.length).toBe(50);

      const res = await request(app)
        .post('/api/v1/shipping-portal/orders/import')
        .send({ rows })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.total).toBe(50);
      expect(res.body.successful).toBe(47);
      expect(res.body.failed.length).toBe(3);

      const reasons = res.body.failed.map((f) => f.reason);
      expect(reasons).toContain('PHONE_REQUIRED');
      expect(reasons).toContain('GOV_NOT_SERVED');
      expect(reasons).toContain('DUPLICATE');

      // Verify order creation count
      expect(mockPrisma.order.create).toHaveBeenCalledTimes(47);
      expect(mockPrisma.shipment.create).toHaveBeenCalledTimes(47);
    });
  });
});
