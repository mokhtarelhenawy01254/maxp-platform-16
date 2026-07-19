const { getSharedPrismaClient } = require('../services/sharedDatabase');

const SYSTEM_NAME = 'ai_image_generator_config';

const DEFAULT_CONFIG = {
  tiers: {
    fast: {
      displayName: 'سريع',
      description: 'أقل جودة لكن أسرع نتيجة - مناسب للتجربة والمسودات',
      model: 'google/gemini-3.1-flash-lite-image',
    },
    balanced: {
      displayName: 'متوازن',
      description: 'جودة وسرعة مناسبتين للمهام اليومية',
      model: 'google/gemini-3.1-flash-image',
    },
    premium: {
      displayName: 'احترافي',
      description: 'أعلى جودة للحملات الإعلانية والتصميمات الهامة',
      model: 'openai/gpt-image-2',
    },
  },
  defaultTier: 'balanced',
  defaultMaxRequestsPerDay: 50,
  companies: {},
};

function parseConfig(raw) {
  if (!raw) return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
  const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
  return { ...JSON.parse(JSON.stringify(DEFAULT_CONFIG)), ...parsed };
}

exports.getConfig = async (req, res) => {
  try {
    const prisma = getSharedPrismaClient();
    const setting = await prisma.systemSettings.findUnique({
      where: { systemName: SYSTEM_NAME },
    });
    const config = parseConfig(setting?.config);
    res.json({ success: true, data: config });
  } catch (error) {
    console.error('[SA-AI-IMAGE] getConfig error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateConfig = async (req, res) => {
  try {
    const prisma = getSharedPrismaClient();
    const config = parseConfig(req.body.config);
    await prisma.systemSettings.upsert({
      where: { systemName: SYSTEM_NAME },
      update: { config: JSON.stringify(config), updatedAt: new Date() },
      create: {
        systemName: SYSTEM_NAME,
        displayName: 'AI Image Generator Settings',
        description: 'Global settings for AI image generation: quality tiers, company overrides, quotas.',
        category: 'ai_models',
        isEnabled: true,
        config: JSON.stringify(config),
      },
    });
    res.json({ success: true, data: config });
  } catch (error) {
    console.error('[SA-AI-IMAGE] updateConfig error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.listCompanies = async (req, res) => {
  try {
    const prisma = getSharedPrismaClient();
    const companies = await prisma.company.findMany({
      select: { id: true, name: true, domain: true, isActive: true },
      orderBy: { name: 'asc' },
    });

    const setting = await prisma.systemSettings.findUnique({
      where: { systemName: SYSTEM_NAME },
    });
    const config = parseConfig(setting?.config);

    const result = companies.map(c => ({
      ...c,
      overrides: config.companies?.[c.id] || null,
      effectiveTier: config.companies?.[c.id]?.tier || config.defaultTier,
      enabled: config.companies?.[c.id]?.enabled !== undefined ? config.companies[c.id].enabled : true,
    }));

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('[SA-AI-IMAGE] listCompanies error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateCompanyOverride = async (req, res) => {
  try {
    const { companyId } = req.params;
    const { enabled, tier, maxRequestsPerDay } = req.body;

    const prisma = getSharedPrismaClient();
    const company = await prisma.company.findUnique({ where: { id: companyId }, select: { id: true } });
    if (!company) {
      return res.status(404).json({ success: false, message: 'الشركة غير موجودة' });
    }

    const setting = await prisma.systemSettings.findUnique({
      where: { systemName: SYSTEM_NAME },
    });
    const config = parseConfig(setting?.config);

    if (!config.companies) config.companies = {};
    config.companies[companyId] = {
      ...(config.companies[companyId] || {}),
      ...(enabled !== undefined ? { enabled } : {}),
      ...(tier ? { tier } : {}),
      ...(maxRequestsPerDay ? { maxRequestsPerDay: Number(maxRequestsPerDay) } : {}),
    };

    await prisma.systemSettings.upsert({
      where: { systemName: SYSTEM_NAME },
      update: { config: JSON.stringify(config), updatedAt: new Date() },
      create: {
        systemName: SYSTEM_NAME,
        displayName: 'AI Image Generator Settings',
        description: 'Global settings for AI image generation.',
        category: 'ai_models',
        isEnabled: true,
        config: JSON.stringify(config),
      },
    });

    res.json({ success: true, data: config.companies[companyId] });
  } catch (error) {
    console.error('[SA-AI-IMAGE] updateCompanyOverride error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};
