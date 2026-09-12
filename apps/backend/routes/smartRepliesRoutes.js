const express = require('express');
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const verifyToken = require('../utils/verifyToken');

const router = express.Router();

const VALID_CHANNELS = [
  'WHATSAPP',
  'FACEBOOK',
  'MESSENGER',
  'INSTAGRAM',
  'TIKTOK',
  'TELEGRAM_USER',
  'TELEGRAM_BOT',
];

const DEFAULT_ACTIVE_CHANNELS = ['WHATSAPP', 'FACEBOOK', 'INSTAGRAM'];

function normalizeChannelMap(channelsInput, currentChannels = null) {
  const base = currentChannels
    ? (Array.isArray(currentChannels)
        ? {
            whatsapp: currentChannels.includes('WHATSAPP'),
            messenger: currentChannels.includes('FACEBOOK') || currentChannels.includes('MESSENGER'),
            instagram: currentChannels.includes('INSTAGRAM'),
            tiktok: currentChannels.includes('TIKTOK'),
            telegram_user: currentChannels.includes('TELEGRAM_USER') || currentChannels.includes('TELEGRAM_USERBOT'),
            telegram_bot: currentChannels.includes('TELEGRAM_BOT'),
          }
        : {
            whatsapp: currentChannels.whatsapp !== false,
            messenger: currentChannels.messenger !== false && currentChannels.facebook !== false,
            instagram: currentChannels.instagram !== false,
            tiktok: Boolean(currentChannels.tiktok),
            telegram_user: Boolean(currentChannels.telegram_user || currentChannels.telegramUser),
            telegram_bot: Boolean(currentChannels.telegram_bot || currentChannels.telegramBot),
          })
    : {
        whatsapp: true,
        messenger: true,
        instagram: true,
        tiktok: false,
        telegram_user: false,
        telegram_bot: false,
      };

  if (!channelsInput) return base;

  if (Array.isArray(channelsInput)) {
    const upper = channelsInput.map((c) => String(c || '').trim().toUpperCase());
    return {
      whatsapp: upper.includes('WHATSAPP'),
      messenger: upper.includes('FACEBOOK') || upper.includes('MESSENGER'),
      instagram: upper.includes('INSTAGRAM'),
      tiktok: upper.includes('TIKTOK'),
      telegram_user: upper.includes('TELEGRAM_USER') || upper.includes('TELEGRAM_USERBOT'),
      telegram_bot: upper.includes('TELEGRAM_BOT') || (upper.includes('TELEGRAM') && !upper.includes('TELEGRAM_USER')),
    };
  }

  if (typeof channelsInput === 'object') {
    return {
      whatsapp: channelsInput.whatsapp !== undefined ? Boolean(channelsInput.whatsapp) : base.whatsapp,
      messenger: channelsInput.messenger !== undefined
        ? Boolean(channelsInput.messenger)
        : (channelsInput.facebook !== undefined ? Boolean(channelsInput.facebook) : base.messenger),
      instagram: channelsInput.instagram !== undefined ? Boolean(channelsInput.instagram) : base.instagram,
      tiktok: channelsInput.tiktok !== undefined ? Boolean(channelsInput.tiktok) : base.tiktok,
      telegram_user: channelsInput.telegram_user !== undefined
        ? Boolean(channelsInput.telegram_user)
        : (channelsInput.telegramUser !== undefined ? Boolean(channelsInput.telegramUser) : base.telegram_user),
      telegram_bot: channelsInput.telegram_bot !== undefined
        ? Boolean(channelsInput.telegram_bot)
        : (channelsInput.telegramBot !== undefined ? Boolean(channelsInput.telegramBot) : base.telegram_bot),
    };
  }

  return base;
}

