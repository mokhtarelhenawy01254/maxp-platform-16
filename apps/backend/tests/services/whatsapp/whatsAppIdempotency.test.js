/**
 * Tests for WhatsApp Notification Idempotency and Deduplication.
 * Verifies 5-minute window, FAILED status exemption, and custom status identity.
 */

const mockPrisma = {
  whatsAppNotificationSettings: { findUnique: jest.fn() },
  whatsAppSession: { findFirst: jest.fn(), findUnique: jest.fn() },
  whatsAppNotificationTemplate: { findFirst: jest.fn() },
  whatsAppNotificationLog: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
  orderStatusConfig: { findFirst: jest.fn() },
  company: { findUnique: jest.fn() },
};

jest.mock('axios', () => ({
  get: jest.fn(),
  post: jest.fn(),
}), { virtual: true });

jest.mock('../../../services/whatsapp/WhatsAppManager', () => ({
  getCompanySessions: jest.fn(() => []),
  getSession: jest.fn(() => ({ status: 'connected', provider: 'BAILEYS' })),
}));

jest.mock('../../../services/whatsapp/WhatsAppMessageHandler', () => ({
  sendText: jest.fn().mockResolvedValue({ key: { id: 'mock-msg' } }),
  sendButtons: jest.fn().mockResolvedValue({ key: { id: 'mock-msg' } }),
  sendTemplateMessage: jest.fn().mockResolvedValue({ id: 'mock-meta-msg' }),
  sendList: jest.fn().mockResolvedValue({ key: { id: 'mock-msg' } }),
}));

jest.mock('../../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(() => mockPrisma),
  safeQuery: jest.fn((operation) => operation()),
}));

const {
  isDuplicateNotification,
} = require('../../../services/whatsapp/WhatsAppNotificationService');

describe('WhatsApp Notification Idempotency (Wave 2 Item 3)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isDuplicateNotification', () => {
    test('blocks duplicate notification within 5-minute window for SENT log', async () => {
      mockPrisma.whatsAppNotificationLog.findFirst.mockResolvedValue({
        id: 'log_1',
        status: 'SENT',
        createdAt: new Date(),
      });

      const isDup = await isDuplicateNotification({
        companyId: 'comp_1',
        orderId: 'ord_123',
        eventType: 'ORDER_CONFIRMED',
      });

      expect(isDup).toBe(true);
      expect(mockPrisma.whatsAppNotificationLog.findFirst).toHaveBeenCalledWith({
        where: expect.objectContaining({
          companyId: 'comp_1',
          orderId: 'ord_123',
          eventType: 'ORDER_CONFIRMED',
          status: { not: 'FAILED' },
          createdAt: expect.objectContaining({ gte: expect.any(Date) }),
        }),
        select: { id: true },
      });
    });

    test('(FAILED Exemption) permits retry when previous log has status FAILED', async () => {
      // When where clause specifies status: { not: 'FAILED' }, findFirst returns null
      mockPrisma.whatsAppNotificationLog.findFirst.mockImplementation(({ where }) => {
        if (where.status?.not === 'FAILED') {
          return Promise.resolve(null);
        }
        return Promise.resolve({ id: 'failed_log', status: 'FAILED' });
      });

      const isDup = await isDuplicateNotification({
        companyId: 'comp_1',
        orderId: 'ord_123',
        eventType: 'ORDER_CONFIRMED',
      });

      // Must be false so the retry is allowed to proceed!
      expect(isDup).toBe(false);
    });

    test('distinguishes custom statuses using rawEventType', async () => {
      mockPrisma.whatsAppNotificationLog.findFirst.mockResolvedValue(null);

      await isDuplicateNotification({
        companyId: 'comp_1',
        orderId: 'ord_123',
        eventType: 'ORDER_PROCESSING',
        rawEventType: 'PREPARING_STAGE_2',
      });

      expect(mockPrisma.whatsAppNotificationLog.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [{ rawEventType: 'PREPARING_STAGE_2' }, { rawEventType: null }],
          }),
        })
      );
    });

    test('returns false when neither orderId nor recipientPhone is provided', async () => {
      const isDup = await isDuplicateNotification({
        companyId: 'comp_1',
        eventType: 'ORDER_CREATED',
      });
      expect(isDup).toBe(false);
    });
  });
});
