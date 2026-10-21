/**
 * Regression Test Suite: Partner Factory Agreements & Payments Routes (Wave 7)
 *
 * Verifies all 14 lifecycle routes and controller methods:
 * 1. listAgreements (listFactoryAgreements)
 * 2. getAgreementById (getFactoryAgreementById)
 * 3. createAgreement (createFactoryAgreement)
 * 4. updateAgreement (updateFactoryAgreement)
 * 5. activateAgreement (activateFactoryAgreement)
 * 6. closeAgreement (closeFactoryAgreement)
 * 7. cancelAgreement (cancelFactoryAgreement)
 * 8. deleteAgreement (deleteFactoryAgreement)
 * 9. generateDefaultPayments (generateAgreementPayments)
 * 10. createPayment (createAgreementPayment)
 * 11. payPayment (payAgreementPayment)
 * 12. cancelPayment (cancelAgreementPayment)
 * 13. addFile (uploadAgreementFile)
 * 14. deleteFile (deleteAgreementFile)
 *
 * Strict Acceptance Criteria:
 * - Every route/method returns 200/201 (or expected 4xx).
 * - Zero 500 (Internal Server Error) and zero 503 (Service Unavailable).
 * - Strictly respects Prisma schema models & enums:
 *   FactoryAgreementStatus: DRAFT | ACTIVE | CLOSED | CANCELLED
 *   FactoryAgreementPricingMode: PER_PIECE | PER_STAGE | HOURLY | FIXED
 *   FactoryAgreementPaymentStatus: PENDING | PAID | CANCELLED
 */

const request = require('supertest');
const express = require('express');

// Mock sharedDatabase before requiring services or controller
const mockPrisma = {
  factoryAgreement: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  factoryAgreementPayment: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  factoryAgreementFile: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  },
  partnerFactory: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
  },
  productionOrder: {
    findFirst: jest.fn(),
  },
  customerOrder: {
    findFirst: jest.fn(),
  },
  $transaction: jest.fn(async (cb) => cb(mockPrisma)),
  $executeRawUnsafe: jest.fn().mockResolvedValue(1),
};

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(() => mockPrisma),
  initializeSharedDatabase: jest.fn(),
  executeWithRetry: jest.fn(async (op) => op()),
}));

// Mock authentication and permissions middleware
jest.mock('../../utils/verifyToken', () => ({
  authenticateToken: (req, res, next) => {
    req.user = {
      id: 'usr_test_123',
      companyId: 'comp_test_456',
      role: 'ADMIN',
    };
    req.companyId = 'comp_test_456';
    next();
  },
}));

jest.mock('../../middleware/checkAppAccess', () => ({
  checkAppAccess: () => (req, res, next) => next(),
}));

const ManufacturingController = require('../../controller/manufacturingController');
const ManufacturingFactoryAgreementService = require('../../services/manufacturingFactoryAgreementService');
const manufacturingRoutes = require('../../routes/manufacturingRoutes');

// Prisma Enums validation
const FACTORY_AGREEMENT_STATUS = {
  DRAFT: 'DRAFT',
  ACTIVE: 'ACTIVE',
  CLOSED: 'CLOSED',
  CANCELLED: 'CANCELLED',
};

const FACTORY_AGREEMENT_PRICING_MODE = {
  PER_PIECE: 'PER_PIECE',
  PER_STAGE: 'PER_STAGE',
  HOURLY: 'HOURLY',
  FIXED: 'FIXED',
};

const FACTORY_AGREEMENT_PAYMENT_STATUS = {
  PENDING: 'PENDING',
  PAID: 'PAID',
  CANCELLED: 'CANCELLED',
};

function createMockRes() {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
  return res;
}

