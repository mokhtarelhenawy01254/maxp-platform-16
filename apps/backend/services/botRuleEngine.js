const { getSharedPrismaClient } = require('./sharedDatabase');

function normalizeBotText(text) {
  if (!text || typeof text !== 'string') return '';
  let t = text.toLowerCase();
  t = t.replace(/[\u064B-\u0652\u0640]/g, '');
  t = t.replace(/[أإآ]/g, 'ا');
  t = t.replace(/ى/g, 'ي');
  t = t.replace(/ة/g, 'ه');
  t = t.replace(/[^\p{L}\p{N}\s]/gu, ' ');
  t = t.replace(/\s+/g, ' ').trim();
  return t;
}

function normalizeKeywordList(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed;
    } catch (e) { /* not json */ }
    return value.split(/[,،\n]/).map((k) => k.trim()).filter(Boolean);
  }
  return [];
}

function parseChannels(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed;
      if (parsed && typeof parsed === 'object') {
        return Object.keys(parsed).filter((c) => parsed[c]);
      }
    } catch (e) { /* not json */ }
    return [];
  }
  return [];
}

function getRuleChannelList(rule) {
  const channels = parseChannels(rule.channels);
  return channels.length > 0 ? channels : ['WHATSAPP', 'FACEBOOK'];
}

function matchesKeyword(text, keyword, matchMode) {
  if (!keyword) return false;
  if (matchMode === 'REGEX') {
    try {
      return new RegExp(String(keyword).trim(), 'i').test(text);
    } catch (e) {
      return false;
    }
  }
  const kw = normalizeBotText(keyword);
  if (!kw) return false;
  if (matchMode === 'EXACT') return text === kw;
  return text.includes(kw);
}

function matchBotRules({ text, rules = [], channel }) {
  if (!text || !Array.isArray(rules) || rules.length === 0) return null;

  const normalized = normalizeBotText(text);
  if (!normalized) return null;

  let best = null;
  for (const rule of rules) {
    if (!rule || rule.isEnabled === false) continue;
    const channels = getRuleChannelList(rule);
    if (!channels.includes(channel)) continue;

    const keywords = normalizeKeywordList(rule.keywords);
    if (keywords.length === 0) continue;

    let matchedKeyword = null;
    let bestKwLen = -1;
    for (const kw of keywords) {
      if (matchesKeyword(normalized, kw, rule.matchMode || 'CONTAINS')) {
        const len = String(kw).length;
        if (len > bestKwLen) {
          bestKwLen = len;
          matchedKeyword = kw;
        }
      }
    }
    if (!matchedKeyword) continue;

    if (!best) {
      best = { rule, matchedKeyword, normalized };
      continue;
    }
    const priorityBetter = Number(rule.priority || 0) > Number(best.rule.priority || 0);
    const samePriorityMoreSpecific =
      Number(rule.priority || 0) === Number(best.rule.priority || 0) &&
      bestKwLen > best.matchedKeyword.length;
    if (priorityBetter || samePriorityMoreSpecific) {
      best = { rule, matchedKeyword, normalized };
    }
  }

  return best;
}

function interpolateReply(text, vars = {}) {
  if (!text) return text;
  const map = {
    firstName: vars.firstName || vars.first_name || '',
    lastName: vars.lastName || vars.last_name || '',
    customerName: vars.customerName || vars.customer_name || vars.firstName || '',
  };
  return String(text).replace(/\{(firstName|lastName|customerName|first_name|last_name|customer_name)\}/g, (_, key) => map[key] || '');
}

async function getBotAutomationSettings(companyId) {
  try {
    const prisma = getSharedPrismaClient();
    return await prisma.botAutomationSettings.findUnique({ where: { companyId } });
  } catch (e) {
    console.error('[BOT-RULES] Failed to load automation settings:', e.message);
    return null;
  }
}

async function getBotRules(companyId) {
  try {
    const prisma = getSharedPrismaClient();
    return await prisma.botAutomationRule.findMany({
      where: { companyId, isEnabled: true },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    });
  } catch (e) {
    console.error('[BOT-RULES] Failed to load automation rules:', e.message);
    return [];
  }
}

function shouldRunChannel(settings, channel) {
  if (!settings || !settings.channels) return true;
  const channels = parseChannels(settings.channels);
  if (channels.length === 0) return true;
  return channels.includes(channel);
}

