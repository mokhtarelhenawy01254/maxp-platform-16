const {
  getEffectiveAiAutoReplySetting,
  readAiSchemaAutoReplySetting,
  checkHasActiveAiKey,
  resolveAiHierarchy,
} = require('../../services/aiSettingsResolver');

describe('aiSettingsResolver', () => {
  let warnSpy;

  beforeEach(() => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
    jest.clearAllMocks();
  });

  test('uses ai.ai_settings as the effective source when present', async () => {
    const prisma = {
      aiSetting: {
        findUnique: jest.fn(async () => ({ companyId: 'co-1', autoReplyEnabled: false, workingHoursEnabled: true })),
      },
      $queryRawUnsafe: jest.fn(async () => [{ autoReplyEnabled: true }]),
    };

    await expect(getEffectiveAiAutoReplySetting('co-1', prisma)).resolves.toEqual(
      expect.objectContaining({
        companyId: 'co-1',
        autoReplyEnabled: true,
        legacyAutoReplyEnabled: false,
        source: 'ai.ai_settings',
        workingHoursEnabled: true,
      })
    );
  });

  test('lets ai.ai_settings false override stale legacy enabled settings', async () => {
    const prisma = {
      aiSetting: {
        findUnique: jest.fn(async () => ({ companyId: 'co-1', autoReplyEnabled: true })),
      },
      $queryRawUnsafe: jest.fn(async () => [{ autoReplyEnabled: false }]),
    };

    await expect(getEffectiveAiAutoReplySetting('co-1', prisma)).resolves.toEqual(
      expect.objectContaining({
        autoReplyEnabled: false,
        legacyAutoReplyEnabled: true,
        source: 'ai.ai_settings',
      })
    );
  });

  test('falls back to public.ai_settings when the ai schema row is absent', async () => {
    const prisma = {
      aiSetting: {
        findUnique: jest.fn(async () => ({ companyId: 'co-1', autoReplyEnabled: true })),
      },
      $queryRawUnsafe: jest.fn(async () => []),
    };

    await expect(getEffectiveAiAutoReplySetting('co-1', prisma)).resolves.toEqual(
      expect.objectContaining({
        autoReplyEnabled: true,
        source: 'public.ai_settings',
      })
    );
  });

  test('returns a safe disabled default when neither settings source exists', async () => {
    const prisma = {
      aiSetting: {
        findUnique: jest.fn(async () => null),
      },
      $queryRawUnsafe: jest.fn(async () => []),
    };

    await expect(getEffectiveAiAutoReplySetting('co-1', prisma)).resolves.toEqual({
      autoReplyEnabled: false,
      source: 'default',
    });
  });

  test('uses a parameterized raw query for ai.ai_settings lookup', async () => {
    const prisma = {
      $queryRawUnsafe: jest.fn(async () => [{ autoReplyEnabled: true }]),
    };

    await expect(readAiSchemaAutoReplySetting(prisma, 'co-1')).resolves.toEqual({ autoReplyEnabled: true });
    expect(prisma.$queryRawUnsafe).toHaveBeenCalledWith(
      'SELECT "autoReplyEnabled" FROM ai.ai_settings WHERE "companyId" = $1 LIMIT 1',
      'co-1'
    );
  });

  describe('resolveAiHierarchy', () => {
    test('returns MASTER_AI_DISABLED when master auto reply is disabled', async () => {
      const hierarchy = await resolveAiHierarchy('co-1', {
        masterSetting: { autoReplyEnabled: false },
        hasActiveKey: true,
        conversationAiEnabled: true
      });

      expect(hierarchy.isEffectiveActive).toBe(false);
      expect(hierarchy.reason).toBe('MASTER_AI_DISABLED');
      expect(hierarchy.masterAutoReplyEnabled).toBe(false);
    });

    test('returns MASTER_AGENT_PAUSED when master agent is paused', async () => {
      const hierarchy = await resolveAiHierarchy('co-1', {
        masterSetting: { autoReplyEnabled: true, agentPaused: true },
        hasActiveKey: true,
        conversationAiEnabled: true
      });

      expect(hierarchy.isEffectiveActive).toBe(false);
      expect(hierarchy.reason).toBe('MASTER_AGENT_PAUSED');
      expect(hierarchy.masterAgentPaused).toBe(true);
    });

    test('returns NO_ACTIVE_AI_KEY when company has no active AI key', async () => {
      const hierarchy = await resolveAiHierarchy('co-1', {
        masterSetting: { autoReplyEnabled: true },
        hasActiveKey: false,
        conversationAiEnabled: true
      });

      expect(hierarchy.isEffectiveActive).toBe(false);
      expect(hierarchy.reason).toBe('NO_ACTIVE_AI_KEY');
    });

    test('returns CONVERSATION_DISABLED when conversation AI is toggled off', async () => {
      const hierarchy = await resolveAiHierarchy('co-1', {
        masterSetting: { autoReplyEnabled: true },
        hasActiveKey: true,
        conversationAiEnabled: false
      });

      expect(hierarchy.isEffectiveActive).toBe(false);
      expect(hierarchy.reason).toBe('CONVERSATION_DISABLED');
    });

    test('returns CONVERSATION_PAUSED when conversation has active aiPausedUntil', async () => {
      const future = new Date(Date.now() + 60000).toISOString();
      const hierarchy = await resolveAiHierarchy('co-1', {
        masterSetting: { autoReplyEnabled: true },
        hasActiveKey: true,
        conversationAiEnabled: true,
        aiPausedUntil: future
      });

      expect(hierarchy.isEffectiveActive).toBe(false);
      expect(hierarchy.isConversationPaused).toBe(true);
      expect(hierarchy.reason).toBe('CONVERSATION_PAUSED');
    });

    test('returns ACTIVE when all hierarchy conditions are satisfied', async () => {
      const hierarchy = await resolveAiHierarchy('co-1', {
        masterSetting: { autoReplyEnabled: true, agentPaused: false },
        hasActiveKey: true,
        conversationAiEnabled: true
      });

      expect(hierarchy.isEffectiveActive).toBe(true);
      expect(hierarchy.reason).toBe('ACTIVE');
    });
  });
});
