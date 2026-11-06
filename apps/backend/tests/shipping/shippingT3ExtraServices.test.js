/**
 * SHIP-T3: Extra Services & Fees, Package Open Requests & Order Change Requests Acceptance Tests
 *
 * Acceptance Criteria (قبول رقمي):
 * 1. Extra service "Packaging" 10 EGP on 70 EGP shipment -> extraFees=10, total=80; statement shows separate line item.
 * 2. Package open request -> PENDING; approve -> 5 EGP fee + wallet transaction OPEN_PACKAGE_FEE + allowOpenPackage=true.
 * 3. Second pending request on same shipment -> 409 Conflict.
 * 4. Order change request (Address) -> approve -> new address in shipment + ShipmentEvent(ORDER_CHANGED).
 * 5. Order change request on DELIVERED shipment -> 409 Conflict.
 */

const mockPrisma = {
  shippingService: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  shipmentServiceLine: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  },
  packageOpenRequest: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  orderChangeRequest: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  shipment: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
  shipmentEvent: {
    create: jest.fn(),
  },
  companyWallet: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  companyWalletTransaction: {
    create: jest.fn(),
  },
  shippingPolicySettings: {
    findUnique: jest.fn(),
  },
  merchant: {
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
  id: 'user-admin-1',
  companyId: 'company-t3-test',
  role: 'COMPANY_ADMIN',
  name: 'Ahmed Admin',
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
const shippingReportsRoutes = require('../../routes/shippingReportsRoutes');
const settlementService = require('../../services/shipping/settlementService');

const app = express();
app.use(express.json());
app.use('/api/v1/shipping-portal', shippingPortalRoutes);
app.use('/api/v1/shipping-reports', shippingReportsRoutes);

describe('SHIP-T3: Extra Services, Open Package Requests & Order Change Requests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = {
      id: 'user-admin-1',
      companyId: 'company-t3-test',
      role: 'COMPANY_ADMIN',
      name: 'Ahmed Admin',
    };
  });

  // ==========================================================================
  // Section 1: Services CRUD & Extra Fees Calculation (Acceptance 1)
  // ==========================================================================
  describe('1) Services CRUD & Extra Fees Calculation', () => {
    it('creates a new extra shipping service (Packaging - 10 EGP)', async () => {
      mockPrisma.shippingService.findFirst.mockResolvedValue(null);
      mockPrisma.shippingService.create.mockResolvedValue({
        id: 'svc-pkg-1',
        companyId: 'company-t3-test',
        code: 'PACKAGING',
        name: 'تغليف خاص',
        pricingMode: 'FIXED',
        amount: 10.0,
        appliesTo: 'SHIPMENT',
        isActive: true,
      });

      const res = await request(app)
        .post('/api/v1/shipping-portal/services')
        .send({
          code: 'PACKAGING',
          name: 'تغليف خاص',
          pricingMode: 'FIXED',
          amount: 10.0,
          appliesTo: 'SHIPMENT',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.code).toBe('PACKAGING');
      expect(res.body.data.amount).toBe(10.0);
    });

    it('rejects duplicate service code with 409', async () => {
      mockPrisma.shippingService.findFirst.mockResolvedValue({
        id: 'svc-pkg-1',
        code: 'PACKAGING',
        companyId: 'company-t3-test',
      });

      const res = await request(app)
        .post('/api/v1/shipping-portal/services')
        .send({
          code: 'PACKAGING',
          name: 'تغليف',
          amount: 10,
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('SERVICE_CODE_EXISTS');
    });

    it('attaches 10 EGP packaging service to 70 EGP shipment -> extraFees=10, total=80', async () => {
      mockPrisma.shipment.findFirst.mockResolvedValue({
        id: 'ship-70-1',
        companyId: 'company-t3-test',
        cost: 70.0,
        codAmount: 500.0,
      });

      mockPrisma.shippingService.findFirst.mockResolvedValue({
        id: 'svc-pkg-1',
        name: 'تغليف',
        amount: 10.0,
        pricingMode: 'FIXED',
      });

      mockPrisma.shipmentServiceLine.create.mockResolvedValue({
        id: 'line-1',
        companyId: 'company-t3-test',
        shipmentId: 'ship-70-1',
        serviceId: 'svc-pkg-1',
        name: 'تغليف',
        amount: 10.0,
        qty: 1,
      });

      mockPrisma.shipmentServiceLine.findMany.mockResolvedValue([
        { id: 'line-1', amount: 10.0 },
      ]);

      const res = await request(app)
        .post('/api/v1/shipping-portal/shipments/ship-70-1/services')
        .send({
          serviceId: 'svc-pkg-1',
          qty: 1,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.extraFees).toBe(10);
      expect(res.body.data.amount).toBe(10);

      // Verify combined total calculation in settlement preview
      mockPrisma.merchant.findFirst.mockResolvedValue({
        id: 'merch-1',
        companyId: 'company-t3-test',
        name: 'تاجر الملابس',
      });
      mockPrisma.clientRateCard.findMany.mockResolvedValue([
        {
          id: 'card-1',
          governorateCode: 'CAIRO',
          basePrice: 70.0,
          baseWeightKg: 1,
          extraKgPrice: 5,
        },
      ]);
      mockPrisma.shipment.findMany.mockResolvedValue([
        {
          id: 'ship-70-1',
          companyId: 'company-t3-test',
          merchantId: 'merch-1',
          status: 'DELIVERED',
          cost: 70.0,
          collectedAmount: 500.0,
          codAmount: 500.0,
          destinationGovernorate: 'CAIRO',
          createdAt: new Date('2026-11-01'),
        },
      ]);

      // Service lines query in settlement
      mockPrisma.shipmentServiceLine.findMany.mockResolvedValue([
        { shipmentId: 'ship-70-1', name: 'تغليف', amount: 10.0, qty: 1 },
      ]);

      const preview = await settlementService.preview({
        companyId: 'company-t3-test',
        merchantId: 'merch-1',
      });

      expect(preview.lines).toHaveLength(1);
      const l = preview.lines[0];
      expect(l.shippingFee).toBe(70.0);
      expect(l.extraFees).toBe(10.0);
      expect(l.totalCharges).toBe(80.0); // 70 + 10 = 80
      expect(l.collectedAmount).toBe(500.0);
      expect(l.net).toBe(420.0); // 500 - 80 = 420
      expect(preview.summary.grossCOD).toBe(500.0); // grossCOD unaffected!
      expect(preview.summary.shippingFeesTotal).toBe(70.0);
      expect(preview.summary.extraFeesTotal).toBe(10.0);
      expect(preview.summary.netPayout).toBe(420.0);
    });
  });

  // ==========================================================================
  // Section 2: Package Open Request Workflow (Acceptance 2 & 3)
  // ==========================================================================
  describe('2) Package Open Request Workflow', () => {
    it('creates a package open request in PENDING status', async () => {
      mockPrisma.shipment.findFirst.mockResolvedValue({
        id: 'ship-open-1',
        companyId: 'company-t3-test',
        allowOpenPackage: false,
      });

      mockPrisma.packageOpenRequest.findFirst.mockResolvedValue(null); // No pending request
      mockPrisma.packageOpenRequest.create.mockResolvedValue({
        id: 'req-open-1',
        shipmentId: 'ship-open-1',
        companyId: 'company-t3-test',
        status: 'PENDING',
        fee: 0,
        requestedBy: 'Client Store',
      });

      const res = await request(app)
        .post('/api/v1/shipping-portal/shipments/ship-open-1/open-request')
        .send({
          reason: 'العميل يرغب في معاينة الخامة قبل الاستلام',
          requestedByType: 'CLIENT',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('PENDING');
    });

    it('blocks duplicate PENDING open package request with 409 Conflict', async () => {
      mockPrisma.shipment.findFirst.mockResolvedValue({
        id: 'ship-open-1',
        companyId: 'company-t3-test',
      });

      // Existing pending request
      mockPrisma.packageOpenRequest.findFirst.mockResolvedValue({
        id: 'req-open-existing',
        shipmentId: 'ship-open-1',
        status: 'PENDING',
      });

      const res = await request(app)
        .post('/api/v1/shipping-portal/shipments/ship-open-1/open-request')
        .send({ reason: 'طلب مكرر' });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('PENDING_REQUEST_EXISTS');
    });

    it('approves open request -> 5 EGP fee + wallet transaction OPEN_PACKAGE_FEE + allowOpenPackage=true', async () => {
      mockPrisma.packageOpenRequest.findFirst.mockResolvedValue({
        id: 'req-open-1',
        shipmentId: 'ship-open-1',
        companyId: 'company-t3-test',
        status: 'PENDING',
        requestedBy: 'Store A',
      });

      mockPrisma.shipment.findFirst.mockResolvedValue({
        id: 'ship-open-1',
        companyId: 'company-t3-test',
        barcode: 'MAX-OPEN-100',
        trackingNumber: 'TRK-OPEN-100',
        status: 'OUT_FOR_DELIVERY',
        allowOpenPackage: false,
      });

      mockPrisma.shippingPolicySettings.findUnique.mockResolvedValue({
        companyId: 'company-t3-test',
        openPackageFeeAsk: 5.0,
      });

      mockPrisma.packageOpenRequest.update.mockResolvedValue({
        id: 'req-open-1',
        status: 'APPROVED',
        fee: 5.0,
        reviewedBy: 'Ahmed Admin',
      });

      mockPrisma.shipment.update.mockResolvedValue({
        id: 'ship-open-1',
        allowOpenPackage: true,
      });

      mockPrisma.shipmentEvent.create.mockResolvedValue({ id: 'evt-1' });
      mockPrisma.companyWallet.findUnique.mockResolvedValue({
        companyId: 'company-t3-test',
        balance: 100.0,
      });
      mockPrisma.companyWallet.update.mockResolvedValue({
        companyId: 'company-t3-test',
        balance: 95.0,
      });
      mockPrisma.companyWalletTransaction.create.mockResolvedValue({
        id: 'tx-1',
        type: 'WITHDRAW',
        reason: 'OPEN_PACKAGE_FEE',
        amount: 5.0,
      });

      const res = await request(app)
        .post('/api/v1/shipping-portal/open-package-requests/req-open-1/approve')
        .send({ fee: 5.0 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('APPROVED');
      expect(res.body.fee).toBe(5.0);

      // Verify shipment allowOpenPackage was set to true
      expect(mockPrisma.shipment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'ship-open-1' },
          data: { allowOpenPackage: true },
        })
      );

      // Verify wallet transaction
      expect(mockPrisma.companyWalletTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            companyId: 'company-t3-test',
            type: 'WITHDRAW',
            reason: 'OPEN_PACKAGE_FEE',
            code: 'MAX-OPEN-100',
            amount: 5.0,
          }),
        })
      );

      // Verify ShipmentEvent
      expect(mockPrisma.shipmentEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            shipmentId: 'ship-open-1',
            reasonCode: 'OPEN_PACKAGE_APPROVED',
          }),
        })
      );
    });
  });

  // ==========================================================================
  // Section 3: Order Change Request Workflow (Acceptance 4 & 5)
  // ==========================================================================
  describe('3) Order Change Request Workflow', () => {
    it('creates address change request, approves it -> updates destination in shipment + ORDER_CHANGED event', async () => {
      mockPrisma.shipment.findFirst.mockResolvedValue({
        id: 'ship-change-1',
        companyId: 'company-t3-test',
        status: 'IN_TRANSIT',
        destinationGovernorate: 'CAIRO',
        destinationCity: 'Nasr City',
        destinationAddress: 'Old St 10',
      });

      mockPrisma.orderChangeRequest.create.mockResolvedValue({
        id: 'req-chg-1',
        shipmentId: 'ship-change-1',
        type: 'ADDRESS',
        oldValue: JSON.stringify({ governorate: 'CAIRO', city: 'Nasr City', address: 'Old St 10' }),
        newValue: JSON.stringify({ governorate: 'GIZA', city: 'Dokki', address: 'New Street 25' }),
        status: 'PENDING',
      });

      // 1. Create Change Request
      const createRes = await request(app)
        .post('/api/v1/shipping-portal/shipments/ship-change-1/change-request')
        .send({
          type: 'ADDRESS',
          newValue: { governorate: 'GIZA', city: 'Dokki', address: 'New Street 25' },
          reason: 'تغيير مكان استلام العميل',
        });

      expect(createRes.status).toBe(201);
      expect(createRes.body.success).toBe(true);
      expect(createRes.body.data.status).toBe('PENDING');

      // 2. Approve Request
      mockPrisma.orderChangeRequest.findFirst.mockResolvedValue({
        id: 'req-chg-1',
        shipmentId: 'ship-change-1',
        companyId: 'company-t3-test',
        type: 'ADDRESS',
        status: 'PENDING',
        oldValue: 'Old St 10',
        newValue: JSON.stringify({ governorate: 'GIZA', city: 'Dokki', address: 'New Street 25' }),
      });

      mockPrisma.shipment.update.mockResolvedValue({
        id: 'ship-change-1',
        destinationGovernorate: 'GIZA',
        destinationCity: 'Dokki',
        destinationAddress: 'New Street 25',
      });

      mockPrisma.orderChangeRequest.update.mockResolvedValue({
        id: 'req-chg-1',
        status: 'APPROVED',
      });

      const approveRes = await request(app)
        .post('/api/v1/shipping-portal/order-change-requests/req-chg-1/approve')
        .send({});

      expect(approveRes.status).toBe(200);
      expect(approveRes.body.success).toBe(true);
      expect(approveRes.body.data.status).toBe('APPROVED');

      // Verify shipment updated with new address
      expect(mockPrisma.shipment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'ship-change-1' },
          data: expect.objectContaining({
            destinationGovernorate: 'GIZA',
            destinationCity: 'Dokki',
            destinationAddress: 'New Street 25',
          }),
        })
      );

      // Verify ShipmentEvent with ORDER_CHANGED
      expect(mockPrisma.shipmentEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            shipmentId: 'ship-change-1',
            toStatus: 'ORDER_CHANGED',
            reasonCode: 'ORDER_CHANGED',
          }),
        })
      );
    });

    it('strictly forbids order change after DELIVERED status with 409 Conflict', async () => {
      mockPrisma.shipment.findFirst.mockResolvedValue({
        id: 'ship-delivered-1',
        companyId: 'company-t3-test',
        status: 'DELIVERED',
        destinationAddress: 'Delivered Address',
      });

      const res = await request(app)
        .post('/api/v1/shipping-portal/shipments/ship-delivered-1/change-request')
        .send({
          type: 'ADDRESS',
          newValue: 'Another Street',
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('SHIPMENT_FINALIZED');
    });

    it('strictly forbids order change after REMITTED status with 409 Conflict', async () => {
      mockPrisma.shipment.findFirst.mockResolvedValue({
        id: 'ship-remitted-1',
        companyId: 'company-t3-test',
        status: 'REMITTED',
        destinationAddress: 'Remitted Address',
      });

      const res = await request(app)
        .post('/api/v1/shipping-portal/shipments/ship-remitted-1/change-request')
        .send({
          type: 'AMOUNT',
          newValue: '300',
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('SHIPMENT_FINALIZED');
    });
  });

  // ==========================================================================
  // Section 4: Profit Report Extra Revenue (Acceptance 1 - Profit)
  // ==========================================================================
  describe('4) Profit Report Extra Revenue', () => {
    it('separates extraRevenue from base shipping revenue in profit report', async () => {
      mockPrisma.shipment.findMany.mockResolvedValue([
        {
          id: 'ship-profit-1',
          companyId: 'company-t3-test',
          cost: 70.0,
          courierCost: 30.0,
          status: 'DELIVERED',
          createdAt: new Date('2026-11-01'),
        },
      ]);

      mockPrisma.shipmentServiceLine.findMany.mockResolvedValue([
        { amount: 10.0 },
        { amount: 15.0 },
      ]);

      const res = await request(app)
        .get('/api/v1/shipping-reports/profit')
        .query({ from: '2026-11-01', to: '2026-11-06' });

      expect(res.status).toBe(200);
      expect(res.body.extraRevenue).toBe(25.0); // 10 + 15 = 25
      expect(res.body.totalRevenue).toBe((res.body.revenue || 0) + 25.0);
    });
  });
});
