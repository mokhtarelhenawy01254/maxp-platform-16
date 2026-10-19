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
    findUnique: jest.fn(),
    upsert: jest.fn(),
    update: jest.fn()
  },
  guestOrder: {
    findFirst: jest.fn(),
    update: jest.fn()
  },
  guestCart: {
    findFirst: jest.fn()
  },
  cartContactLog: {
    create: jest.fn()
  }
};

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(() => mockPrisma)
}));

jest.mock('../../services/socketService', () => ({
  io: {
    to: jest.fn().mockReturnThis(),
    emit: jest.fn()
  },
  sockets: { sockets: new Map() },
  isSocketConnected: jest.fn()
}));

const telephonyService = require('../../services/telephonyService');
const socketService = require('../../services/socketService');

describe('TelephonyService - Production Grade Unit Tests', () => {
  const companyId = 'test_comp_telephony_1';
  const userId = 'test_user_telephony_1';
  const deviceId = 'test_device_uuid_123';

  beforeEach(() => {
    jest.clearAllMocks();
    // الافتراضي: سوكت حي — اختبارات الزومبي تقلبه صراحة إلى false
    socketService.isSocketConnected.mockReturnValue(true);
  });

  describe('Presence Honesty (zombie device guard)', () => {
    const zombieDevice = {
      id: 'dev_zombie',
      deviceId,
      deviceName: 'Dead Phone',
      socketId: 'sock_dead_1',
      isOnline: true,
      lastSeenAt: new Date(), // ظهور طازج: التطبيق أُغلق للتو والعلم لم يُظبط
      appVersion: '1.0'
    };

    test('reports offline and self-heals the stale flag when the device socket is dead', async () => {
      mockPrisma.employeeDevice.findFirst.mockResolvedValue(zombieDevice);
      mockPrisma.employeeDevice.update.mockResolvedValue({});
      socketService.isSocketConnected.mockReturnValue(false);

      const presence = await telephonyService.getDevicePresence(companyId, userId);

      expect(presence.isOnline).toBe(false);
      expect(presence.device).toBeNull();
      expect(mockPrisma.employeeDevice.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'dev_zombie' }, data: { isOnline: false } })
      );
    });

    test('reports online when the device socket is verified alive', async () => {
      mockPrisma.employeeDevice.findFirst.mockResolvedValue(zombieDevice);
      socketService.isSocketConnected.mockReturnValue(true);

      const presence = await telephonyService.getDevicePresence(companyId, userId);

      expect(presence.isOnline).toBe(true);
      expect(presence.device?.deviceId).toBe(deviceId);
      expect(mockPrisma.employeeDevice.update).not.toHaveBeenCalled();
    });

    test('initiateCall refuses to open a session for a zombie device (no dead-air call)', async () => {
      mockPrisma.callAttemptLog.findFirst.mockResolvedValue(null);
      mockPrisma.order.findFirst.mockResolvedValue({
        id: 'ord_1',
        orderNumber: '1001',
        customerName: 'أحمد',
        customerPhone: '01012345678',
        companyId
      });
      mockPrisma.employeeDevice.findFirst.mockResolvedValue(zombieDevice);
      mockPrisma.employeeDevice.update.mockResolvedValue({});
      socketService.isSocketConnected.mockReturnValue(false);

      await expect(
        telephonyService.initiateCall({ companyId, userId, orderId: 'ord_1' })
      ).rejects.toThrow('لا يوجد هاتف أندرويد متصل حالياً');
      // لا جلسة تُفتح أصلًا — فلا عدّاد محاولات يُستهلك ولا زر يعلق
      expect(mockPrisma.callAttemptLog.create).not.toHaveBeenCalled();
    });
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
      mockPrisma.employeeDevice.findUnique.mockResolvedValue(null);
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

    test('rejects heartbeat claiming a device registered to another employee', async () => {
      mockPrisma.employeeDevice.findUnique.mockResolvedValue({
        id: 'dev_hijack',
        deviceId,
        companyId: 'other_company',
        userId: 'other_user'
      });

      await expect(
        telephonyService.registerOrHeartbeatDevice({ companyId, userId, deviceId })
      ).rejects.toMatchObject({ statusCode: 403 });
      expect(mockPrisma.employeeDevice.upsert).not.toHaveBeenCalled();
    });

    test('allows the same employee to re-heartbeat their own device', async () => {
      mockPrisma.employeeDevice.findUnique.mockResolvedValue({
        id: 'dev_own',
        deviceId,
        companyId,
        userId
      });
      mockPrisma.employeeDevice.upsert.mockImplementation(({ update }) =>
        Promise.resolve({ id: 'dev_own', ...update })
      );

      const device = await telephonyService.registerOrHeartbeatDevice({
        companyId,
        userId,
        deviceId,
        socketConnected: true
      });
      expect(device.isOnline).toBe(true);
      expect(mockPrisma.employeeDevice.upsert).toHaveBeenCalled();
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

    test('rejects completing a session owned by another employee', async () => {
      mockPrisma.callAttemptLog.findUnique.mockResolvedValue({
        id: 'log_3',
        sessionId: 'call_other_agent',
        orderId: 'ord_3',
        companyId,
        userId: 'another_agent',
        callerPhone: null
      });

      await expect(
        telephonyService.completeCall({
          companyId,
          userId,
          sessionId: 'call_other_agent',
          durationSeconds: 10
        })
      ).rejects.toMatchObject({ message: 'غير مصرح بتعديل جلسة مكالمة موظف آخر', statusCode: 403 });
      expect(mockPrisma.callAttemptLog.update).not.toHaveBeenCalled();
    });

    test('rejects completing a session that belongs to another company', async () => {
      mockPrisma.callAttemptLog.findUnique.mockResolvedValue({
        id: 'log_4',
        sessionId: 'call_foreign_company',
        orderId: 'ord_4',
        companyId: 'other_company',
        userId,
        callerPhone: null
      });

      await expect(
        telephonyService.completeCall({
          companyId,
          userId,
          sessionId: 'call_foreign_company',
          durationSeconds: 10
        })
      ).rejects.toMatchObject({ message: 'غير مصرح بتعديل هذه الجلسة', statusCode: 403 });
      expect(mockPrisma.callAttemptLog.update).not.toHaveBeenCalled();
    });

    test('rejects an invalid call result value on completion', async () => {
      mockPrisma.callAttemptLog.findUnique.mockResolvedValue({
        id: 'log_5',
        sessionId: 'call_bogus_result',
        orderId: 'ord_5',
        companyId,
        userId,
        callerPhone: null
      });

      await expect(
        telephonyService.completeCall({
          companyId,
          userId,
          sessionId: 'call_bogus_result',
          durationSeconds: 10,
          result: 'bogus'
        })
      ).rejects.toMatchObject({ message: 'قيمة نتيجة مكالمة غير صالحة', statusCode: 400 });
      expect(mockPrisma.callAttemptLog.update).not.toHaveBeenCalled();
    });

    test('initiates and completes call for guest orders updating guestOrder table', async () => {
      const sessionId = 'call_guest_session_999';
      mockPrisma.callAttemptLog.findFirst.mockResolvedValue(null);
      mockPrisma.order.findFirst.mockResolvedValue(null); // not regular order
      mockPrisma.guestOrder.findFirst.mockResolvedValue({
        id: 'guest_101',
        orderNumber: 'GUEST-101',
        guestName: 'سارة عميل زائر',
        guestPhone: '01123456789',
        companyId
      });
      mockPrisma.employeeDevice.findFirst.mockResolvedValue({
        id: 'dev_1',
        deviceId,
        deviceName: 'Pixel 8',
        lastSeenAt: new Date(),
        isOnline: true
      });
      mockPrisma.callAttemptLog.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: 'log_guest_1', ...data })
      );

      const initiated = await telephonyService.initiateCall({
        companyId,
        userId,
        orderId: 'guest_101'
      });

      expect(initiated.success).toBe(true);
      expect(initiated.customerPhone).toBe('+201123456789');
      expect(mockPrisma.callAttemptLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            guestOrderId: 'guest_101',
            callStatus: 'INITIATED'
          })
        })
      );

      mockPrisma.callAttemptLog.findUnique.mockResolvedValue({
        id: 'log_guest_1',
        sessionId,
        guestOrderId: 'guest_101',
        companyId
      });
      mockPrisma.callAttemptLog.update.mockImplementation(({ data }) =>
        Promise.resolve({ id: 'log_guest_1', sessionId, ...data })
      );
      mockPrisma.guestOrder.update.mockResolvedValue({ id: 'guest_101' });

      await telephonyService.completeCall({
        companyId,
        userId,
        sessionId,
        durationSeconds: 45
      });

      expect(mockPrisma.guestOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'guest_101' },
          data: expect.objectContaining({
            callAttempts: { increment: 1 }
          })
        })
      );
    });

    test('initiates and completes call for abandoned guest cart recovery', async () => {
      const sessionId = 'call_cart_session_111';
      mockPrisma.callAttemptLog.findFirst.mockResolvedValue(null);
      mockPrisma.order.findFirst.mockResolvedValue(null);
      mockPrisma.guestOrder.findFirst.mockResolvedValue(null);
      mockPrisma.guestCart.findFirst.mockResolvedValue({
        id: 'cuid_cart_123',
        cartId: 'CART-ABC123',
        checkoutData: JSON.stringify({
          customerName: 'محمد أحمد',
          customerPhone: '01099887766'
        }),
        companyId
      });
      mockPrisma.employeeDevice.findFirst.mockResolvedValue({
        id: 'dev_1',
        deviceId,
        deviceName: 'Pixel 8',
        lastSeenAt: new Date(),
        isOnline: true
      });
      mockPrisma.callAttemptLog.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: 'log_cart_1', ...data })
      );

      const initiated = await telephonyService.initiateCall({
        companyId,
        userId,
        orderId: 'CART-ABC123'
      });

      expect(initiated.success).toBe(true);
      expect(initiated.customerPhone).toBe('+201099887766');
      expect(mockPrisma.callAttemptLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            notes: 'CART:CART-ABC123',
            callStatus: 'INITIATED'
          })
        })
      );

      mockPrisma.callAttemptLog.findUnique.mockResolvedValue({
        id: 'log_cart_1',
        sessionId,
        notes: 'CART:CART-ABC123',
        companyId
      });
      mockPrisma.callAttemptLog.update.mockImplementation(({ data }) =>
        Promise.resolve({ id: 'log_cart_1', sessionId, result: 'reached', ...data })
      );

      await telephonyService.completeCall({
        companyId,
        userId,
        sessionId,
        durationSeconds: 60,
        result: 'reached'
      });

      expect(mockPrisma.cartContactLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            cartId: 'CART-ABC123',
            method: 'call',
            result: 'reached'
          })
        })
      );
    });
  });

  describe('Active Call Watchdog (getActiveCall)', () => {
    it('returns null when companyId is missing or no initiated call exists', async () => {
      mockPrisma.callAttemptLog.findFirst.mockResolvedValue(null);
      const res = await telephonyService.getActiveCall({ companyId, userId });
      expect(res).toBeNull();

      const noComp = await telephonyService.getActiveCall({ companyId: null, userId });
      expect(noComp).toBeNull();
    });

    it('returns active call details when a call was initiated recently', async () => {
      const startedAt = new Date();
      mockPrisma.callAttemptLog.findFirst.mockResolvedValue({
        id: 'active_log_1',
        sessionId: 'call_active_123',
        orderId: 'ORD-999',
        customerPhone: '+201012345678',
        callStatus: 'INITIATED',
        startedAt
      });
      mockPrisma.order.findFirst.mockResolvedValue({
        id: 'ORD-999',
        orderNumber: 'ORD-999',
        customerName: 'أحمد محمود'
      });

      const res = await telephonyService.getActiveCall({ companyId, userId });
      expect(mockPrisma.callAttemptLog.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            companyId,
            callStatus: 'INITIATED',
            userId
          })
        })
      );
      expect(res).toEqual({
        sessionId: 'call_active_123',
        orderId: 'ORD-999',
        orderNumber: 'ORD-999',
        customerName: 'أحمد محمود',
        customerPhone: '+201012345678',
        startedAt
      });
    });
  });

  describe('Diagnostic Logging (recordDiagnosticLog & getDiagnosticLogs)', () => {
    it('records and returns diagnostics scoped strictly to companyId', () => {
      telephonyService.diagnosticLogs = [];

      // Record logs for companyId
      const entry1 = telephonyService.recordDiagnosticLog({
        companyId,
        userId,
        event: 'AGENT_INIT',
        deviceId: 'dev_huawei_1',
        deviceName: 'HUAWEI STK-L21',
        details: { mode: 'capacitor' }
      });

      const entry2 = telephonyService.recordDiagnosticLog({
        companyId,
        userId,
        event: 'NATIVE_DIAL_SUCCESS',
        deviceId: 'dev_huawei_1',
        deviceName: 'HUAWEI STK-L21',
        details: { phone: '01012345678' }
      });

      // Record log for another company
      telephonyService.recordDiagnosticLog({
        companyId: 'other_company_999',
        userId: 'other_user',
        event: 'NATIVE_DIAL_FAILED',
        deviceId: 'dev_other',
        deviceName: 'Other Phone'
      });

      expect(entry1).toBeDefined();
      expect(entry1.event).toBe('AGENT_INIT');
      expect(entry2.event).toBe('NATIVE_DIAL_SUCCESS');

      const logs = telephonyService.getDiagnosticLogs({ companyId });
      expect(logs.length).toBe(2);
      expect(logs[0].event).toBe('NATIVE_DIAL_SUCCESS'); // latest first
      expect(logs[1].event).toBe('AGENT_INIT');

      // Check tenant isolation
      const otherLogs = telephonyService.getDiagnosticLogs({ companyId: 'other_company_999' });
      expect(otherLogs.length).toBe(1);
      expect(otherLogs[0].event).toBe('NATIVE_DIAL_FAILED');
    });

    it('returns empty array if companyId is missing', () => {
      expect(telephonyService.getDiagnosticLogs({ companyId: null })).toEqual([]);
      expect(telephonyService.recordDiagnosticLog({ companyId: null, event: 'TEST' })).toBeNull();
    });

    it('preserves client-provided timestamp when supplied', () => {
      telephonyService.diagnosticLogs = [];
      const clientTs = '2026-10-19T10:00:00.000Z';
      const entry = telephonyService.recordDiagnosticLog({
        companyId,
        userId,
        event: 'TEST_EVENT',
        timestamp: clientTs
      });
      expect(entry.timestamp).toBe(clientTs);
    });
  });
});
