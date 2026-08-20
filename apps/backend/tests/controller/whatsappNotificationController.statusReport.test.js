/**
 * Regression tests for getStatusReport ΓÇö the daily order-status report.
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
    recipientName: '╪ú╪¡┘à╪»',
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
      name: '┘é╪º┘ä╪¿ ╪º┘ä╪¬╪ú┘â┘è╪»',
      metaTemplateName: 'order_confirm_ar',
      channel: 'META_CLOUD',
      headerUsesOrderProduct: true,
    },
    order: { orderNumber: 'ORD-100' },
    customer: { firstName: '╪ú╪¡┘à╪»', lastName: '┘à╪¡┘à╪»' },
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

  test('┘è╪¼┘à┘æ╪╣ ╪º┘ä╪│╪¼┘ä╪º╪¬ ╪¡╪│╪¿ ╪º┘ä╪¡╪º┘ä╪⌐ ┘ê┘è┘à┘è┘æ╪▓ ┘à┘è╪¬╪º (TEMPLATE) ╪╣┘å ╪╣╪º╪»┘è (TEXT)', async () => {
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

  test('┘è╪▒╪¼╪╣ ╪¬┘ü╪º╪╡┘è┘ä drill-down ╪¿╪ú╪▒┘é╪º┘à ╪º┘ä╪╖┘ä╪¿╪º╪¬ ┘ê╪ú╪│┘à╪º╪í ╪º┘ä┘é┘ê╪º┘ä╪¿ ┘ê┘å┘ê╪╣ ╪º┘ä╪Ñ╪▒╪│╪º┘ä', async () => {
    const prisma = buildPrisma({ logs: [makeLog()], total: 1 });
    const { req, res } = makeReqRes(prisma);
    await getStatusReport(req, res);

    const body = res.json.mock.calls[0][0];
    expect(body.items).toHaveLength(1);
    const item = body.items[0];
    expect(item.orderNumber).toBe('ORD-100');
    expect(item.customerName).toBe('╪ú╪¡┘à╪»');
    expect(item.templateName).toBe('┘é╪º┘ä╪¿ ╪º┘ä╪¬╪ú┘â┘è╪»');
    expect(item.metaTemplateName).toBe('order_confirm_ar');
    expect(item.messageType).toBe('TEMPLATE');
    expect(item.headerUsesOrderProduct).toBe(true);
  });

  test('┘è┘ü┘ä╪¬╪▒ ╪¡╪│╪¿ eventType ┘ä┘ê ╪º╪¬╪▒╪│┘ä ┘ü┘è ╪º┘ä┘Ç query', async () => {
    const prisma = buildPrisma({ logs: [makeLog()], total: 1 });
    const { req, res } = makeReqRes(prisma, { eventType: 'ORDER_CONFIRMED' });
    await getStatusReport(req, res);

    const where = prisma.whatsAppNotificationLog.findMany.mock.calls[0][0].where;
    expect(where.eventType).toBe('ORDER_CONFIRMED');
    expect(where.createdAt.gte).toBeInstanceOf(Date);
    expect(where.createdAt.lte).toBeInstanceOf(Date);
  });

  test('┘è╪»╪╣┘à ┘ü┘ä╪¬╪▒╪⌐ eventTypes (┘à┘ü╪╡┘ê┘ä╪⌐ ╪¿┘ü┘ê╪º╪╡┘ä) ┘ä╪¬┘é┘è┘è╪» ╪º┘ä╪¬┘é╪▒┘è╪▒ ╪╣┘ä┘ë ╪ú╪¡╪»╪º╪½ ┘à╪¡╪»╪»╪⌐', async () => {
    const prisma = buildPrisma({ logs: [makeLog({ eventType: 'LOYALTY_POINTS_AWARDED' })], total: 1 });
    const { req, res } = makeReqRes(prisma, { eventTypes: 'LOYALTY_POINTS_AWARDED,CASHBACK_CREDITED' });
    await getStatusReport(req, res);

    const where = prisma.whatsAppNotificationLog.findMany.mock.calls[0][0].where;
    expect(where.eventType).toEqual({ in: ['LOYALTY_POINTS_AWARDED', 'CASHBACK_CREDITED'] });
    expect(where.category).toBeUndefined();
    expect(where.OR).toBeUndefined();
  });

  test('eventTypes ┘ä┘ç ╪ú┘ê┘ä┘ê┘è╪⌐ ╪╣┘ä┘ë category ┘ä┘ê ╪º╪¬╪¿╪╣╪¬ ╪º┘ä╪º╪¬┘å┘è┘å', async () => {
    const prisma = buildPrisma({ logs: [makeLog()], total: 1 });
    const { req, res } = makeReqRes(prisma, { eventTypes: 'LOYALTY_POINTS_AWARDED', category: 'MARKETING' });
    await getStatusReport(req, res);

    const where = prisma.whatsAppNotificationLog.findMany.mock.calls[0][0].where;
    expect(where.eventType).toEqual({ in: ['LOYALTY_POINTS_AWARDED'] });
    expect(where.category).toBeUndefined();
  });

  test('┘è╪¿┘å┘è eventType ╪╡╪º┘ä╪¡ ┘à┘å mixed list (╪¿┘è╪┤┘è┘ä ╪º┘ä┘é┘è┘à ╪º┘ä┘ä┘è ┘à╪┤ enum ╪╣╪┤╪º┘å ╪¬┘à┘å╪╣ 500)', async () => {
    const prisma = buildPrisma({ logs: [makeLog()], total: 1 });
    const { req, res } = makeReqRes(prisma, { eventTypes: 'LOYALTY_POINTS_AWARDED,AUTO_DISCOUNT_COUPON_GRANTED,__INVALID__' });
    await getStatusReport(req, res);

    const where = prisma.whatsAppNotificationLog.findMany.mock.calls[0][0].where;
    expect(where.eventType).toEqual({ in: ['LOYALTY_POINTS_AWARDED'] });
  });

  test('eventTypes ┘â┘ä┘ç╪º ┘à╪┤ ╪╡╪º┘ä╪¡╪⌐ ΓåÆ ╪¿┘è╪¬╪▒╪┤╪¡ ┘ä┘ä┘ü╪ª╪º╪¬ ╪º┘ä╪º┘ü╪¬╪▒╪º╪╢┘è╪⌐ ╪¿╪»┘ä 500', async () => {
    const prisma = buildPrisma({ logs: [makeLog()], total: 1 });
    const { req, res } = makeReqRes(prisma, { eventTypes: 'AUTO_DISCOUNT_COUPON_GRANTED,AUTO_DISCOUNT_COUPON_EXPIRING' });
    await getStatusReport(req, res);

    const where = prisma.whatsAppNotificationLog.findMany.mock.calls[0][0].where;
    expect(where.eventType).toBeUndefined();
    expect(Array.isArray(where.OR)).toBe(true);
  });

  test('┘è╪»╪╣┘à ┘ü┘ä╪¬╪▒╪⌐ category ┘à╪«╪╡╪╡╪⌐ (┘à┘ü╪╡┘ê┘ä╪⌐ ╪¿┘ü┘ê╪º╪╡┘ä) ╪¿╪»┘ä ┘ü╪ª╪º╪¬ ╪º┘ä╪╖┘ä╪¿╪º╪¬ ΓÇö ┘ä╪Ñ╪┤╪╣╪º╪▒╪º╪¬ ╪º┘ä╪╣┘à┘ä╪º╪í', async () => {
    const prisma = buildPrisma({ logs: [makeLog({ category: 'MARKETING', eventType: 'LOYALTY_POINTS_AWARDED' })], total: 1 });
    const { req, res } = makeReqRes(prisma, { category: 'MARKETING,CUSTOMER' });
    await getStatusReport(req, res);

    const where = prisma.whatsAppNotificationLog.findMany.mock.calls[0][0].where;
    expect(where.category).toEqual({ in: ['MARKETING', 'CUSTOMER'] });
    expect(where.OR).toBeUndefined();
  });

  test('┘ü┘ä╪¬╪▒╪⌐ category ┘ü╪º╪▒╪║╪⌐ ╪¬╪▒╪¼╪╣ ┘ä┘ä┘ü╪ª╪º╪¬ ╪º┘ä╪º┘ü╪¬╪▒╪º╪╢┘è╪⌐ ┘ä┘ä╪╖┘ä╪¿╪º╪¬', async () => {
    const prisma = buildPrisma({ logs: [makeLog()], total: 1 });
    const { req, res } = makeReqRes(prisma, { category: '' });
    await getStatusReport(req, res);

    const where = prisma.whatsAppNotificationLog.findMany.mock.calls[0][0].where;
    expect(where.category).toBeUndefined();
    expect(Array.isArray(where.OR)).toBe(true);
  });

  test('╪º┘ä┘ü┘ä╪¬╪▒╪⌐ ╪º┘ä╪º┘ü╪¬╪▒╪º╪╢┘è╪⌐ ╪¿╪¬╪│╪¬╪«╪»┘à category ┘ü┘é╪╖ (┘à┘à┘å┘ê╪╣ startsWith ╪╣┘ä┘ë enum eventType)', async () => {
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

  test('╪¿┘è╪▒╪¼╪╣ ┘å╪¬┘è╪¼╪⌐ ┘ü╪º╪▒╪║╪⌐ ┘ä┘ê ╪¼╪»┘ê┘ä ╪º┘ä╪│╪¼┘ä╪º╪¬ ┘à╪┤ ┘à┘ê╪¼┘ê╪» (P2021) ╪¿╪»┘ä 500', async () => {
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
