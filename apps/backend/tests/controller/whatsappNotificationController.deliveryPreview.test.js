/**
 * 🚨 PRODUCTION-FIX (notifications-fix-plan §5.4 — delivery preview):
 * regression tests for getTemplatesDeliveryPreview — the admin must see the
 * expected delivery fate per template (provider + template approval status),
 * and risk levels must be computed correctly per scenario.
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
const { getTemplatesDeliveryPreview } = require('../../controller/whatsappNotificationController');

function buildPrisma({ templates, sessions, defaultSessionId }) {
  return {
    whatsAppNotificationTemplate: { findMany: jest.fn().mockResolvedValue(templates) },
    whatsAppSession: { findMany: jest.fn().mockResolvedValue(sessions) },
    whatsAppNotificationSettings: { findUnique: jest.fn().mockResolvedValue({ defaultSessionId }) },
  };
}

function makeReqRes(prisma) {
  getSharedPrismaClient.mockReturnValue(prisma);
  const req = { user: { companyId: 'company-1' } };
  const res = {
    json: jest.fn(),
    status: jest.fn().mockReturnThis(),
  };
  return { req, res };
}

const templates = [
  { id: 't1', eventType: 'CONFIRMED', category: 'ORDER', metaTemplateName: null, metaTemplateStatus: null, metaTemplateLanguage: 'ar' },
  { id: 't2', eventType: 'SHIPPED', category: 'ORDER', metaTemplateName: 'order_shipped_ar', metaTemplateStatus: 'APPROVED', metaTemplateLanguage: 'ar' },
  { id: 't3', eventType: 'CANCELLED', category: 'ORDER', metaTemplateName: 'order_cancelled_ar', metaTemplateStatus: 'PENDING', metaTemplateLanguage: 'ar' },
];

describe('GET /templates/delivery-preview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('يرجع baileys_free_text لو default Baileys', async () => {
    const prisma = buildPrisma({
      templates,
      sessions: [{ id: 's1', name: 'جلسة بايلز', provider: 'BAILEYS', phoneNumber: '201000000000', status: 'CONNECTED' }],
      defaultSessionId: 's1',
    });
    const { req, res } = makeReqRes(prisma);
    await getTemplatesDeliveryPreview(req, res);
    const body = res.json.mock.calls[0][0];
    expect(body.success).toBe(true);
    expect(body.defaultSession.provider).toBe('BAILEYS');
    expect(body.preview.every(p => p.deliveryStatus === 'baileys_free_text' && p.riskLevel === 'none')).toBe(true);
    expect(body.hasBaileysBackup).toBe(true);
  });

  test('يرجع meta_approved لو ميتا + قالب معتمد', async () => {
    const prisma = buildPrisma({
      templates,
      sessions: [{ id: 's2', name: 'جلسة ميتا', provider: 'META_CLOUD', phoneNumber: '201000000000', status: 'CONNECTED' }],
      defaultSessionId: 's2',
    });
    const { req, res } = makeReqRes(prisma);
    await getTemplatesDeliveryPreview(req, res);
    const body = res.json.mock.calls[0][0];
    const shipped = body.preview.find(p => p.eventType === 'SHIPPED');
    expect(shipped.deliveryStatus).toBe('meta_approved');
    expect(shipped.riskLevel).toBe('none');
    expect(shipped.message).toContain('order_shipped_ar');
    const cancelled = body.preview.find(p => p.eventType === 'CANCELLED');
    expect(cancelled.deliveryStatus).toBe('meta_not_approved');
    expect(cancelled.riskLevel).toBe('danger');
    const confirmed = body.preview.find(p => p.eventType === 'CONFIRMED');
    expect(confirmed.deliveryStatus).toBe('meta_no_template');
    expect(confirmed.riskLevel).toBe('warning');
  });

  test('يرجع no_session بخطر danger لو مفيش sessions', async () => {
    const prisma = buildPrisma({ templates, sessions: [], defaultSessionId: null });
    const { req, res } = makeReqRes(prisma);
    await getTemplatesDeliveryPreview(req, res);
    const body = res.json.mock.calls[0][0];
    expect(body.defaultSession).toBeNull();
    expect(body.connectedSessionsCount).toBe(0);
    expect(body.hasBaileysBackup).toBe(false);
    expect(body.preview.every(p => p.deliveryStatus === 'no_session' && p.riskLevel === 'danger')).toBe(true);
  });
});
