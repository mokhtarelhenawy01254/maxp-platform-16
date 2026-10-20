/**
 * 🧪 whatsappAnnouncementGuard.test.js
 *
 * تيكت 2026-10-20 — «مسار ANNOUNCEMENT بيفشل بحجم 1,000/ساعة (بدون قالب)»:
 *  (أ) ANNOUNCEMENT بدون قالب على META_CLOUD  → صفر نداء لميتا + سطر NO_TEMPLATE_CONFIGURED واحد
 *  (ب) أي مسار جديد بينادي sendNotification   → الحارس المركزي بيمنعه تلقائيًا
 *  (ج) بعد فشل قالب غير معتمد                → المحاولات تتوقف 24 ساعة (fake timers)
 *  (د) LOYALTY_POINTS_AWARDED / CASHBACK_CREDITED → بارامترات مطابقة لقالب ميتا المعتمد
 *  (هـ) صفر ريجريشن على ORDER_*              → الإرسال شغال زي الأول
 *  (و) NO_SESSION                            → سطر/صف واحد بدل صف لكل مستلم
 *
 * كل الاختبارات mocks — مفيش أي إرسال حقيقي ولا اتصال DB.
 */

let mockPrismaInstance = null;

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: () => mockPrismaInstance,
  safeQuery: (fn) => fn(),
}));

jest.mock('../../services/whatsapp/WhatsAppManager', () => ({
  getCompanySessions: jest.fn(() => []),
  getSession: jest.fn(() => undefined),
}));

jest.mock('../../services/whatsapp/WhatsAppMessageHandler', () => ({
  sendText: jest.fn().mockResolvedValue({ key: { id: 'wamid-text' } }),
  sendButtons: jest.fn().mockResolvedValue({ key: { id: 'wamid-buttons' } }),
  sendList: jest.fn().mockResolvedValue({ key: { id: 'wamid-list' } }),
  sendTemplateMessage: jest.fn().mockResolvedValue({ id: 'wamid-template' }),
}));

jest.mock('../../services/whatsapp/sessionBalancer', () => ({
  getOrAssignSession: jest.fn(async () => 'sess-meta-1'),
  ensureRuntimeSessionConnected: jest.fn(async () => ({ status: 'connected', provider: 'BAILEYS', sessionId: 'sess-1' })),
  findAlternativeBaileysSession: jest.fn(async () => null),
  isMetaWindowError: jest.fn(() => false),
}));

jest.mock('../../services/orderTemplateSeeding', () => ({
  META_ORDER_BLUEPRINTS: {},
  ensureOrderTemplate: jest.fn(async () => null),
}));

jest.mock('../../utils/companyBranding', () => ({
  getCompanyBranding: jest.fn(async () => ({ name: 'Test Co', domain: 'test.local' })),
}));

jest.mock('../../services/whatsapp/providers/MetaCloudProvider', () => ({
  listTemplates: jest.fn(async () => []),
}));

const WhatsAppMessageHandler = require('../../services/whatsapp/WhatsAppMessageHandler');
const MetaCloudProvider = require('../../services/whatsapp/providers/MetaCloudProvider');
const WhatsAppNotificationService = require('../../services/whatsapp/WhatsAppNotificationService');
const NotificationSendGuard = require('../../services/whatsapp/notificationSendGuard');

const { sendNotification } = WhatsAppNotificationService;

