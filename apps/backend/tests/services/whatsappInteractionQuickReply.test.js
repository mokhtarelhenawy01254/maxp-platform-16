/**
 * ≡ƒÜ¿ PRODUCTION-FIX: Quick-reply buttons from Meta template (type="button").
 * Regression tests for _isQuickReplyText + _mapQuickReplyAction.
 * Guarantees: "╪¬╪ú┘â┘è╪» ╪º┘ä╪ú┘ê╪▒╪»╪▒" maps to CONFIRMED, "╪Ñ┘ä╪║╪º╪í ╪º┘ä╪ú┘ê╪▒╪»╪▒" to CANCELLED,
 * "╪¬╪ú╪¼┘è┘ä" to PROCESSING, and unknown text returns null.
 */
const WhatsAppInteractionService = require('../../services/whatsapp/WhatsAppInteractionService');

describe('WhatsAppInteractionService quick-reply mapping', () => {
  test('┘è╪╣╪▒┘æ┘ü ┘å╪╡┘ê╪╡ ╪ú╪▓╪▒╪º╪▒ ╪º┘ä┘Ç quick reply', () => {
    expect(WhatsAppInteractionService._isQuickReplyText('╪¬╪ú┘â┘è╪» ╪º┘ä╪ú┘ê╪▒╪»╪▒')).toBe(true);
    expect(WhatsAppInteractionService._isQuickReplyText('╪Ñ┘ä╪║╪º╪í ╪º┘ä╪ú┘ê╪▒╪»╪▒')).toBe(true);
    expect(WhatsAppInteractionService._isQuickReplyText('╪¬╪ú╪¼┘è┘ä ╪º┘ä╪¬╪│┘ä┘è┘à')).toBe(true);
    expect(WhatsAppInteractionService._isQuickReplyText('confirm')).toBe(true);
    expect(WhatsAppInteractionService._isQuickReplyText('cancel')).toBe(true);
    expect(WhatsAppInteractionService._isQuickReplyText('╪Ñ┘ä╪║╪º╪í')).toBe(true);
  });

  test('┘ä╪º ┘è╪╣╪▒┘æ┘ü ┘å╪╡┘ê╪╡ ╪║┘è╪▒ ╪º┘ä╪ú╪▓╪▒╪º╪▒', () => {
    expect(WhatsAppInteractionService._isQuickReplyText('╪ú┘ç┘ä┘ï╪º')).toBe(false);
    expect(WhatsAppInteractionService._isQuickReplyText('╪¬┘à╪º┘à')).toBe(false);
    expect(WhatsAppInteractionService._isQuickReplyText('')).toBe(false);
  });

  test('┘è╪▒╪│┘à ┘å╪╡ ╪º┘ä╪▓╪▒ ╪Ñ┘ä┘ë ╪¡╪º┘ä╪⌐ ╪º┘ä╪╖┘ä╪¿', () => {
    expect(WhatsAppInteractionService._mapQuickReplyAction('╪¬╪ú┘â┘è╪» ╪º┘ä╪ú┘ê╪▒╪»╪▒')).toEqual({
      status: 'CONFIRMED',
      note: expect.any(String)
    });
    expect(WhatsAppInteractionService._mapQuickReplyAction('╪Ñ┘ä╪║╪º╪í ╪º┘ä╪ú┘ê╪▒╪»╪▒')).toEqual({
      status: 'CANCELLED',
      note: expect.any(String)
    });
    expect(WhatsAppInteractionService._mapQuickReplyAction('╪¬╪ú╪¼┘è┘ä ╪º┘ä╪¬╪│┘ä┘è┘à')).toEqual({
      status: 'PROCESSING',
      note: expect.any(String)
    });
    expect(WhatsAppInteractionService._mapQuickReplyAction('confirm')).toEqual({
      status: 'CONFIRMED',
      note: expect.any(String)
    });
  });

  test('┘è╪▒╪¼╪╣ null ┘ä┘å╪╡ ╪║┘è╪▒ ┘à╪╣╪▒┘ê┘ü', () => {
    expect(WhatsAppInteractionService._mapQuickReplyAction('┘â┘ä╪º┘à ╪╣╪º╪»┘è')).toBeNull();
    expect(WhatsAppInteractionService._mapQuickReplyAction('')).toBeNull();
  });
});
