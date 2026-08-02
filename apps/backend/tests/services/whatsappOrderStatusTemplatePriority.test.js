/**
 * Regression test: order-status WhatsApp notifications must prefer the
 * raw status-code template (e.g. CONFIRMED) over the legacy ORDER_* event
 * template (e.g. ORDER_CONFIRMED).
 *
 * sendOrderStatusNotification sends eventType=ORDER_CONFIRMED +
 * fallbackEventType=CONFIRMED; sendNotification() looks up the
 * fallbackEventType template FIRST. This test pins that contract so it
 * can't silently regress.
 */
jest.mock('../../services/whatsapp/WhatsAppManager', () => ({
  getCompanySessions: jest.fn(() => []),
  getSession: jest.fn(() => ({ status: 'connected', provider: 'BAILEYS' })),
}));

jest.mock('../../services/whatsapp/WhatsAppMessageHandler', () => ({
  sendText: jest.fn().mockResolvedValue({ key: { id: 'mock-msg' } }),
  sendButtons: jest.fn().mockResolvedValue({ key: { id: 'mock-msg' } }),
  sendTemplateMessage: jest.fn().mockResolvedValue({ id: 'mock-meta-msg' }),
  sendList: jest.fn().mockResolvedValue({ key: { id: 'mock-msg' } }),
}));

const mockSettings = {
  whatsAppNotificationSettings: { findUnique: jest.fn() },
  whatsAppSession: { findFirst: jest.fn(), findUnique: jest.fn() },
  whatsAppNotificationTemplate: { findFirst: jest.fn() },
  whatsAppNotificationLog: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
  company: { findUnique: jest.fn() },
};

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(() => mockSettings),
  safeQuery: jest.fn((operation) => operation()),
}));

const { getSharedPrismaClient } = require('../../services/sharedDatabase');

describe('whatsapp order status template priority', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockSettings.whatsAppNotificationSettings.findUnique.mockResolvedValue({
      isEnabled: true,
      orderNotificationsEnabled: true,
      orderCreatedEnabled: true,
      orderConfirmedEnabled: true,
      orderProcessingEnabled: true,
      orderShippedEnabled: true,
      orderDeliveredEnabled: true,
      orderCancelledEnabled: true,
      quietHoursEnabled: false,
      defaultSessionId: null,
    });

    mockSettings.whatsAppSession.findFirst.mockResolvedValue({
      id: 'sess1',
      status: 'CONNECTED',
      provider: 'BAILEYS',
    });
    mockSettings.whatsAppSession.findUnique.mockResolvedValue({
      id: 'sess1',
      status: 'CONNECTED',
      provider: 'BAILEYS',
    });

    mockSettings.whatsAppNotificationLog.findFirst.mockResolvedValue(null);
    mockSettings.whatsAppNotificationLog.create.mockResolvedValue({ id: 'log-1' });
    mockSettings.whatsAppNotificationLog.update.mockResolvedValue({});
  });

  it('queries the raw status-code template before the legacy ORDER_* one', async () => {
    mockSettings.whatsAppNotificationTemplate.findFirst.mockImplementation(({ where }) => {
      if (where.eventType === 'CONFIRMED') {
        return Promise.resolve({ id: 'raw-code-template', content: 'raw code template', isActive: true });
      }
      if (where.eventType === 'ORDER_CONFIRMED') {
        return Promise.resolve({ id: 'legacy-template', content: 'legacy template', isActive: true });
      }
      return Promise.resolve(null);
    });

    const { sendOrderStatusNotification } = require('../../services/whatsapp/WhatsAppNotificationService');

    const order = {
      id: 'order-1',
      orderNumber: 'ORD-1',
      companyId: 'company-1',
      customerPhone: '+201000000000',
      customer: { firstName: 'Ali', phone: '+201000000000' },
      items: [],
      total: '100',
      currency: 'EGP',
    };

    const result = await sendOrderStatusNotification(order, 'CONFIRMED', 'PENDING');

    const calls = mockSettings.whatsAppNotificationTemplate.findFirst.mock.calls;
    const eventTypesQueried = calls
      .map((c) => c[0] && c[0].where && c[0].where.eventType)
      .filter(Boolean);

    // The raw status code (CONFIRMED) must be queried first and win.
    expect(eventTypesQueried[0]).toBe('CONFIRMED');
    expect(eventTypesQueried).not.toContain('ORDER_CONFIRMED');
    expect(result).toBeDefined();
  });

  it('falls back to the legacy ORDER_* template when no status-code template exists', async () => {
    mockSettings.whatsAppNotificationTemplate.findFirst.mockImplementation(({ where }) => {
      if (where.eventType === 'CONFIRMED') {
        return Promise.resolve(null);
      }
      if (where.eventType === 'ORDER_CONFIRMED') {
        return Promise.resolve({ id: 'legacy-template', content: 'legacy template', isActive: true });
      }
      return Promise.resolve(null);
    });

    const { sendOrderStatusNotification } = require('../../services/whatsapp/WhatsAppNotificationService');

    const order = {
      id: 'order-2',
      orderNumber: 'ORD-2',
      companyId: 'company-1',
      customerPhone: '+201000000000',
      customer: { firstName: 'Ali', phone: '+201000000000' },
      items: [],
      total: '100',
      currency: 'EGP',
    };

    const result = await sendOrderStatusNotification(order, 'CONFIRMED', 'PENDING');

    const calls = mockSettings.whatsAppNotificationTemplate.findFirst.mock.calls;
    const eventTypesQueried = calls
      .map((c) => c[0] && c[0].where && c[0].where.eventType)
      .filter(Boolean);

    // CONFIRMED tried first, then ORDER_CONFIRMED fallback.
    expect(eventTypesQueried.indexOf('CONFIRMED')).toBeLessThan(
      eventTypesQueried.indexOf('ORDER_CONFIRMED')
    );
    expect(result).toBeDefined();
  });
});
