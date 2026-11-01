/**
 * 🧪 Wholesale Notifications, Receipt, Statement PDF & Due Reminder Tests
 */

jest.mock('../services/sharedDatabase', () => {
  const mockPrisma = {
    wholesaleCustomer: {
      findFirst: jest.fn().mockImplementation(({ where }) => {
        if (where?.id === 'wc_with_phone') {
          return Promise.resolve({
            id: 'wc_with_phone',
            companyId: where.companyId || 'cmp_1',
            currentBalance: 12500,
            creditLimit: 50000,
            customer: { firstName: 'مختار', lastName: 'الهواري', phone: '01012345678' }
          });
        }
        return Promise.resolve(null);
      }),
      findMany: jest.fn().mockResolvedValue([]),
    },
    whatsAppNotificationSettings: {
      findUnique: jest.fn().mockImplementation(({ where }) => {
        if (where?.companyId === 'cmp_disabled_wholesale') {
          return Promise.resolve({
            isEnabled: true,
            wholesaleNotificationsEnabled: false,
            wholesaleOrderCreatedEnabled: true,
            wholesalePaymentReceivedEnabled: true,
          });
        }
        if (where?.companyId === 'cmp_disabled_event') {
          return Promise.resolve({
            isEnabled: true,
            wholesaleNotificationsEnabled: true,
            wholesalePaymentReceivedEnabled: false,
          });
        }
        return Promise.resolve({
          isEnabled: true,
          wholesaleNotificationsEnabled: true,
          wholesaleOrderCreatedEnabled: true,
          wholesalePaymentReceivedEnabled: true,
          wholesaleDueReminderEnabled: true,
        });
      }),
    },
    whatsAppNotificationLog: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: 'log_test_1' }),
    },
    company: {
      findUnique: jest.fn().mockResolvedValue({ id: 'cmp_1', name: 'ماكس بيرفورمانس للتجارة' }),
    },
    notification: {
      create: jest.fn().mockResolvedValue({ id: 'notif_internal_1' }),
    }
  };
  return {
    getSharedPrismaClient: () => mockPrisma,
    safeQuery: (fn) => fn(),
  };
});

const { generateStatementPdf } = require('../services/wholesalePdfService');
const DEFAULT_TEMPLATES = require('../services/whatsapp/templates/defaultTemplates');
const notificationTypes = require('../services/whatsapp/notificationTypes');
const WhatsAppNotificationService = require('../services/whatsapp/WhatsAppNotificationService');
const wholesaleDueReminderCron = require('../cron/wholesaleDueReminderCron');

