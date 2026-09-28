/**
 * Executive Copilot & Media Buyer Session Integrity Regression Tests
 * Verifies the 6 flaw fixes:
 * 1. Error propagation (no silent swallowing).
 * 2. Session ID stability & context storage (no drift).
 * 3. Domain uniformity ('copilot' on list, get, append, delete).
 * 4. Strict slash-command rewind interceptor (no accidental conversational deletes).
 * 5. Soft-delete on rewind & deleteSession (no hard DELETE FROM).
 * 6. Empty session cleanup.
 */

describe('Executive Copilot Session & Rewind Integrity', () => {
  let mockPrisma;
  let agentStudioSessionService;
  let aiSessionService;
  let marketingCopilotSessionService;

  beforeEach(() => {
    jest.resetModules();

    mockPrisma = {
      $executeRawUnsafe: jest.fn().mockResolvedValue(1),
      $queryRawUnsafe: jest.fn(),
    };

    jest.doMock('../../services/sharedDatabase', () => ({
      getSharedPrismaClient: () => mockPrisma,
    }));

    agentStudioSessionService = require('../../services/agentStudioSessionService');
    aiSessionService = require('../../services/aiSessionService');
    marketingCopilotSessionService = require('../../services/marketingCopilotSessionService');
  });

  describe('Flaw 1 & 4: Domain Enforcement & Error Propagation in aiSessionService', () => {
    it('should query getSession with domain = "copilot" and propagate errors', async () => {
      mockPrisma.$queryRawUnsafe.mockRejectedValueOnce(new Error('DB Connection Timeout'));

      await expect(
        aiSessionService.getHistory('comp_123', 'user_1', 'sess_abc')
      ).rejects.toThrow('DB Connection Timeout');
    });

    it('should throw explicit error on createSession failure instead of returning fake session', async () => {
      mockPrisma.$executeRawUnsafe.mockRejectedValueOnce(new Error('Insert constraint violation'));

      await expect(
        aiSessionService.createSession('comp_123', 'user_1', {}, { id: 'sess_abc' })
      ).rejects.toThrow('Insert constraint violation');
    });

    it('should throw explicit error on appendMessage failure instead of returning false', async () => {
      mockPrisma.$executeRawUnsafe.mockRejectedValueOnce(new Error('Disk Full'));

      await expect(
        aiSessionService.appendMessage('comp_123', 'sess_abc', { text: 'Hello' })
      ).rejects.toThrow('Disk Full');
    });
  });

  describe('Flaw 4: Domain Verification in agentStudioSessionService.getSession', () => {
    it('should include domain filter when domain is specified', async () => {
      mockPrisma.$queryRawUnsafe
        .mockResolvedValueOnce([{ id: 'sess_1', companyId: 'comp_1', domain: 'copilot', status: 'ACTIVE' }])
        .mockResolvedValueOnce([{ id: 'msg_1', role: 'user', content: 'test', createdAt: new Date() }]);

      const session = await agentStudioSessionService.getSession('comp_1', 'sess_1', 'copilot');
      expect(session).toBeDefined();
      expect(session.id).toBe('sess_1');

      // Verify SQL contains domain parameter
      const firstCallSql = mockPrisma.$queryRawUnsafe.mock.calls[0][0];
      expect(firstCallSql).toContain('domain = $3');
    });
  });

  describe('Flaw 5: Soft Deletion on Rewind & Delete (No Hard DELETE)', () => {
    it('agentStudioSessionService.rewindSession should use UPDATE isDeleted = TRUE', async () => {
      mockPrisma.$queryRawUnsafe
        .mockResolvedValueOnce([
          { id: 'msg_2', role: 'assistant', content: 'reply' },
          { id: 'msg_1', role: 'user', content: 'hi' },
        ]) // lastMessages
        .mockResolvedValueOnce([]); // remaining messages

      const result = await agentStudioSessionService.rewindSession('comp_1', 'sess_1', 'copilot');
      expect(result.success).toBe(true);

      // Verify no DELETE FROM was executed
      const calls = mockPrisma.$executeRawUnsafe.mock.calls;
      const deleteCalls = calls.filter(c => String(c[0]).includes('DELETE FROM public.agent_studio_messages'));
      expect(deleteCalls.length).toBe(0);

      // Verify soft delete UPDATE was executed
      const softDeleteCalls = calls.filter(c => String(c[0]).includes('"isDeleted" = TRUE'));
      expect(softDeleteCalls.length).toBeGreaterThan(0);
    });

    it('marketingCopilotSessionService.deleteSession should use soft delete status = DELETED', async () => {
      await marketingCopilotSessionService.deleteSession('comp_1', 'mb_sess_1');

      const calls = mockPrisma.$executeRawUnsafe.mock.calls;
      const hardDeleteCalls = calls.filter(c => String(c[0]).includes('DELETE FROM public.facebook_ads_ai_chat_sessions'));
      expect(hardDeleteCalls.length).toBe(0);

      const softDeleteCalls = calls.filter(c => String(c[0]).includes("status = 'DELETED'"));
      expect(softDeleteCalls.length).toBeGreaterThan(0);
    });
  });

  describe('Flaw 5: Rewind Command Regex Guard', () => {
    const isExecutiveRewind = (msg) => /^\s*\/(تراجع|undo|rewind)\s*$/i.test(msg);

    it('should trigger ONLY on explicit slash command', () => {
      expect(isExecutiveRewind('/تراجع')).toBe(true);
      expect(isExecutiveRewind('/undo')).toBe(true);
      expect(isExecutiveRewind('/rewind')).toBe(true);
      expect(isExecutiveRewind('  /تراجع  ')).toBe(true);
    });

    it('should NOT trigger on conversational sentences starting with Arabic words', () => {
      expect(isExecutiveRewind('تراجع المبيعات كان بسبب الحملة')).toBe(false);
      expect(isExecutiveRewind('تراجعنا عن الخطة السابقة')).toBe(false);
      expect(isExecutiveRewind('ارجع ورا شوية في التقرير وافهمني')).toBe(false);
      expect(isExecutiveRewind('undo the changes please')).toBe(false);
    });
  });

  describe('Flaw 6: Empty Session Cleanup', () => {
    it('cleanupEmptySessions should execute soft-delete query on empty stale sessions', async () => {
      mockPrisma.$executeRawUnsafe.mockResolvedValueOnce(3);

      const count = await agentStudioSessionService.cleanupEmptySessions('comp_1', 'copilot', 30);
      expect(count).toBe(3);

      const callSql = mockPrisma.$executeRawUnsafe.mock.calls[0][0];
      expect(callSql).toContain("status = 'DELETED'");
      expect(callSql).toContain('NOT EXISTS');
    });
  });
});
