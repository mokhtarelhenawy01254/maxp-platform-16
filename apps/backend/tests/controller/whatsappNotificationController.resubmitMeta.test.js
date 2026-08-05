/**
 * إعادة إرسال قالب إلى ميتا للمراجعة بعد التعديل (resubmit-meta):
 * - بيرفض لو القالب مش مربوط
 * - بينشئ قالباً جديداً باسم فريد بالمحتوى المعدل (لأن ميتا تمنع تعديل قالب APPROVED)
 * - بيربط القالب المحلي بالقالب الجديد ويضعه PENDING
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
  createTemplate: jest.fn(),
  updateTemplate: jest.fn(),
  listTemplates: jest.fn(),
}));

const { getSharedPrismaClient } = require('../../services/sharedDatabase');
const { createTemplate, updateTemplate, listTemplates } = require('../../services/whatsapp/providers/MetaCloudProvider');
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
  metaTemplateId: '778899',
  metaTemplateStatus: 'APPROVED',
  variables: null,
};

describe('POST /templates/:id/resubmit-meta', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    createTemplate.mockResolvedValue({ id: '12345', status: 'PENDING', name: 'order_confirm_ar_f1abc' });
    updateTemplate.mockResolvedValue({ id: '12345', status: 'PENDING' });
    listTemplates.mockResolvedValue([{ id: '778899', name: 'order_confirm_ar', status: 'APPROVED', category: 'UTILITY', components: [{ type: 'BODY', text: 'مرحبا {{1}}، أكد طلبك' }] }]);
  });

  test('يرفض لو القالب غير مربوط بقالب ميتا', async () => {
    const prisma = buildPrisma({ template: { ...BOUND_TEMPLATE, metaTemplateName: null }, session: { id: 's1', provider: 'META_CLOUD' } });
    const { req, res } = makeReqRes(prisma);
    await resubmitMetaTemplate(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].error).toContain('غير مربوط');
    expect(createTemplate).not.toHaveBeenCalled();
  });

  test('بينشئ قالب ميتا جديداً باسم فريد بالمحتوى المعدل ويربط القالب المحلي به', async () => {
    const prisma = buildPrisma({ template: BOUND_TEMPLATE, session: { id: 's1', provider: 'META_CLOUD' } });
    const { req, res } = makeReqRes(prisma);
    await resubmitMetaTemplate(req, res);

    // ميتا تمنع تعديل قالب APPROVED — الحل هو createTemplate باسم فريد
    expect(updateTemplate).not.toHaveBeenCalled();
    expect(createTemplate).toHaveBeenCalledTimes(1);

    const [sId, payload] = createTemplate.mock.calls[0];
    expect(sId).toBe('s1');
    expect(payload.language).toBe('ar');
    expect(payload.category).toBe('UTILITY');
    expect(payload.name).toMatch(/^order_confirm_ar/);
    expect(payload.components[0].type).toBe('BODY');
    expect(payload.components[0].text).toContain('{{1}}');

    // القالب المحلي رُبط بالقالب الجديد + metaTemplateId الجديد + PENDING
    const updateCall = prisma.whatsAppNotificationTemplate.update.mock.calls[0];
    expect(updateCall[0].where.id).toBe('t1');
    expect(updateCall[0].data.metaTemplateStatus).toBe('PENDING');
    expect(updateCall[0].data.metaTemplateId).toBe('12345');
    expect(updateCall[0].data.metaTemplateName).toMatch(/^order_confirm_ar/);

    const body = res.json.mock.calls[0][0];
    expect(body.success).toBe(true);
    expect(body.verifiedStatus).toBe('PENDING');
    expect(body.metaTemplateName).toMatch(/^order_confirm_ar/);
    expect(body.message).toContain('تم إنشاء قالب جديد في ميتا');
  });

  test('بيرجع خطأ 500 مع رسالة ميتا لو فشل إنشاء القالب في ميتا', async () => {
    const metaErr = new Error('Template not approved for update');
    metaErr.code = 100;
    metaErr.metaError = { message: 'Template not approved for update', error_user_title: 'غير متاح', code: 100 };
    createTemplate.mockRejectedValue(metaErr);
    const prisma = buildPrisma({ template: BOUND_TEMPLATE, session: { id: 's1', provider: 'META_CLOUD' } });
    const { req, res } = makeReqRes(prisma);
    await resubmitMetaTemplate(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json.mock.calls[0][0].error).toContain('Template not approved for update');
  });
});
