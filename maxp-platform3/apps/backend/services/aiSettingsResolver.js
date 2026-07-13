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

module.exports = {
  getEffectiveAiAutoReplySetting,
  readAiSchemaAutoReplySetting,
  readLegacyAiSetting
};
