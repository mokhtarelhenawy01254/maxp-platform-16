/**
 * listAvailableMetaTemplates (GET /templates/meta-available):
 * - بيفلتر القوالب المعتمدة بس (APPROVED)
 * - بيرجّع كل الربطات (boundToLocalTemplateIds/boundToEventTypes)
 * - بيرجّع محتوى أول قالب محلي مربوط (boundLocalContent) لتمكين auto-fill في الفرونت
 */
jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(),
  safeQuery: (fn) => fn(),
}));

jest.mock('../../services/whatsapp/providers/MetaCloudProvider', () => ({
  listTemplates: jest.fn(),
}));

const { getSharedPrismaClient } = require('../../services/sharedDatabase');
const { listTemplates } = require('../../services/whatsapp/providers/MetaCloudProvider');
const { listAvailableMetaTemplates } = require('../../controller/whatsappNotificationController');

function buildPrisma({ localTemplates }) {
  return {
    whatsAppNotificationTemplate: {
      findMany: jest.fn().mockResolvedValue(localTemplates),
    },
  };
}

function makeReqRes(prisma) {
  getSharedPrismaClient.mockReturnValue(prisma);
  const req = { user: { companyId: 'company-1' }, query: { sessionId: 's1' } };
  const res = {
    json: jest.fn(),
    status: jest.fn().mockReturnThis(),
  };
  return { req, res };
}

describe('listAvailableMetaTemplates', () => {
  beforeEach(() => jest.clearAllMocks());

  test('بيرفض لو مفيش sessionId', async () => {
    const { req, res } = makeReqRes(buildPrisma({ localTemplates: [] }));
    req.query = {};
    await listAvailableMetaTemplates(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('بيرجّع القوالب المعتمدة بس مع boundLocalContent من أول قالب مربوط', async () => {
    listTemplates.mockResolvedValue([
      { name: 'approved_tpl', status: 'APPROVED', language: 'ar', category: 'UTILITY', components: [{ type: 'BODY', text: 'مرحبا {{1}}' }] },
      { name: 'pending_tpl', status: 'PENDING', language: 'ar', category: 'UTILITY', components: [] },
    ]);
    const prisma = buildPrisma({
      localTemplates: [
        { id: 't1', eventType: 'SHIPPED', metaTemplateName: 'approved_tpl', metaTemplateStatus: 'APPROVED', content: 'مرحبا {{customerName}}' },
        { id: 't2', eventType: 'DELIVERED', metaTemplateName: 'approved_tpl', metaTemplateStatus: 'APPROVED', content: 'رسالة تانية' },
      ],
    });
    const { req, res } = makeReqRes(prisma);
    await listAvailableMetaTemplates(req, res);

    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(true);
    expect(payload.templates).toHaveLength(1);
    const tpl = payload.templates[0];
    expect(tpl.name).toBe('approved_tpl');
    expect(tpl.boundToLocalTemplateIds).toEqual(['t1', 't2']);
    expect(tpl.boundToEventTypes).toEqual(['SHIPPED', 'DELIVERED']);
    // boundLocalContent = محتوى أول قالب مربوط (أفضل مصدر للمتغيرات)
    expect(tpl.boundLocalContent).toBe('مرحبا {{customerName}}');
  });

  test('بيحط boundLocalContent null لو القالب مش مربوط بأي قالب محلي', async () => {
    listTemplates.mockResolvedValue([
      { name: 'unbound_tpl', status: 'APPROVED', language: 'ar', category: 'UTILITY', components: [{ type: 'BODY', text: 'نص' }] },
    ]);
    const prisma = buildPrisma({ localTemplates: [] });
    const { req, res } = makeReqRes(prisma);
    await listAvailableMetaTemplates(req, res);

    const payload = res.json.mock.calls[0][0];
    expect(payload.templates[0].boundLocalContent).toBeNull();
    expect(payload.templates[0].boundToLocalTemplateIds).toEqual([]);
  });
});