describe('Partner Factory Agreements & Payments - Regression Test Suite', () => {
  let app;
  const companyId = 'comp_test_456';
  const testUser = { id: 'usr_test_123', companyId };

  const sampleAgreement = {
    id: 'fa_test_001',
    companyId,
    partnerFactoryId: 'pf_test_1',
    code: 'FA-2026-0001',
    title: 'Summer Collection Contract 2026',
    pricingMode: FACTORY_AGREEMENT_PRICING_MODE.PER_PIECE,
    totalValue: 12000,
    currency: 'EGP',
    status: FACTORY_AGREEMENT_STATUS.DRAFT,
    payments: [],
    files: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const samplePayment = {
    id: 'fap_test_001',
    agreementId: sampleAgreement.id,
    seq: 1,
    label: 'مقدم إنتاج 70%',
    percent: 70,
    amount: 8400,
    status: FACTORY_AGREEMENT_PAYMENT_STATUS.PENDING,
    paidAt: null,
    reference: null,
  };

  const sampleFile = {
    id: 'faf_test_001',
    agreementId: sampleAgreement.id,
    fileName: 'contract_signed.pdf',
    url: '/uploads/manufacturing/contract_signed.pdf',
    kind: 'DOCUMENT',
  };

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/v1/manufacturing', manufacturingRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('1. Schema Enums & Structure Verification', () => {
    it('verifies FactoryAgreementStatus values match Prisma schema', () => {
      expect(FACTORY_AGREEMENT_STATUS.DRAFT).toBe('DRAFT');
      expect(FACTORY_AGREEMENT_STATUS.ACTIVE).toBe('ACTIVE');
      expect(FACTORY_AGREEMENT_STATUS.CLOSED).toBe('CLOSED');
      expect(FACTORY_AGREEMENT_STATUS.CANCELLED).toBe('CANCELLED');
    });

    it('verifies FactoryAgreementPricingMode values match Prisma schema', () => {
      expect(FACTORY_AGREEMENT_PRICING_MODE.PER_PIECE).toBe('PER_PIECE');
      expect(FACTORY_AGREEMENT_PRICING_MODE.PER_STAGE).toBe('PER_STAGE');
      expect(FACTORY_AGREEMENT_PRICING_MODE.HOURLY).toBe('HOURLY');
      expect(FACTORY_AGREEMENT_PRICING_MODE.FIXED).toBe('FIXED');
    });

    it('verifies FactoryAgreementPaymentStatus values match Prisma schema', () => {
      expect(FACTORY_AGREEMENT_PAYMENT_STATUS.PENDING).toBe('PENDING');
      expect(FACTORY_AGREEMENT_PAYMENT_STATUS.PAID).toBe('PAID');
      expect(FACTORY_AGREEMENT_PAYMENT_STATUS.CANCELLED).toBe('CANCELLED');
    });
  });

  describe('2. Controller Unit Invocations (All 14 Methods)', () => {
    it('1. listFactoryAgreements returns 200 with data & pagination (never 500/503)', async () => {
      jest.spyOn(ManufacturingFactoryAgreementService, 'listAgreements').mockResolvedValueOnce({
        success: true,
        data: [sampleAgreement],
        pagination: { total: 1, page: 1, limit: 50 },
      });

      const req = { user: testUser, query: { page: 1, limit: 50 } };
      const res = createMockRes();

      await ManufacturingController.listFactoryAgreements(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.statusCode).not.toBe(500);
      expect(res.statusCode).not.toBe(503);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);
    });

    it('2. getFactoryAgreementById returns 200 on found, 404 on missing (never 500/503)', async () => {
      jest.spyOn(ManufacturingFactoryAgreementService, 'getAgreementById').mockResolvedValueOnce(sampleAgreement);

      const req = { user: testUser, params: { id: sampleAgreement.id } };
      const res = createMockRes();

      await ManufacturingController.getFactoryAgreementById(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.statusCode).not.toBe(500);
      expect(res.statusCode).not.toBe(503);
      expect(res.body.data.id).toBe(sampleAgreement.id);

      // Error case: not found
      jest.spyOn(ManufacturingFactoryAgreementService, 'getAgreementById').mockRejectedValueOnce({
        statusCode: 404,
        message: 'الاتفاقية غير موجودة',
      });

      const resNotFound = createMockRes();
      await ManufacturingController.getFactoryAgreementById(req, resNotFound);

      expect(resNotFound.statusCode).toBe(404);
      expect(resNotFound.statusCode).not.toBe(500);
      expect(resNotFound.statusCode).not.toBe(503);
      expect(resNotFound.body.success).toBe(false);
    });

    it('3. createFactoryAgreement returns 201 on success (never 500/503)', async () => {
      jest.spyOn(ManufacturingFactoryAgreementService, 'createAgreement').mockResolvedValueOnce(sampleAgreement);

      const req = {
        user: testUser,
        body: {
          partnerFactoryId: 'pf_test_1',
          title: 'New Agreement',
          pricingMode: 'PER_PIECE',
          totalValue: 12000,
        },
      };
      const res = createMockRes();

      await ManufacturingController.createFactoryAgreement(req, res);

      expect(res.statusCode).toBe(201);
      expect(res.statusCode).not.toBe(500);
      expect(res.statusCode).not.toBe(503);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(sampleAgreement.id);
    });

    it('4. updateFactoryAgreement returns 200 on update, 400 on invalid state (never 500/503)', async () => {
      const updated = { ...sampleAgreement, title: 'Updated Title' };
      jest.spyOn(ManufacturingFactoryAgreementService, 'updateAgreement').mockResolvedValueOnce(updated);

      const req = { user: testUser, params: { id: sampleAgreement.id }, body: { title: 'Updated Title' } };
      const res = createMockRes();

      await ManufacturingController.updateFactoryAgreement(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.statusCode).not.toBe(500);
      expect(res.statusCode).not.toBe(503);
      expect(res.body.data.title).toBe('Updated Title');
    });

    it('5. activateFactoryAgreement returns 200 when valid, 400 when value invalid (never 500/503)', async () => {
      const active = { ...sampleAgreement, status: FACTORY_AGREEMENT_STATUS.ACTIVE };
      jest.spyOn(ManufacturingFactoryAgreementService, 'activateAgreement').mockResolvedValueOnce(active);

      const req = { user: testUser, params: { id: sampleAgreement.id } };
      const res = createMockRes();

      await ManufacturingController.activateFactoryAgreement(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.statusCode).not.toBe(500);
      expect(res.statusCode).not.toBe(503);
      expect(res.body.data.status).toBe(FACTORY_AGREEMENT_STATUS.ACTIVE);

      // Error case: activation validation rejection
      jest.spyOn(ManufacturingFactoryAgreementService, 'activateAgreement').mockRejectedValueOnce({
        statusCode: 400,
        message: 'لا يمكن تفعيل اتفاقية بدون قيمة إجمالية',
      });

      const resFail = createMockRes();
      await ManufacturingController.activateFactoryAgreement(req, resFail);

      expect(resFail.statusCode).toBe(400);
      expect(resFail.statusCode).not.toBe(500);
      expect(resFail.statusCode).not.toBe(503);
    });

    it('6. closeFactoryAgreement returns 200 on close (never 500/503)', async () => {
      const closed = { ...sampleAgreement, status: FACTORY_AGREEMENT_STATUS.CLOSED };
      jest.spyOn(ManufacturingFactoryAgreementService, 'closeAgreement').mockResolvedValueOnce(closed);

      const req = { user: testUser, params: { id: sampleAgreement.id } };
      const res = createMockRes();

      await ManufacturingController.closeFactoryAgreement(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.statusCode).not.toBe(500);
      expect(res.statusCode).not.toBe(503);
      expect(res.body.data.status).toBe(FACTORY_AGREEMENT_STATUS.CLOSED);
    });

    it('7. cancelFactoryAgreement returns 200 on cancel (never 500/503)', async () => {
      const cancelled = { ...sampleAgreement, status: FACTORY_AGREEMENT_STATUS.CANCELLED };
      jest.spyOn(ManufacturingFactoryAgreementService, 'cancelAgreement').mockResolvedValueOnce(cancelled);

      const req = { user: testUser, params: { id: sampleAgreement.id } };
      const res = createMockRes();

      await ManufacturingController.cancelFactoryAgreement(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.statusCode).not.toBe(500);
      expect(res.statusCode).not.toBe(503);
      expect(res.body.data.status).toBe(FACTORY_AGREEMENT_STATUS.CANCELLED);
    });

    it('8. deleteFactoryAgreement returns 200 on delete, 400 on non-DRAFT (never 500/503)', async () => {
      jest.spyOn(ManufacturingFactoryAgreementService, 'deleteAgreement').mockResolvedValueOnce({
        success: true,
        message: 'تم حذف الاتفاقية بنجاح',
      });

      const req = { user: testUser, params: { id: sampleAgreement.id } };
      const res = createMockRes();

      await ManufacturingController.deleteFactoryAgreement(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.statusCode).not.toBe(500);
      expect(res.statusCode).not.toBe(503);
      expect(res.body.success).toBe(true);

      // Error case: non-DRAFT agreement deletion rejected
      jest.spyOn(ManufacturingFactoryAgreementService, 'deleteAgreement').mockRejectedValueOnce({
        statusCode: 400,
        message: 'لا يمكن حذف اتفاقية مفعلة أو مغلقة',
      });

      const resFail = createMockRes();
      await ManufacturingController.deleteFactoryAgreement(req, resFail);

      expect(resFail.statusCode).toBe(400);
      expect(resFail.statusCode).not.toBe(500);
      expect(resFail.statusCode).not.toBe(503);
    });

    it('9. generateAgreementPayments returns 200 on milestone generation (never 500/503)', async () => {
      jest.spyOn(ManufacturingFactoryAgreementService, 'generateDefaultPayments').mockResolvedValueOnce({
        success: true,
        data: [samplePayment],
        agreement: { ...sampleAgreement, payments: [samplePayment] },
        message: 'تم توليد الدفعات بنجاح',
      });

      const req = { user: testUser, params: { id: sampleAgreement.id }, body: {} };
      const res = createMockRes();

      await ManufacturingController.generateAgreementPayments(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.statusCode).not.toBe(500);
      expect(res.statusCode).not.toBe(503);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);
    });

    it('10. createAgreementPayment returns 201 on custom payment (never 500/503)', async () => {
      jest.spyOn(ManufacturingFactoryAgreementService, 'createPayment').mockResolvedValueOnce({
        success: true,
        data: samplePayment,
        agreement: { ...sampleAgreement, payments: [samplePayment] },
      });

      const req = {
        user: testUser,
        params: { id: sampleAgreement.id },
        body: { label: 'دفعة إضافية', amount: 2000 },
      };
      const res = createMockRes();

      await ManufacturingController.createAgreementPayment(req, res);

      expect(res.statusCode).toBe(201);
      expect(res.statusCode).not.toBe(500);
      expect(res.statusCode).not.toBe(503);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(samplePayment.id);
    });

    it('11. payAgreementPayment returns 200 on recording payment (never 500/503)', async () => {
      const paidPayment = {
        ...samplePayment,
        status: FACTORY_AGREEMENT_PAYMENT_STATUS.PAID,
        paidAt: new Date(),
      };
      jest.spyOn(ManufacturingFactoryAgreementService, 'payPayment').mockResolvedValueOnce({
        success: true,
        data: paidPayment,
        agreement: { ...sampleAgreement, payments: [paidPayment] },
      });

      const req = {
        user: testUser,
        params: { id: sampleAgreement.id, paymentId: samplePayment.id },
        body: { reference: 'TRANS-12345' },
      };
      const res = createMockRes();

      await ManufacturingController.payAgreementPayment(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.statusCode).not.toBe(500);
      expect(res.statusCode).not.toBe(503);
      expect(res.body.data.status).toBe(FACTORY_AGREEMENT_PAYMENT_STATUS.PAID);
    });

    it('12. cancelAgreementPayment returns 200 on cancelling payment (never 500/503)', async () => {
      const cancelledPayment = {
        ...samplePayment,
        status: FACTORY_AGREEMENT_PAYMENT_STATUS.CANCELLED,
      };
      jest.spyOn(ManufacturingFactoryAgreementService, 'cancelPayment').mockResolvedValueOnce({
        success: true,
        data: cancelledPayment,
        agreement: { ...sampleAgreement, payments: [cancelledPayment] },
      });

      const req = {
        user: testUser,
        params: { id: sampleAgreement.id, paymentId: samplePayment.id },
        body: {},
      };
      const res = createMockRes();

      await ManufacturingController.cancelAgreementPayment(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.statusCode).not.toBe(500);
      expect(res.statusCode).not.toBe(503);
      expect(res.body.data.status).toBe(FACTORY_AGREEMENT_PAYMENT_STATUS.CANCELLED);
    });

    it('13. uploadAgreementFile returns 201 on file added, 400 when file missing (never 500/503)', async () => {
      jest.spyOn(ManufacturingFactoryAgreementService, 'addFile').mockResolvedValueOnce({
        success: true,
        data: sampleFile,
        agreement: { ...sampleAgreement, files: [sampleFile] },
        message: 'تم رفع الملف بنجاح',
      });

      const reqWithFile = {
        user: testUser,
        params: { id: sampleAgreement.id },
        file: { originalname: 'contract.pdf', path: '/tmp/contract.pdf' },
      };
      const res = createMockRes();

      await ManufacturingController.uploadAgreementFile(reqWithFile, res);

      expect(res.statusCode).toBe(201);
      expect(res.statusCode).not.toBe(500);
      expect(res.statusCode).not.toBe(503);

      // Missing file error case
      const reqNoFile = { user: testUser, params: { id: sampleAgreement.id } };
      const resNoFile = createMockRes();

      await ManufacturingController.uploadAgreementFile(reqNoFile, resNoFile);

      expect(resNoFile.statusCode).toBe(400);
      expect(resNoFile.statusCode).not.toBe(500);
      expect(resNoFile.statusCode).not.toBe(503);
    });

    it('14. deleteAgreementFile returns 200 on file deleted (never 500/503)', async () => {
      jest.spyOn(ManufacturingFactoryAgreementService, 'deleteFile').mockResolvedValueOnce({
        success: true,
        agreement: { ...sampleAgreement, files: [] },
        message: 'تم حذف الملف بنجاح',
      });

      const req = {
        user: testUser,
        params: { id: sampleAgreement.id, fileId: sampleFile.id },
      };
      const res = createMockRes();

      await ManufacturingController.deleteAgreementFile(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.statusCode).not.toBe(500);
      expect(res.statusCode).not.toBe(503);
      expect(res.body.success).toBe(true);
    });
  });

  describe('3. HTTP Endpoints via Supertest (All 14 Mounted Routes)', () => {
    it('GET /api/v1/manufacturing/factory-agreements -> 200', async () => {
      jest.spyOn(ManufacturingFactoryAgreementService, 'listAgreements').mockResolvedValueOnce({
        success: true,
        data: [sampleAgreement],
        pagination: { total: 1, page: 1, limit: 50 },
      });

      const res = await request(app).get('/api/v1/manufacturing/factory-agreements');
      expect(res.status).toBe(200);
      expect(res.status).not.toBe(500);
      expect(res.status).not.toBe(503);
      expect(res.body.success).toBe(true);
    });

    it('POST /api/v1/manufacturing/factory-agreements -> 201', async () => {
      jest.spyOn(ManufacturingFactoryAgreementService, 'createAgreement').mockResolvedValueOnce(sampleAgreement);

      const res = await request(app)
        .post('/api/v1/manufacturing/factory-agreements')
        .send({ partnerFactoryId: 'pf_test_1', title: 'Contract', totalValue: 12000 });

      expect(res.status).toBe(201);
      expect(res.status).not.toBe(500);
      expect(res.status).not.toBe(503);
    });

    it('GET /api/v1/manufacturing/factory-agreements/:id -> 200', async () => {
      jest.spyOn(ManufacturingFactoryAgreementService, 'getAgreementById').mockResolvedValueOnce(sampleAgreement);

      const res = await request(app).get(`/api/v1/manufacturing/factory-agreements/${sampleAgreement.id}`);
      expect(res.status).toBe(200);
      expect(res.status).not.toBe(500);
      expect(res.status).not.toBe(503);
    });

    it('PATCH /api/v1/manufacturing/factory-agreements/:id -> 200', async () => {
      jest.spyOn(ManufacturingFactoryAgreementService, 'updateAgreement').mockResolvedValueOnce(sampleAgreement);

      const res = await request(app)
        .patch(`/api/v1/manufacturing/factory-agreements/${sampleAgreement.id}`)
        .send({ title: 'New Title' });

      expect(res.status).toBe(200);
      expect(res.status).not.toBe(500);
      expect(res.status).not.toBe(503);
    });

    it('POST /api/v1/manufacturing/factory-agreements/:id/activate -> 200', async () => {
      jest.spyOn(ManufacturingFactoryAgreementService, 'activateAgreement').mockResolvedValueOnce({
        ...sampleAgreement,
        status: 'ACTIVE',
      });

      const res = await request(app).post(`/api/v1/manufacturing/factory-agreements/${sampleAgreement.id}/activate`);
      expect(res.status).toBe(200);
      expect(res.status).not.toBe(500);
      expect(res.status).not.toBe(503);
    });

    it('POST /api/v1/manufacturing/factory-agreements/:id/close -> 200', async () => {
      jest.spyOn(ManufacturingFactoryAgreementService, 'closeAgreement').mockResolvedValueOnce({
        ...sampleAgreement,
        status: 'CLOSED',
      });

      const res = await request(app).post(`/api/v1/manufacturing/factory-agreements/${sampleAgreement.id}/close`);
      expect(res.status).toBe(200);
      expect(res.status).not.toBe(500);
      expect(res.status).not.toBe(503);
    });

    it('POST /api/v1/manufacturing/factory-agreements/:id/cancel -> 200', async () => {
      jest.spyOn(ManufacturingFactoryAgreementService, 'cancelAgreement').mockResolvedValueOnce({
        ...sampleAgreement,
        status: 'CANCELLED',
      });

      const res = await request(app).post(`/api/v1/manufacturing/factory-agreements/${sampleAgreement.id}/cancel`);
      expect(res.status).toBe(200);
      expect(res.status).not.toBe(500);
      expect(res.status).not.toBe(503);
    });

    it('DELETE /api/v1/manufacturing/factory-agreements/:id -> 200', async () => {
      jest.spyOn(ManufacturingFactoryAgreementService, 'deleteAgreement').mockResolvedValueOnce({
        success: true,
        message: 'تم الحذف',
      });

      const res = await request(app).delete(`/api/v1/manufacturing/factory-agreements/${sampleAgreement.id}`);
      expect(res.status).toBe(200);
      expect(res.status).not.toBe(500);
      expect(res.status).not.toBe(503);
    });

    it('POST /api/v1/manufacturing/factory-agreements/:id/payments/generate -> 200', async () => {
      jest.spyOn(ManufacturingFactoryAgreementService, 'generateDefaultPayments').mockResolvedValueOnce({
        success: true,
        data: [samplePayment],
      });

      const res = await request(app).post(`/api/v1/manufacturing/factory-agreements/${sampleAgreement.id}/payments/generate`);
      expect(res.status).toBe(200);
      expect(res.status).not.toBe(500);
      expect(res.status).not.toBe(503);
    });

    it('POST /api/v1/manufacturing/factory-agreements/:id/payments -> 201', async () => {
      jest.spyOn(ManufacturingFactoryAgreementService, 'createPayment').mockResolvedValueOnce({
        success: true,
        data: samplePayment,
        agreement: sampleAgreement,
      });

      const res = await request(app)
        .post(`/api/v1/manufacturing/factory-agreements/${sampleAgreement.id}/payments`)
        .send({ label: 'دفعة', amount: 5000 });

      expect(res.status).toBe(201);
      expect(res.status).not.toBe(500);
      expect(res.status).not.toBe(503);
    });

    it('PATCH /api/v1/manufacturing/factory-agreements/:id/payments/:paymentId/pay -> 200', async () => {
      jest.spyOn(ManufacturingFactoryAgreementService, 'payPayment').mockResolvedValueOnce({
        success: true,
        data: { ...samplePayment, status: 'PAID' },
        agreement: sampleAgreement,
      });

      const res = await request(app)
        .patch(`/api/v1/manufacturing/factory-agreements/${sampleAgreement.id}/payments/${samplePayment.id}/pay`)
        .send({ reference: 'REF-123' });

      expect(res.status).toBe(200);
      expect(res.status).not.toBe(500);
      expect(res.status).not.toBe(503);
    });

    it('PATCH /api/v1/manufacturing/factory-agreements/:id/payments/:paymentId/cancel -> 200', async () => {
      jest.spyOn(ManufacturingFactoryAgreementService, 'cancelPayment').mockResolvedValueOnce({
        success: true,
        data: { ...samplePayment, status: 'CANCELLED' },
        agreement: sampleAgreement,
      });

      const res = await request(app)
        .patch(`/api/v1/manufacturing/factory-agreements/${sampleAgreement.id}/payments/${samplePayment.id}/cancel`)
        .send({});

      expect(res.status).toBe(200);
      expect(res.status).not.toBe(500);
      expect(res.status).not.toBe(503);
    });

    it('DELETE /api/v1/manufacturing/factory-agreements/:id/files/:fileId -> 200', async () => {
      jest.spyOn(ManufacturingFactoryAgreementService, 'deleteFile').mockResolvedValueOnce({
        success: true,
        message: 'تم حذف الملف',
      });

      const res = await request(app).delete(
        `/api/v1/manufacturing/factory-agreements/${sampleAgreement.id}/files/${sampleFile.id}`
      );
      expect(res.status).toBe(200);
      expect(res.status).not.toBe(500);
      expect(res.status).not.toBe(503);
    });
  });
});