function isSmartReplyChannelEnabled(config, channel) {
  if (!channel) return true;
  const ch = String(channel).toUpperCase().trim();
  if (!config) return ['WHATSAPP', 'FACEBOOK', 'MESSENGER', 'INSTAGRAM'].includes(ch);

  // 1. If passed directly as an array: ['WHATSAPP', 'FACEBOOK', ...]
  if (Array.isArray(config)) {
    const active = config.map((c) => String(c).toUpperCase().trim());
    if (ch === 'MESSENGER' || ch === 'FACEBOOK') {
      return active.includes('FACEBOOK') || active.includes('MESSENGER');
    }
    if (ch === 'TELEGRAM_BOT') {
      return active.includes('TELEGRAM_BOT') || (active.includes('TELEGRAM') && !active.includes('TELEGRAM_USER'));
    }
    if (ch === 'TELEGRAM_USER' || ch === 'TELEGRAM_USERBOT') {
      return active.includes('TELEGRAM_USER') || active.includes('TELEGRAM_USERBOT');
    }
    if (ch === 'TELEGRAM') {
      return active.includes('TELEGRAM') || active.includes('TELEGRAM_BOT') || active.includes('TELEGRAM_USER');
    }
    return active.includes(ch);
  }

  // 2. If passed as wrapper with channelSettings: { channelSettings, channels }
  if (config.channelSettings && typeof config.channelSettings === 'object') {
    const cs = config.channelSettings;
    if (ch === 'WHATSAPP') return cs.whatsapp !== false;
    if (ch === 'FACEBOOK' || ch === 'MESSENGER') return cs.messenger !== false && cs.facebook !== false;
    if (ch === 'INSTAGRAM') return cs.instagram !== false;
    if (ch === 'TIKTOK') return Boolean(cs.tiktok);
    if (ch === 'TELEGRAM_USER' || ch === 'TELEGRAM_USERBOT') return Boolean(cs.telegram_user || cs.telegramUser);
    if (ch === 'TELEGRAM_BOT') return Boolean(cs.telegram_bot || cs.telegramBot);
    if (ch === 'TELEGRAM') return Boolean(cs.telegram_bot || cs.telegramBot || cs.telegram_user || cs.telegramUser);
  }

  // 3. If wrapper has channels array
  if (Array.isArray(config.channels)) {
    return isSmartReplyChannelEnabled(config.channels, ch);
  }

  // 4. If passed directly as channelSettings map (e.g. { whatsapp: true, messenger: false })
  if (typeof config === 'object') {
    const cs = config;
    if (ch === 'WHATSAPP') return cs.whatsapp !== false;
    if (ch === 'FACEBOOK' || ch === 'MESSENGER') return cs.messenger !== false && cs.facebook !== false;
    if (ch === 'INSTAGRAM') return cs.instagram !== false;
    if (ch === 'TIKTOK') return Boolean(cs.tiktok);
    if (ch === 'TELEGRAM_USER' || ch === 'TELEGRAM_USERBOT') return Boolean(cs.telegram_user || cs.telegramUser);
    if (ch === 'TELEGRAM_BOT') return Boolean(cs.telegram_bot || cs.telegramBot);
    if (ch === 'TELEGRAM') return Boolean(cs.telegram_bot || cs.telegramBot || cs.telegram_user || cs.telegramUser);
  }

  // Default active channels for backwards compatibility: WHATSAPP, FACEBOOK, INSTAGRAM
  const defaultActive = ['WHATSAPP', 'FACEBOOK', 'MESSENGER', 'INSTAGRAM'];
  return defaultActive.includes(ch);
}

async function getSmartReplies(companyId, channel) {
  try {
    const prisma = getSharedPrismaClient();
    if (!prisma?.aiSetting?.findUnique) return null;
    const aiSetting = await prisma.aiSetting.findUnique({
      where: { companyId },
      select: { modelSettings: true },
    });
    if (!aiSetting?.modelSettings) return null;

    let modelSettings = {};
    try {
      modelSettings = JSON.parse(aiSetting.modelSettings);
    } catch {
      return null;
    }

    const ruleResponses = modelSettings?.ruleResponses;
    if (!ruleResponses || ruleResponses.enableRuleResponses !== true) {
      return null;
    }

    if (channel) {
      const allowed = isSmartReplyChannelEnabled({
        channels: ruleResponses.channels,
        channelSettings: ruleResponses.channelSettings,
      }, channel);
      if (!allowed) {
        return null;
      }
    }

    const templates = Array.isArray(ruleResponses.customRuleResponses?.templates)
      ? ruleResponses.customRuleResponses.templates
      : [];

    const ALL_CHANNELS = [
      'WHATSAPP',
      'FACEBOOK',
      'MESSENGER',
      'INSTAGRAM',
      'TIKTOK',
      'TELEGRAM_USER',
      'TELEGRAM_BOT',
    ];

    return templates
      .filter((t) => t && typeof t === 'object')
      .map((t) => ({
        id: String(t.id || ''),
        name: String(t.name || ''),
        type: String(t.type || 'custom'),
        channels: Array.isArray(t.channels) && t.channels.length > 0
          ? t.channels.map((c) => String(c).toUpperCase())
          : ALL_CHANNELS,
        keywords: Array.isArray(t.keywords)
          ? t.keywords.map((k) => String(k || '').trim()).filter(Boolean)
          : [],
        responses: Array.isArray(t.responses)
          ? t.responses.map((r) => String(r || '').trim()).filter(Boolean)
          : [],
      }))
      .filter((t) => t.keywords.length > 0 && t.responses.length > 0);
  } catch (e) {
    console.error('[BOT-RULES] Failed to load smart replies:', e.message);
    return null;
  }
}

