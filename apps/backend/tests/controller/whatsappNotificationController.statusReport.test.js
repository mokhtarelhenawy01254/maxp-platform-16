/**
 * Regression tests for getStatusReport — the daily order-status report.
 * Aggregates whatsAppNotificationLog by eventType + messageType (TEMPLATE = meta / else regular)
 * + delivery status, and returns drill-down items with order/customer/template info.
 */
jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(),
  safeQuery: (fn) => fn(),
}));

jest.mock('../../services/whatsapp/WhatsAppNotificationService', () => ({
  __esModule: true,
  default: {},
  sendNotification: jest.fn(),
  sendOrderStatusNotification: jest.fn(),
}));

const { getSharedPrismaClient } = require('../../services/sharedDatabase');
const { getStatusReport } = require('../../controller/whatsappNotificationController');

function makeLog(overrides = {}) {
  return {
    id: 'log-1',
    companyId: 'company-1',
    templateId: 'tpl-1',
    sessionId: 's1',
    recipientPhone: '201000000000',
    recipientName: 'أحمد',
    category: 'ORDERS',
    eventType: 'ORDER_CONFIRMED',
    content: 'msg',
    orderId: 'ord-1',
    customerId: 'cust-1',
    status: 'DELIVERED',
    messageType: 'TEMPLATE',
    sentAt: new Date('2026-08-11T10:00:00Z'),
    createdAt: new Date('2026-08-11T10:00:00Z'),
    failureReason: null,
    errorCode: null,
    whatsapp_notification_templates: {
      name: 'قالب التأكيد',
      metaTemplateName: 'order_confirm_ar',
      channel: 'META_CLOUD',
      headerUsesOrderProduct: true,
    },
    order: { orderNumber: 'ORD-100' },
    customer: { firstName: 'أحمد', lastName: 'محمد' },
    ...overrides,
  };
}

function buildPrisma({ logs, total }) {
  return {
    whatsAppNotificationLog: {
      findMany: jest.fn().mockResolvedValue(logs),
      count: jest.fn().mockResolvedValue(total),
    },
  };
}

function makeReqRes(prisma, query = {}) {
  getSharedPrismaClient.mockReturnValue(prisma);
  const req = { user: { companyId: 'company-1' }, query };
  const res = {
    json: jest.fn(),
    status: jest.fn().mockReturnThis(),
  };
  return { req, res };
}