function buildPrismaMock(overrides = {}) {
  const prisma = {
    whatsAppNotificationSettings: {
      findUnique: jest.fn(async () => ({ isEnabled: true, quietHoursEnabled: false })),
      create: jest.fn(async (args) => ({ id: 'settings-1', ...(args?.data || {}) })),
    },
    whatsAppSession: {
      findFirst: jest.fn(async () => ({ id: 'sess-meta-1', status: 'CONNECTED', provider: 'META_CLOUD' })),
      findUnique: jest.fn(async () => ({ id: 'sess-meta-1', status: 'CONNECTED', provider: 'META_CLOUD' })),
    },
    whatsAppNotificationTemplate: {
      findFirst: jest.fn(async () => null),
      findMany: jest.fn(async () => []),
      findUnique: jest.fn(async () => null),
    },
    whatsAppNotificationLog: {
      create: jest.fn(async () => ({ id: 'log-1' })),
      update: jest.fn(async () => ({})),
      findFirst: jest.fn(async () => null),
    },
    whatsAppNotificationQueue: {
      create: jest.fn(async () => ({ id: 'queue-1' })),
      update: jest.fn(async () => ({})),
      updateMany: jest.fn(async () => ({ count: 0 })),
      findMany: jest.fn(async () => []),
    },
    company: {
      findUnique: jest.fn(async () => ({ id: 'company-1', slug: 'test', customDomain: null })),
      findFirst: jest.fn(async () => ({ id: 'company-1' })),
    },
    $queryRaw: jest.fn(async () => []),
    ...overrides,
  };
  return prisma;
}

function baseSendOptions(overrides = {}) {
  return {
    companyId: 'company-1',
    recipientPhone: '201000000001',
    recipientName: 'مستلم',
    recipientType: 'ADMIN',
    category: 'HR',
    eventType: 'ANNOUNCEMENT',
    variables: { title: 'عنوان', content: 'نص', signature: 'توقيع' },
    priority: 1,
    ...overrides,
  };
}

const isNoTemplateLine = (msg) => String(msg).includes('NO_TEMPLATE_CONFIGURED');

