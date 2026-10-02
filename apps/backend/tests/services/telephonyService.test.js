const telephonyService = require('../../services/telephonyService');
const { getSharedPrismaClient } = require('../../services/sharedDatabase');

describe('TelephonyService - Production Grade Unit Tests', () => {
  const companyId = 'test_comp_telephony_1';
  const otherCompanyId = 'test_comp_telephony_2';
  const userId = 'test_user_telephony_1';
  const deviceId = 'test_device_uuid_123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Outbound Phone Normalization (E.164 & Egyptian Formats)', () => {
    test('normalizes standard 11-digit Egyptian mobile starting with 01', async () => {
      // Mock prisma calls
      const prisma = getSharedPrismaClient();
      jest.spyOn(prisma.callAttemptLog, 'findFirst').mockResolvedValue(null);
      jest.spyOn(prisma.order, 'findFirst').mockResolvedValue({
        id: 'ord_1',
        orderNumber: '1001',
        customerName: 'أحمد محمود',
        customerPhone: '01012345678',
        companyId
      });
      jest.spyOn(telephonyService, 'getDevicePresence').mockResolvedValue({
        isOnline: true,
        device: { id: 'dev_1', deviceId, deviceName: 'Samsung A15' }
      });
      jest.spyOn(prisma.callAttemptLog, 'create').mockImplementation(({ data }) =>
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
      const prisma = getSharedPrismaClient();
      jest.spyOn(prisma.callAttemptLog, 'findFirst').mockResolvedValue(null);
      jest.spyOn(prisma.order, 'findFirst').mockResolvedValue({
        id: 'ord_fraud',
        orderNumber: '9999',
        customerName: 'مجهول',
        customerPhone: '0900123456', // Premium rate / invalid
        companyId
      });
      jest.spyOn(telephonyService, 'getDevicePresence').mockResolvedValue({
        isOnline: true,
        device: { id: 'dev_1', deviceId, deviceName: 'Samsung A15' }
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
      const prisma = getSharedPrismaClient();
      jest.spyOn(prisma.callAttemptLog, 'findFirst').mockResolvedValue(null);
      // Order belongs to other company, so finding with companyId returns null
      jest.spyOn(prisma.order, 'findFirst').mockResolvedValue(null);

      await expect(
        telephonyService.initiateCall({
          companyId,
          userId,
          orderId: 'foreign_order_123'
        })
      ).rejects.toThrow('الطلب غير موجود أو غير تابع لشركتك');
    });

    test('enforces 20-second rate limit between calls for the same user', async () => {
      const prisma = getSharedPrismaClient();
      // Mock an attempt from 5 seconds ago
      jest.spyOn(prisma.callAttemptLog, 'findFirst').mockResolvedValue({
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
      const prisma = getSharedPrismaClient();
      jest.spyOn(prisma.callAttemptLog, 'findFirst').mockResolvedValue(null);
      jest.spyOn(prisma.order, 'findFirst').mockResolvedValue({
        id: 'ord_1',
        orderNumber: '1001',
        customerName: 'أحمد',
        customerPhone: '01123456789',
        companyId
      });
      jest.spyOn(telephonyService, 'getDevicePresence').mockResolvedValue({
        isOnline: false,
        device: null
      });

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
      const prisma = getSharedPrismaClient();
      const sessionId = 'call_test_123';

      jest.spyOn(prisma.callAttemptLog, 'findUnique').mockResolvedValue({
        id: 'log_1',
        sessionId,
        orderId: 'ord_1',
        companyId,
        callerPhone: null
      });
      jest.spyOn(prisma.callAttemptLog, 'update').mockImplementation(({ data }) =>
        Promise.resolve({ id: 'log_1', sessionId, ...data })
      );
      jest.spyOn(prisma.order, 'update').mockResolvedValue({ id: 'ord_1' });

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
      expect(prisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'ord_1' },
          data: expect.objectContaining({
            callAttempts: { increment: 1 }
          })
        })
      );
    });
  });
});
