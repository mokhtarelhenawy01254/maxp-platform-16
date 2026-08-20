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
  orderStatusConfig: { findFirst: jest.fn() },
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
    mockSettings.orderStatusConfig.findFirst.mockResolvedValue({ notifyCustomer: true });
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

  it('skips the send when the status config has notifyCustomer=false (PROCESSING etc.)', async () => {
    // Per-status flag wins over the global settings flag (orderProcessingEnabled).
    mockSettings.orderStatusConfig.findFirst.mockResolvedValue({ notifyCustomer: false });

    const { sendOrderStatusNotification } = require('../../services/whatsapp/WhatsAppNotificationService');

    const order = {
      id: 'order-3',
      orderNumber: 'ORD-3',
      companyId: 'company-1',
      customerPhone: '+201000000000',
      customer: { firstName: 'Ali', phone: '+201000000000' },
      items: [],
      total: '100',
      currency: 'EGP',
    };

    const result = await sendOrderStatusNotification(order, 'PROCESSING', 'CONFIRMED');

    expect(result).toEqual({ success: false, reason: 'status_notification_disabled' });
    // No notification log should be created (nothing was attempted)
    expect(mockSettings.whatsAppNotificationLog.create).not.toHaveBeenCalled();
  });

  it('returns no_template when no DB template exists for an order event (no code fallback)', async () => {
    // No DB templates at all for this order event.
    mockSettings.whatsAppNotificationTemplate.findFirst.mockResolvedValue(null);

    const { sendOrderStatusNotification } = require('../../services/whatsapp/WhatsAppNotificationService');

    const order = {
      id: 'order-3',
      orderNumber: 'ORD-3',
      companyId: 'company-1',
      customerPhone: '+201000000000',
      customer: { firstName: 'Ali', phone: '+201000000000' },
      items: [],
      total: '100',
      currency: 'EGP',
    };

    const result = await sendOrderStatusNotification(order, 'CONFIRMED', 'PENDING');

    // No message should be sent: order events must NOT fall back to the
    // hard-coded DEFAULT_TEMPLATES or free-text in the code.
    expect(result).toEqual(expect.objectContaining({ success: false, reason: 'no_template' }));
  });
});