function matchSmartReplyTemplates({ text, templates = [], channel }) {
  if (!text || !Array.isArray(templates) || templates.length === 0) return null;

  const normalized = normalizeBotText(text);
  if (!normalized) return null;

  const normalizedChannel = channel ? String(channel).toUpperCase() : null;

  let best = null;
  for (const template of templates) {
    if (!template || !Array.isArray(template.keywords) || template.keywords.length === 0) continue;

    if (normalizedChannel && Array.isArray(template.channels) && template.channels.length > 0) {
      const isTemplateAllowed = isSmartReplyChannelEnabled(template.channels, normalizedChannel);
      if (!isTemplateAllowed) {
        continue;
      }
    }

    let matchedKeyword = null;
    let bestKwLen = -1;

    for (const rawKw of template.keywords) {
      if (!rawKw) continue;
      const normalizedKw = normalizeBotText(rawKw);
      if (!normalizedKw) continue;

      if (matchesKeyword(normalized, normalizedKw, 'CONTAINS')) {
        const len = normalizedKw.length;
        if (len > bestKwLen) {
          bestKwLen = len;
          matchedKeyword = rawKw;
        }
      }
    }

    if (!matchedKeyword) continue;

    if (!best || bestKwLen > best.bestKwLen) {
      best = {
        template,
        matchedKeyword,
        bestKwLen,
      };
    }
  }

  if (!best) return null;

  const responses = (best.template.responses || []).filter((r) => r && String(r).trim());
  if (responses.length === 0) return null;

  const selectedResponse = responses[Math.floor(Math.random() * responses.length)];

  return {
    kind: 'smart_reply',
    ruleId: best.template.id,
    templateName: best.template.name,
    matchedKeyword: best.matchedKeyword,
    replyText: selectedResponse,
    replyType: 'TEXT',
    mediaUrl: null,
    buttons: null,
    stopFurtherProcessing: true,
  };
}

async function evaluateInboundBotReply({ companyId, text, channel, customer = {}, isFirstMessage = false }) {
  if (!companyId || !text) return { kind: null };

  const settings = await getBotAutomationSettings(companyId);
  const isBotAutomationActive = settings && shouldRunChannel(settings, channel);

  // 1. Welcome message on first contact (if bot automation configured and enabled)
  if (isBotAutomationActive && settings.welcomeEnabled && settings.welcomeMessage && isFirstMessage) {
    return {
      kind: 'welcome',
      replyText: interpolateReply(settings.welcomeMessage, customer),
      settings,
    };
  }

  // 2. Custom rules from Bot Automation (if active)
  if (isBotAutomationActive) {
    const matched = await matchBotRulesFromDb(companyId, text, channel);
    if (matched) return matched;
  }

  // 3. Smart Replies from /settings/smart-replies (AiSetting)
  const smartTemplates = await getSmartReplies(companyId, channel);
  if (smartTemplates && smartTemplates.length > 0) {
    const matchedSmartReply = matchSmartReplyTemplates({ text, templates: smartTemplates, channel });
    if (matchedSmartReply) {
      matchedSmartReply.replyText = interpolateReply(matchedSmartReply.replyText, customer);
      return matchedSmartReply;
    }
  }

  // 4. Default reply from Bot Automation (if active and enabled)
  if (isBotAutomationActive && settings.defaultReplyEnabled && settings.defaultReply) {
    return {
      kind: 'default',
      replyText: interpolateReply(settings.defaultReply, customer),
      settings,
    };
  }

  return { kind: null };
}

async function matchBotRulesFromDb(companyId, text, channel) {
  const rules = await getBotRules(companyId);
  const matched = matchBotRules({ text, rules, channel });
  if (!matched) return null;
  return {
    kind: 'rule',
    ruleId: matched.rule.id,
    rule: matched.rule,
    matchedKeyword: matched.matchedKeyword,
    replyText: interpolateReply(matched.rule.replyText || '', {}),
    replyType: matched.rule.replyType || 'TEXT',
    mediaUrl: matched.rule.mediaUrl || null,
    buttons: matched.rule.buttons || null,
    stopFurtherProcessing: matched.rule.stopFurtherProcessing !== false,
  };
}

module.exports = {
  normalizeBotText,
  normalizeKeywordList,
  parseChannels,
  getRuleChannelList,
  matchesKeyword,
  matchBotRules,
  interpolateReply,
  getBotAutomationSettings,
  getBotRules,
  getSmartReplies,
  matchSmartReplyTemplates,
  shouldRunChannel,
  isSmartReplyChannelEnabled,
  evaluateInboundBotReply,
};
