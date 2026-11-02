const { getSharedPrismaClient } = require('../services/sharedDatabase');

const DEFAULT_RUNTIME_SETTINGS = {
  maxParallel: 3,
  poolSize: 4,
};

const getCompanyId = (req) => req.user?.companyId || req.companyId;

/**
 * GET /api/v1/agent-manager/runtime-settings
 * Get runtime settings for current company
 */
async function getRuntimeSettings(req, res) {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ success: false, error: 'companyId is required' });
    }

    const prisma = getSharedPrismaClient();
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { settings: true },
    });

    const parsed = typeof company?.settings === 'string'
      ? JSON.parse(company.settings)
      : (company?.settings || {});

    const agentRuntime = {
      ...DEFAULT_RUNTIME_SETTINGS,
      ...(parsed.agentRuntime || {}),
    };

    return res.json({
      success: true,
      maxParallel: agentRuntime.maxParallel,
      poolSize: agentRuntime.poolSize,
      settings: agentRuntime,
      data: agentRuntime,
      agentRuntime,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * PUT /api/v1/agent-manager/runtime-settings
 * Update runtime settings for current company (whitelist maxParallel 1..10 only)
 */
async function updateRuntimeSettings(req, res) {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ success: false, error: 'companyId is required' });
    }

    const { maxParallel } = req.body || {};
    if (maxParallel === undefined || maxParallel === null) {
      return res.status(400).json({ success: false, error: 'maxParallel is required' });
    }

    const parsedMax = Number(maxParallel);
    if (Number.isNaN(parsedMax) || parsedMax < 1 || parsedMax > 10) {
      return res.status(400).json({ success: false, error: 'maxParallel must be an integer between 1 and 10' });
    }

    const safeMaxParallel = Math.floor(parsedMax);

    const prisma = getSharedPrismaClient();
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { settings: true },
    });

    const parsed = typeof company?.settings === 'string'
      ? JSON.parse(company.settings)
      : (company?.settings || {});

    parsed.agentRuntime = {
      ...DEFAULT_RUNTIME_SETTINGS,
      ...(parsed.agentRuntime || {}),
      maxParallel: safeMaxParallel,
    };

    await prisma.company.update({
      where: { id: companyId },
      data: { settings: parsed },
    });

    return res.json({
      success: true,
      maxParallel: safeMaxParallel,
      poolSize: parsed.agentRuntime.poolSize || DEFAULT_RUNTIME_SETTINGS.poolSize,
      settings: parsed.agentRuntime,
      data: parsed.agentRuntime,
      agentRuntime: parsed.agentRuntime,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}

module.exports = {
  DEFAULT_RUNTIME_SETTINGS,
  getRuntimeSettings,
  updateRuntimeSettings,
};
