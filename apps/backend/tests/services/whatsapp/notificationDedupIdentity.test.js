/**
 * 🛡️ (custom-status-identity) — هوية الـ dedup للحالات المخصصة.
 * قبل الإصلاح: حالتان مخصصتان مختلفتان على نفس mapsToSystem خلال 10 ثوانٍ
 * لنفس الطلب → التانية كانت بتتبلع (نفس persistedEventType). دلوقتي التطابق
 * على rawEventType (مع توافق احتياطي مع الصفوف القديمة null).
 */
const mockFindFirst = jest.fn();
jest.mock('../../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(() => ({ whatsAppNotificationLog: { findFirst: mockFindFirst } })),
  safeQuery: (fn) => fn(),
}));

// أعزل الاستدعاءات الثقيلة بتاعة باقي الخدمة — بنستخدم دالة isDuplicateNotification بس
jest.mock('../../../services/whatsapp/WhatsAppManager', () => ({
  __esModule: true,
  default: { getSession: jest.fn(() => null), getSessionsByCompany: jest.fn(() => []) },
  getSession: jest.fn(() => null),
}));

const service = require('../../../services/whatsapp/WhatsAppNotificationService');

describe('isDuplicateNotification — custom-status dedup identity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('passes rawEventType so the where clause matches on the ORIGINAL custom code', async () => {
    mockFindFirst.mockResolvedValue(null);
    await service.isDuplicateNotification({
      companyId: 'comp_1',
      orderId: 'ord_1',
      eventType: 'ON_HOLD', // persisted (mapsToSystem) value
      rawEventType: 'DELAYED-WITH-CAPTAIN',
    });
    const where = mockFindFirst.mock.calls[0][0].where;
    expect(where.eventType).toBe('ON_HOLD');
    // التطابق على الهوية الأصلية (أو الصفوف القديمة null) — مش أي حالة على نفس الـ mapping
    expect(where.OR).toEqual([{ rawEventType: 'DELAYED-WITH-CAPTAIN' }, { rawEventType: null }]);
  });

  test('without rawEventType the behavior stays exactly as before (persisted key only)', async () => {
    mockFindFirst.mockResolvedValue(null);
    await service.isDuplicateNotification({
      companyId: 'comp_1',
      orderId: 'ord_1',
      eventType: 'ORDER_CONFIRMED',
    });
    const where = mockFindFirst.mock.calls[0][0].where;
    expect(where.eventType).toBe('ORDER_CONFIRMED');
    expect(where.OR).toBeUndefined();
  });
});
