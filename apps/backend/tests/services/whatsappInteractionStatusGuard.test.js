/**
 * 🛡️ Unit & Integration-unit tests for WhatsApp stale-button status guard
 * Covers:
 * - WhatsAppInteractionService.resolveButtonStatusGuard (pure guard)
 * - WhatsAppInteractionService.handleButtonResponse (button IDs & quick-reply text)
 * - OrderStatusHistory rejection logging & WhatsApp customer reply
 * - orderService.validateConfiguredStatusTransition automated-channel fallback (409 + warn vs backoffice override)
 */

const mockPrisma = {
  order: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  orderStatusConfig: {
    findFirst: jest.fn(),
  },
  orderStatusHistory: {
    create: jest.fn(),
  },
  whatsAppMessage: {
    findFirst: jest.fn(),
  },
};

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(() => mockPrisma),
  safeQuery: jest.fn((fn) => fn()),
}));

const mockSendText = jest.fn().mockResolvedValue({ success: true });
jest.mock('../../services/whatsapp/WhatsAppMessageHandler', () => ({
  sendText: mockSendText,
}));

jest.mock('../../services/taskNotificationService', () => ({
  handleExecutionResponse: jest.fn(),
}));

const WhatsAppInteractionService = require('../../services/whatsapp/WhatsAppInteractionService');
const orderService = require('../../services/orderService');

