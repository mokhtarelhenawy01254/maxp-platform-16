jest.mock('../../../services/whatsapp/WhatsAppNotificationService', () => ({
  sendNotification: jest.fn().mockResolvedValue({ success: true }),
  isDuplicateNotification: jest.fn().mockResolvedValue(false),
}));

const mockPrisma = {
  whatsAppNotificationSettings: { findUnique: jest.fn() },
  whatsAppNotificationTemplate: { findFirst: jest.fn() },
  cartConversionLog: { findFirst: jest.fn() },
};

jest.mock('../../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(() => mockPrisma),
  safeQuery: jest.fn((operation) => operation()),
}));

const { handleCartCreated } = require('../../../services/orders/incompleteCartMessagingService');
const {
  sendNotification,
  isDuplicateNotification,
} = require('../../../services/whatsapp/WhatsAppNotificationService');

const baseCart = {
  cartId: 'cart-123',
  companyId: 'company-1',
  items: JSON.stringify([{ productId: 'p1', quantity: 2 }]),
  total: '500',
  checkoutData: JSON.stringify({ customerName: 'أحمد', phone: '01001234567' }),
};

describe('incompleteCartMessagingService.handleCartCreated', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.whatsAppNotificationSettings.findUnique.mockResolvedValue({
      isEnabled: true,
      incompleteCartImmediateMessage: true,
    });
    mockPrisma.cartConversionLog.findFirst.mockResolvedValue(null);
    mockPrisma.whatsAppNotificationTemplate.findFirst.mockResolvedValue({ channel: 'AUTO' });
    isDuplicateNotification.mockResolvedValue(false);
    sendNotification.mockResolvedValue({ success: true });
  });

  test('skips when the global notifications master is disabled', async () => {
    mockPrisma.whatsAppNotificationSettings.findUnique.mockResolvedValue({
      isEnabled: false,
      incompleteCartImmediateMessage: true,
    });
    const result = await handleCartCreated(baseCart);
    expect(result).toEqual({ success: false, reason: 'notifications_disabled' });
    expect(sendNotification).not.toHaveBeenCalled();
  });

  test('skips when the immediate message toggle is off', async () => {
    mockPrisma.whatsAppNotificationSettings.findUnique.mockResolvedValue({
      isEnabled: true,
      incompleteCartImmediateMessage: false,
    });
    const result = await handleCartCreated(baseCart);
    expect(result).toEqual({ success: false, reason: 'immediate_message_disabled' });
    expect(sendNotification).not.toHaveBeenCalled();
  });

  test('skips when the cart has no phone', async () => {
    const cart = { ...baseCart, checkoutData: JSON.stringify({ customerName: 'أحمد' }) };
    const result = await handleCartCreated(cart);
    expect(result).toEqual({ success: false, reason: 'no_phone' });
    expect(sendNotification).not.toHaveBeenCalled();
  });

  test('skips when the cart was already converted to an order', async () => {
    mockPrisma.cartConversionLog.findFirst.mockResolvedValue({ id: 'log-1' });
    const result = await handleCartCreated(baseCart);
    expect(result).toEqual({ success: false, reason: 'converted' });
    expect(sendNotification).not.toHaveBeenCalled();
  });

  test('skips when the same cart/phone was already notified within the dedup window', async () => {
    isDuplicateNotification.mockResolvedValue(true);
    const result = await handleCartCreated(baseCart);
    expect(result).toEqual({ success: false, reason: 'duplicate_blocked' });
    expect(sendNotification).not.toHaveBeenCalled();
  });

  test('sends INCOMPLETE_CART_FIRST_APPEARANCE with parsed cart data', async () => {
    const result = await handleCartCreated(baseCart);
    expect(result).toEqual({ success: true });
    expect(sendNotification).toHaveBeenCalledTimes(1);
    const args = sendNotification.mock.calls[0][0];
    expect(args.companyId).toBe('company-1');
    expect(args.recipientPhone).toBe('01001234567');
    expect(args.recipientName).toBe('أحمد');
    expect(args.category).toBe('ABANDONED_CART');
    expect(args.eventType).toBe('INCOMPLETE_CART_FIRST_APPEARANCE');
    expect(args.cartId).toBe('cart-123');
    expect(args.variables.itemCount).toBe('1');
    expect(args.variables.total).toBe('500');
  });

  test('passes the template channel so the merchant choice reaches sendNotification', async () => {
    mockPrisma.whatsAppNotificationTemplate.findFirst.mockResolvedValue({ channel: 'META_CLOUD' });
    await handleCartCreated(baseCart);
    expect(sendNotification.mock.calls[0][0].channel).toBe('META_CLOUD');
  });

  test('defaults the channel to AUTO when no template row exists', async () => {
    mockPrisma.whatsAppNotificationTemplate.findFirst.mockResolvedValue(null);
    await handleCartCreated(baseCart);
    expect(sendNotification.mock.calls[0][0].channel).toBe('AUTO');
  });

  test('returns error result instead of throwing when a DB call fails', async () => {
    mockPrisma.whatsAppNotificationSettings.findUnique.mockRejectedValue(new Error('db down'));
    const result = await handleCartCreated(baseCart);
    expect(result.success).toBe(false);
    expect(result.reason).toBe('error');
    expect(result.error).toBe('db down');
  });
});
