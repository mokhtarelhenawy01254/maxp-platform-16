/**
 * مصدر واحد للحقيقة للحالات الداخلية (مش بتتبعت للعميل).
 * الـ UI والـ backend بيستخدموا نفس القائمة.
 */
const { NON_NOTIFIABLE_STATUS_CODES, isNonNotifiableStatus } = require('../../utils/orderStatusMeta');

describe('orderStatusMeta', () => {
  describe('isNonNotifiableStatus', () => {
    test('يصنّف الحالات الداخلية المعروفة كـ non-notifiable', () => {
      expect(isNonNotifiableStatus('TRASH')).toBe(true);
      expect(isNonNotifiableStatus('TRASH_ORDER')).toBe(true);
      expect(isNonNotifiableStatus('DRAFT')).toBe(true);
      expect(isNonNotifiableStatus('DUPLICATE_ORDER')).toBe(true);
      expect(isNonNotifiableStatus('DELETED')).toBe(true);
    });

    test('case-insensitive', () => {
      expect(isNonNotifiableStatus('trash')).toBe(true);
      expect(isNonNotifiableStatus('Trash')).toBe(true);
    });

    test('يقبل القيم الفارغة بدون crash', () => {
      expect(isNonNotifiableStatus(null)).toBe(false);
      expect(isNonNotifiableStatus(undefined)).toBe(false);
      expect(isNonNotifiableStatus('')).toBe(false);
    });

    test('الحالات القابلة للإرسال مش non-notifiable', () => {
      expect(isNonNotifiableStatus('CONFIRMED')).toBe(false);
      expect(isNonNotifiableStatus('SHIPPED')).toBe(false);
      expect(isNonNotifiableStatus('DELIVERED')).toBe(false);
      expect(isNonNotifiableStatus('PAYMENT_REMINDER')).toBe(false);
    });
  });

  describe('NON_NOTIFIABLE_STATUS_CODES', () => {
    test('مجمّدة (frozen) عشان منع التعديل', () => {
      expect(Object.isFrozen(NON_NOTIFIABLE_STATUS_CODES)).toBe(true);
    });

    test('تحتوي على الـ 5 أكواد الأساسية', () => {
      expect(NON_NOTIFIABLE_STATUS_CODES).toEqual(
        expect.arrayContaining(['TRASH', 'TRASH_ORDER', 'DRAFT', 'DUPLICATE_ORDER', 'DELETED'])
      );
    });
  });
});