describe('GET /whatsapp/notifications/status-report', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('يجمّع السجلات حسب الحالة ويميّز ميتا (TEMPLATE) عن عادي (TEXT)', async () => {
    const prisma = buildPrisma({
      logs: [
        makeLog({ id: 'a', eventType: 'ORDER_CONFIRMED', messageType: 'TEMPLATE', status: 'DELIVERED' }),
        makeLog({ id: 'b', eventType: 'ORDER_CONFIRMED', messageType: 'TEMPLATE', status: 'SENT' }),
        makeLog({ id: 'c', eventType: 'ORDER_SHIPPED', messageType: 'TEXT', status: 'FAILED', failureReason: 'rejected', errorCode: '131047' }),
        makeLog({ id: 'd', eventType: 'ORDER_SHIPPED', messageType: 'TEXT', status: 'DELIVERED' }),
      ],
      total: 4,
    });
    const { req, res } = makeReqRes(prisma);
    await getStatusReport(req, res);

    const body = res.json.mock.calls[0][0];
    expect(body.success).toBe(true);
    expect(body.summary.total).toBe(4);
    expect(body.summary.meta).toBe(2);
    expect(body.summary.regular).toBe(2);
    expect(body.summary.delivered).toBe(2);
    expect(body.summary.failed).toBe(1);

    const confirmed = body.byStatus.find((r) => r.eventType === 'ORDER_CONFIRMED');
    expect(confirmed.total).toBe(2);
    expect(confirmed.meta).toBe(2);
    expect(confirmed.regular).toBe(0);

    const shipped = body.byStatus.find((r) => r.eventType === 'ORDER_SHIPPED');
    expect(shipped.meta).toBe(0);
    expect(shipped.regular).toBe(2);
    expect(shipped.failed).toBe(1);

    expect(body.byStatus).toHaveLength(2);
  });

  test('يرجع تفاصيل drill-down بأرقام الطلبات وأسماء القوالب ونوع الإرسال', async () => {
    const prisma = buildPrisma({ logs: [makeLog()], total: 1 });
    const { req, res } = makeReqRes(prisma);
    await getStatusReport(req, res);

    const body = res.json.mock.calls[0][0];
    expect(body.items).toHaveLength(1);
    const item = body.items[0];
    expect(item.orderNumber).toBe('ORD-100');
    expect(item.customerName).toBe('أحمد');
    expect(item.templateName).toBe('قالب التأكيد');
    expect(item.metaTemplateName).toBe('order_confirm_ar');
    expect(item.messageType).toBe('TEMPLATE');
    expect(item.headerUsesOrderProduct).toBe(true);
  });

  test('يفلتر حسب eventType لو اترسل في الـ query', async () => {
    const prisma = buildPrisma({ logs: [makeLog()], total: 1 });
    const { req, res } = makeReqRes(prisma, { eventType: 'ORDER_CONFIRMED' });
    await getStatusReport(req, res);

    const where = prisma.whatsAppNotificationLog.findMany.mock.calls[0][0].where;
    expect(where.eventType).toBe('ORDER_CONFIRMED');
    expect(where.createdAt.gte).toBeInstanceOf(Date);
    expect(where.createdAt.lte).toBeInstanceOf(Date);
  });

  test('يدعم فلترة eventTypes (مفصولة بفواصل) لتقييد التقرير على أحداث محددة', async () => {
    const prisma = buildPrisma({ logs: [makeLog({ eventType: 'LOYALTY_POINTS_AWARDED' })], total: 1 });
    const { req, res } = makeReqRes(prisma, { eventTypes: 'LOYALTY_POINTS_AWARDED,CASHBACK_CREDITED' });
    await getStatusReport(req, res);

    const where = prisma.whatsAppNotificationLog.findMany.mock.calls[0][0].where;
    expect(where.eventType).toEqual({ in: ['LOYALTY_POINTS_AWARDED', 'CASHBACK_CREDITED'] });
    expect(where.category).toBeUndefined();
    expect(where.OR).toBeUndefined();
  });

  test('eventTypes له أولوية على category لو اتبعت الاتنين', async () => {
    const prisma = buildPrisma({ logs: [makeLog()], total: 1 });
    const { req, res } = makeReqRes(prisma, { eventTypes: 'LOYALTY_POINTS_AWARDED', category: 'MARKETING' });
    await getStatusReport(req, res);

    const where = prisma.whatsAppNotificationLog.findMany.mock.calls[0][0].where;
    expect(where.eventType).toEqual({ in: ['LOYALTY_POINTS_AWARDED'] });
    expect(where.category).toBeUndefined();
  });

  test('يدعم فلترة category مخصصة (مفصولة بفواصل) بدل فئات الطلبات — لإشعارات العملاء', async () => {
    const prisma = buildPrisma({ logs: [makeLog({ category: 'MARKETING', eventType: 'LOYALTY_POINTS_AWARDED' })], total: 1 });
    const { req, res } = makeReqRes(prisma, { category: 'MARKETING,CUSTOMER' });
    await getStatusReport(req, res);

    const where = prisma.whatsAppNotificationLog.findMany.mock.calls[0][0].where;
    expect(where.category).toEqual({ in: ['MARKETING', 'CUSTOMER'] });
    expect(where.OR).toBeUndefined();
  });

  test('فلترة category فارغة ترجع للفئات الافتراضية للطلبات', async () => {
    const prisma = buildPrisma({ logs: [makeLog()], total: 1 });
    const { req, res } = makeReqRes(prisma, { category: '' });
    await getStatusReport(req, res);

    const where = prisma.whatsAppNotificationLog.findMany.mock.calls[0][0].where;
    expect(where.category).toBeUndefined();
    expect(Array.isArray(where.OR)).toBe(true);
  });

  test('الفلترة الافتراضية بتستخدم category فقط (ممنوع startsWith على enum eventType)', async () => {
    const prisma = buildPrisma({ logs: [makeLog()], total: 1 });
    const { req, res } = makeReqRes(prisma);
    await getStatusReport(req, res);

    const where = prisma.whatsAppNotificationLog.findMany.mock.calls[0][0].where;
    expect(Array.isArray(where.OR)).toBe(true);
    expect(where.OR).toContainEqual({ category: 'ORDER' });
    expect(where.OR).toContainEqual({ category: 'ORDERS' });
    expect(where.OR).toContainEqual({ category: 'ABANDONED_CART' });
    const usesEnumStartsWith = JSON.stringify(where).includes('startsWith');
    expect(usesEnumStartsWith).toBe(false);
  });

  test('بيرجع نتيجة فارغة لو جدول السجلات مش موجود (P2021) بدل 500', async () => {
    const prisma = {
      whatsAppNotificationLog: {
        findMany: jest.fn().mockRejectedValue({ code: 'P2021', message: 'table does not exist' }),
        count: jest.fn().mockRejectedValue({ code: 'P2021' }),
      },
    };
    const { req, res } = makeReqRes(prisma);
    await getStatusReport(req, res);
    const body = res.json.mock.calls[0][0];
    expect(body.success).toBe(true);
    expect(body.summary.total).toBe(0);
    expect(body.items).toEqual([]);
    expect(body.warning).toBeDefined();
  });
});
