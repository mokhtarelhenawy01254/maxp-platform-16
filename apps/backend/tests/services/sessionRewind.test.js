/**
 * @file sessionRewind.test.js
 * @description Unit tests for Hermes Session State Rewind (Undo last turn)
 */

const marketingCopilotSessionService = require('../../services/marketingCopilotSessionService');
const { getSharedPrismaClient } = require('../../services/sharedDatabase');

describe('MarketingCopilotSessionService - Session Rewind Test Suite', () => {
  let companyId = 'cmleybpf70028juo2wwpmp8rt';
  const sessionId = `mb_rewind_test_${Date.now()}`;

  beforeAll(async () => {
    try {
      const prisma = getSharedPrismaClient();
      const existing = await prisma.company.findFirst({ select: { id: true } });
      if (existing?.id) companyId = existing.id;
    } catch (_) {}
  });

  afterAll(async () => {
    try {
      await marketingCopilotSessionService.deleteSession(companyId, sessionId);
    } catch (_) {}
  });

  test('rewinds last turn (user + assistant) cleanly', async () => {
    // 1. Seed 4 messages (Turn 1 + Turn 2)
    await marketingCopilotSessionService.saveSession(companyId, 'user_1', {
      id: sessionId,
      title: 'جلسة اختبار التراجع',
      messages: [
        { id: `msg_1_${Date.now()}`, sender: 'user', text: 'عايز أعمل إعلان لكوتشي Dash' },
        { id: `msg_2_${Date.now()}`, sender: 'agent', text: 'تمام، المنتج متاح وسعره 620 ج.م' },
        { id: `msg_3_${Date.now()}`, sender: 'user', text: 'خلي الميزانية 5000 ج.م' },
        { id: `msg_4_${Date.now()}`, sender: 'agent', text: 'تم تجهيز المسودة بميزانية 5000 ج.م' },
      ],
    });

    const beforeRewind = await marketingCopilotSessionService.getSession(companyId, sessionId);
    expect(beforeRewind.messages.length).toBe(4);

    // 2. Perform Rewind
    const rewindResult = await marketingCopilotSessionService.rewindSession(companyId, sessionId);
    expect(rewindResult.success).toBe(true);
    expect(rewindResult.undoneCount).toBe(2);

    // 3. Verify state after rewind
    const afterRewind = await marketingCopilotSessionService.getSession(companyId, sessionId);
    expect(afterRewind.messages.length).toBe(2);
    expect(afterRewind.messages[0].text).toBe('عايز أعمل إعلان لكوتشي Dash');
    expect(afterRewind.messages[1].text).toBe('تمام، المنتج متاح وسعره 620 ج.م');
  });

  test('handles rewind on empty or non-existent session gracefully', async () => {
    const emptySessionId = `mb_empty_${Date.now()}`;
    const result = await marketingCopilotSessionService.rewindSession(companyId, emptySessionId);
    expect(result.success).toBe(false);
    expect(result.message).toContain('لا توجد رسائل سابقة');
  });
});
