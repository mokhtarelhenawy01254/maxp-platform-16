const express = require('express');
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const verifyToken = require('../utils/verifyToken');

const router = express.Router();

function normalizeSmartReplyTemplates(customRuleResponses) {
  const templates = Array.isArray(customRuleResponses?.templates)
    ? customRuleResponses.templates
    : [];

  return {
    templates: templates
      .filter((template) => template && typeof template === 'object')
      .map((template) => ({
        id: String(template.id || `template_${Date.now()}`),
        name: String(template.name || 'Custom smart reply'),
        type: String(template.type || 'custom'),
        keywords: Array.isArray(template.keywords)
          ? template.keywords.map((keyword) => String(keyword || '').trim()).filter(Boolean)
          : [],
        responses: Array.isArray(template.responses)
          ? template.responses.map((reply) => String(reply || '').trim()).filter(Boolean)
          : [],
        isDefault: false,
      }))
      .filter((template) => template.keywords.length > 0 && template.responses.length > 0),
  };
}

function parseRuleResponseSettings(aiSetting) {
  const defaults = {
    enableRuleResponses: false,
    allowDefaultRuleResponses: false,
    customRuleResponses: { templates: [] },
  };

  if (!aiSetting?.modelSettings) {
    return defaults;
  }

  try {
    const modelSettings = JSON.parse(aiSetting.modelSettings);
    const saved = modelSettings.ruleResponses || {};
    return {
      ...defaults,
      ...saved,
      enableRuleResponses: saved.enableRuleResponses === true,
      allowDefaultRuleResponses: false,
      customRuleResponses: normalizeSmartReplyTemplates(saved.customRuleResponses),
    };
  } catch {
    return defaults;
  }
}

router.get('/rule-responses', verifyToken.authenticateToken, async (req, res) => {
  try {
    const companyId = req.user?.companyId || req.companyId;
    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: 'Company ID is required',
      });
    }

    const aiSetting = await getSharedPrismaClient().aiSetting.findUnique({
      where: { companyId },
      select: { modelSettings: true },
    });

    return res.json({
      success: true,
      data: parseRuleResponseSettings(aiSetting),
    });
  } catch (error) {
    console.error('Error loading smart replies:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to load smart replies',
    });
  }
});

router.put('/rule-responses', verifyToken.authenticateToken, async (req, res) => {
  try {
    const companyId = req.user?.companyId || req.companyId;
    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: 'Company ID is required',
      });
    }

    const existing = await getSharedPrismaClient().aiSetting.findUnique({
      where: { companyId },
      select: { modelSettings: true },
    });

    let modelSettings = {};
    if (existing?.modelSettings) {
      try {
        modelSettings = JSON.parse(existing.modelSettings);
      } catch {
        modelSettings = {};
      }
    }

    const normalizedCustomRuleResponses = normalizeSmartReplyTemplates(
      req.body?.customRuleResponses,
    );
    modelSettings.ruleResponses = {
      enableRuleResponses: req.body?.enableRuleResponses === true,
      customRuleResponses: normalizedCustomRuleResponses,
      allowDefaultRuleResponses: false,
      updatedAt: new Date().toISOString(),
    };

    await getSharedPrismaClient().aiSetting.upsert({
      where: { companyId },
      update: {
        modelSettings: JSON.stringify(modelSettings),
        updatedAt: new Date(),
      },
      create: {
        companyId,
        modelSettings: JSON.stringify(modelSettings),
        autoReplyEnabled: false,
      },
    });

    return res.json({
      success: true,
      message: 'Smart replies saved successfully',
    });
  } catch (error) {
    console.error('Error saving smart replies:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to save smart replies',
    });
  }
});

module.exports = router;
