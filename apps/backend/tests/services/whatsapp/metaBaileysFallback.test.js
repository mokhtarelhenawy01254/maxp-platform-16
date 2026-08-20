/**
 * 🚨 PRODUCTION-FIX (notifications-fix-plan §5.3 — Meta → Baileys fallback):
 * regression tests for findAlternativeBaileysSession + isMetaWindowError.
 * Guarantees: when Meta rejects outside the 24h window, the code finds a Baileys
 * session and falls back ONCE (no loop), and non-window errors don't fall back.
 */
const { isMetaWindowError } = require('../../../services/whatsapp/sessionBalancer');

// نختبر isMetaWindowError (دالة نقية). findAlternativeBaileysSession يعتمد
// على prisma + WhatsAppManager — نختبره بـ mock عبر jest.mock.
const mockFindMany = jest.fn();
jest.mock('../../../services/sharedDatabase', () => ({
  getSharedPrismaClient: () => ({ whatsAppSession: { findMany: mockFindMany } }),
  safeQuery: (fn) => fn(),
}));

jest.mock('../../../services/whatsapp/WhatsAppManager', () => ({
  getSession: jest.fn(),
}));

const { findAlternativeBaileysSession } = require('../../../services/whatsapp/sessionBalancer');
const WhatsAppManager = require('../../../services/whatsapp/WhatsAppManager');

describe('isMetaWindowError', () => {
  test('يميّز خطأ نافذة 24 ساعة عن الأخطاء التانية', () => {
    expect(isMetaWindowError({ message: 'outside 24 hour window' })).toBe(true);
    expect(isMetaWindowError({ message: 'outside the 24-hour messaging window' })).toBe(true);
    expect(isMetaWindowError({ code: 'RECIPIENT_CANNOT_SEND' })).toBe(true);
    expect(isMetaWindowError({ code: 'TEMPLATE_NOT_APPROVED' })).toBe(true);
    // كودات ميتا الرقمية للرسائل المرفوضة خارج النافذة
    expect(isMetaWindowError({ code: 131047 })).toBe(true);
    expect(isMetaWindowError({ code: '131047' })).toBe(true);
    expect(isMetaWindowError({ code: 131026 })).toBe(true);
    expect(isMetaWindowError({ code: '131026' })).toBe(true);
    // الرسالة الحرفية لـ 131047 (re_engagement_needed)
    expect(isMetaWindowError({ message: 'Message failed to send because more than 24 hours have passed since the customer last replied to this number.' })).toBe(true);
    expect(isMetaWindowError({ message: 'invalid phone number' })).toBe(false);
    expect(isMetaWindowError({ code: 'SOMETHING_ELSE', message: 'rate limited' })).toBe(false);
    expect(isMetaWindowError(null)).toBe(false);
    expect(isMetaWindowError({})).toBe(false);
  });
});

describe('findAlternativeBaileysSession', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('يرجّع Baileys session متصلة في الذاكرة', async () => {
    const candidates = [
      { id: 'baileys1', name: 'بايلز 1', phoneNumber: '201000000000' },
      { id: 'baileys2', name: 'بايلز 2', phoneNumber: '201000000001' },
    ];
    mockFindMany.mockResolvedValue(candidates);
    WhatsAppManager.getSession.mockReturnValueOnce(null).mockReturnValueOnce({ status: 'connected' });

    const result = await findAlternativeBaileysSession('company1', 'meta1');
    expect(result).toEqual({ sessionId: 'baileys2', name: 'بايلز 2', phoneNumber: '201000000001' });
  });

  test('يرجّع null لو مفيش Baileys متصلة في الذاكرة', async () => {
    const candidates = [
      { id: 'baileys1', name: 'بايلز 1', phoneNumber: '201000000000' },
    ];
    mockFindMany.mockResolvedValue(candidates);
    WhatsAppManager.getSession.mockReturnValue({ status: 'disconnected' });

    const result = await findAlternativeBaileysSession('company1', 'meta1');
    expect(result).toBeNull();
  });

  test('يرجّع null لو مفيش Baileys sessions أصلاً', async () => {
    mockFindMany.mockResolvedValue([]);
    const result = await findAlternativeBaileysSession('company1', 'meta1');
    expect(result).toBeNull();
  });

  test('الاستعلام بيستثني session الميتا الفاشلة', async () => {
    mockFindMany.mockResolvedValue([]);
    await findAlternativeBaileysSession('company1', 'meta1');
    const where = mockFindMany.mock.calls[0][0].where;
    expect(where.id).toEqual({ not: 'meta1' });
    expect(where.provider).toBe('BAILEYS');
    expect(where.companyId).toBe('company1');
  });
});
