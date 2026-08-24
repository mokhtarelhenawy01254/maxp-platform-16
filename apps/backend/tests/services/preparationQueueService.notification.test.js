/**
 * ðŸ›¡ï¸ Regression tests (prep-stage-notify):
 *
 * Bug A: ØªØ­Ø±ÙƒØ§Øª Ø®Ø· Ø§Ù„ØªØ¬Ù‡ÙŠØ² Ù…Ù† ØµÙØ­Ø© Ø§Ù„ØªØ¬Ù‡ÙŠØ² ÙƒØ§Ù†Øª Ø¨ØªØ­Ø¯Ù‘Ø« Ø§Ù„Ø£ÙˆØ±Ø¯Ø± ÙˆØªÙƒØªØ¨ History
 *        Ù…Ù† ØºÙŠØ± Ø¥Ø±Ø³Ø§Ù„ Ø£ÙŠ Ø±Ø³Ø§Ù„Ø© ÙˆØ§ØªØ³Ø§Ø¨ Ù„Ù„Ø¹Ù…ÙŠÙ„.
 * Bug B: normalizeWhatsAppOrderStatus ÙƒØ§Ù† Ø¨ÙŠØ­ÙˆÙ‘Ù„ PACKAGEDâ†’PACKED / PREPARINGâ†’PICKING
 *        Ù‚Ø¨Ù„ Ø§Ù„Ø¥Ø´Ø¹Ø§Ø± ÙØ¨ÙŠÙƒØ³Ø± Ù„Ù‚Ø· Ù‚Ø§Ù„Ø¨ Ø§Ù„ØªØ§Ø¬Ø± Ø§Ù„Ù…Ø³Ø¬Ù‘Ù„ Ø¨Ø§Ù„ÙƒÙˆØ¯ Ø§Ù„Ø£ØµÙ„ÙŠ.
 */

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(() => mockSharedPrisma)
}));

jest.mock('../../services/whatsapp/WhatsAppNotificationService', () => ({
  isDuplicateNotification: jest.fn(),
  sendOrderStatusNotification: jest.fn()
}));

const mockSharedPrisma = {
  order: {
    findFirst: jest.fn(),
    update: jest.fn()
  },
  guestOrder: {
    findFirst: jest.fn(),
    update: jest.fn()
  },
  orderStatusConfig: {
    findFirst: jest.fn().mockResolvedValue(null)
  }
};

const WhatsAppNotificationService = require('../../services/whatsapp/WhatsAppNotificationService');
const { getPersistedNotificationEventType } = require('../../services/whatsapp/notificationTypes');
const {
  updatePreparationOrderStatus
} = require('../../services/preparationQueueService');

const baseOrder = {
  id: 'order-1',
  companyId: 'company-1',
  status: 'PROCESSING',
  customerPhone: '201000000000',
  customerName: 'Ø¹Ù…ÙŠÙ„ ØªØ¬Ø±Ø¨Ø©',
  metadata: JSON.stringify({ preparationStatus: 'QUALITY_CHECK' }),
  notes: null
};