describe('WhatsApp ANNOUNCEMENT central send guard', () => {
  let warnSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    NotificationSendGuard.resetGuardState();
    mockPrismaInstance = buildPrismaMock();
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  // ────────────────────────────────────────────────────────────────────────────
  // (أ) ANNOUNCEMENT بدون قالب → صفر نداء لميتا + سطر واحد لكل دفعة
  // ────────────────────────────────────────────────────────────────────────────
  test('(أ) ANNOUNCEMENT بدون قالب على META_CLOUD: صفر إرسال + سطر NO_TEMPLATE_CONFIGURED واحد لـ5 مستلمين', async () => {
    const phones = ['201000000001', '201000000002', '201000000003', '201000000004', '201000000005'];
    const results = [];

    for (const phone of phones) {
      results.push(await sendNotification(baseSendOptions({ recipientPhone: phone })));
    }

    // 1) ولا أي نداء لميتا أو Baileys
    expect(WhatsAppMessageHandler.sendTemplateMessage).not.toHaveBeenCalled();
    expect(WhatsAppMessageHandler.sendText).not.toHaveBeenCalled();
    expect(WhatsAppMessageHandler.sendButtons).not.toHaveBeenCalled();

    // 2) ولا صف FAILED لكل مستلم (ده اللي كان بيعمل ~1000 صف/ساعة)
    expect(mockPrismaInstance.whatsAppNotificationLog.create).not.toHaveBeenCalled();

    // 3) سطر واحد فقط للدفعة كلها
    const guardLines = warnSpy.mock.calls.map((c) => c[0]).filter(isNoTemplateLine);
    expect(guardLines).toHaveLength(1);

    // 4) كل النتائج مصنّفة بوضوح
    expect(results[0].errorCode).toBe('NO_TEMPLATE_CONFIGURED');
    expect(results[0].templateId).toBeNull();
    expect(results[0].success).toBe(false);
    results.slice(1).forEach((r) => {
      expect(r.errorCode).toBe('NO_TEMPLATE_CONFIGURED');
      expect(r.suppressed).toBe(true);
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // (ب) مسار جديد بيستخدم طبقة الإرسال → الحارس بيمنعه تلقائيًا
  // ────────────────────────────────────────────────────────────────────────────
  test('(ب) مسار جديد (حدث غير معروف) بيرث الحارس المركزي بدون أي كود إضافي', async () => {
    // مسار وهمي جديد تمامًا — مفيش قالب ولا default template في الكود
    const result = await sendNotification(
      baseSendOptions({
        eventType: 'BRAND_NEW_BROADCAST_EVENT',
        category: 'SYSTEM',
        contentOverride: 'رسالة إعلانية جديدة',
        variables: {},
      })
    );

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('NO_TEMPLATE_CONFIGURED');
    expect(WhatsAppMessageHandler.sendTemplateMessage).not.toHaveBeenCalled();
    expect(WhatsAppMessageHandler.sendText).not.toHaveBeenCalled();
    expect(
      warnSpy.mock.calls.map((c) => c[0]).filter(isNoTemplateLine)
    ).toHaveLength(1);
  });

  // ────────────────────────────────────────────────────────────────────────────
  // (ج) بعد فشل قالب غير معتمد → قفل 24 ساعة (fake timers)
  // ────────────────────────────────────────────────────────────────────────────
  test('(ج) قالب غير معتمد: المحاولات تتوقف 24 ساعة ثم تسمح بمحاولة واحدة جديدة', async () => {
    jest.useFakeTimers({ now: new Date('2026-10-20T10:00:00Z'), doNotFake: ['nextTick', 'setImmediate'] });

    mockPrismaInstance.whatsAppNotificationTemplate.findFirst.mockResolvedValue({
      id: 'tpl-pending',
      companyId: 'company-1',
      eventType: 'ANNOUNCEMENT',
      isActive: true,
      channel: 'META_CLOUD',
      metaTemplateName: 'announcement_v1',
      metaTemplateStatus: 'PENDING',
      content: 'إعلان',
      variables: JSON.stringify(['title']),
    });
    mockPrismaInstance.whatsAppNotificationTemplate.findMany.mockResolvedValue([]);

    const first = await sendNotification(baseSendOptions({ recipientPhone: '201000000010' }));
    expect(first.errorCode).toBe('META_TEMPLATE_NOT_APPROVED');
    expect(first.suppressed).toBe(false);
    expect(WhatsAppMessageHandler.sendTemplateMessage).not.toHaveBeenCalled();

    const notApprovedLines = () =>
      warnSpy.mock.calls.map((c) => c[0]).filter((m) => String(m).includes('META_TEMPLATE_NOT_APPROVED'));
    expect(notApprovedLines()).toHaveLength(1);

    // +1 ساعة → لسه مقفول، ولا سطر جديد
    jest.advanceTimersByTime(60 * 60 * 1000);
    const second = await sendNotification(baseSendOptions({ recipientPhone: '201000000011' }));
    expect(second.errorCode).toBe('META_TEMPLATE_NOT_APPROVED');
    expect(second.suppressed).toBe(true);
    expect(notApprovedLines()).toHaveLength(1);

    // +22 ساعة كمان (المجموع 23 ساعة) → لسه جوه الـ24 ساعة
    jest.advanceTimersByTime(22 * 60 * 60 * 1000);
    const third = await sendNotification(baseSendOptions({ recipientPhone: '201000000012' }));
    expect(third.suppressed).toBe(true);

    // بعد 25 ساعة → القفل انتهى، محاولة واحدة جديدة (وسطر جديد) — ميتا لسه مش بتتنادى
    jest.advanceTimersByTime(2 * 60 * 60 * 1000);
    const fourth = await sendNotification(baseSendOptions({ recipientPhone: '201000000013' }));
    expect(fourth.suppressed).toBe(false);
    expect(fourth.errorCode).toBe('META_TEMPLATE_NOT_APPROVED');
    expect(notApprovedLines()).toHaveLength(2);
    expect(WhatsAppMessageHandler.sendTemplateMessage).not.toHaveBeenCalled();
  });

  // ────────────────────────────────────────────────────────────────────────────
  // (د1) LOYALTY_POINTS_AWARDED: متغيرات زيادة → تتقص لعدد قالب ميتا بدل mismatch
  // ────────────────────────────────────────────────────────────────────────────
  test('(د1) LOYALTY_POINTS_AWARDED: 5 متغيرات محلية vs 3 في القالب المعتمد → 3 بارامترات بدون mismatch', async () => {
    MetaCloudProvider.listTemplates.mockResolvedValue([
      { name: 'loyalty_points_v9', components: [{ type: 'BODY', text: 'مرحبا {{1}} كسبت {{2}} نقطة. رصيدك {{3}}' }] },
    ]);

    mockPrismaInstance.whatsAppNotificationSettings.findUnique.mockResolvedValue({
      isEnabled: true,
      quietHoursEnabled: false,
      loyaltyEnabled: true,
    });
    mockPrismaInstance.whatsAppNotificationTemplate.findFirst.mockResolvedValue({
      id: 'tpl-loyalty',
      companyId: 'company-1',
      eventType: 'LOYALTY_POINTS_AWARDED',
      isActive: true,
      channel: 'META_CLOUD',
      metaTemplateName: 'loyalty_points_v9',
      metaTemplateStatus: 'APPROVED',
      content: 'مرحبا {{customerName}} كسبت {{points}} نقطة. رصيدك {{currentPoints}} — {{reason}} — {{programName}}',
      variables: JSON.stringify(['customerName', 'points', 'currentPoints', 'reason', 'programName']),
    });
    mockPrismaInstance.whatsAppNotificationTemplate.findMany.mockResolvedValue([
      {
        id: 'tpl-loyalty',
        companyId: 'company-1',
        eventType: 'LOYALTY_POINTS_AWARDED',
        isActive: true,
        channel: 'META_CLOUD',
        metaTemplateName: 'loyalty_points_v9',
        metaTemplateStatus: 'APPROVED',
        content: 'مرحبا {{customerName}} كسبت {{points}} نقطة. رصيدك {{currentPoints}} — {{reason}} — {{programName}}',
        variables: JSON.stringify(['customerName', 'points', 'currentPoints', 'reason', 'programName']),
      },
    ]);

    const result = await sendNotification({
      companyId: 'company-1',
      recipientPhone: '201000000020',
      recipientName: 'منى',
      recipientType: 'CUSTOMER',
      category: 'MARKETING',
      eventType: 'LOYALTY_POINTS_AWARDED',
      variables: { customerName: 'منى', points: '120', currentPoints: '500', reason: 'شراء', programName: 'برنامج' },
      priority: 3,
    });

    expect(result.success).toBe(true);
    expect(WhatsAppMessageHandler.sendTemplateMessage).toHaveBeenCalledTimes(1);
    const body = WhatsAppMessageHandler.sendTemplateMessage.mock.calls[0][3];
    expect(body.components).toHaveLength(1);
    expect(body.components[0].type).toBe('BODY');
    expect(body.components[0].parameters).toHaveLength(3);
    expect(body.components[0].parameters.map((p) => p.text)).toEqual(['منى', '120', '500']);
  });

  // ────────────────────────────────────────────────────────────────────────────
  // (د2) CASHBACK_CREDITED: نفس الحماية
  // ────────────────────────────────────────────────────────────────────────────
  test('(د2) CASHBACK_CREDITED: 5 متغيرات محلية vs 2 في القالب المعتمد → 2 بارامترات + نجاح', async () => {
    MetaCloudProvider.listTemplates.mockResolvedValue([
      { name: 'cashback_credited_v7', components: [{ type: 'BODY', text: 'مبروك {{1}} تم ايداع {{2}}' }] },
    ]);

    mockPrismaInstance.whatsAppNotificationSettings.findUnique.mockResolvedValue({
      isEnabled: true,
      quietHoursEnabled: false,
      loyaltyEnabled: true,
    });
    const cashbackTemplate = {
      id: 'tpl-cashback',
      companyId: 'company-1',
      eventType: 'CASHBACK_CREDITED',
      isActive: true,
      channel: 'META_CLOUD',
      metaTemplateName: 'cashback_credited_v7',
      metaTemplateStatus: 'APPROVED',
      content: 'مبروك {{customerName}} تم ايداع {{amount}} {{currency}} — {{orderNumber}} — {{balance}}',
      variables: JSON.stringify(['customerName', 'amount', 'currency', 'orderNumber', 'balance']),
    };
    mockPrismaInstance.whatsAppNotificationTemplate.findFirst.mockResolvedValue(cashbackTemplate);
    mockPrismaInstance.whatsAppNotificationTemplate.findMany.mockResolvedValue([cashbackTemplate]);

    const result = await sendNotification({
      companyId: 'company-1',
      recipientPhone: '201000000021',
      recipientName: 'أحمد',
      recipientType: 'CUSTOMER',
      category: 'MARKETING',
      eventType: 'CASHBACK_CREDITED',
      variables: { customerName: 'أحمد', amount: '25.00', currency: 'EGP', orderNumber: 'ORD-1', balance: '75.00' },
      priority: 3,
    });

    expect(result.success).toBe(true);
    const body = WhatsAppMessageHandler.sendTemplateMessage.mock.calls[0][3];
    expect(body.components[0].parameters).toHaveLength(2);
    expect(body.components[0].parameters.map((p) => p.text)).toEqual(['أحمد', '25.00']);
  });

  // ────────────────────────────────────────────────────────────────────────────
  // (هـ) صفر ريجريشن على ORDER_*
  // ────────────────────────────────────────────────────────────────────────────
  test('(هـ) ORDER_CONFIRMED: قالب معتمد مطابق → لسه بيتبعت عادي', async () => {
    MetaCloudProvider.listTemplates.mockResolvedValue([
      { name: 'order_confirmed_v3', components: [{ type: 'BODY', text: 'طلبك {{1}} اتأكد بإجمالي {{2}}' }] },
    ]);

    mockPrismaInstance.whatsAppNotificationSettings.findUnique.mockResolvedValue({
      isEnabled: true,
      quietHoursEnabled: false,
      orderNotificationsEnabled: true,
    });
    const orderTemplate = {
      id: 'tpl-order-confirmed',
      companyId: 'company-1',
      eventType: 'ORDER_CONFIRMED',
      isActive: true,
      channel: 'META_CLOUD',
      metaTemplateName: 'order_confirmed_v3',
      metaTemplateStatus: 'APPROVED',
      content: 'طلبك {{orderNumber}} اتأكد بإجمالي {{total}}',
      variables: JSON.stringify(['orderNumber', 'total']),
    };
    mockPrismaInstance.whatsAppNotificationTemplate.findFirst.mockResolvedValue(orderTemplate);
    mockPrismaInstance.whatsAppNotificationTemplate.findMany.mockResolvedValue([orderTemplate]);

    const result = await sendNotification({
      companyId: 'company-1',
      recipientPhone: '201000000030',
      recipientName: 'سارة',
      recipientType: 'CUSTOMER',
      category: 'ORDER',
      eventType: 'ORDER_CONFIRMED',
      variables: { orderNumber: 'ORD-99', total: '500' },
      priority: 1,
    });

    expect(result.success).toBe(true);
    expect(WhatsAppMessageHandler.sendTemplateMessage).toHaveBeenCalledTimes(1);
    const body = WhatsAppMessageHandler.sendTemplateMessage.mock.calls[0][3];
    expect(body.components[0].parameters.map((p) => p.text)).toEqual(['ORD-99', '500']);
    expect(mockPrismaInstance.whatsAppNotificationLog.create).toHaveBeenCalledTimes(1);
    expect(mockPrismaInstance.whatsAppNotificationLog.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'SENT' }) })
    );
  });

  // ────────────────────────────────────────────────────────────────────────────
  // (و) NO_SESSION → صف/سطر واحد بدل صف لكل مستلم
  // ────────────────────────────────────────────────────────────────────────────
  test('(و) NO_SESSION: 3 محاولات → صف فشل واحد فقط + سطر واحد', async () => {
    mockPrismaInstance.whatsAppSession.findFirst.mockResolvedValue(null);
    mockPrismaInstance.whatsAppSession.findUnique.mockResolvedValue(null);
    // لا جلسة في الذاكرة ولا في DB → getOrAssignSession بيرجع null
    require('../../services/whatsapp/sessionBalancer').getOrAssignSession.mockResolvedValue(null);
    require('../../services/whatsapp/sessionBalancer').ensureRuntimeSessionConnected.mockResolvedValue(null);

    const results = [];
    for (const phone of ['201000000041', '201000000042', '201000000043']) {
      results.push(await sendNotification(baseSendOptions({ recipientPhone: phone })));
    }

    expect(results.every((r) => r.errorCode === 'NO_SESSION')).toBe(true);
    expect(mockPrismaInstance.whatsAppNotificationLog.create).toHaveBeenCalledTimes(1);
    const created = mockPrismaInstance.whatsAppNotificationLog.create.mock.calls[0][0].data;
    expect(created.errorCode).toBe('NO_SESSION');
    expect(created.status).toBe('FAILED');

    const noSessionLines = warnSpy.mock.calls
      .map((c) => c[0])
      .filter((m) => String(m).includes('NO_SESSION'));
    expect(noSessionLines).toHaveLength(1);
    expect(results[1].suppressed).toBe(true);
    expect(results[2].suppressed).toBe(true);
  });
});