describe('whatsapp channel-aware template selection (two slots per status)', () => {
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

    mockSettings.whatsAppNotificationLog.findFirst.mockResolvedValue(null);
    mockSettings.whatsAppNotificationLog.create.mockResolvedValue({ id: 'log-1' });
    mockSettings.whatsAppNotificationLog.update.mockResolvedValue({});
  });

  const order = {
    id: 'order-c1',
    orderNumber: 'ORD-C1',
    companyId: 'company-1',
    customerPhone: '+201000000000',
    customer: { firstName: 'Ali', phone: '+201000000000' },
    items: [],
    total: '100',
    currency: 'EGP',
  };

  // mockImplementation ┘è╪¡╪º┘â┘è Prisma: ┘è╪▒╪» ╪¿┘é┘ê╪º┘ä╪¿ ╪¡╪│╪¿ (eventType + channel)
  function mockFindFirst(rows) {
    mockSettings.whatsAppNotificationTemplate.findFirst.mockImplementation(({ where }) => {
      const evt = where.eventType;
      const metaOnly = where.channel === 'META_CLOUD';
      const notMeta = where.channel && typeof where.channel === 'object' && where.channel.not === 'META_CLOUD';
      const legacyMeta = where.metaTemplateName && typeof where.metaTemplateName === 'object' && where.metaTemplateName.not === null;
      let candidates = rows.filter((r) => r.eventType === evt);
      if (metaOnly) candidates = candidates.filter((r) => String(r.channel || '').toUpperCase() === 'META_CLOUD');
      if (notMeta && !legacyMeta) candidates = candidates.filter((r) => String(r.channel || '').toUpperCase() !== 'META_CLOUD');
      if (notMeta && legacyMeta) candidates = candidates.filter((r) => String(r.channel || '').toUpperCase() !== 'META_CLOUD' && !!r.metaTemplateName);
      return Promise.resolve(candidates[0] || null);
    });
  }

  it('Meta session + approved META_CLOUD template ΓåÆ ┘è┘ü╪╢┘æ┘ä ┘é╪º┘ä╪¿ ┘à┘è╪¬╪º', async () => {
    mockSettings.whatsAppSession.findFirst.mockResolvedValue({ id: 'sess-m', status: 'CONNECTED', provider: 'META_CLOUD' });
    mockSettings.whatsAppSession.findUnique.mockResolvedValue({ id: 'sess-m', status: 'CONNECTED', provider: 'META_CLOUD' });
    mockFindFirst([
      { eventType: 'CONFIRMED', channel: 'AUTO', id: 'regular-1', content: '┘å╪╡ ╪╣╪º╪»┘è', isActive: true },
      { eventType: 'CONFIRMED', channel: 'META_CLOUD', id: 'meta-1', content: '┘à╪▒╪¼╪╣', isActive: true, metaTemplateName: 'confirm_ar', metaTemplateStatus: 'APPROVED', variables: JSON.stringify([]) },
    ]);

    const { sendOrderStatusNotification } = require('../../services/whatsapp/WhatsAppNotificationService');
    const res = await sendOrderStatusNotification(order, 'CONFIRMED', 'PENDING');

    const calls = mockSettings.whatsAppNotificationTemplate.findFirst.mock.calls;
    const used = calls.find((c) => c[0].where.channel === 'META_CLOUD');
    expect(used).toBeTruthy();
    expect(res).toBeDefined();
  });

  it('Meta session + META_CLOUD ╪║┘è╪▒ ┘à╪╣╪¬┘à╪» ΓåÆ ╪¿┘è┘å╪▓┘ä ┘ä┘ä┘é╪º┘ä╪¿ ╪º┘ä╪╣╪º╪»┘è', async () => {
    mockSettings.whatsAppSession.findFirst.mockResolvedValue({ id: 'sess-m', status: 'CONNECTED', provider: 'META_CLOUD' });
    mockSettings.whatsAppSession.findUnique.mockResolvedValue({ id: 'sess-m', status: 'CONNECTED', provider: 'META_CLOUD' });
    mockFindFirst([
      { eventType: 'CONFIRMED', channel: 'AUTO', id: 'regular-1', content: '┘å╪╡ ╪╣╪º╪»┘è', isActive: true },
      { eventType: 'CONFIRMED', channel: 'META_CLOUD', id: 'meta-1', content: '┘à╪▒╪¼╪╣', isActive: true, metaTemplateName: 'confirm_ar', metaTemplateStatus: 'PENDING' },
    ]);

    const { sendOrderStatusNotification } = require('../../services/whatsapp/WhatsAppNotificationService');
    const res = await sendOrderStatusNotification(order, 'CONFIRMED', 'PENDING');

    const calls = mockSettings.whatsAppNotificationTemplate.findFirst.mock.calls;
    const usedRegular = calls.some((c) => c[0].where.channel && c[0].where.channel.not === 'META_CLOUD');
    expect(usedRegular).toBeTruthy();
    expect(res).toBeDefined();
  });

  it('Baileys session + ╪º┘ä┘é╪º┘ä╪¿┘è┘å ┘à┘ê╪¼┘ê╪»┘è┘å ΓåÆ ┘è┘ü╪╢┘æ┘ä ╪º┘ä┘é╪º┘ä╪¿ ╪º┘ä╪╣╪º╪»┘è', async () => {
    mockSettings.whatsAppSession.findFirst.mockResolvedValue({ id: 'sess-b', status: 'CONNECTED', provider: 'BAILEYS' });
    mockSettings.whatsAppSession.findUnique.mockResolvedValue({ id: 'sess-b', status: 'CONNECTED', provider: 'BAILEYS' });
    mockFindFirst([
      { eventType: 'CONFIRMED', channel: 'AUTO', id: 'regular-1', content: '┘å╪╡ ╪╣╪º╪»┘è', isActive: true },
      { eventType: 'CONFIRMED', channel: 'META_CLOUD', id: 'meta-1', content: '┘à╪▒╪¼╪╣', isActive: true, metaTemplateName: 'confirm_ar', metaTemplateStatus: 'APPROVED' },
    ]);

    const { sendOrderStatusNotification } = require('../../services/whatsapp/WhatsAppNotificationService');
    const res = await sendOrderStatusNotification(order, 'CONFIRMED', 'PENDING');

    const calls = mockSettings.whatsAppNotificationTemplate.findFirst.mock.calls;
    const usedRegular = calls.some((c) => c[0].where.channel && c[0].where.channel.not === 'META_CLOUD');
    expect(usedRegular).toBeTruthy();
    expect(res).toBeDefined();
  });

  it('Meta session + ╪│╪¼┘ä ╪╣╪º╪»┘è ┘é╪»┘è┘à ╪╣┘ä┘è┘ç ╪▒╪¿╪╖ ┘à┘è╪¬╪º ┘à╪╣╪¬┘à╪» (legacy) ΓåÆ ╪¿┘è╪¿╪╣╪¬ ╪╣╪¿╪▒ ┘é╪º┘ä╪¿ ┘à┘è╪¬╪º ┘à╪┤ ┘å╪╡ ╪¡╪▒', async () => {
    mockSettings.whatsAppSession.findFirst.mockResolvedValue({ id: 'sess-m', status: 'CONNECTED', provider: 'META_CLOUD' });
    mockSettings.whatsAppSession.findUnique.mockResolvedValue({ id: 'sess-m', status: 'CONNECTED', provider: 'META_CLOUD' });
    // ╪│╪¼┘ä legacy ┘ê╪º╪¡╪» ╪¿╪│: channel AUTO + metaTemplateName ┘à╪╣╪¬┘à╪» (╪º┘ä┘å┘à┘ê╪░╪¼ ╪º┘ä┘é╪»┘è┘à)
    mockFindFirst([
      { eventType: 'CONFIRMED', channel: 'AUTO', id: 'legacy-1', content: '┘à╪▒╪¼╪╣ ╪º┘ä┘à╪¬╪║┘è╪▒╪º╪¬', isActive: true, metaTemplateName: 'confirm_ar', metaTemplateStatus: 'APPROVED', variables: JSON.stringify([{ position: 1, name: 'customerName' }]) },
    ]);

    const { sendOrderStatusNotification } = require('../../services/whatsapp/WhatsAppNotificationService');
    const res = await sendOrderStatusNotification(order, 'CONFIRMED', 'PENDING');

    // ┘ä╪º╪▓┘à ┘è┘â┘ê┘å ╪º╪│╪¬┘Å╪╣┘ä┘à ╪╣┘å ╪º┘ä╪│╪¼┘ä ╪º┘ä┘Ç legacy ╪º┘ä┘à╪▒╪¬╪¿╪╖ ╪¿┘à┘è╪¬╪º (metaTemplateName not null)
    const calls = mockSettings.whatsAppNotificationTemplate.findFirst.mock.calls;
    const queriedLegacyMeta = calls.some((c) => c[0].where.metaTemplateName && c[0].where.metaTemplateName.not === null);
    expect(queriedLegacyMeta).toBeTruthy();
    expect(res).toBeDefined();
  });

  it('Meta session + ╪│╪¼┘ä┘è┘å ╪╣╪º╪»┘è┘è┘å: ┘ê╪º╪¡╪» ╪╣┘ä┘è┘ç ╪▒╪¿╪╖ ┘à┘è╪¬╪º ┘à╪╣╪¬┘à╪» ┘ê┘ê╪º╪¡╪» ╪╣╪º╪»┘è ╪╡╪▒┘è╪¡ ΓåÆ ╪¿┘è╪¿╪╣╪¬ ╪╣╪¿╪▒ ╪º┘ä┘ä┘è ╪╣┘ä┘è┘ç ╪º┘ä╪▒╪¿╪╖', async () => {
    mockSettings.whatsAppSession.findFirst.mockResolvedValue({ id: 'sess-m', status: 'CONNECTED', provider: 'META_CLOUD' });
    mockSettings.whatsAppSession.findUnique.mockResolvedValue({ id: 'sess-m', status: 'CONNECTED', provider: 'META_CLOUD' });
    // ╪│╪¼┘ä ╪╣╪º╪»┘è ╪╡╪▒┘è╪¡ (╪¿╪»┘ê┘å ╪▒╪¿╪╖) + ╪│╪¼┘ä legacy ╪╣┘ä┘è┘ç ╪▒╪¿╪╖ ┘à┘è╪¬╪º ┘à╪╣╪¬┘à╪»
    mockFindFirst([
      { eventType: 'CONFIRMED', channel: 'AUTO', id: 'plain-1', content: '┘å╪╡ ╪╣╪º╪»┘è', isActive: true },
      { eventType: 'CONFIRMED', channel: 'AUTO', id: 'legacy-meta', content: '┘à╪▒╪¼╪╣', isActive: true, metaTemplateName: 'confirm_ar', metaTemplateStatus: 'APPROVED', variables: JSON.stringify([{ position: 1, name: 'customerName' }]) },
    ]);

    const { sendOrderStatusNotification } = require('../../services/whatsapp/WhatsAppNotificationService');
    const res = await sendOrderStatusNotification(order, 'CONFIRMED', 'PENDING');

    const calls = mockSettings.whatsAppNotificationTemplate.findFirst.mock.calls;
    // ╪º┘ä┘Ç legacy (metaTemplateName not null) ┘ä╪º╪▓┘à ┘è┘â┘ê┘å ╪º╪¬╪│╪ú┘ä ╪╣┘å┘ç ┘ê╪¿┘è╪▒╪¼╪╣ ╪º┘ä┘é╪º┘ä╪¿ ╪º┘ä┘à╪▒╪¿┘ê╪╖
    const legacyIdx = calls.findIndex((c) => c[0].where.metaTemplateName && c[0].where.metaTemplateName.not === null);
    expect(legacyIdx).toBeGreaterThanOrEqual(0);
    expect(res).toBeDefined();
  });
});

