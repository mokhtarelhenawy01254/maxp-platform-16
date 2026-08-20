/**
 * ┘à╪╡╪»╪▒ ┘ê╪º╪¡╪» ┘ä┘ä╪¡┘é┘è┘é╪⌐ ┘ä┘ä╪¡╪º┘ä╪º╪¬ ╪º┘ä╪»╪º╪«┘ä┘è╪⌐ (┘à╪┤ ╪¿╪¬╪¬╪¿╪╣╪¬ ┘ä┘ä╪╣┘à┘è┘ä).
 * ╪º┘ä┘Ç UI ┘ê╪º┘ä┘Ç backend ╪¿┘è╪│╪¬╪«╪»┘à┘ê╪º ┘å┘ü╪│ ╪º┘ä┘é╪º╪ª┘à╪⌐.
 */
const { NON_NOTIFIABLE_STATUS_CODES, isNonNotifiableStatus } = require('../../utils/orderStatusMeta');

describe('orderStatusMeta', () => {
  describe('isNonNotifiableStatus', () => {
    test('┘è╪╡┘å┘æ┘ü ╪º┘ä╪¡╪º┘ä╪º╪¬ ╪º┘ä╪»╪º╪«┘ä┘è╪⌐ ╪º┘ä┘à╪╣╪▒┘ê┘ü╪⌐ ┘â┘Ç non-notifiable', () => {
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

    test('┘è┘é╪¿┘ä ╪º┘ä┘é┘è┘à ╪º┘ä┘ü╪º╪▒╪║╪⌐ ╪¿╪»┘ê┘å crash', () => {
      expect(isNonNotifiableStatus(null)).toBe(false);
      expect(isNonNotifiableStatus(undefined)).toBe(false);
      expect(isNonNotifiableStatus('')).toBe(false);
    });

    test('╪º┘ä╪¡╪º┘ä╪º╪¬ ╪º┘ä┘é╪º╪¿┘ä╪⌐ ┘ä┘ä╪Ñ╪▒╪│╪º┘ä ┘à╪┤ non-notifiable', () => {
      expect(isNonNotifiableStatus('CONFIRMED')).toBe(false);
      expect(isNonNotifiableStatus('SHIPPED')).toBe(false);
      expect(isNonNotifiableStatus('DELIVERED')).toBe(false);
      expect(isNonNotifiableStatus('PAYMENT_REMINDER')).toBe(false);
    });
  });

  describe('NON_NOTIFIABLE_STATUS_CODES', () => {
    test('┘à╪¼┘à┘æ╪»╪⌐ (frozen) ╪╣╪┤╪º┘å ┘à┘å╪╣ ╪º┘ä╪¬╪╣╪»┘è┘ä', () => {
      expect(Object.isFrozen(NON_NOTIFIABLE_STATUS_CODES)).toBe(true);
    });

    test('╪¬╪¡╪¬┘ê┘è ╪╣┘ä┘ë ╪º┘ä┘Ç 5 ╪ú┘â┘ê╪º╪» ╪º┘ä╪ú╪│╪º╪│┘è╪⌐', () => {
      expect(NON_NOTIFIABLE_STATUS_CODES).toEqual(
        expect.arrayContaining(['TRASH', 'TRASH_ORDER', 'DRAFT', 'DUPLICATE_ORDER', 'DELETED'])
      );
    });
  });
});