describe('WhatsAppInteractionService & OrderService Status Guard', () => {
  let updateOrderStatusSpy;
  let warnSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.orderStatusConfig.findFirst.mockResolvedValue(null);
    mockPrisma.orderStatusHistory.create.mockResolvedValue({ id: 'hist-1' });
    mockPrisma.order.update.mockResolvedValue({});
    updateOrderStatusSpy = jest
      .spyOn(orderService, 'updateOrderStatus')
      .mockResolvedValue({ id: 'ord-1', status: 'CONFIRMED' });
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    if (updateOrderStatusSpy) updateOrderStatusSpy.mockRestore();
    if (warnSpy) warnSpy.mockRestore();
  });

  describe('resolveButtonStatusGuard (pure function)', () => {
    test('rejects CONFIRM on SHIPPED order with Arabic label reply', () => {
      const order = {
        id: 'ord-shipped',
        orderNumber: 'ORD-261112-001',
        customerName: 'أحمد',
        status: 'SHIPPED',
      };
      const res = WhatsAppInteractionService.resolveButtonStatusGuard(order, 'CONFIRM', null);

      expect(res.allowed).toBe(false);
      expect(res.reason).toBe('stale_button');
      expect(res.reply).toContain('ORD-261112-001');
      expect(res.reply).toContain(WhatsAppInteractionService.ORDER_STATUS_LABELS_AR.SHIPPED);
      expect(res.reply).toContain('تم الشحن 🚚');
      expect(res.reply).not.toContain('SHIPPED');
    });

    test('allows CONFIRM on PENDING order and CANCEL on PROCESSING order', () => {
      const pendingOrder = { id: '1', orderNumber: 'ORD-1', status: 'PENDING' };
      const processingOrder = { id: '2', orderNumber: 'ORD-2', status: 'PROCESSING' };

      expect(WhatsAppInteractionService.resolveButtonStatusGuard(pendingOrder, 'CONFIRM').allowed).toBe(true);
      expect(WhatsAppInteractionService.resolveButtonStatusGuard(processingOrder, 'CANCEL').allowed).toBe(true);
    });

    test('gives priority to non-empty company allowedNextStatuses over built-in policy', () => {
      const shippedOrder = { id: '1', orderNumber: 'ORD-1', status: 'SHIPPED' };

      expect(
        WhatsAppInteractionService.resolveButtonStatusGuard(shippedOrder, 'CONFIRM', ['CONFIRMED']).allowed
      ).toBe(true);
      expect(
        WhatsAppInteractionService.resolveButtonStatusGuard(shippedOrder, 'CONFIRM', ['DELIVERED']).allowed
      ).toBe(false);
    });

    test('normalizes set_status_CONFIRMED_<id> through BUTTON_STATUS_POLICY with Arabic label', () => {
      const returnedOrder = { id: '3', orderNumber: 'ORD-3', status: 'RETURNED' };
      const res = WhatsAppInteractionService.resolveButtonStatusGuard(returnedOrder, 'set_status_CONFIRMED_3');

      expect(res.allowed).toBe(false);
      expect(res.reason).toBe('stale_button');
      expect(res.reply).toContain('مرتجع ↩️');
    });
  });

  describe('handleButtonResponse stale-button & happy-path flows', () => {
    const sessionId = 'sess-1';
    const companyId = 'comp-1';
    const remoteJid = '201001234567@s.whatsapp.net';

    test('SHIPPED + CONFIRM_ORDER_<id> does NOT call orderService.updateOrderStatus, logs history, and notifies customer', async () => {
      const shippedOrder = {
        id: 'ord-100',
        orderNumber: 'ORD-261112-100',
        companyId,
        customerName: 'محمود',
        status: 'SHIPPED',
      };
      mockPrisma.order.findFirst.mockResolvedValue(shippedOrder);

      const result = await WhatsAppInteractionService.handleButtonResponse(sessionId, companyId, remoteJid, {
        id: 'CONFIRM_ORDER_ord-100',
        text: 'تأكيد الأوردر',
      });

      expect(result).toEqual({
        success: false,
        rejected: true,
        reason: 'stale_button',
        currentStatus: 'SHIPPED',
      });
      expect(updateOrderStatusSpy).not.toHaveBeenCalled();
      expect(shippedOrder.status).toBe('SHIPPED');

      expect(mockSendText).toHaveBeenCalledTimes(1);
      const sentReply = mockSendText.mock.calls[0][2];
      expect(sentReply).toContain('ORD-261112-100');
      expect(sentReply).toContain('تم الشحن 🚚');
      expect(sentReply).not.toContain('SHIPPED');

      expect(mockPrisma.orderStatusHistory.create).toHaveBeenCalledTimes(1);
      expect(mockPrisma.orderStatusHistory.create).toHaveBeenCalledWith({
        data: {
          orderId: 'ord-100',
          status: 'SHIPPED',
          oldStatus: 'SHIPPED',
          reason: 'مرفوض — زر قديم (الحالة الحالية: SHIPPED)',
          userName: 'WhatsApp Bot',
          changedBy: 'SYSTEM_WHATSAPP',
        },
      });
    });

    test('SHIPPED + confirm_order_<id> (lowercase) AND quick-reply "تأكيد الأوردر" both reject cleanly with zero exceptions', async () => {
      const shippedOrder = {
        id: 'ord-101',
        orderNumber: 'ORD-261112-101',
        companyId,
        customerName: 'سارة',
        status: 'SHIPPED',
      };
      mockPrisma.order.findFirst.mockResolvedValue(shippedOrder);

      const lowercaseResult = await WhatsAppInteractionService.handleButtonResponse(sessionId, companyId, remoteJid, {
        id: 'confirm_order_ord-101',
      });
      expect(lowercaseResult.rejected).toBe(true);
      expect(updateOrderStatusSpy).not.toHaveBeenCalled();

      mockPrisma.whatsAppMessage.findFirst.mockResolvedValue({
        interactiveData: JSON.stringify({ templateBody: 'طلبك رقم ORD-261112-101 تم شحنه' }),
        content: 'طلبك رقم ORD-261112-101',
      });

      const quickReplyResult = await WhatsAppInteractionService.handleButtonResponse(sessionId, companyId, remoteJid, {
        type: 'button',
        payload: 'تأكيد الأوردر',
        text: 'تأكيد الأوردر',
        contextMessageId: 'wamid.old.123',
      });
      expect(quickReplyResult).toEqual({
        success: false,
        rejected: true,
        reason: 'stale_button',
        currentStatus: 'SHIPPED',
      });
      expect(updateOrderStatusSpy).not.toHaveBeenCalled();
      expect(mockPrisma.orderStatusHistory.create).toHaveBeenCalledTimes(2);
    });

    test('DELIVERED + POSTPONE_ORDER_<id> rejects without updating status', async () => {
      const deliveredOrder = {
        id: 'ord-102',
        orderNumber: 'ORD-261112-102',
        companyId,
        status: 'DELIVERED',
      };
      mockPrisma.order.findFirst.mockResolvedValue(deliveredOrder);

      const result = await WhatsAppInteractionService.handleButtonResponse(sessionId, companyId, remoteJid, {
        id: 'POSTPONE_ORDER_ord-102',
      });

      expect(result).toEqual({
        success: false,
        rejected: true,
        reason: 'stale_button',
        currentStatus: 'DELIVERED',
      });
      expect(updateOrderStatusSpy).not.toHaveBeenCalled();
      expect(deliveredOrder.status).toBe('DELIVERED');
      expect(mockSendText.mock.calls[0][2]).toContain('تم التسليم بنجاح ✨');
    });

    test('OUT_FOR_DELIVERY + CONFIRM_ORDER_<id> rejects without updating status', async () => {
      const outOrder = {
        id: 'ord-103',
        orderNumber: 'ORD-261112-103',
        companyId,
        status: 'OUT_FOR_DELIVERY',
      };
      mockPrisma.order.findFirst.mockResolvedValue(outOrder);

      const result = await WhatsAppInteractionService.handleButtonResponse(sessionId, companyId, remoteJid, {
        id: 'CONFIRM_ORDER_ord-103',
      });

      expect(result.rejected).toBe(true);
      expect(result.currentStatus).toBe('OUT_FOR_DELIVERY');
      expect(updateOrderStatusSpy).not.toHaveBeenCalled();
      expect(mockSendText.mock.calls[0][2]).toContain('مع المندوب للتسليم اليوم 🛵');
    });

    test('PENDING + CONFIRM_ORDER_<id> confirms normally and passes source: whatsapp_bot', async () => {
      const pendingOrder = {
        id: 'ord-104',
        orderNumber: 'ORD-261112-104',
        companyId,
        status: 'PENDING',
        governorate: 'القاهرة',
        city: 'مدينة نصر',
      };
      mockPrisma.order.findFirst.mockResolvedValue(pendingOrder);
      mockPrisma.order.findUnique.mockResolvedValue(pendingOrder);

      const result = await WhatsAppInteractionService.handleButtonResponse(sessionId, companyId, remoteJid, {
        id: 'CONFIRM_ORDER_ord-104',
      });

      expect(result).toEqual({ id: 'ord-1', status: 'CONFIRMED' });
      expect(updateOrderStatusSpy).toHaveBeenCalledWith(
        'ord-104',
        companyId,
        'CONFIRMED',
        expect.any(String),
        'SYSTEM_WHATSAPP',
        'WhatsApp Bot',
        null,
        false,
        expect.objectContaining({ source: 'whatsapp_bot' })
      );
      expect(mockPrisma.orderStatusHistory.create).not.toHaveBeenCalled();
    });

    test('PROCESSING + CANCEL_ORDER_<id> cancels normally', async () => {
      const processingOrder = {
        id: 'ord-105',
        orderNumber: 'ORD-261112-105',
        companyId,
        status: 'PROCESSING',
      };
      mockPrisma.order.findFirst.mockResolvedValue(processingOrder);
      mockPrisma.order.findUnique.mockResolvedValue(processingOrder);
      updateOrderStatusSpy.mockResolvedValueOnce({ id: 'ord-105', status: 'CANCELLED' });

      const result = await WhatsAppInteractionService.handleButtonResponse(sessionId, companyId, remoteJid, {
        id: 'CANCEL_ORDER_ord-105',
      });

      expect(result).toEqual({ id: 'ord-105', status: 'CANCELLED' });
      expect(updateOrderStatusSpy).toHaveBeenCalledWith(
        'ord-105',
        companyId,
        'CANCELLED',
        expect.any(String),
        'SYSTEM_WHATSAPP',
        'WhatsApp Bot',
        null,
        false,
        expect.objectContaining({ skipCallAttemptGuard: true, source: 'whatsapp_bot' })
      );
    });
  });

  describe('orderService.validateConfiguredStatusTransition automated-channel guard', () => {
    test('SHIPPED -> CONFIRMED with source: whatsapp_bot and allowedNextStatuses = null throws 409 and warns once', async () => {
      jest.spyOn(orderService, 'getPrisma').mockReturnValue(mockPrisma);
      mockPrisma.orderStatusConfig.findFirst.mockResolvedValue({ allowedNextStatuses: null });

      let caughtError = null;
      try {
        await orderService.validateConfiguredStatusTransition('comp-1', 'SHIPPED', 'CONFIRMED', {
          source: 'whatsapp_bot',
        });
      } catch (err) {
        caughtError = err;
      }

      expect(caughtError).not.toBeNull();
      expect(caughtError.statusCode).toBe(409);
      expect(warnSpy).toHaveBeenCalledTimes(1);
    });

    test('same transition from backoffice (isOverride=true or skipValidation=true) passes without error', async () => {
      jest.spyOn(orderService, 'getPrisma').mockReturnValue(mockPrisma);
      mockPrisma.orderStatusConfig.findFirst.mockResolvedValue({ allowedNextStatuses: null });

      await expect(
        orderService.validateConfiguredStatusTransition('comp-1', 'SHIPPED', 'CONFIRMED', {
          source: 'whatsapp_bot',
          isOverride: true,
        })
      ).resolves.toBeUndefined();

      await expect(
        orderService.validateConfiguredStatusTransition('comp-1', 'SHIPPED', 'CONFIRMED', {
          source: 'whatsapp_bot',
          skipValidation: true,
        })
      ).resolves.toBeUndefined();
    });

    test('PROCESSING -> CONFIRMED with source: whatsapp_bot logs warn without blocking (Decision #6)', async () => {
      jest.spyOn(orderService, 'getPrisma').mockReturnValue(mockPrisma);
      mockPrisma.orderStatusConfig.findFirst.mockResolvedValue({ allowedNextStatuses: null });

      await expect(
        orderService.validateConfiguredStatusTransition('comp-1', 'PROCESSING', 'CONFIRMED', {
          source: 'whatsapp_bot',
        })
      ).resolves.toBeUndefined();

      expect(warnSpy).toHaveBeenCalledTimes(1);
    });
  });
});
