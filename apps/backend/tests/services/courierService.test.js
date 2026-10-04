const courierService = require('../../services/courierService');
const { getSharedPrismaClient } = require('../../services/sharedDatabase');
const bcrypt = require('bcryptjs');

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

jest.mock('../../services/sharedDatabase', () => {
  const mPrisma = {
    deliveryRun: {
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
    },
    treasuryAccount: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    treasuryTransaction: {
      create: jest.fn(),
    },
    shipment: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
      aggregate: jest.fn(),
    },
    courier: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
    },
    companyApp: {
      findFirst: jest.fn(),
    },
    order: {
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    orderStatusHistory: {
      create: jest.fn(),
    },
    courierCommission: {
      findMany: jest.fn(),
      groupBy: jest.fn(),
      count: jest.fn(),
      updateMany: jest.fn(),
      createMany: jest.fn(),
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

      // Verify treasury balance moved ATOMICALLY (increment, not read-then-write —
      // two runs settling concurrently on one account must not clobber each other)
      expect(prisma.treasuryAccount.update).toHaveBeenCalledWith({
        where: { id: 'acc-treasury-cairo' },
        data: { balance: { increment: 500 } },
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

  describe('createDeliveryRun dispatch flow', () => {
    const companyId = 'comp-dispatch';

    it('5. creates a run, generates per-parcel OTPs, and fires the dispatch notification with them', async () => {
      const { notifyRunDispatched } = require('../../services/courierNotificationService');

      prisma.courier.findFirst.mockResolvedValueOnce({
        id: 'courier-9',
        companyId,
        name: 'كابتن تجريبي',
        commissionType: 'FIXED_PER_ORDER',
        commissionAmount: 35
      });
      prisma.shipment.findMany.mockResolvedValueOnce([
        {
          id: 'ship-9',
          orderId: 'order-9',
          settlementStatus: 'PENDING',
          status: 'READY_FOR_SHIPPING',
          order: {
            id: 'order-9',
            total: 750,
            status: 'READY_TO_SHIP',
            orderNumber: 'ORD-DISP-1',
            customerName: 'عميل التجربة',
            customerPhone: '01234567890'
          }
        }
      ]);
      prisma.companyApp.findFirst.mockResolvedValueOnce(undefined);
      prisma.deliveryRun.count.mockResolvedValueOnce(0);
      prisma.deliveryRun.create.mockResolvedValueOnce({
        id: 'run-9',
        companyId,
        runNumber: 'RUN-20261003-001',
        status: 'DISPATCHED'
      });
      prisma.shipment.updateMany.mockResolvedValueOnce({ count: 1 });
      prisma.shipment.update.mockResolvedValueOnce({});
      prisma.order.updateMany.mockResolvedValueOnce({ count: 1 });
      prisma.courier.update.mockResolvedValueOnce({});

      const run = await courierService.createDeliveryRun(companyId, {
        courierId: 'courier-9',
        shipmentIds: ['ship-9'],
        notes: 'مأمورية تجريبية'
      });

      expect(run.runNumber).toBe('RUN-20261003-001');

      // OTP was generated and hashed onto the parcel (customer has a phone)
      expect(prisma.shipment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'ship-9' },
          data: expect.objectContaining({
            otpHash: expect.any(String),
            otpExpiresAt: expect.any(Date)
          })
        })
      );

      // The dispatch notification fired AFTER the transaction with the OTP map —
      // this catches the out-of-scope otpByShipment ReferenceError caught live on prod
      expect(notifyRunDispatched).toHaveBeenCalledTimes(1);
      const arg = notifyRunDispatched.mock.calls[0][1];
      expect(arg.shipments[0].id).toBe('ship-9');
      expect(arg.otpByShipment.get('ship-9')).toMatch(/^\d{4}$/);
    });

    it('6. refuses to dispatch parcels that are already settled or delivered', async () => {
      prisma.courier.findFirst.mockResolvedValueOnce({ id: 'courier-9', companyId, name: 'كابتن' });
      prisma.shipment.findMany.mockResolvedValueOnce([
        { id: 'ship-settled', settlementStatus: 'SETTLED', status: 'DELIVERED', order: { id: 'o1', total: 100 } }
      ]);

      await expect(
        courierService.createDeliveryRun(companyId, { courierId: 'courier-9', shipmentIds: ['ship-settled'] })
      ).rejects.toThrow('لا يمكن إسناد شحنات مسوّاة ماليًا أو منتهية لرحلة جديدة');
    });
  });

  describe('delivery OTP brute-force guard', () => {
    const companyId = 'comp-otp';

    const otpShipment = (attempts) => ({
      id: 'ship-otp',
      companyId,
      status: 'OUT_FOR_DELIVERY',
      settlementStatus: 'PENDING',
      collectedAmount: 0,
      deliveryRunId: 'run-otp',
      otpHash: bcrypt.hashSync('1234', 10),
      otpExpiresAt: new Date(Date.now() + 86400000),
      otpAttempts: attempts,
      deliveryRun: { id: 'run-otp', status: 'DISPATCHED' },
      courier: { id: 'courier-1', pinHash: null, name: 'كابتن', phone: '010' },
      order: { id: 'o1', status: 'OUT_FOR_DELIVERY', total: 500 }
    });

    const enableOtp = () => prisma.companyApp.findFirst.mockResolvedValue({
      settings: { fieldWorkflow: { requireDeliveryOtp: true } }
    });

    beforeEach(() => {
      enableOtp();
    });

    it('7. counts a wrong code as an attempt and tells the courier how many are left', async () => {
      prisma.shipment.findFirst.mockResolvedValueOnce(otpShipment(0));
      prisma.shipment.update.mockResolvedValueOnce({});

      await expect(
        courierService.updateDeliveryRunShipment(companyId, {
          shipmentId: 'ship-otp', runId: 'run-otp', status: 'DELIVERED', otp: '9999', collectedAmount: 500
        })
      ).rejects.toThrow('باقي 4 محاولة');

      expect(prisma.shipment.update).toHaveBeenCalledWith({
        where: { id: 'ship-otp' },
        data: { otpAttempts: { increment: 1 } },
      });
    });

    it('8. locks the parcel after 5 wrong attempts until a manager resends', async () => {
      prisma.shipment.findFirst.mockResolvedValueOnce(otpShipment(5));

      await expect(
        courierService.updateDeliveryRunShipment(companyId, {
          shipmentId: 'ship-otp', runId: 'run-otp', status: 'DELIVERED', otp: '1234', collectedAmount: 500
        })
      ).rejects.toThrow('تم تجاوز عدد المحاولات المسموح بها');
    });

    it('9. accepts the correct code and resets the attempt counter', async () => {
      prisma.shipment.findFirst.mockResolvedValueOnce(otpShipment(3));
      prisma.shipment.update.mockResolvedValueOnce({ id: 'ship-otp', status: 'DELIVERED' });
      prisma.order.update.mockResolvedValueOnce({});
      prisma.orderStatusHistory.create.mockResolvedValueOnce({});
      prisma.shipment.count.mockResolvedValueOnce(0);
      prisma.deliveryRun.update.mockResolvedValueOnce({});

      const result = await courierService.updateDeliveryRunShipment(companyId, {
        shipmentId: 'ship-otp', runId: 'run-otp', status: 'DELIVERED', otp: '1234', collectedAmount: 500
      });

      expect(result.status).toBe('DELIVERED');
      expect(prisma.shipment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'ship-otp' },
          data: expect.objectContaining({ status: 'DELIVERED', otpAttempts: 0 }),
        })
      );
    });
  });

  describe('resendShipmentOtp (manager escape hatch)', () => {
    const companyId = 'comp-resend';

    it('10. regenerates the code, resets attempts, and reports the real send result', async () => {
      const { sendCourierNotification } = require('../../services/courierNotificationService');

      prisma.shipment.findFirst.mockResolvedValueOnce({
        id: 'ship-r',
        companyId,
        status: 'DELAYED',
        settlementStatus: 'PENDING',
        deliveryRun: { id: 'run-r', status: 'DISPATCHED', runNumber: 'RUN-R-1' },
        order: { id: 'o-r', orderNumber: 'ORD-R', customerName: 'عميل', customerPhone: '01234567890', total: 400 },
        courier: { id: 'c-r', name: 'كابتن', phone: '010' }
      });
      prisma.shipment.update.mockResolvedValueOnce({});

      const result = await courierService.resendShipmentOtp(companyId, { shipmentId: 'ship-r', userId: 'admin-1' });

      expect(result.sent).toBe(true);
      expect(prisma.shipment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'ship-r' },
          data: expect.objectContaining({ otpHash: expect.any(String), otpAttempts: 0, otpExpiresAt: expect.any(Date) }),
        })
      );
      expect(sendCourierNotification).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'courier_out_for_delivery', companyId })
      );
    });

    it('11. refuses resending for already-settled parcels', async () => {
      prisma.shipment.findFirst.mockResolvedValueOnce({
        id: 'ship-s',
        companyId,
        status: 'DELIVERED',
        settlementStatus: 'SETTLED',
        deliveryRun: { id: 'run-s', status: 'SETTLED', runNumber: 'RUN-S-1' },
        order: { id: 'o-s', customerPhone: '01234567890', total: 100 },
        courier: { id: 'c-s', name: 'كابتن', phone: '010' }
      });

      await expect(
        courierService.resendShipmentOtp(companyId, { shipmentId: 'ship-s' })
      ).rejects.toThrow('لا يمكن إعادة إرسال كود لشحنة بعد تسويتها ماليًا');
    });
  });

  describe('payCourierCommissions payout flow', () => {
    const companyId = 'comp-pay';

    it('12. pays DUE commissions with an atomic treasury decrement and marks them PAID', async () => {
      prisma.courier.findFirst.mockResolvedValueOnce({ id: 'courier-p', companyId, name: 'كابتن العمولة' });
      prisma.courierCommission.findMany.mockResolvedValueOnce([
        { id: 'cc1', amount: 30 },
        { id: 'cc2', amount: 30 },
      ]);
      prisma.treasuryAccount.findFirst.mockResolvedValueOnce({ id: 'acc-p', companyId, balance: 1000 });
      prisma.treasuryAccount.update.mockResolvedValueOnce({ id: 'acc-p', balance: 940 });
      prisma.treasuryTransaction.create.mockResolvedValueOnce({ id: 'tx-p' });
      prisma.courierCommission.updateMany.mockResolvedValueOnce({ count: 2 });

      const result = await courierService.payCourierCommissions(companyId, 'courier-p', {
        treasuryAccountId: 'acc-p',
        userId: 'admin-1'
      });

      expect(result.total).toBe(60);
      expect(result.paidCount).toBe(2);
      expect(prisma.treasuryAccount.update).toHaveBeenCalledWith({
        where: { id: 'acc-p' },
        data: { balance: { decrement: 60 } },
      });
      expect(prisma.treasuryTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ type: 'WITHDRAWAL', runningBalance: 940, amount: 60 }),
        })
      );
      expect(prisma.courierCommission.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'DUE' }),
          data: expect.objectContaining({ status: 'PAID' }),
        })
      );
    });

    it('13. refuses payout when nothing is due', async () => {
      prisma.courier.findFirst.mockResolvedValueOnce({ id: 'courier-p', companyId, name: 'كابتن' });
      prisma.courierCommission.findMany.mockResolvedValueOnce([]);

      await expect(
        courierService.payCourierCommissions(companyId, 'courier-p', {})
      ).rejects.toThrow('لا توجد مستحقات غير مدفوعة لهذا المندوب');
    });
  });
});
