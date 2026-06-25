const { getSharedPrismaClient } = require('../services/sharedDatabase');

async function getDefaultAgentTemplateSlug() {
  try {
    const prisma = getSharedPrismaClient();
    const setting = await prisma.systemSettings.findFirst({
      where: { systemName: 'defaultAgentTemplate' },
    });
    if (setting?.config) {
      const config = JSON.parse(setting.config);
      if (config.templateSlug) return config.templateSlug;
    }
  } catch (e) {
    console.warn('[DefaultAgentTemplate] Failed to read setting:', e.message);
  }
  return 'support-agent';
}

module.exports = { getDefaultAgentTemplateSlug };
