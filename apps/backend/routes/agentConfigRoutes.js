/**
 * @module agentConfigRoutes
 * @description CEO Agent configuration — Soul, Rules, and Skills management.
 *
 * GET  /api/v1/ai/agent-config   → load current config
 * PUT  /api/v1/ai/agent-config   → save config
 *
 * Storage (all in AiSetting row for the company):
 *   promptTemplate          → Soul (free-text Arabic personality)
 *   responseRules           → Rules (JSON string[])
 *   modelSettings.agentSkills → enabled tool names (string[])
 */

const express = require('express');
const router = express.Router();
const verifyToken = require('../utils/verifyToken');
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const { TOOLS } = require('../legacy-ai-agent/aiAgent/agentToolRegistry');
const { clearCache } = require('../legacy-ai-agent/aiAgent/agentSoulConfig');

router.use(verifyToken.authenticateToken);

const getCompanyId = (req) => req.user?.companyId || req.companyId;

const ALL_TOOL_NAMES = Object.keys(TOOLS);

function parseJson(val, fallback) {
  if (!val) return fallback;
  try { return JSON.parse(val); } catch { return fallback; }
}

// ── GET /api/v1/ai/agent-config ──────────────────────────────────────────────

router.get('/', async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ success: false, error: 'companyId required' });

    const prisma = getSharedPrismaClient();
    const setting = await prisma.aiSetting.findUnique({ where: { companyId } });

    // ── Soul ─────────────────────────────────────────────────────────────────
    const soul = setting?.promptTemplate || '';

    // ── Rules ────────────────────────────────────────────────────────────────
    let rules = [];
    const rawRules = setting?.responseRules;
    if (rawRules) {
      const parsed = parseJson(rawRules, null);
      if (Array.isArray(parsed)) rules = parsed;
      else if (typeof rawRules === 'string') rules = rawRules.split('\n').filter(Boolean);
    }

    // ── Skills ───────────────────────────────────────────────────────────────
    const modelSettings = parseJson(setting?.modelSettings, {});
    const storedSkills = modelSettings.agentSkills;
    const enabledSet = new Set(
      Array.isArray(storedSkills) && storedSkills.length > 0
        ? storedSkills
        : ALL_TOOL_NAMES
    );

    const skills = ALL_TOOL_NAMES.map(name => ({
      name,
      description: TOOLS[name].description,
      params: TOOLS[name].params,
      readOnly: TOOLS[name].readOnly,
      enabled: enabledSet.has(name),
    }));

    return res.json({ success: true, soul, rules, skills });
  } catch (error) {
    console.error('[AGENT-CONFIG] GET error:', error.message);
    return res.status(500).json({ success: false, error: 'فشل تحميل الإعدادات' });
  }
});

// ── PUT /api/v1/ai/agent-config ──────────────────────────────────────────────

router.put('/', async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ success: false, error: 'companyId required' });

    const { soul, rules, enabledSkills } = req.body || {};
    const prisma = getSharedPrismaClient();

    // Preserve existing modelSettings, only update agentSkills
    const existing = await prisma.aiSetting.findUnique({ where: { companyId } });
    const currentModelSettings = parseJson(existing?.modelSettings, {});

    const skillsToSave = Array.isArray(enabledSkills)
      ? enabledSkills.filter(s => ALL_TOOL_NAMES.includes(s))
      : ALL_TOOL_NAMES;

    const updatedModelSettings = {
      ...currentModelSettings,
      agentSkills: skillsToSave,
    };

    const cleanRules = Array.isArray(rules)
      ? rules.map(r => String(r).trim()).filter(Boolean)
      : [];

    await prisma.aiSetting.upsert({
      where: { companyId },
      update: {
        promptTemplate: soul?.trim() || null,
        responseRules: cleanRules.length ? JSON.stringify(cleanRules) : null,
        modelSettings: JSON.stringify(updatedModelSettings),
      },
      create: {
        companyId,
        promptTemplate: soul?.trim() || null,
        responseRules: cleanRules.length ? JSON.stringify(cleanRules) : null,
        modelSettings: JSON.stringify(updatedModelSettings),
      },
    });

    // Invalidate 5-min soul cache so the agent picks up changes immediately
    clearCache(companyId);

    return res.json({ success: true, message: 'تم حفظ إعدادات الوكيل بنجاح ✅' });
  } catch (error) {
    console.error('[AGENT-CONFIG] PUT error:', error.message);
    return res.status(500).json({ success: false, error: 'فشل حفظ الإعدادات' });
  }
});

module.exports = router;
