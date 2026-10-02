const mockPrisma = {
  callAttemptLog: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn()
  },
  order: {
    findFirst: jest.fn(),
    update: jest.fn()
  },
  employeeDevice: {
    findFirst: jest.fn(),
    upsert: jest.fn()
  }
};

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(() => mockPrisma)
}));

jest.mock('../../services/socketService', () => ({
  io: {
    to: jest.fn().mockReturnThis(),
    emit: jest.fn()
  }
}));

const telephonyService = require('../../services/telephonyService');

describe('TelephonyService - Production Grade Unit Tests', () => {
  const companyId = 'test_comp_telephony_1';
  const userId = 'test_user_telephony_1';
  const deviceId = 'test_device_uuid_123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Outbound Phone Normalization (E.164 & Egyptian Formats)', () => {
    test('normalizes standard 11-digit Egyptian mobile starting with 01', async () => {
      mockPrisma.callAttemptLog.findFirst.mockResolvedValue(null);
      mockPrisma.order.findFirst.mockResolvedValue({
        id: 'ord_1',
        orderNumber: '1001',
        customerName: 'أحمد محمود',
        customerPhone: '01012345678',
        companyId
      });
      mockPrisma.employeeDevice.findFirst.mockResolvedValue({
        id: 'dev_1',
        deviceId,
        deviceName: 'Samsung A15',
        lastSeenAt: new Date(),
        isOnline: true
      });
      mockPrisma.callAttemptLog.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: 'log_1', ...data })
      );

      const result = await telephonyService.initiateCall({
        companyId,
        userId,
        orderId: 'ord_1'
      });

      expect(result.success).toBe(true);
      expect(result.customerPhone).toBe('+201012345678');
      expect(result.sessionId).toMatch(/^call_\d+_/);
    });

    test('rejects non-Egyptian or invalid phone format to prevent toll fraud', async () => {
      mockPrisma.callAttemptLog.findFirst.mockResolvedValue(null);
      mockPrisma.order.findFirst.mockResolvedValue({
        id: 'ord_fraud',
        orderNumber: '9999',
        customerName: 'مجهول',
        customerPhone: '01912345678', // Invalid Egyptian carrier (019)
        companyId
      });
      mockPrisma.employeeDevice.findFirst.mockResolvedValue({
        id: 'dev_1',
        deviceId,
        deviceName: 'Samsung A15',
        lastSeenAt: new Date(),
        isOnline: true
      });

      await expect(
        telephonyService.initiateCall({
          companyId,
          userId,
          orderId: 'ord_fraud'
        })
      ).rejects.toThrow('رقم الهاتف ليس رقماً مصرياً صالحاً');
    });
  });

  describe('Tenant Isolation & Rate Limiting Enforcement', () => {
    test('strictly enforces Tenant Isolation - cannot call orders of another company', async () => {
      mockPrisma.callAttemptLog.findFirst.mockResolvedValue(null);
      // Order belongs to other company, so finding with companyId returns null
      mockPrisma.order.findFirst.mockResolvedValue(null);

      await expect(
        telephonyService.initiateCall({
          companyId,
          userId,
          orderId: 'foreign_order_123'
        })
      ).rejects.toThrow('الطلب غير موجود أو غير تابع لشركتك');
    });

    test('enforces 20-second rate limit between calls for the same user', async () => {
      // Mock an attempt from 5 seconds ago
      mockPrisma.callAttemptLog.findFirst.mockResolvedValue({
        id: 'log_recent',
        companyId,
        userId,
        createdAt: new Date(Date.now() - 5000)
      });

      await expect(
        telephonyService.initiateCall({
          companyId,
          userId,
          orderId: 'ord_1'
        })
      ).rejects.toThrow('يرجى الانتظار 20 ثانية');
    });

    test('blocks outbound call when employee device is offline (Presence Guard)', async () => {
      mockPrisma.callAttemptLog.findFirst.mockResolvedValue(null);
      mockPrisma.order.findFirst.mockResolvedValue({
        id: 'ord_1',
        orderNumber: '1001',
        customerName: 'أحمد',
        customerPhone: '01123456789',
        companyId
      });
      mockPrisma.employeeDevice.findFirst.mockResolvedValue(null);

      await expect(
        telephonyService.initiateCall({
          companyId,
          userId,
          orderId: 'ord_1'
        })
      ).rejects.toThrow('لا يوجد هاتف أندرويد متصل حالياً لحسابك');
    });
  });

  describe('Call Completion & TelephonyManager Official Duration', () => {
    test('updates CallAttemptLog with official duration and increments order attempts', async () => {
      const sessionId = 'call_test_123';

      mockPrisma.callAttemptLog.findUnique.mockResolvedValue({
        id: 'log_1',
        sessionId,
        orderId: 'ord_1',
        companyId,
        callerPhone: null
      });
      mockPrisma.callAttemptLog.update.mockImplementation(({ data }) =>
        Promise.resolve({ id: 'log_1', sessionId, ...data })
      );
      mockPrisma.order.update.mockResolvedValue({ id: 'ord_1' });

      const updated = await telephonyService.completeCall({
        companyId,
        userId,
        sessionId,
        durationSeconds: 85,
        callStatus: 'COMPLETED',
        callerPhone: '01099998888',
        result: 'reached'
      });

      expect(updated.durationSeconds).toBe(85);
      expect(updated.callStatus).toBe('COMPLETED');
      expect(updated.result).toBe('reached');
      expect(mockPrisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'ord_1' },
          data: expect.objectContaining({
            callAttempts: { increment: 1 }
          })
        })
      );
    });

    test('sets isOnline to false when socketConnected is false in heartbeat', async () => {
      mockPrisma.employeeDevice.upsert.mockImplementation(({ update, create }) =>
        Promise.resolve({ id: 'dev_1', ...update })
      );

      const device = await telephonyService.registerOrHeartbeatDevice({
        companyId,
        userId,
        deviceId,
        socketConnected: false
      });

      expect(device.isOnline).toBe(false);
      expect(mockPrisma.employeeDevice.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { deviceId },
          update: expect.objectContaining({
            isOnline: false
          })
        })
      );
    });

    test('completeCall leaves callerPhone null when callerPhone is not provided', async () => {
      const sessionId = 'call_test_null_caller';

      mockPrisma.callAttemptLog.findUnique.mockResolvedValue({
        id: 'log_2',
        sessionId,
        orderId: 'ord_2',
        companyId,
        callerPhone: null
      });
      mockPrisma.callAttemptLog.update.mockImplementation(({ data }) =>
        Promise.resolve({ id: 'log_2', sessionId, ...data })
      );
      mockPrisma.order.update.mockResolvedValue({ id: 'ord_2' });

      const updated = await telephonyService.completeCall({
        companyId,
        userId,
        sessionId,
        durationSeconds: 30,
        callStatus: 'COMPLETED'
        // callerPhone intentionally omitted
      });

      expect(updated.callerPhone).toBeNull();
      expect(mockPrisma.callAttemptLog.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { sessionId },
          data: expect.objectContaining({
            callerPhone: null
          })
        })
      );
    });
  });
});