describe('preparationQueueService â†’ WhatsApp notification (prep-stage-notify)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    WhatsAppNotificationService.isDuplicateNotification.mockResolvedValue(null);
    WhatsAppNotificationService.sendOrderStatusNotification.mockResolvedValue({ success: true });
    mockSharedPrisma.orderStatusConfig.findFirst.mockResolvedValue(null);
  });

  it('sends a WhatsApp status notification when a regular order moves to PACKAGED', async () => {
    mockSharedPrisma.order.findFirst.mockResolvedValue({ ...baseOrder });
    const updated = { ...baseOrder, status: 'PROCESSING' };
    mockSharedPrisma.order.update.mockResolvedValue(updated);

    await updatePreparationOrderStatus({
      orderIdentifier: 'order-1',
      companyId: 'company-1',
      status: 'PACKAGED',
      userId: 'user-1',
      userName: 'ØªØ§Ø¬Ø±'
    });

    // give the fire-and-forget setImmediate a tick
    await new Promise((resolve) => setImmediate(resolve));

    expect(WhatsAppNotificationService.sendOrderStatusNotification).toHaveBeenCalledTimes(1);
    const [orderArg, statusArg] = WhatsAppNotificationService.sendOrderStatusNotification.mock.calls[0];
    // ðŸ›¡ï¸ Bug B: Ø§Ù„ÙƒÙˆØ¯ Ø§Ù„Ø£ØµÙ„ÙŠ PACKAGED â€” Ù…Ø´ Ø§Ù„Ù…Ø­ÙˆÙŽÙ‘Ù„ PACKED â€” Ø¹Ø´Ø§Ù† Ù‚Ø§Ù„Ø¨ Ø§Ù„ØªØ§Ø¬Ø± ÙŠØªÙ„Ù‚Ø·
    expect(statusArg).toBe('PACKAGED');
    expect(orderArg.customerPhone).toBe('201000000000');
  });

  it('skips the notification when dedup detects a recent one', async () => {
    mockSharedPrisma.order.findFirst.mockResolvedValue({ ...baseOrder });
    mockSharedPrisma.order.update.mockResolvedValue({ ...baseOrder });
    WhatsAppNotificationService.isDuplicateNotification.mockResolvedValue(true);

    await updatePreparationOrderStatus({
      orderIdentifier: 'order-1',
      companyId: 'company-1',
      status: 'STOCK_SHORTAGE',
      userId: 'user-1',
      userName: 'ØªØ§Ø¬Ø±'
    });
    await new Promise((resolve) => setImmediate(resolve));

    expect(WhatsAppNotificationService.sendOrderStatusNotification).not.toHaveBeenCalled();
  });

  it('maps guest phone/name onto the notification payload for guest orders', async () => {
    mockSharedPrisma.order.findFirst.mockResolvedValue(null);
    mockSharedPrisma.guestOrder.findFirst.mockResolvedValue({
      id: 'guest-1',
      companyId: 'company-1',
      status: 'CONFIRMED',
      guestPhone: '201111111111',
      guestName: 'Ø¶ÙŠÙ',
      items: JSON.stringify([]),
      metadata: JSON.stringify({ preparationStatus: 'PREPARING' })
    });
    mockSharedPrisma.guestOrder.update.mockResolvedValue({
      id: 'guest-1',
      status: 'PACKAGED',
      guestPhone: '201111111111',
      items: JSON.stringify([])
    });

    await updatePreparationOrderStatus({
      orderIdentifier: 'guest-1',
      companyId: 'company-1',
      status: 'PACKAGED',
      userId: 'user-1',
      userName: 'ØªØ§Ø¬Ø±'
    });
    await new Promise((resolve) => setImmediate(resolve));

    expect(WhatsAppNotificationService.sendOrderStatusNotification).toHaveBeenCalledTimes(1);
    const [orderArg, statusArg] = WhatsAppNotificationService.sendOrderStatusNotification.mock.calls[0];
    expect(statusArg).toBe('PACKAGED');
    expect(orderArg.customerPhone).toBe('201111111111');
  });

  it('does not throw when the notification provider fails', async () => {
    mockSharedPrisma.order.findFirst.mockResolvedValue({ ...baseOrder });
    mockSharedPrisma.order.update.mockResolvedValue({ ...baseOrder });
    WhatsAppNotificationService.sendOrderStatusNotification.mockRejectedValue(new Error('session dead'));

    const result = await updatePreparationOrderStatus({
      orderIdentifier: 'order-1',
      companyId: 'company-1',
      status: 'READY_TO_SHIP',
      userId: 'user-1',
      userName: 'ØªØ§Ø¬Ø±'
    });

    expect(result.orderType).toBe('regular');
    await new Promise((resolve) => setImmediate(resolve));
    expect(WhatsAppNotificationService.sendOrderStatusNotification).toHaveBeenCalledTimes(1);
  });
});

describe('notificationTypes prep-stage persistence mapping (prep-stage-alias)', () => {
  it('maps raw prep-stage codes to valid log enums', () => {
    expect(getPersistedNotificationEventType('PACKAGED')).toBe('PACKED');
    expect(getPersistedNotificationEventType('PREPARING')).toBe('PICKING');
  });

  it('keeps standard order statuses intact', () => {
    expect(getPersistedNotificationEventType('RETURNED')).toBe('ORDER_RETURNED');
    expect(getPersistedNotificationEventType('CONFIRMED')).toBe('ORDER_CONFIRMED');
  });
});
