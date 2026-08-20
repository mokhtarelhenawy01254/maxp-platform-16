/**
 * ≡ƒÜ¿ PRODUCTION-FIX (notifications-fix-plan ┬º5.3 ΓÇö Meta ΓåÆ Baileys fallback):
 * regression tests for findAlternativeBaileysSession + isMetaWindowError.
 * Guarantees: when Meta rejects outside the 24h window, the code finds a Baileys
 * session and falls back ONCE (no loop), and non-window errors don't fall back.
 */
const { isMetaWindowError } = require('../../../services/whatsapp/sessionBalancer');

// ┘å╪«╪¬╪¿╪▒ isMetaWindowError (╪»╪º┘ä╪⌐ ┘å┘é┘è╪⌐). findAlternativeBaileysSession ┘è╪╣╪¬┘à╪»
// ╪╣┘ä┘ë prisma + WhatsAppManager ΓÇö ┘å╪«╪¬╪¿╪▒┘ç ╪¿┘Ç mock ╪╣╪¿╪▒ jest.mock.
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
  test('┘è┘à┘è┘æ╪▓ ╪«╪╖╪ú ┘å╪º┘ü╪░╪⌐ 24 ╪│╪º╪╣╪⌐ ╪╣┘å ╪º┘ä╪ú╪«╪╖╪º╪í ╪º┘ä╪¬╪º┘å┘è╪⌐', () => {
    expect(isMetaWindowError({ message: 'outside 24 hour window' })).toBe(true);
    expect(isMetaWindowError({ message: 'outside the 24-hour messaging window' })).toBe(true);
    expect(isMetaWindowError({ code: 'RECIPIENT_CANNOT_SEND' })).toBe(true);
    expect(isMetaWindowError({ code: 'TEMPLATE_NOT_APPROVED' })).toBe(true);
    // ┘â┘ê╪»╪º╪¬ ┘à┘è╪¬╪º ╪º┘ä╪▒┘é┘à┘è╪⌐ ┘ä┘ä╪▒╪│╪º╪ª┘ä ╪º┘ä┘à╪▒┘ü┘ê╪╢╪⌐ ╪«╪º╪▒╪¼ ╪º┘ä┘å╪º┘ü╪░╪⌐
    expect(isMetaWindowError({ code: 131047 })).toBe(true);
    expect(isMetaWindowError({ code: '131047' })).toBe(true);
    expect(isMetaWindowError({ code: 131026 })).toBe(true);
    expect(isMetaWindowError({ code: '131026' })).toBe(true);
    // ╪º┘ä╪▒╪│╪º┘ä╪⌐ ╪º┘ä╪¡╪▒┘ü┘è╪⌐ ┘ä┘Ç 131047 (re_engagement_needed)
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

  test('┘è╪▒╪¼┘æ╪╣ Baileys session ┘à╪¬╪╡┘ä╪⌐ ┘ü┘è ╪º┘ä╪░╪º┘â╪▒╪⌐', async () => {
    const candidates = [
      { id: 'baileys1', name: '╪¿╪º┘è┘ä╪▓ 1', phoneNumber: '201000000000' },
      { id: 'baileys2', name: '╪¿╪º┘è┘ä╪▓ 2', phoneNumber: '201000000001' },
    ];
    mockFindMany.mockResolvedValue(candidates);
    WhatsAppManager.getSession.mockReturnValueOnce(null).mockReturnValueOnce({ status: 'connected' });

    const result = await findAlternativeBaileysSession('company1', 'meta1');
    expect(result).toEqual({ sessionId: 'baileys2', name: '╪¿╪º┘è┘ä╪▓ 2', phoneNumber: '201000000001' });
  });

  test('┘è╪▒╪¼┘æ╪╣ null ┘ä┘ê ┘à┘ü┘è╪┤ Baileys ┘à╪¬╪╡┘ä╪⌐ ┘ü┘è ╪º┘ä╪░╪º┘â╪▒╪⌐', async () => {
    const candidates = [
      { id: 'baileys1', name: '╪¿╪º┘è┘ä╪▓ 1', phoneNumber: '201000000000' },
    ];
    mockFindMany.mockResolvedValue(candidates);
    WhatsAppManager.getSession.mockReturnValue({ status: 'disconnected' });

    const result = await findAlternativeBaileysSession('company1', 'meta1');
    expect(result).toBeNull();
  });

  test('┘è╪▒╪¼┘æ╪╣ null ┘ä┘ê ┘à┘ü┘è╪┤ Baileys sessions ╪ú╪╡┘ä╪º┘ï', async () => {
    mockFindMany.mockResolvedValue([]);
    const result = await findAlternativeBaileysSession('company1', 'meta1');
    expect(result).toBeNull();
  });

  test('╪º┘ä╪º╪│╪¬╪╣┘ä╪º┘à ╪¿┘è╪│╪¬╪½┘å┘è session ╪º┘ä┘à┘è╪¬╪º ╪º┘ä┘ü╪º╪┤┘ä╪⌐', async () => {
    mockFindMany.mockResolvedValue([]);
    await findAlternativeBaileysSession('company1', 'meta1');
    const where = mockFindMany.mock.calls[0][0].where;
    expect(where.id).toEqual({ not: 'meta1' });
    expect(where.provider).toBe('BAILEYS');
    expect(where.companyId).toBe('company1');
  });
});
