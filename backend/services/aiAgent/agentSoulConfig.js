/**
 * @module agentSoulConfig
 * @description Loads agent Soul/Rules/Skills per company.
 * Priority: company AiSetting → AgentDefinition (by type) → GlobalAiConfig (legacy) → hardcoded defaults
 */

const { getSharedPrismaClient } = require('../sharedDatabase');

// ─── Default Soul (CEO, Arabic, Professional) ─────────────────────────────────

const DEFAULT_SOUL = `
أنت CEO Agent — مساعد ذكي متخصص في إدارة الأعمال التجارية.
دورك هو مساعدة صاحب الشركة والمدير في اتخاذ قرارات مبنية على البيانات الفعلية.

شخصيتك:
- تتكلم العربية دائماً بأسلوب مهني وودود ومختصر
- تستخدم الأرقام والإحصائيات عند توفر البيانات
- تقدم توصيات عملية وقابلة للتنفيذ
- تكون صادقاً إذا كانت البيانات غير متاحة
`.trim();

const DEFAULT_RULES = `
قواعد لا تُخالَف:
1. تجاوب دائماً باللغة العربية بغض النظر عن لغة السؤال
2. لا تخترع أرقاماً أو بيانات — استخدم الأدوات للحصول على البيانات الحقيقية
3. إذا لم تكن متأكداً، قل ذلك بوضوح
4. لا تشارك بيانات حساسة خارج نطاق الشركة
5. إذا طُلب تعديل بيانات (تغيير سعر / تطبيق خصم) يجب تأكيد الأمر أولاً
6. الردود تكون مختصرة وواضحة — تجنب الإطالة غير الضرورية
`.trim();

// ─── Cache  ───────────────────────────────────────────────────────────────────
// Key: `${companyId}:${agentType}`

const _cache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;

/** Clear all cache entries for a specific company (any agent type). */
function clearCache(companyId) {
  if (!companyId) { _cache.clear(); return; }
  for (const key of _cache.keys()) {
    if (key.startsWith(`${companyId}:`)) _cache.delete(key);
  }
}

/** Clear all cache entries that use a specific agent type (all companies). */
function clearAgentCache(agentType) {
  for (const key of _cache.keys()) {
    if (key.endsWith(`:${agentType}`)) _cache.delete(key);
  }
}

// ─── Main loader ──────────────────────────────────────────────────────────────

/**
 * Returns Soul + Rules + enabledTools for a company + agent type.
 *
 * @param {string} companyId
 * @param {string} [agentType='ceo']
 * @returns {{ soul: string, rules: string, companyName: string, enabledTools: string[]|null }}
 */
async function loadSoul(companyId, agentType = 'ceo') {
  const cacheKey = `${companyId}:${agentType}`;
  const cached = _cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  let soul = DEFAULT_SOUL;
  let rules = DEFAULT_RULES;
  let companyName = 'الشركة';
  let enabledTools = null;

  try {
    const prisma = getSharedPrismaClient();

    const [settings, company, agentDef] = await Promise.all([
      prisma.aiSetting.findUnique({ where: { companyId } }),
      prisma.company.findUnique({ where: { id: companyId }, select: { name: true } }),
      prisma.agentDefinition.findUnique({ where: { type: agentType } }).catch(() => null),
    ]);

    if (company?.name) companyName = company.name;

    // ── Global agent config: AgentDefinition → GlobalAiConfig (legacy) ────────
    let globalAgentConfig = {};
    if (agentDef?.settings) {
      try { globalAgentConfig = JSON.parse(agentDef.settings); } catch { /* ignore */ }
    } else {
      // Legacy fallback to GlobalAiConfig
      try {
        const globalConfig = await prisma.globalAiConfig.findFirst({ orderBy: { createdAt: 'asc' } });
        if (globalConfig?.settings) {
          const gs = JSON.parse(globalConfig.settings);
          globalAgentConfig = gs.agentConfig || {};
        }
      } catch { /* ignore */ }
    }

    // ── Soul: company-specific → global default → hardcoded ──────────────────
    if (settings?.promptTemplate?.trim()) {
      soul = settings.promptTemplate.trim();
    } else if (globalAgentConfig.soul?.trim()) {
      soul = globalAgentConfig.soul.trim();
    }

    // ── Rules: company-specific → global default → hardcoded ─────────────────
    const rawRules = settings?.responseRules;
    if (rawRules?.trim()) {
      try {
        const parsed = JSON.parse(rawRules);
        if (Array.isArray(parsed) && parsed.length > 0) {
          rules = 'قواعد لا تُخالَف:\n' + parsed.map((r, i) => `${i + 1}. ${r}`).join('\n');
        } else if (typeof parsed === 'string') {
          rules = parsed;
        }
      } catch {
        rules = rawRules;
      }
    } else if (Array.isArray(globalAgentConfig.rules) && globalAgentConfig.rules.length > 0) {
      rules = 'قواعد لا تُخالَف:\n' + globalAgentConfig.rules.map((r, i) => `${i + 1}. ${r}`).join('\n');
    }

    // ── Skills: company-specific → global default → all tools ────────────────
    if (settings?.modelSettings) {
      try {
        const ms = JSON.parse(settings.modelSettings);
        if (Array.isArray(ms.agentSkills) && ms.agentSkills.length > 0) enabledTools = ms.agentSkills;
      } catch { /* keep enabledTools = null */ }
    }
    if (!enabledTools && Array.isArray(globalAgentConfig.skills) && globalAgentConfig.skills.length > 0) {
      enabledTools = globalAgentConfig.skills;
    }
  } catch (e) {
    console.warn('[SOUL-CONFIG] Failed to load soul (using defaults):', e.message);
  }

  const data = { soul, rules, companyName, enabledTools };
  _cache.set(cacheKey, { data, expiresAt: Date.now() + CACHE_TTL_MS });
  return data;
}

/**
 * Builds the full system prompt string for the LLM.
 *
 * @param {string} companyId
 * @param {string} toolDescriptions
 * @param {string} [agentType='ceo']
 * @returns {Promise<string>}
 */
async function buildSystemPrompt(companyId, toolDescriptions, agentType = 'ceo') {
  const { soul, rules, companyName } = await loadSoul(companyId, agentType);

  return `
[الهوية]
${soul.replace('{companyName}', companyName)}
[/الهوية]

[القواعد]
${rules}
[/القواعد]

[الأدوات المتاحة]
يمكنك استخدام الأدوات التالية للحصول على بيانات حقيقية من قاعدة البيانات:
${toolDescriptions}
[/الأدوات المتاحة]

[طريقة استخدام الأدوات]
عندما تحتاج بيانات، استخدم استدعاءات الأدوات الأصلية التي يرسلها لك النظام فقط.
سيتم تنفيذ الأداة وإعادة النتيجة إليك لتكمل إجابتك.
لا تكتب أي صيغة أدوات داخل نص الرد للمستخدم مثل CALL_TOOL أو tool_calls أو DSML أو agenttool__.
[/طريقة استخدام الأدوات]
`.trim();
}

module.exports = { loadSoul, buildSystemPrompt, clearCache, clearAgentCache };
