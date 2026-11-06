process.env.POSTGRES_URL = 'postgresql://mock:mock@localhost:5432/mockdb';
process.env.DATABASE_URL = 'postgresql://mock:mock@localhost:5432/mockdb';

const mockPrisma = {
  courier: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  courierDocument: {
    create: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  courierPayroll: {
    create: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
  shipment: {
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  courierCommission: {
    findMany: jest.fn(),
  },
  treasuryAccount: {
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  treasuryTransaction: {
    create: jest.fn(),
  },
  installedApp: {
    findFirst: jest.fn(),
  },
  deliveryRun: {
    findFirst: jest.fn(),
    create: jest.fn(),
    count: jest.fn(),
  },
  $executeRawUnsafe: jest.fn().mockResolvedValue(1),
  $transaction: jest.fn((callback) => callback(mockPrisma)),
};

jest.mock('../../services/ensureLocalPostgres', () => ({
  ensureLocalPostgres: jest.fn().mockResolvedValue(true),
}));

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(() => mockPrisma),
  safeQuery: jest.fn((fn) => fn()),
}));

jest.mock('../../services/courierNotificationService', () => ({
  notifyRunDispatched: jest.fn(),
  notifyFieldUpdate: jest.fn(),
  sendCourierNotification: jest.fn().mockResolvedValue({ success: true }),
  COURIER_NOTIFICATION_EVENTS: {
    OUT_FOR_DELIVERY: 'courier_out_for_delivery',
    DELIVERED: 'courier_delivered',
    RETURNED: 'courier_returned'
  },
}));

const courierService = require('../../services/courierService');
const courierPayrollService = require('../../services/courierPayrollService');

describe('SHIP-W15: Courier Documents, Compensation, and Payroll Engine', () => {
  const companyId = 'company-w15-test';
  const courierId = 'courier-w15-1';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('1) Courier Documents & Verification Lifecycle', () => {
    test('Rule 1: Uploading National ID + Custody receipt sets PENDING_REVIEW; verifying both sets VERIFIED', async () => {
      mockPrisma.courier.findFirst.mockResolvedValue({
        id: courierId,
        companyId,
        name: 'كابتن محمود',
        documentsStatus: 'INCOMPLETE',
      });
      mockPrisma.courier.update.mockResolvedValue({});

      // Step A: Upload National ID
      mockPrisma.courierDocument.findMany.mockResolvedValue([
        { id: 'doc-1', type: 'NATIONAL_ID_FRONT', status: 'PENDING' },
      ]);
      mockPrisma.courierDocument.create.mockResolvedValue({
        id: 'doc-1',
        type: 'NATIONAL_ID_FRONT',
        status: 'PENDING',
      });

      const res1 = await courierService.uploadCourierDocument(
        companyId,
        courierId,
        {
          file: { filename: 'id.jpg', originalname: 'id.jpg', mimetype: 'image/jpeg', size: 1024 },
          type: 'NATIONAL_ID_FRONT',
        },
        'user-admin'
      );
      expect(res1.documentsStatus).toBe('PENDING_REVIEW');
      expect(mockPrisma.courier.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: courierId },
          data: { documentsStatus: 'PENDING_REVIEW' },
        })
      );

      // Step B: Upload Custody Receipt (وصل أمانة)
      mockPrisma.courierDocument.findMany.mockResolvedValue([
        { id: 'doc-1', type: 'NATIONAL_ID_FRONT', status: 'PENDING' },
        { id: 'doc-2', type: 'CUSTODY_RECEIPT', status: 'PENDING' },
      ]);
      const res2 = await courierService.uploadCourierDocument(
        companyId,
        courierId,
        {
          file: { filename: 'custody.pdf', originalname: 'custody.pdf', mimetype: 'application/pdf', size: 2048 },
          type: 'CUSTODY_RECEIPT',
        },
        'user-admin'
      );
      expect(res2.documentsStatus).toBe('PENDING_REVIEW');

      // Step C: Verify both documents
      mockPrisma.courierDocument.findFirst.mockResolvedValue({ id: 'doc-1', companyId, courierId, status: 'PENDING' });
      mockPrisma.courierDocument.update.mockResolvedValue({ id: 'doc-1', status: 'VERIFIED' });
      mockPrisma.courierDocument.findMany.mockResolvedValue([
        { id: 'doc-1', type: 'NATIONAL_ID_FRONT', status: 'VERIFIED' },
        { id: 'doc-2', type: 'CUSTODY_RECEIPT', status: 'VERIFIED' },
      ]);

      const res3 = await courierService.updateCourierDocumentStatus(
        companyId,
        courierId,
        'doc-1',
        { status: 'VERIFIED' },
        'user-admin'
      );
      expect(res3.documentsStatus).toBe('VERIFIED');
      expect(mockPrisma.courier.update).toHaveBeenLastCalledWith(
        expect.objectContaining({
          where: { id: courierId },
          data: { documentsStatus: 'VERIFIED' },
        })
      );
    });
  });

  describe('2) Assignment Policy Guard (Unverified Couriers)', () => {
    test('Rule 2A: Unverified courier rejected when allowUnverifiedCouriers=false (default)', async () => {
      mockPrisma.courier.findFirst.mockResolvedValue({
        id: courierId,
        companyId,
        name: 'أحمد سعيد',
        documentsStatus: 'INCOMPLETE',
      });
      mockPrisma.installedApp.findFirst.mockResolvedValue({
        settings: { general: { allowUnverifiedCouriers: false } },
      });

      await expect(
        courierService.createDeliveryRun(companyId, {
          courierId,
          shipmentIds: ['shipment-1'],
        })
      ).rejects.toThrow(/لا يمكن إسناد مأمورية/);
    });

    test('Rule 2B: Unverified courier allowed when allowUnverifiedCouriers=true', async () => {
      mockPrisma.courier.findFirst.mockResolvedValue({
        id: courierId,
        companyId,
        name: 'أحمد سعيد',
        documentsStatus: 'INCOMPLETE',
      });
      mockPrisma.installedApp.findFirst.mockResolvedValue({
        settings: { general: { allowUnverifiedCouriers: true } },
      });
      mockPrisma.deliveryRun.count.mockResolvedValue(0);
      mockPrisma.deliveryRun.create.mockResolvedValue({
        id: 'run-w15-1',
        runNumber: 'RUN-20261104-001',
        courierId,
      });
      mockPrisma.shipment.findMany.mockResolvedValue([
        { id: 'shipment-1', status: 'READY_FOR_SHIPPING', cost: 50, codAmount: 200 },
      ]);
      mockPrisma.shipment.updateMany.mockResolvedValue({ count: 1 });

      const run = await courierService.createDeliveryRun(companyId, {
        courierId,
        shipmentIds: ['shipment-1'],
        allowUnverifiedCouriers: true,
      });
      expect(run).toBeDefined();
      expect(run.id).toBe('run-w15-1');
    });
  });

  describe('3) Compensation Calculation Formulas', () => {
    test('Rule 3: Base salary 4000 + bonus 6 EGP per order after 30 orders threshold', () => {
      // 25 orders -> bonus 0, net 4000
      const calc25 = courierPayrollService.computeCompensation({
        deliveredCount: 25,
        compensationModel: 'SALARY_PLUS_BONUS',
        salaryBase: 4000,
        bonusPerOrder: 6,
        bonusStartsAfterOrders: 30,
      });
      expect(calc25.bonus).toBe(0);
      expect(calc25.netPayable).toBe(4000);

      // 40 orders -> (40 - 30) * 6 = 60, net 4060
      const calc40 = courierPayrollService.computeCompensation({
        deliveredCount: 40,
        compensationModel: 'SALARY_PLUS_BONUS',
        salaryBase: 4000,
        bonusPerOrder: 6,
        bonusStartsAfterOrders: 30,
      });
      expect(calc40.bonus).toBe(60);
      expect(calc40.netPayable).toBe(4060);
    });

    test('Rule 4: Tiered bonus: 1-50 @ 6 EGP, 51+ @ 8 EGP for 55 orders = 340 EGP', () => {
      const tiers = [
        { from: 1, to: 50, amount: 6 },
        { from: 51, to: null, amount: 8 },
      ];
      const calc55 = courierPayrollService.computeCompensation({
        deliveredCount: 55,
        compensationModel: 'SALARY_PLUS_BONUS',
        salaryBase: 0,
        bonusTiers: tiers,
      });
      // 50 * 6 = 300, 5 * 8 = 40 => Total bonus = 340
      expect(calc55.bonus).toBe(340);
      expect(calc55.netPayable).toBe(340);
    });
  });

  describe('5) Monthly Payroll Workflow & Payout', () => {
    test('Rule 5: Run monthly payroll DRAFT -> APPROVE -> PAY with treasury movement and duplicate 409 guard', async () => {
      const month = '2026-11';

      mockPrisma.courier.findMany.mockResolvedValue([
        {
          id: courierId,
          companyId,
          name: 'كابتن طارق',
          isActive: true,
          compensationModel: 'SALARY_PLUS_BONUS',
          salaryBase: 4000,
          bonusPerOrder: 6,
          bonusStartsAfterOrders: 30,
        },
      ]);
      mockPrisma.courier.findFirst.mockResolvedValue({
        id: courierId,
        companyId,
        name: 'كابتن طارق',
        compensationModel: 'SALARY_PLUS_BONUS',
        salaryBase: 4000,
        bonusPerOrder: 6,
        bonusStartsAfterOrders: 30,
      });
      mockPrisma.shipment.count.mockResolvedValue(40);
      mockPrisma.courierCommission.findMany.mockResolvedValue([]);
      mockPrisma.courierPayroll.findFirst.mockResolvedValue(null);
      mockPrisma.courierPayroll.create.mockImplementation(({ data }) => ({
        id: 'payroll-w15-1',
        ...data,
        courier: { id: courierId, name: 'كابتن طارق', phone: '01000000000', documentsStatus: 'VERIFIED' },
      }));

      // Step A: Run payroll -> creates DRAFT with netPayable = 4060
      const runResult = await courierPayrollService.runMonthlyPayroll(companyId, month, 'user-admin');
      expect(runResult.payrolls).toHaveLength(1);
      expect(runResult.payrolls[0].netPayable).toBe(4060);
      expect(runResult.payrolls[0].status).toBe('DRAFT');

      // Step B: Approve payroll
      mockPrisma.courierPayroll.findFirst.mockResolvedValue({
        id: 'payroll-w15-1',
        companyId,
        status: 'DRAFT',
        netPayable: 4060,
        month,
        courier: { id: courierId, name: 'كابتن طارق' },
      });
      mockPrisma.courierPayroll.update.mockResolvedValue({
        id: 'payroll-w15-1',
        status: 'APPROVED',
        approvedBy: 'user-admin',
      });

      const approved = await courierPayrollService.approvePayroll(companyId, 'payroll-w15-1', 'user-admin');
      expect(approved.status).toBe('APPROVED');

      // Step C: Pay payroll from treasury
      mockPrisma.courierPayroll.findFirst.mockResolvedValue({
        id: 'payroll-w15-1',
        companyId,
        status: 'APPROVED',
        netPayable: 4060,
        month,
        courier: { id: courierId, name: 'كابتن طارق' },
      });
      mockPrisma.treasuryAccount.findFirst.mockResolvedValue({
        id: 'treasury-main',
        companyId,
        balance: 10000,
        isActive: true,
      });
      mockPrisma.treasuryAccount.update.mockResolvedValue({
        id: 'treasury-main',
        balance: 5940,
      });
      mockPrisma.treasuryTransaction.create.mockResolvedValue({
        id: 'tx-w15-1',
      });
      mockPrisma.courierPayroll.update.mockResolvedValue({
        id: 'payroll-w15-1',
        status: 'PAID',
        paidBy: 'user-admin',
        treasuryTransactionId: 'tx-w15-1',
      });

      const paid = await courierPayrollService.payPayroll(
        companyId,
        'payroll-w15-1',
        { treasuryAccountId: 'treasury-main', notes: 'صرف راتب كاش' },
        'user-admin'
      );
      expect(paid.status).toBe('PAID');
      expect(mockPrisma.treasuryAccount.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'treasury-main' },
          data: { balance: 5940 }, // 10000 - 4060
        })
      );
      expect(mockPrisma.treasuryTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            amount: -4060,
            type: 'EXPENSE',
            runningBalance: 5940,
          }),
        })
      );

      // Step D: Duplicate payout prevention (409)
      mockPrisma.courierPayroll.findFirst.mockResolvedValue({
        id: 'payroll-w15-1',
        companyId,
        status: 'PAID',
        month,
      });
      await expect(
        courierPayrollService.payPayroll(companyId, 'payroll-w15-1', {}, 'user-admin')
      ).rejects.toThrow(/شهر واحد لا يُصرف مرتين/);
    });
  });
});
