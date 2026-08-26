/**
 * getStatusesWithTemplates (GET /order-status/with-templates):
 * - القالب المربوط بميتا (metaTemplateName معتمد) بـ channel AUTO كان بيقع في regularMap
 *   والـ metaMap تفضل فاضية لأن التصنيف القديم كان بالاعتماد على channel==='META_CLOUD' فقط.
 *   ده كان بيخلي الصفحة تعرض "بدون قالب ميتا" رغم إن القالب مربوط وبتتبعت.
 * - الإصلاح: أي قالب عليه metaTemplateName يتحسب قالب ميتا (legacy أو جديد)، ونفضّل
 *   المربوط المعتمد عند تكرار الصفوف لنفس الحالة.
 */
jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(),
  safeQuery: (fn) => fn(),
}));

jest.mock('../../services/orderTemplateSeeding', () => ({
  seedDefaultOrderTemplates: jest.fn().mockResolvedValue(0),
}));

jest.mock('../../utils/orderStatusMeta', () => ({
  isNonNotifiableStatus: jest.fn(() => false),
}));

const { getSharedPrismaClient } = require('../../services/sharedDatabase');
const { getStatusesWithTemplates } = require('../../controller/orderStatusController');

function makeReqRes(prisma) {
  getSharedPrismaClient.mockReturnValue(prisma);
  const req = {
    user: { companyId: 'company-1' },
    companyId: 'company-1',
  };
  const res = {
    json: jest.fn(),
    status: jest.fn().mockReturnThis(),
  };
  return { req, res };
}

function buildPrisma({ statuses, templates }) {
  return {
    orderStatusConfig: { findMany: jest.fn().mockResolvedValue(statuses) },
    whatsAppNotificationTemplate: { findMany: jest.fn().mockResolvedValue(templates) },
    whatsAppNotificationSettings: { findUnique: jest.fn().mockResolvedValue({ incompleteCartImmediateMessage: false }) },
  };
}

describe('getStatusesWithTemplates', () => {
  beforeEach(() => jest.clearAllMocks());

  test('القالب المربوط بميتا بـ channel AUTO يظهر في metaTemplate (مش regular)', async () => {
    const prisma = buildPrisma({
      statuses: [
        { id: 's-delivered', code: 'DELIVERED', name: 'تم التسليم', color: '#000', sortOrder: 1, statusType: 'shipping', notifyCustomer: true, isSystemStatus: true },
      ],
      templates: [
        // قالب عادي (من غير ربط ميتا)
        { id: 't-default', companyId: 'company-1', eventType: 'DELIVERED', channel: 'AUTO', metaTemplateName: null, metaTemplateStatus: null, content: 'أهلًا بحضرتك', isActive: true },
        // القالب المربوط بميتا المعتمد (channel AUTO = legacy) — لازم يكون هو الـ metaTemplate
        { id: 't-meta', companyId: 'company-1', eventType: 'DELIVERED', channel: 'AUTO', metaTemplateName: 'deliveredmssr2akj', metaTemplateStatus: 'APPROVED', content: 'صباح الخير {{customerName}}', isActive: true },
      ],
    });

    const { req, res } = makeReqRes(prisma);
    await getStatusesWithTemplates(req, res);

    const payload = res.json.mock.calls[0][0];
    const delivered = payload.data.find((s) => s.code === 'DELIVERED');
    expect(delivered).toBeTruthy();
    // القالب المربوط بميتا لازم يبقى هو metaTemplate رغم إن channel = AUTO
    expect(delivered.metaTemplate).toBeTruthy();
    expect(delivered.metaTemplate.id).toBe('t-meta');
    expect(delivered.hasMetaTemplate).toBe(true);
    expect(delivered.template.id).toBe('t-default');
  });

  test('عند تكرار صفوف لنفس الحالة، يُفضّل الصف المربوط المعتمد كميتا', async () => {
    const prisma = buildPrisma({
      statuses: [
        { id: 's-shipped', code: 'SHIPPED', name: 'تم الشحن', color: '#000', sortOrder: 1, statusType: 'shipping', notifyCustomer: true, isSystemStatus: true },
      ],
      templates: [
        // أول صف (من غير ربط) — كان first-wins قديم يختاره ويخبّي المربوط
        { id: 't-default', companyId: 'company-1', eventType: 'SHIPPED', channel: 'AUTO', metaTemplateName: null, metaTemplateStatus: null, content: 'أهلًا', isActive: true },
        { id: 't-meta-pending', companyId: 'company-1', eventType: 'SHIPPED', channel: 'AUTO', metaTemplateName: 'swan_shipped_pending', metaTemplateStatus: 'PENDING', content: 'x', isActive: true },
        { id: 't-meta-approved', companyId: 'company-1', eventType: 'SHIPPED', channel: 'AUTO', metaTemplateName: 'swan_shipped_msbtz5h4msbudqui', metaTemplateStatus: 'APPROVED', content: 'تم شحن {{customerName}}', isActive: true },
      ],
    });

    const { req, res } = makeReqRes(prisma);
    await getStatusesWithTemplates(req, res);

    const payload = res.json.mock.calls[0][0];
    const shipped = payload.data.find((s) => s.code === 'SHIPPED');
    expect(shipped.metaTemplate).toBeTruthy();
    expect(shipped.metaTemplate.id).toBe('t-meta-approved');
    expect(shipped.metaTemplate.metaTemplateStatus).toBe('APPROVED');
  });
});
