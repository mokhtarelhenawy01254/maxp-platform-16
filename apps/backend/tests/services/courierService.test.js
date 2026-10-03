const courierService = require('../../services/courierService');
const { getSharedPrismaClient } = require('../../services/sharedDatabase');

jest.mock('../../services/sharedDatabase', () => {
  const mPrisma = {
    deliveryRun: {
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
    },
    treasuryAccount: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    treasuryTransaction: {
      create: jest.fn(),
    },
    shipment: {
      updateMany: jest.fn(),
    },
    courier: {
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    companyApp: {
      findFirst: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(mPrisma)),
  };

  return {
    getSharedPrismaClient: jest.fn(() => mPrisma),
  };
});

describe('Courier Service Module Unit Tests', () => {
  const prisma = getSharedPrismaClient();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('1. should export all essential courier management functions', () => {
    expect(typeof courierService.listCouriers).toBe('function');
    expect(typeof courierService.getCourierById).toBe('function');
    expect(typeof courierService.createCourier).toBe('function');
    expect(typeof courierService.updateCourier).toBe('function');
    expect(typeof courierService.deleteCourier).toBe('function');
    expect(typeof courierService.createDeliveryRun).toBe('function');
    expect(typeof courierService.listDeliveryRuns).toBe('function');
    expect(typeof courierService.getDeliveryRunById).toBe('function');
    expect(typeof courierService.updateDeliveryRunShipment).toBe('function');
    expect(typeof courierService.settleDeliveryRun).toBe('function');
    expect(typeof courierService.getCourierDashboardSummary).toBe('function');
  });

  describe('settleDeliveryRun financial remittance flow', () => {
    const companyId = 'comp-100';
    const runId = 'run-abc';

    it('2. throws error if delivery run does not exist', async () => {
      prisma.deliveryRun.findFirst.mockResolvedValueOnce(null);

      await expect(
        courierService.settleDeliveryRun(companyId, runId, { actualCashReceived: 500 })
      ).rejects.toThrow('رحلة التوصيل غير موجودة');
    });

    it('3. throws error if delivery run is already SETTLED', async () => {
      prisma.deliveryRun.findFirst.mockResolvedValueOnce({
        id: runId,
        companyId,
        status: 'SETTLED',
      });

      await expect(
        courierService.settleDeliveryRun(companyId, runId, { actualCashReceived: 500 })
      ).rejects.toThrow('تمت تسوية هذه الوردية وتوريدها بالفعل سابقاً');
    });

    it('4. deposits cash into TreasuryAccount, records audit log, and marks run and shipments SETTLED', async () => {
      const mockRun = {
        id: runId,
        companyId,
        runNumber: 'RUN-20260924-001',
        courierId: 'courier-1',
        status: 'DISPATCHED',
        courier: { id: 'courier-1', name: 'أحمد مندوب' },
        shipments: [
          { id: 'ship-1', status: 'DELIVERED' },
          { id: 'ship-2', status: 'RETURNED' },
        ],
      };

      prisma.deliveryRun.findFirst.mockResolvedValueOnce(mockRun);
      // Atomic settle claim: the run is still DISPATCHED, so exactly one claim wins
      prisma.deliveryRun.updateMany.mockResolvedValueOnce({ count: 1 });
      prisma.treasuryAccount.findFirst.mockResolvedValueOnce({
        id: 'acc-treasury-cairo',
        companyId,
        balance: 1000,
      });
      prisma.treasuryAccount.update.mockResolvedValueOnce({
        id: 'acc-treasury-cairo',
        balance: 1500,
      });
      prisma.treasuryTransaction.create.mockResolvedValueOnce({
        id: 'tx-remit-1',
        amount: 500,
        type: 'DEPOSIT',
        referenceType: 'COURIER_REMITTANCE',
      });
      prisma.deliveryRun.update.mockResolvedValueOnce({
        ...mockRun,
        status: 'SETTLED',
        totalCODCollected: 500,
      });
      prisma.deliveryRun.count.mockResolvedValueOnce(0); // No other active runs
      prisma.courier.update.mockResolvedValueOnce({ id: 'courier-1', status: 'AVAILABLE' });

      const result = await courierService.settleDeliveryRun(companyId, runId, {
        treasuryAccountId: 'acc-treasury-cairo',
        actualCashReceived: 500,
        notes: 'تسوية كاملة',
        userId: 'admin-1',
      });

      // Verify treasury balance was updated (1000 + 500 = 1500)
      expect(prisma.treasuryAccount.update).toHaveBeenCalledWith({
        where: { id: 'acc-treasury-cairo' },
        data: { balance: 1500 },
      });

      // Verify TreasuryTransaction was created
      expect(prisma.treasuryTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            companyId,
            treasuryAccountId: 'acc-treasury-cairo',
            amount: 500,
            type: 'DEPOSIT',
            runningBalance: 1500,
            referenceType: 'COURIER_REMITTANCE',
            referenceId: runId,
          }),
        })
      );

      // Verify delivered shipments were marked SETTLED
      expect(prisma.shipment.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['ship-1'] } },
        data: expect.objectContaining({
          settlementStatus: 'SETTLED',
        }),
      });

      // Verify courier returned to AVAILABLE
      expect(prisma.courier.update).toHaveBeenCalledWith({
        where: { id: 'courier-1' },
        data: { status: 'AVAILABLE' },
      });

      expect(result.run.status).toBe('SETTLED');
    });
  });
});
