const { getSharedPrismaClient } = require('./sharedDatabase');

async function readLegacyAiSetting(prisma, companyId) {
  if (!prisma?.aiSetting?.findUnique) {
    return null;
  }

  try {
    return await prisma.aiSetting.findUnique({ where: { companyId } });
  } catch (error) {
    console.warn('⚠️ [AI-SETTINGS] Failed to read public.ai_settings:', error.message);
    return null;
  }
}

async function readAiSchemaAutoReplySetting(prisma, companyId) {
  if (!prisma?.$queryRawUnsafe) {
    return null;
  }

  try {
    const rows = await prisma.$queryRawUnsafe(
      'SELECT "autoReplyEnabled" FROM ai.ai_settings WHERE "companyId" = $1 LIMIT 1',
      companyId
    );
    const row = Array.isArray(rows) ? rows[0] : null;
    if (!row) {
      return null;
    }
    return { autoReplyEnabled: row.autoReplyEnabled === true };
  } catch (error) {
    console.warn('⚠️ [AI-SETTINGS] Failed to read ai.ai_settings:', error.message);
    return null;
  }
}

async function getEffectiveAiAutoReplySetting(companyId, prisma = getSharedPrismaClient()) {
  if (!companyId) {
    return { autoReplyEnabled: false, source: 'missing_company' };
  }

  const legacySetting = await readLegacyAiSetting(prisma, companyId);
  const aiSchemaSetting = await readAiSchemaAutoReplySetting(prisma, companyId);

  if (aiSchemaSetting) {
    return {
      ...(legacySetting || {}),
      autoReplyEnabled: aiSchemaSetting.autoReplyEnabled,
      legacyAutoReplyEnabled: legacySetting?.autoReplyEnabled ?? null,
      source: 'ai.ai_settings'
    };
  }

  if (legacySetting) {
    return {
      ...legacySetting,
      source: 'public.ai_settings'
    };
  }

  return { autoReplyEnabled: false, source: 'default' };
}

async function checkHasActiveAiKey(companyId, prisma = getSharedPrismaClient()) {
  if (!prisma) return true;
  try {
    if (prisma.aiKey?.findFirst) {
      const key = await prisma.aiKey.findFirst({
        where: {
          isActive: true,
          OR: [
            { companyId: companyId || undefined },
            { keyType: 'CENTRAL' }
          ]
        },
        select: { id: true }
      });
      return Boolean(key);
    }
    if (prisma.$queryRawUnsafe) {
      const rows = await prisma.$queryRawUnsafe(
        'SELECT id FROM public.ai_keys WHERE "isActive" = true AND ("companyId" = $1 OR "keyType" = \'CENTRAL\') LIMIT 1',
        companyId || ''
      );
      return Array.isArray(rows) && rows.length > 0;
    }
  } catch (e) {
    console.warn('⚠️ [AI-SETTINGS] Failed to check active ai_keys:', e.message);
  }
  return true;
}

async function resolveAiHierarchy(companyId, options = {}, prisma = getSharedPrismaClient()) {
  const {
    masterSetting: preloadedMasterSetting,
    hasActiveKey: preloadedHasActiveKey,
    channelEnabled = true,
    conversationAiEnabled = true,
    aiPausedUntil = null
  } = options;

  const effectiveMaster = preloadedMasterSetting !== undefined
    ? preloadedMasterSetting
    : await getEffectiveAiAutoReplySetting(companyId, prisma);

  const masterAutoReplyEnabled = effectiveMaster?.autoReplyEnabled === true;
  const masterAgentPaused = effectiveMaster?.agentPaused === true;

  const hasActiveAiKey = preloadedHasActiveKey !== undefined
    ? preloadedHasActiveKey
    : await checkHasActiveAiKey(companyId, prisma);

  const isConversationPaused = Boolean(
    aiPausedUntil && new Date(aiPausedUntil).getTime() > Date.now()
  );

  const convAiEnabled = conversationAiEnabled !== false;

  const isEffectiveActive = Boolean(
    masterAutoReplyEnabled &&
    !masterAgentPaused &&
    hasActiveAiKey &&
    channelEnabled &&
    convAiEnabled &&
    !isConversationPaused
  );

  let reason = 'ACTIVE';
  if (!masterAutoReplyEnabled) {
    reason = 'MASTER_AI_DISABLED';
  } else if (masterAgentPaused) {
    reason = 'MASTER_AGENT_PAUSED';
  } else if (!hasActiveAiKey) {
    reason = 'NO_ACTIVE_AI_KEY';
  } else if (!channelEnabled) {
    reason = 'CHANNEL_DISABLED';
  } else if (!convAiEnabled) {
    reason = 'CONVERSATION_DISABLED';
  } else if (isConversationPaused) {
    reason = 'CONVERSATION_PAUSED';
  }

  return {
    masterAutoReplyEnabled,
    masterAgentPaused,
    hasActiveAiKey,
    channelEnabled: Boolean(channelEnabled),
    conversationAiEnabled: convAiEnabled,
    isConversationPaused,
    conversationPausedUntil: aiPausedUntil ? new Date(aiPausedUntil).toISOString() : null,
    isEffectiveActive,
    reason
  };
}

module.exports = {
  getEffectiveAiAutoReplySetting,
  readAiSchemaAutoReplySetting,
  readLegacyAiSetting,
  checkHasActiveAiKey,
  resolveAiHierarchy
};