function channelMapToArray(channelMap) {
  const arr = [];
  if (channelMap.whatsapp) arr.push('WHATSAPP');
  if (channelMap.messenger) arr.push('FACEBOOK');
  if (channelMap.instagram) arr.push('INSTAGRAM');
  if (channelMap.tiktok) arr.push('TIKTOK');
  if (channelMap.telegram_user) arr.push('TELEGRAM_USER');
  if (channelMap.telegram_bot) arr.push('TELEGRAM_BOT');
  return arr;
}

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
        channels: Array.isArray(template.channels)
          ? template.channels.map((c) => String(c || '').trim().toUpperCase()).filter((c) => VALID_CHANNELS.includes(c))
          : DEFAULT_ACTIVE_CHANNELS,
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

function validateSmartReplyTemplates(customRuleResponses) {
  if (!customRuleResponses || typeof customRuleResponses !== 'object') return null;
  const templates = customRuleResponses.templates;
  if (!templates) return null;
  if (!Array.isArray(templates)) {
    return 'قائمة القوالب يجب أن تكون مصفوفة صالحة';
  }

  for (let i = 0; i < templates.length; i++) {
    const template = templates[i];
    if (!template || typeof template !== 'object') {
      return `القالب رقم ${i + 1} غير صالح`;
    }
    const name = String(template.name || '').trim();
    if (!name) {
      return `القالب رقم ${i + 1} يتطلب اسماً`;
    }
    const keywords = Array.isArray(template.keywords)
      ? template.keywords.map((k) => String(k || '').trim()).filter(Boolean)
      : [];
    if (keywords.length === 0) {
      return `القالب "${name}" يتطلب كلمة مفتاحية واحدة على الأقل`;
    }
    const responses = Array.isArray(template.responses)
      ? template.responses.map((r) => String(r || '').trim()).filter(Boolean)
      : [];
    if (responses.length === 0) {
      return `القالب "${name}" يتطلب قالباً أو رداً واحداً على الأقل`;
    }
  }

  return null;
}

function parseRuleResponseSettings(aiSetting) {
  const defaultChannelMap = normalizeChannelMap(null);
  const defaults = {
    enableRuleResponses: false,
    channels: channelMapToArray(defaultChannelMap),
    channelSettings: defaultChannelMap,
    allowDefaultRuleResponses: false,
    customRuleResponses: { templates: [] },
  };

  if (!aiSetting?.modelSettings) {
    return defaults;
  }

  try {
    const modelSettings = JSON.parse(aiSetting.modelSettings);
    const saved = modelSettings.ruleResponses || {};
    const channelMap = normalizeChannelMap(saved.channelSettings || saved.channels);
    const activeChannelsArray = channelMapToArray(channelMap);

    return {
      ...defaults,
      ...saved,
      enableRuleResponses: saved.enableRuleResponses === true,
      channels: activeChannelsArray,
      channelSettings: channelMap,
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

    const validationError = validateSmartReplyTemplates(req.body?.customRuleResponses);
    if (validationError) {
      return res.status(400).json({
        success: false,
        error: validationError,
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

    const normalizedCustomRuleResponses = req.body?.customRuleResponses !== undefined
      ? normalizeSmartReplyTemplates(req.body.customRuleResponses)
      : (modelSettings?.ruleResponses?.customRuleResponses || { templates: [] });

    const rawChannels = req.body?.channelSettings !== undefined ? req.body.channelSettings : req.body?.channels;
    const channelMap = normalizeChannelMap(
      rawChannels,
      modelSettings?.ruleResponses?.channelSettings || modelSettings?.ruleResponses?.channels
    );
    const activeChannelsArray = channelMapToArray(channelMap);

    const enableRuleResponses = req.body?.enableRuleResponses !== undefined
      ? req.body.enableRuleResponses === true
      : (modelSettings?.ruleResponses?.enableRuleResponses === true);

    modelSettings.ruleResponses = {
      enableRuleResponses,
      channels: activeChannelsArray,
      channelSettings: channelMap,
      customRuleResponses: normalizedCustomRuleResponses,
      allowDefaultRuleResponses: false,
      updatedAt: new Date().toISOString(),
    };

    const updatedSetting = await getSharedPrismaClient().aiSetting.upsert({
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
      data: parseRuleResponseSettings(updatedSetting),
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
