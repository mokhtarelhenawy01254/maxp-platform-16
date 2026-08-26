/**
 * Regression test: a SUCCESSFUL META_CLOUD template send must NOT be marked
 * FAILED. Introduced by commit 2b3ca684 — blockFreeTextMetaFallback was
 * initialized to `sessionProvider === 'META_CLOUD'`, so even when the approved
 * Meta template send SUCCEEDED (customer received it), the flow reached the
 * `if (blockFreeTextMetaFallback) throw new Error("Approved Meta template
 * failed...")` guard and the notification log was written as FAILED.
 *
 * The guard now also requires `!result` so a real delivery (result truthy)
 * proceeds to SENT and the status-templates report shows the truth.
 */
jest.mock('../../../services/whatsapp/WhatsAppManager', () => ({
  getCompanySessions: jest.fn(() => []),
  getSession: jest.fn(() => ({ status: 'connected', provider: 'META_CLOUD' })),
}));

jest.mock('../../../services/whatsapp/WhatsAppMessageHandler', () => ({
  sendText: jest.fn().mockResolvedValue({ key: { id: 'mock-msg' } }),
  sendButtons: jest.fn().mockResolvedValue({ key: { id: 'mock-msg' } }),
  sendTemplateMessage: jest.fn().mockResolvedValue({ id: 'wamid-success-123' }),
  sendList: jest.fn().mockResolvedValue({ key: { id: 'mock-msg' } }),
}));

jest.mock('../../../services/whatsapp/sessionBalancer', () => ({
  getOrAssignSession: jest.fn(() => 'sess-m'),
  ensureRuntimeSessionConnected: jest.fn(),
  findAlternativeBaileysSession: jest.fn(() => null),
  isMetaWindowError: jest.fn(() => false),
}));

const mockSettings = {
  whatsAppNotificationSettings: { findUnique: jest.fn() },
  whatsAppSession: { findFirst: jest.fn(), findUnique: jest.fn() },
  whatsAppNotificationTemplate: { findFirst: jest.fn() },
  whatsAppNotificationLog: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
  orderStatusConfig: { findFirst: jest.fn() },
  company: { findUnique: jest.fn() },
};

jest.mock('../../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(() => mockSettings),
  safeQuery: jest.fn((operation) => operation()),
}));

const { getSharedPrismaClient } = require('../../../services/sharedDatabase');
const WhatsAppMessageHandler = require('../../../services/whatsapp/WhatsAppMessageHandler');

describe('META_CLOUD approved template send — success must not be marked FAILED', () => {
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

    mockSettings.company.findUnique.mockResolvedValue({
      id: 'company-1',
      name: 'Test Store',
      slug: 'test-store',
      customDomain: null,
      website: null,
    });

    mockSettings.whatsAppSession.findFirst.mockResolvedValue({
      id: 'sess-m',
      status: 'CONNECTED',
      provider: 'META_CLOUD',
    });
    mockSettings.whatsAppSession.findUnique.mockResolvedValue({
      id: 'sess-m',
      status: 'CONNECTED',
      provider: 'META_CLOUD',
    });

    // قالب ميتا معتمد APPROVED مربوط بالحالة (الشكل الحديث: channel=META_CLOUD)
    mockSettings.whatsAppNotificationTemplate.findFirst.mockResolvedValue({
      id: 'meta-tpl-1',
      content: 'مرحباً {{customerName}} — طلبك {{orderNumber}} تم شحنه',
      isActive: true,
      channel: 'META_CLOUD',
      metaTemplateName: 'swan_shipped_msbtz5h4msbudqui',
      metaTemplateStatus: 'APPROVED',
      metaTemplateLanguage: 'ar',
      variables: JSON.stringify([
        { position: 1, name: 'customerName' },
        { position: 2, name: 'orderNumber' },
      ]),
      headerFormat: 'TEXT',
      hasButtons: false,
      buttons: null,
      hasList: false,
      listData: null,
      footer: null,
    });

    mockSettings.whatsAppNotificationLog.findFirst.mockResolvedValue(null);
    mockSettings.whatsAppNotificationLog.create.mockResolvedValue({ id: 'log-1' });
    mockSettings.whatsAppNotificationLog.update.mockResolvedValue({ id: 'log-1' });
    mockSettings.orderStatusConfig.findFirst.mockResolvedValue({ notifyCustomer: true });
  });

  const order = {
    id: 'order-ok-1',
    orderNumber: 'ORD-895037-359',
    companyId: 'company-1',
    customerPhone: '+201200163862',
    customerName: 'مايا محمد',
    customer: { firstName: 'مايا', phone: '+201200163862' },
    items: [],
    total: '100',
    currency: 'EGP',
    turboTrackingNumber: 'TRK-1',
  };

  it('🏁 قالب ميتا معتمد أُرسل بنجاح → log يتحدّث SENT مش FAILED', async () => {
    const { sendOrderStatusNotification } = require('../../../services/whatsapp/WhatsAppNotificationService');
    const res = await sendOrderStatusNotification(order, 'SHIPPED', 'PROCESSING');

    expect(WhatsAppMessageHandler.sendTemplateMessage).toHaveBeenCalled();
    expect(res).toEqual(expect.objectContaining({ success: true }));

    // 🚨 كان الفيصل: قبل الإصلاح، guard بيتفق `blockFreeTextMetaFallback` (true
    // لأي جلسة META_CLOUD) ويرمي "Approved Meta template failed..." حتى بعد نجاح
    // الإرسال → catch يكتب FAILED. دلوقتي لازم يكون اتكتب SENT.
    const logUpdate = mockSettings.whatsAppNotificationLog.update.mock.calls.map((c) => c[0]);
    const sentUpdate = logUpdate.find((c) => c && c.data && c.data.status === 'SENT');
    expect(sentUpdate).toBeTruthy();
    expect(sentUpdate.data.messageType).toBe('TEMPLATE');

    // لا يوجد أي تحديث بحالة FAILED
    const failedUpdate = logUpdate.find((c) => c && c.data && c.data.status === 'FAILED');
    expect(failedUpdate).toBeUndefined();
  });

  it('لا يمر إطلاقاً على throw "Approved Meta template failed and free-text is blocked" بعد نجاح القالب', async () => {
    // نرصد الـ console.error للـ catch — قبل الإصلاح كانت الرسالة دي تظهر بعد كل
    // إرسال قالب معتمد ناجح (على الرغم من وصول الرسالة للعميل).
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const { sendOrderStatusNotification } = require('../../../services/whatsapp/WhatsAppNotificationService');
      const res = await sendOrderStatusNotification(order, 'SHIPPED', 'PROCESSING');
      expect(res.success).toBe(true);
    } finally {
      errorSpy.mockRestore();
      warnSpy.mockRestore();
    }

    // النتيجة: لا رسالة فشل قالب ميتا (الـ throw) ولا أي fallback لبايلز
    expect(WhatsAppMessageHandler.sendText).not.toHaveBeenCalled();
    expect(WhatsAppMessageHandler.sendButtons).not.toHaveBeenCalled();
  });
});