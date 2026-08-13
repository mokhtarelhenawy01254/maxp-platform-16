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
  const kw = keyword.trim().toLowerCase();
  if (!kw) return false;
  if (matchMode === 'EXACT') return text === kw;
  if (matchMode === 'REGEX') {
    try {
      return new RegExp(kw, 'i').test(text);
    } catch (e) {
      return false;
    }
  }
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

async function evaluateInboundBotReply({ companyId, text, channel, customer = {}, isFirstMessage = false }) {
  if (!companyId || !text) return { kind: null };

  const settings = await getBotAutomationSettings(companyId);

  if (!settings || !shouldRunChannel(settings, channel)) {
    return { kind: null };
  }

  if (settings.welcomeEnabled && settings.welcomeMessage && isFirstMessage) {
    return {
      kind: 'welcome',
      replyText: interpolateReply(settings.welcomeMessage, customer),
      settings,
    };
  }

  if (!settings.defaultReplyEnabled) {
    const matched = await matchBotRulesFromDb(companyId, text, channel);
    if (matched) return matched;
    return { kind: null };
  }

  const matched = await matchBotRulesFromDb(companyId, text, channel);
  if (matched) return matched;

  if (settings.defaultReply) {
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
  shouldRunChannel,
  evaluateInboundBotReply,
};
