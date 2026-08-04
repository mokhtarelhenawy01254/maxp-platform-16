/**
 * إعادة إرسال قالب مربوط لميتا للمراجعة بعد التعديل (resubmit-meta):
 * - بيرفض لو القالب مش مربوط
 * - بيحدّث القالب الموجود في ميتا بنفس الاسم وبيضعه PENDING
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

jest.mock('../../services/whatsapp/providers/MetaCloudProvider', () => ({
  updateTemplate: jest.fn(),
}));

const { getSharedPrismaClient } = require('../../services/sharedDatabase');
const { updateTemplate } = require('../../services/whatsapp/providers/MetaCloudProvider');
const { resubmitMetaTemplate } = require('../../controller/whatsappNotificationController');

function buildPrisma({ template, session }) {
  return {
    whatsAppNotificationTemplate: {
      findFirst: jest.fn().mockResolvedValue(template),
      update: jest.fn().mockResolvedValue({ ...template, metaTemplateStatus: 'PENDING' }),
    },
    whatsAppSession: {
      findFirst: jest.fn().mockResolvedValue(session),
    },
  };
}

function makeReqRes(prisma) {
  getSharedPrismaClient.mockReturnValue(prisma);
  const req = { user: { companyId: 'company-1' }, params: { id: 't1' }, body: { sessionId: 's1' } };
  const res = {
    json: jest.fn(),
    status: jest.fn().mockReturnThis(),
  };
  return { req, res };
}

const BOUND_TEMPLATE = {
  id: 't1',
  eventType: 'CONFIRMED',
  name: 'قالب تأكيد',
  category: 'ORDER',
  content: 'مرحبا {{customerName}}، أكد طلبك',
  hasButtons: false,
  buttons: null,
  metaTemplateName: 'order_confirm_ar',
  metaTemplateStatus: 'APPROVED',
  variables: null,
};

describe('POST /templates/:id/resubmit-meta', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    updateTemplate.mockResolvedValue({ id: '12345', status: 'PENDING' });
  });

  test('يرفض لو القالب غير مربوط بقالب ميتا', async () => {
    const prisma = buildPrisma({ template: { ...BOUND_TEMPLATE, metaTemplateName: null }, session: { id: 's1', provider: 'META_CLOUD' } });
    const { req, res } = makeReqRes(prisma);
    await resubmitMetaTemplate(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].error).toContain('غير مربوط');
    expect(updateTemplate).not.toHaveBeenCalled();
  });

  test('بيحدّث القالب الموجود في ميتا بنفس الاسم وبيضعه PENDING', async () => {
    const prisma = buildPrisma({ template: BOUND_TEMPLATE, session: { id: 's1', provider: 'META_CLOUD' } });
    const { req, res } = makeReqRes(prisma);
    await resubmitMetaTemplate(req, res);

    expect(updateTemplate).toHaveBeenCalledTimes(1);
    expect(updateTemplate.mock.calls[0][0]).toBe('s1');
    expect(updateTemplate.mock.calls[0][1]).toBe('order_confirm_ar');
    const payload = updateTemplate.mock.calls[0][2];
    expect(payload.components[0].type).toBe('BODY');
    expect(payload.components[0].text).toContain('{{1}}');
    expect(payload.language).toBe('ar');
    expect(payload.category).toBe('UTILITY');

    const updateCall = prisma.whatsAppNotificationTemplate.update.mock.calls[0];
    expect(updateCall[0].where.id).toBe('t1');
    expect(updateCall[0].data.metaTemplateStatus).toBe('PENDING');

    const body = res.json.mock.calls[0][0];
    expect(body.success).toBe(true);
    expect(body.metaTemplateName).toBe('order_confirm_ar');
  });

  test('بيرجع خطأ 500 مع رسالة ميتا لو ميتا رفضت التحديث', async () => {
    updateTemplate.mockRejectedValue({
      response: { data: { error: { message: 'Template not approved for update', error_user_title: 'غير متاح', code: 100 } } },
    });
    const prisma = buildPrisma({ template: BOUND_TEMPLATE, session: { id: 's1', provider: 'META_CLOUD' } });
    const { req, res } = makeReqRes(prisma);
    await resubmitMetaTemplate(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json.mock.calls[0][0].error).toContain('Template not approved for update');
  });
});
