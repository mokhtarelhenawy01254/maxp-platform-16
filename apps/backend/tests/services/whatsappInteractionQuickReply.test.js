/**
 * 🚨 PRODUCTION-FIX: Quick-reply buttons from Meta template (type="button").
 * Regression tests for _isQuickReplyText + _mapQuickReplyAction.
 * Guarantees: "تأكيد الأوردر" maps to CONFIRMED, "إلغاء الأوردر" to CANCELLED,
 * "تأجيل" to PROCESSING, and unknown text returns null.
 */
const WhatsAppInteractionService = require('../../services/whatsapp/WhatsAppInteractionService');

describe('WhatsAppInteractionService quick-reply mapping', () => {
  test('يعرّف نصوص أزرار الـ quick reply', () => {
    expect(WhatsAppInteractionService._isQuickReplyText('تأكيد الأوردر')).toBe(true);
    expect(WhatsAppInteractionService._isQuickReplyText('إلغاء الأوردر')).toBe(true);
    expect(WhatsAppInteractionService._isQuickReplyText('تأجيل التسليم')).toBe(true);
    expect(WhatsAppInteractionService._isQuickReplyText('confirm')).toBe(true);
    expect(WhatsAppInteractionService._isQuickReplyText('cancel')).toBe(true);
    expect(WhatsAppInteractionService._isQuickReplyText('إلغاء')).toBe(true);
  });

  test('لا يعرّف نصوص غير الأزرار', () => {
    expect(WhatsAppInteractionService._isQuickReplyText('أهلًا')).toBe(false);
    expect(WhatsAppInteractionService._isQuickReplyText('تمام')).toBe(false);
    expect(WhatsAppInteractionService._isQuickReplyText('')).toBe(false);
  });

  test('يرسم نص الزر إلى حالة الطلب', () => {
    expect(WhatsAppInteractionService._mapQuickReplyAction('تأكيد الأوردر')).toEqual({
      status: 'CONFIRMED',
      note: expect.any(String)
    });
    expect(WhatsAppInteractionService._mapQuickReplyAction('إلغاء الأوردر')).toEqual({
      status: 'CANCELLED',
      note: expect.any(String)
    });
    expect(WhatsAppInteractionService._mapQuickReplyAction('تأجيل التسليم')).toEqual({
      status: 'PROCESSING',
      note: expect.any(String)
    });
    expect(WhatsAppInteractionService._mapQuickReplyAction('confirm')).toEqual({
      status: 'CONFIRMED',
      note: expect.any(String)
    });
  });

  test('يرجع null لنص غير معروف', () => {
    expect(WhatsAppInteractionService._mapQuickReplyAction('كلام عادي')).toBeNull();
    expect(WhatsAppInteractionService._mapQuickReplyAction('')).toBeNull();
  });
});
