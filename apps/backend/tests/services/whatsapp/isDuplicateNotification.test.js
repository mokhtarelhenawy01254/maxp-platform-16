/**
 * ≡ƒÜ¿ PRODUCTION-FIX (notifications-fix-plan ┬º3.1) ΓÇö regression tests:
 * isDuplicateNotification is the single dedup gate used by orderService,
 * orderWorkflowService and sendOrderCreatedNotification. It must key on the
 * PERSISTED event type (matches whatsAppNotificationLog rows) and scope by
 * orderId (regular) or recipientPhone (guest) within the 10s window.
 */
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

const mockSettings = {
  whatsAppNotificationLog: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
};

jest.mock('../../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(() => mockSettings),
  safeQuery: jest.fn((operation) => operation()),
}));

const { isDuplicateNotification } = require('../../../services/whatsapp/WhatsAppNotificationService');

describe('isDuplicateNotification (┬º3.1)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSettings.whatsAppNotificationLog.findFirst.mockResolvedValue(null);
  });

  test('returns true when a log row exists within the window for the same orderId + eventType', async () => {
    mockSettings.whatsAppNotificationLog.findFirst.mockResolvedValue({ id: 'log-1' });
    const result = await isDuplicateNotification({
      companyId: 'c1', orderId: 'o1', eventType: 'ORDER_CONFIRMED',
    });
    expect(result).toBe(true);
  });

  test('returns false when nothing found within the window (older or none)', async () => {
    const result = await isDuplicateNotification({
      companyId: 'c1', orderId: 'o1', eventType: 'ORDER_CONFIRMED',
    });
    expect(result).toBe(false);
  });

  test('returns true when only recipientPhone matches (guest order, no orderId)', async () => {
    mockSettings.whatsAppNotificationLog.findFirst.mockResolvedValue({ id: 'log-2' });
    const result = await isDuplicateNotification({
      companyId: 'c1', recipientPhone: '201000000000', eventType: 'ORDER_CONFIRMED',
    });
    expect(result).toBe(true);
  });

  test('returns false when a row exists but for a different eventType', async () => {
    // The query must filter on the exact persisted eventType, so a row logged
    // under ORDER_PROCESSING is NOT treated as a duplicate of ORDER_CONFIRMED.
    mockSettings.whatsAppNotificationLog.findFirst.mockImplementation(({ where }) =>
      where.eventType === 'ORDER_CONFIRMED' ? Promise.resolve({ id: 'log-1' }) : Promise.resolve(null)
    );
    const result = await isDuplicateNotification({
      companyId: 'c1', orderId: 'o1', eventType: 'ORDER_PROCESSING',
    });
    expect(result).toBe(false);
  });

  test('normalizes a raw status code to the persisted event type when querying', async () => {
    await isDuplicateNotification({ companyId: 'c1', orderId: 'o1', eventType: 'RETURNED' });
    const where = mockSettings.whatsAppNotificationLog.findFirst.mock.calls[0][0].where;
    expect(where.eventType).toBe('ORDER_RETURNED');
  });

  test('scopes the query to companyId + orderId', async () => {
    await isDuplicateNotification({ companyId: 'c1', orderId: 'o1', eventType: 'ORDER_CONFIRMED' });
    const where = mockSettings.whatsAppNotificationLog.findFirst.mock.calls[0][0].where;
    expect(where.companyId).toBe('c1');
    expect(where.orderId).toBe('o1');
  });

  test('uses a ~10s lookback window via createdAt.gte', async () => {
    const before = Date.now();
    await isDuplicateNotification({ companyId: 'c1', orderId: 'o1', eventType: 'ORDER_CONFIRMED' });
    const where = mockSettings.whatsAppNotificationLog.findFirst.mock.calls[0][0].where;
    expect(where.createdAt).toBeDefined();
    expect(where.createdAt.gte).toBeInstanceOf(Date);
    const gteMs = where.createdAt.gte.getTime();
    expect(gteMs).toBeGreaterThanOrEqual(before - 10000 - 1000);
    expect(gteMs).toBeLessThanOrEqual(before + 1000);
  });
});
