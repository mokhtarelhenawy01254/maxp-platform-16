/**
 * listAvailableMetaTemplates (GET /templates/meta-available):
 * - ╪¿┘è┘ü┘ä╪¬╪▒ ╪º┘ä┘é┘ê╪º┘ä╪¿ ╪º┘ä┘à╪╣╪¬┘à╪»╪⌐ ╪¿╪│ (APPROVED)
 * - ╪¿┘è╪▒╪¼┘æ╪╣ ┘â┘ä ╪º┘ä╪▒╪¿╪╖╪º╪¬ (boundToLocalTemplateIds/boundToEventTypes)
 * - ╪¿┘è╪▒╪¼┘æ╪╣ ┘à╪¡╪¬┘ê┘ë ╪ú┘ê┘ä ┘é╪º┘ä╪¿ ┘à╪¡┘ä┘è ┘à╪▒╪¿┘ê╪╖ (boundLocalContent) ┘ä╪¬┘à┘â┘è┘å auto-fill ┘ü┘è ╪º┘ä┘ü╪▒┘ê┘å╪¬
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

  test('╪¿┘è╪▒┘ü╪╢ ┘ä┘ê ┘à┘ü┘è╪┤ sessionId', async () => {
    const { req, res } = makeReqRes(buildPrisma({ localTemplates: [] }));
    req.query = {};
    await listAvailableMetaTemplates(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('╪¿┘è╪▒╪¼┘æ╪╣ ╪º┘ä┘é┘ê╪º┘ä╪¿ ╪º┘ä┘à╪╣╪¬┘à╪»╪⌐ ╪¿╪│ ┘à╪╣ boundLocalContent ┘à┘å ╪ú┘ê┘ä ┘é╪º┘ä╪¿ ┘à╪▒╪¿┘ê╪╖', async () => {
    listTemplates.mockResolvedValue([
      { name: 'approved_tpl', status: 'APPROVED', language: 'ar', category: 'UTILITY', components: [{ type: 'BODY', text: '┘à╪▒╪¡╪¿╪º {{1}}' }] },
      { name: 'pending_tpl', status: 'PENDING', language: 'ar', category: 'UTILITY', components: [] },
    ]);
    const prisma = buildPrisma({
      localTemplates: [
        { id: 't1', eventType: 'SHIPPED', metaTemplateName: 'approved_tpl', metaTemplateStatus: 'APPROVED', content: '┘à╪▒╪¡╪¿╪º {{customerName}}' },
        { id: 't2', eventType: 'DELIVERED', metaTemplateName: 'approved_tpl', metaTemplateStatus: 'APPROVED', content: '╪▒╪│╪º┘ä╪⌐ ╪¬╪º┘å┘è╪⌐' },
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
    // boundLocalContent = ┘à╪¡╪¬┘ê┘ë ╪ú┘ê┘ä ┘é╪º┘ä╪¿ ┘à╪▒╪¿┘ê╪╖ (╪ú┘ü╪╢┘ä ┘à╪╡╪»╪▒ ┘ä┘ä┘à╪¬╪║┘è╪▒╪º╪¬)
    expect(tpl.boundLocalContent).toBe('┘à╪▒╪¡╪¿╪º {{customerName}}');
  });

  test('╪¿┘è╪¡╪╖ boundLocalContent null ┘ä┘ê ╪º┘ä┘é╪º┘ä╪¿ ┘à╪┤ ┘à╪▒╪¿┘ê╪╖ ╪¿╪ú┘è ┘é╪º┘ä╪¿ ┘à╪¡┘ä┘è', async () => {
    listTemplates.mockResolvedValue([
      { name: 'unbound_tpl', status: 'APPROVED', language: 'ar', category: 'UTILITY', components: [{ type: 'BODY', text: '┘å╪╡' }] },
    ]);
    const prisma = buildPrisma({ localTemplates: [] });
    const { req, res } = makeReqRes(prisma);
    await listAvailableMetaTemplates(req, res);

    const payload = res.json.mock.calls[0][0];
    expect(payload.templates[0].boundLocalContent).toBeNull();
    expect(payload.templates[0].boundToLocalTemplateIds).toEqual([]);
  });
});