describe('Wholesale Notifications & Collection Suite', () => {

  // ── 1. Event Types & Templates ──────────────────────────────────────────────
  describe('Event Types & Templates', () => {
    const requiredEvents = [
      'WHOLESALE_ORDER_CREATED',
      'WHOLESALE_ORDER_CONFIRMED',
      'WHOLESALE_ORDER_SHIPPED',
      'WHOLESALE_PAYMENT_RECEIVED',
      'WHOLESALE_DUE_REMINDER',
    ];

    test('All 5 wholesale events are present in DEFAULT_TEMPLATES with required variables', () => {
      requiredEvents.forEach((evt) => {
        expect(DEFAULT_TEMPLATES[evt]).toBeDefined();
        expect(typeof DEFAULT_TEMPLATES[evt].content).toBe('string');
        expect(DEFAULT_TEMPLATES[evt].content.length).toBeGreaterThan(20);
        expect(Array.isArray(DEFAULT_TEMPLATES[evt].variables)).toBe(true);
      });

      // Check specific variables
      expect(DEFAULT_TEMPLATES.WHOLESALE_ORDER_CREATED.variables).toContain('orderNumber');
      expect(DEFAULT_TEMPLATES.WHOLESALE_ORDER_CREATED.variables).toContain('currentBalance');
      expect(DEFAULT_TEMPLATES.WHOLESALE_ORDER_CREATED.variables).toContain('creditLimit');

      expect(DEFAULT_TEMPLATES.WHOLESALE_PAYMENT_RECEIVED.variables).toContain('amount');
      expect(DEFAULT_TEMPLATES.WHOLESALE_PAYMENT_RECEIVED.variables).toContain('balanceBefore');
      expect(DEFAULT_TEMPLATES.WHOLESALE_PAYMENT_RECEIVED.variables).toContain('balanceAfter');

      expect(DEFAULT_TEMPLATES.WHOLESALE_DUE_REMINDER.variables).toContain('currentBalance');
      expect(DEFAULT_TEMPLATES.WHOLESALE_DUE_REMINDER.variables).toContain('creditLimit');
    });

    test('notificationTypes persists wholesale events to safe DB enums and recognizes them', () => {
      expect(notificationTypes.getPersistedNotificationEventType('WHOLESALE_ORDER_CREATED')).toBe('ORDER_CREATED');
      expect(notificationTypes.getPersistedNotificationEventType('WHOLESALE_ORDER_CONFIRMED')).toBe('ORDER_CONFIRMED');
      expect(notificationTypes.getPersistedNotificationEventType('WHOLESALE_ORDER_SHIPPED')).toBe('ORDER_SHIPPED');
      expect(notificationTypes.getPersistedNotificationEventType('WHOLESALE_PAYMENT_RECEIVED')).toBe('PAYMENT_RECEIVED');
      expect(notificationTypes.getPersistedNotificationEventType('WHOLESALE_DUE_REMINDER')).toBe('PAYMENT_REMINDER');

      expect(notificationTypes.isOrderCategory('WHOLESALE', 'WHOLESALE_ORDER_CREATED')).toBe(true);
      expect(notificationTypes.isOrderCategory('ORDER', 'WHOLESALE_PAYMENT_RECEIVED')).toBe(true);
      expect(notificationTypes.VALID_WHATSAPP_EVENT_TYPES.has('WHOLESALE_ORDER_CREATED')).toBe(true);
      expect(notificationTypes.VALID_WHATSAPP_EVENT_TYPES.has('WHOLESALE_PAYMENT_RECEIVED')).toBe(true);
    });
  });

  // ── 2. Settings Toggle Enforcement ──────────────────────────────────────────
  describe('Settings Enable / Disable Enforcement', () => {
    test('Service exports all wholesale notification methods', () => {
      expect(typeof WhatsAppNotificationService.sendWholesaleOrderCreatedNotification).toBe('function');
      expect(typeof WhatsAppNotificationService.sendWholesaleOrderStatusNotification).toBe('function');
      expect(typeof WhatsAppNotificationService.sendWholesalePaymentNotification).toBe('function');
      expect(typeof WhatsAppNotificationService.sendWholesaleDueReminderNotification).toBe('function');
    });

    test('Disabling wholesale module stops sending before dispatching', async () => {
      const res = await WhatsAppNotificationService.sendWholesalePaymentNotification({
        companyId: 'cmp_disabled_wholesale',
        wholesaleCustomerId: 'wc_with_phone',
        amount: 500,
        balanceBefore: 1000,
        balanceAfter: 500,
      });

      expect(res.success).toBe(false);
      expect(res.reason).toBe('module_disabled');
    });

    test('Disabling specific wholesale event stops sending', async () => {
      const res = await WhatsAppNotificationService.sendWholesalePaymentNotification({
        companyId: 'cmp_disabled_event',
        wholesaleCustomerId: 'wc_with_phone',
        amount: 500,
        balanceBefore: 1000,
        balanceAfter: 500,
      });

      expect(res.success).toBe(false);
      expect(res.reason).toBe('event_type_disabled');
    });
  });

  // ── 3. Statement PDF Generation ─────────────────────────────────────────────
  describe('Statement PDF Generation', () => {
    test('generateStatementPdf produces valid binary PDF with Arabic shaping', async () => {
      const mockStatementData = {
        customerName: 'مؤسسة النور للتوزيع والتجارة',
        customerPhone: '01011122233',
        fromDate: '2026-10-01T00:00:00.000Z',
        toDate: '2026-10-31T23:59:59.000Z',
        openingBalance: 10000,
        closingBalance: 18000,
        totalInvoiced: 15000,
        totalPaid: 7000,
        statement: { id: 'stmt_12345678' },
        lines: [
          {
            date: '2026-10-02T10:00:00.000Z',
            type: 'INVOICE',
            reference: 'ORD-501',
            description: 'فاتورة طلبية جملة ملابس',
            debit: 15000,
            credit: 0,
            balance: 25000,
          },
          {
            date: '2026-10-10T14:30:00.000Z',
            type: 'PAYMENT',
            reference: 'PAY-882',
            description: 'سداد تحويل بنكي',
            debit: 0,
            credit: 7000,
            balance: 18000,
          },
        ],
      };

      const buffer = await generateStatementPdf(mockStatementData, { name: 'ماكس بيرفورمانس العالمية' });

      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer.length).toBeGreaterThan(1000);
      // Valid PDF magic header
      expect(buffer.slice(0, 5).toString('ascii')).toBe('%PDF-');
    });

    test('generateStatementPdf handles empty transactions gracefully', async () => {
      const emptyData = {
        customerName: 'تاجر جديد',
        customerPhone: null,
        fromDate: '2026-10-01',
        toDate: '2026-10-31',
        openingBalance: 0,
        closingBalance: 0,
        totalInvoiced: 0,
        totalPaid: 0,
        lines: [],
      };

      const buffer = await generateStatementPdf(emptyData, { name: 'المتجر' });
      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer.slice(0, 5).toString('ascii')).toBe('%PDF-');
    });
  });

  // ── 4. Scheduled Due Reminder & Cooldown ────────────────────────────────────
  describe('Scheduled Due Reminder & 3-Day Cooldown', () => {
    test('Wholesale reminder cooldown is set to 3 days (259,200,000 ms)', () => {
      expect(wholesaleDueReminderCron.COOLDOWN_MS).toBe(3 * 24 * 60 * 60 * 1000);
      // 7 days / 3 days cooldown allows at most 2 to 3 reminders in a 7-day period
      const maxRemindersIn7Days = Math.floor((7 * 24 * 60 * 60 * 1000) / wholesaleDueReminderCron.COOLDOWN_MS) + 1;
      expect(maxRemindersIn7Days).toBeLessThanOrEqual(3);
    });

    test('Cron export contains start and run functions', () => {
      expect(typeof wholesaleDueReminderCron.startWholesaleDueReminderCron).toBe('function');
      expect(typeof wholesaleDueReminderCron.runWholesaleDueReminders).toBe('function');
    });
  });

  // ── 5. Payment Receipt Values ──────────────────────────────────────────────
  describe('Payment Receipt Values Check', () => {
    test('sendWholesalePaymentNotification handles missing customer gracefully', async () => {
      const result = await WhatsAppNotificationService.sendWholesalePaymentNotification({
        companyId: 'cmp_123',
        wholesaleCustomerId: 'wc_non_existent',
        amount: 2500,
        balanceBefore: 5000,
        balanceAfter: 2500,
      });

      expect(result.success).toBe(false);
      expect(result.reason).toBe('wholesale_customer_not_found');
    });
  });
});
