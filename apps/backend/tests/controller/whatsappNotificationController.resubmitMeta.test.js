/**
 * ╪Ñ╪╣╪º╪»╪⌐ ╪Ñ╪▒╪│╪º┘ä ┘é╪º┘ä╪¿ ╪Ñ┘ä┘ë ┘à┘è╪¬╪º ┘ä┘ä┘à╪▒╪º╪¼╪╣╪⌐ ╪¿╪╣╪» ╪º┘ä╪¬╪╣╪»┘è┘ä (resubmit-meta):
 * - ╪¿┘è╪▒┘ü╪╢ ┘ä┘ê ╪º┘ä┘é╪º┘ä╪¿ ┘à╪┤ ┘à╪▒╪¿┘ê╪╖
 * - ┘ä┘ê ╪º┘ä╪¡╪º┘ä╪⌐ APPROVED/REJECTED/PAUSED ΓåÆ ╪¿┘è╪╣╪»┘æ┘ä ╪º┘ä┘é╪º┘ä╪¿ ╪º┘ä┘à┘ê╪¼┘ê╪» ╪╣╪¿╪▒ POST /{templateId}
 * - ┘ä┘ê ╪º┘ä╪¡╪º┘ä╪⌐ PENDING (┘à┘è╪¬╪º ╪¬┘à┘å╪╣ ╪¬╪╣╪»┘è┘ä┘ç╪º╪î subcode 2388003) ΓåÆ ╪¿┘è┘å╪┤╪ª ┘é╪º┘ä╪¿╪º┘ï ╪¼╪»┘è╪»╪º┘ï ╪¿╪º╪│┘à ┘ü╪▒┘è╪»
 * - ╪¿┘è╪¡┘ü╪╕ metaTemplateId ┘ê╪¿┘è╪¡╪»┘æ╪½ ╪º┘ä╪¡╪º┘ä╪⌐
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
      update: jest.fn().mockResolvedValue({ ...template, metaTemplateStatus: 'APPROVED' }),
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
  name: '┘é╪º┘ä╪¿ ╪¬╪ú┘â┘è╪»',
  category: 'ORDER',
  content: '┘à╪▒╪¡╪¿╪º {{customerName}}╪î ╪ú┘â╪» ╪╖┘ä╪¿┘â',
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
    updateTemplate.mockResolvedValue({ success: true });
    listTemplates.mockResolvedValue([
      { id: '778899', name: 'order_confirm_ar', status: 'APPROVED', category: 'UTILITY', components: [{ type: 'BODY', text: '┘à╪▒╪¡╪¿╪º {{1}}╪î ╪ú┘â╪» ╪╖┘ä╪¿┘â' }] },
    ]);
  });

  test('┘è╪▒┘ü╪╢ ┘ä┘ê ╪º┘ä┘é╪º┘ä╪¿ ╪║┘è╪▒ ┘à╪▒╪¿┘ê╪╖ ╪¿┘é╪º┘ä╪¿ ┘à┘è╪¬╪º', async () => {
    const prisma = buildPrisma({ template: { ...BOUND_TEMPLATE, metaTemplateName: null }, session: { id: 's1', provider: 'META_CLOUD' } });
    const { req, res } = makeReqRes(prisma);
    await resubmitMetaTemplate(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].error).toContain('╪║┘è╪▒ ┘à╪▒╪¿┘ê╪╖');
    expect(updateTemplate).not.toHaveBeenCalled();
  });

  test('APPROVED ΓåÆ ╪¿┘è╪╣╪»┘æ┘ä ╪º┘ä┘é╪º┘ä╪¿ ╪º┘ä┘à┘ê╪¼┘ê╪» ╪╣╪¿╪▒ POST /{templateId} ╪¿╪º┘ä┘à╪¡╪¬┘ê┘ë ╪º┘ä┘à╪╣╪»┘ä', async () => {
    listTemplates.mockResolvedValue([
      { id: '778899', name: 'order_confirm_ar', status: 'APPROVED', category: 'UTILITY', components: [{ type: 'BODY', text: '┘à╪▒╪¡╪¿╪º {{1}}╪î ╪ú┘â╪» ╪╖┘ä╪¿┘â' }] },
    ]);
    const prisma = buildPrisma({ template: BOUND_TEMPLATE, session: { id: 's1', provider: 'META_CLOUD' } });
    const { req, res } = makeReqRes(prisma);
    await resubmitMetaTemplate(req, res);

    expect(createTemplate).not.toHaveBeenCalled();
    expect(updateTemplate).toHaveBeenCalledTimes(1);

    const [sId, templateId, payload] = updateTemplate.mock.calls[0];
    expect(sId).toBe('s1');
    expect(templateId).toBe('778899');
    expect(payload.components[0].type).toBe('BODY');
    expect(payload.components[0].text).toContain('{{1}}');
    expect(payload.category).toBeUndefined();

    const updateCall = prisma.whatsAppNotificationTemplate.update.mock.calls[0];
    expect(updateCall[0].where.id).toBe('t1');
    expect(updateCall[0].data.metaTemplateId).toBe('778899');

    const body = res.json.mock.calls[0][0];
    expect(body.success).toBe(true);
    expect(body.applied).toBe(true);
    expect(body.action).toBe('edited');
  });

  test('PENDING ΓåÆ ╪¿┘è┘å╪┤╪ª ┘é╪º┘ä╪¿╪º┘ï ╪¼╪»┘è╪»╪º┘ï ╪¿╪º╪│┘à ┘ü╪▒┘è╪» (┘ä╪ú┘å ┘à┘è╪¬╪º ╪¬┘à┘å╪╣ ╪¬╪╣╪»┘è┘ä PENDING)', async () => {
    listTemplates.mockResolvedValue([
      { id: '778899', name: 'order_confirm_ar', status: 'PENDING', category: 'UTILITY', components: [{ type: 'BODY', text: '┘à╪▒╪¡╪¿╪º {{1}}╪î ╪ú┘â╪» ╪╖┘ä╪¿┘â' }] },
    ]);
    const prisma = buildPrisma({ template: BOUND_TEMPLATE, session: { id: 's1', provider: 'META_CLOUD' } });
    const { req, res } = makeReqRes(prisma);
    await resubmitMetaTemplate(req, res);

    expect(updateTemplate).not.toHaveBeenCalled();
    expect(createTemplate).toHaveBeenCalledTimes(1);
    const [, payload] = createTemplate.mock.calls[0];
    expect(payload.name).toMatch(/^order_confirm_ar/);
    expect(payload.components[0].text).toContain('{{1}}');

    const updateCall = prisma.whatsAppNotificationTemplate.update.mock.calls[0];
    expect(updateCall[0].data.metaTemplateName).toMatch(/^order_confirm_ar/);
    expect(updateCall[0].data.metaTemplateId).toBe('12345');

    const body = res.json.mock.calls[0][0];
    expect(body.success).toBe(true);
    expect(body.applied).toBe(false);
    expect(body.action).toBe('created');
  });

  test('╪¿┘è╪▒╪¼╪╣ ╪«╪╖╪ú 500 ┘à╪╣ ╪▒╪│╪º┘ä╪⌐ ┘à┘è╪¬╪º ┘ä┘ê ┘ü╪┤┘ä ╪º┘ä╪¬╪╣╪»┘è┘ä', async () => {
    const metaErr = new Error('Template not approved for update');
    metaErr.code = 100;
    metaErr.metaError = { message: 'Template not approved for update', error_user_title: '╪║┘è╪▒ ┘à╪¬╪º╪¡', code: 100 };
    updateTemplate.mockRejectedValue(metaErr);
    const prisma = buildPrisma({ template: BOUND_TEMPLATE, session: { id: 's1', provider: 'META_CLOUD' } });
    const { req, res } = makeReqRes(prisma);
    await resubmitMetaTemplate(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json.mock.calls[0][0].error).toContain('Template not approved for update');
  });
});