describe('notificationSendGuard (unit)', () => {
  beforeEach(() => {
    NotificationSendGuard.resetGuardState();
    jest.restoreAllMocks();
  });

  test('evaluateSendGate: META_CLOUD بدون قالب مربوط = مرفوض بـ NO_TEMPLATE_CONFIGURED', () => {
    const verdict = NotificationSendGuard.evaluateSendGate({
      sessionProvider: 'META_CLOUD',
      template: { id: null, content: 'نص' },
      contentOverride: 'نص',
      eventType: 'ANNOUNCEMENT',
    });
    expect(verdict.allowed).toBe(false);
    expect(verdict.errorCode).toBe('NO_TEMPLATE_CONFIGURED');
  });

  test('evaluateSendGate: Baileys بنص حر مسموح، وبدون محتوى مرفوض', () => {
    const allowed = NotificationSendGuard.evaluateSendGate({
      sessionProvider: 'BAILEYS',
      template: null,
      contentOverride: 'إعلان',
      eventType: 'ANNOUNCEMENT',
    });
    expect(allowed.allowed).toBe(true);

    const blocked = NotificationSendGuard.evaluateSendGate({
      sessionProvider: 'BAILEYS',
      template: null,
      contentOverride: '',
      eventType: 'ANNOUNCEMENT',
    });
    expect(blocked.allowed).toBe(false);
    expect(blocked.errorCode).toBe('NO_TEMPLATE_CONFIGURED');
  });

  test('القفل 24 ساعة بيتمسح لما القالب يتغيّر (templateId مختلف)', () => {
    const now = 1_000_000;
    NotificationSendGuard.openFailureWindow({
      companyId: 'c1', eventType: 'ANNOUNCEMENT', templateId: 'tpl-a', errorCode: 'META_TEMPLATE_NOT_APPROVED', now,
    });

    expect(NotificationSendGuard.checkFailureWindow({
      companyId: 'c1', eventType: 'ANNOUNCEMENT', templateId: 'tpl-a', now: now + 1000,
    }).suppressed).toBe(true);

    expect(NotificationSendGuard.checkFailureWindow({
      companyId: 'c1', eventType: 'ANNOUNCEMENT', templateId: 'tpl-b', now: now + 1000,
    }).suppressed).toBe(false);

    expect(NotificationSendGuard.checkFailureWindow({
      companyId: 'c1', eventType: 'ANNOUNCEMENT', templateId: 'tpl-a',
      now: now + NotificationSendGuard.DEFAULT_FAILURE_WINDOW_MS + 1,
    }).suppressed).toBe(false);
  });
});
