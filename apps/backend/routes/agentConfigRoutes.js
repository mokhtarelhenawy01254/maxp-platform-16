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
const { TOOLS } = { TOOLS: {} };
const { clearCache } = { clearCache: async () => {} };
const { t } = require('../services/i18n');

router.use(verifyToken.authenticateToken);

const getCompanyId = (req) => req.user?.companyId || req.companyId;

function getAllToolNames() {
  return Object.keys(TOOLS);
}

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

    // ── Soul / Rules / Skills — now from ai-service (AgentTemplate)
    // Legacy: fall back to AiSetting if ai-service is unreachable
    let soul = '';
    let rules = [];
    let skills = [];
    try {
      const templates = await aiServiceAdminClient.listAgentTemplates();
      if (Array.isArray(templates) && templates.length > 0) {
        const ceoTemplate = templates.find(t => t.role === 'CEO') || templates[0];
        soul = ceoTemplate.instructions_soul || ceoTemplate.instructionsSoul || '';
        const allTools = await aiServiceAdminClient.listTools();
        skills = Array.isArray(allTools) ? allTools.map(t => ({
          name: t.name, description: t.description || '',
          params: t.params || {}, readOnly: t.readOnly !== false, enabled: true,
        })) : [];
      }
    } catch (_) {
      // Fallback to legacy AiSetting fields
      soul = setting?.promptTemplate || '';
      const rawRules = setting?.responseRules;
      if (rawRules) {
        const parsed = parseJson(rawRules, null);
        if (Array.isArray(parsed)) rules = parsed;
        else if (typeof rawRules === 'string') rules = rawRules.split('\n').filter(Boolean);
      }
      const allToolNames = getAllToolNames();
      const modelSettings = parseJson(setting?.modelSettings, {});
      const storedSkills = modelSettings.agentSkills;
      const enabledSet = new Set(Array.isArray(storedSkills) && storedSkills.length > 0 ? storedSkills : allToolNames);
      skills = allToolNames.map(name => ({ name, description: TOOLS[name]?.description || '', params: TOOLS[name]?.params || {}, readOnly: TOOLS[name]?.readOnly !== false, enabled: enabledSet.has(name) }));
    }

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

    // 2026: Delegate soul/rules/skills to ai-service AgentTemplate
    try {
      const templates = await aiServiceAdminClient.listAgentTemplates();
      const ceoSlug = Array.isArray(templates) && templates.find(t => t.role === 'CEO')?.slug || 'manager-ceo';
      await aiServiceAdminClient.updateAgentTemplate(ceoSlug, {
        soulInstructions: soul?.trim() || '',
        rules: Array.isArray(rules) ? rules.map(r => String(r).trim()).filter(Boolean) : [],
        allowedSkills: Array.isArray(enabledSkills) ? enabledSkills : [],
      });
    } catch (apiErr) {
      console.error('[AGENT-CONFIG] Failed to sync to ai-service:', apiErr.message);
    }

    // Keep AiSetting for backward-compatible company settings
    const existing = await prisma.aiSetting.findUnique({ where: { companyId } });
    const currentModelSettings = parseJson(existing?.modelSettings, {});
    const allToolNames = getAllToolNames();
    const skillsToSave = Array.isArray(enabledSkills)
      ? enabledSkills.filter(s => allToolNames.includes(s))
      : allToolNames;
    const updatedModelSettings = { ...currentModelSettings, agentSkills: skillsToSave };

    await prisma.aiSetting.upsert({
      where: { companyId },
      update: { modelSettings: JSON.stringify(updatedModelSettings) },
      create: { companyId, modelSettings: JSON.stringify(updatedModelSettings) },
    });

    clearCache(companyId);
    return res.json({ success: true, message: t('agentConfig.saved') });
  } catch (error) {
    console.error('[AGENT-CONFIG] PUT error:', error.message);
    return res.status(500).json({ success: false, error: t('agentConfig.saveFailed') });
  }
});

module.exports = router;