describe('whatsapp order-creation dispatch (sendOrderCreationNotification)', () => {
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

    mockSettings.whatsAppSession.findFirst.mockResolvedValue({ id: 'sess1', status: 'CONNECTED', provider: 'BAILEYS' });
    mockSettings.whatsAppSession.findUnique.mockResolvedValue({ id: 'sess1', status: 'CONNECTED', provider: 'BAILEYS' });
    mockSettings.whatsAppNotificationLog.findFirst.mockResolvedValue(null);
    mockSettings.whatsAppNotificationLog.create.mockResolvedValue({ id: 'log-1' });
    mockSettings.whatsAppNotificationLog.update.mockResolvedValue({});
  });

  const baseOrder = (status) => ({
    id: 'order-created-1',
    orderNumber: 'ORD-CREATED-1',
    companyId: 'company-1',
    status,
    customerPhone: '+201000000000',
    customerName: 'Ali',
    customer: { firstName: 'Ali', phone: '+201000000000' },
    items: [],
    total: '100',
    currency: 'EGP',
  });

  it('routes an order created directly as CONFIRMED to the status template, NOT ORDER_CREATED', async () => {
    mockSettings.whatsAppNotificationTemplate.findFirst.mockImplementation(({ where }) => {
      if (where.eventType === 'CONFIRMED') {
        return Promise.resolve({ id: 't-confirmed', content: 'confirmed', isActive: true });
      }
      if (where.eventType === 'ORDER_CONFIRMED') {
        return Promise.resolve({ id: 't-order-confirmed', content: 'order confirmed', isActive: true });
      }
      return Promise.resolve(null);
    });

    const { sendOrderCreationNotification } = require('../../services/whatsapp/WhatsAppNotificationService');
    const res = await sendOrderCreationNotification(baseOrder('CONFIRMED'));

    const calls = mockSettings.whatsAppNotificationTemplate.findFirst.mock.calls;
    const eventTypesQueried = calls.map((c) => c[0] && c[0].where && c[0].where.eventType).filter(Boolean);
    expect(eventTypesQueried).not.toContain('ORDER_CREATED');
    expect(eventTypesQueried[0]).toBe('CONFIRMED');
    expect(res).toBeDefined();
  });

  it('routes an order created as PENDING to the ORDER_CREATED new-order template', async () => {
    mockSettings.whatsAppNotificationTemplate.findFirst.mockResolvedValue({
      id: 't-created', eventType: 'ORDER_CREATED', content: 'new order', isActive: true,
    });

    const { sendOrderCreationNotification } = require('../../services/whatsapp/WhatsAppNotificationService');
    const res = await sendOrderCreationNotification(baseOrder('PENDING'));

    const calls = mockSettings.whatsAppNotificationTemplate.findFirst.mock.calls;
    const eventTypesQueried = calls.map((c) => c[0] && c[0].where && c[0].where.eventType).filter(Boolean);
    expect(eventTypesQueried).toContain('ORDER_CREATED');
    expect(res).toBeDefined();
  });

  it('routes an order with no status to the ORDER_CREATED new-order template', async () => {
    mockSettings.whatsAppNotificationTemplate.findFirst.mockResolvedValue({
      id: 't-created', eventType: 'ORDER_CREATED', content: 'new order', isActive: true,
    });

    const { sendOrderCreationNotification } = require('../../services/whatsapp/WhatsAppNotificationService');
    const res = await sendOrderCreationNotification(baseOrder(null));

    const calls = mockSettings.whatsAppNotificationTemplate.findFirst.mock.calls;
    const eventTypesQueried = calls.map((c) => c[0] && c[0].where && c[0].where.eventType).filter(Boolean);
    expect(eventTypesQueried).toContain('ORDER_CREATED');
    expect(res).toBeDefined();
  });

  it('blocks a duplicate status notification within the dedup window (service + route double call)', async () => {
    // recent notification log ΓåÆ ╪º┘ä╪»┘ü╪╣╪⌐ ╪º┘ä╪¬╪º┘å┘è╪⌐ (┘à┘å ╪º┘ä┘Ç route) ╪¬╪¬╪¿┘ä┘ê┘â
    mockSettings.whatsAppNotificationLog.findFirst.mockResolvedValue({ id: 'recent-log' });

    const { sendOrderCreationNotification } = require('../../services/whatsapp/WhatsAppNotificationService');
    const res = await sendOrderCreationNotification(baseOrder('CONFIRMED'));

    expect(res).toEqual(expect.objectContaining({ success: false, reason: 'duplicate_blocked' }));
    expect(mockSettings.whatsAppNotificationTemplate.findFirst).not.toHaveBeenCalled();
  });
});
