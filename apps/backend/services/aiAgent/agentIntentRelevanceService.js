/**
 * @module agentIntentRelevanceService
 * @description Structural intent gate for agent tools.
 *
 * Handles active durable goals and delegates general routing
 * to the schema-bound LLM classifier in agentIntentPlannerService.buildIntentContractAsync.
 */

const agentIntentPlannerService = require('./agentIntentPlannerService');

function normalizeText(value = '') {
  return String(value || '')
    .toLowerCase()
    .replace(/[ً-ٰٟـ]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[^\p{L}\p{N}_\s.-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripScenarioPrefix(value = '') {
  return String(value || '')
    .replace(/^\s*(?:FB|WA|LIVE|BATCH)[A-Z0-9_-]{2,100}[:：]\s*/iu, '')
    .replace(/^\s*اختبار\s+كودكس\s+(?=[^:：]{0,100}[\d_-])[^:：]{1,100}[:：]\s*/iu, '')
    .replace(/^\s*اختبار\s+كودكس\s+بعد\s+النشر\s*[:：]\s*/iu, '')
    .replace(/^\s*اختبار\s+بعد\s+النشر(?:\s+[\w.-]+)?\s*[:：]\s*/iu, '')
    .replace(/^\s*اختبار\s+بعد\s+التحديث\s*[:：]\s*/iu, '')
    .trim();
}

function includesAny(text, needles = []) {
  return needles.some((needle) => text.includes(normalizeText(needle)));
}

function unique(items = []) {
  return [...new Set(items.filter(Boolean))];
}

function filterAvailable(tools, availableTools = []) {
  const available = new Set(availableTools || []);
  return unique(tools).filter((tool) => available.has(tool));
}

const SLOT_PARAM_KEYS = {
  productName: ['productName'],
  productPrice: ['productPrice', 'price'],
  customerName: ['customerName'],
  customerPhone: ['customerPhone', 'phone'],
  quantity: ['quantity'],
  productSize: ['productSize', 'size'],
  productColor: ['productColor', 'color'],
  city: ['city'],
  governorate: ['governorate'],
  address: ['address', 'shippingAddress', 'customerAddress'],
};

function hasStructuredValue(params = {}, keys = []) {
  if (!params || typeof params !== 'object') return false;
  return keys.some((key) => {
    const value = params[key];
    if (typeof value === 'number') return Number.isFinite(value);
    if (typeof value === 'string') return value.trim().length > 0;
    if (Array.isArray(value)) return value.length > 0;
    return value !== undefined && value !== null;
  });
}

function paramsSatisfyMissingSlots(missingSlots = [], params = {}) {
  return missingSlots.every((slot) => {
    const keys = SLOT_PARAM_KEYS[slot] || [slot];
    return hasStructuredValue(params, keys);
  });
}

function buildPlan(base, availableTools) {
  const allowedTools = filterAvailable(base.allowedTools || [], availableTools);
  const primaryTool = allowedTools.includes(base.primaryTool) ? base.primaryTool : (allowedTools[0] || null);

  return {
    intent: base.intent || 'general',
    requiresTool: Boolean(base.requiresTool && primaryTool),
    primaryTool,
    allowedTools,
    blockedTools: filterAvailable(base.blockedTools || [], availableTools),
    reason: base.reason || 'No current system data required',
    goalRunId: base.goalRunId || null,
    selectionScore: Number.isFinite(base.selectionScore) ? base.selectionScore : null,
    classification: base.classification || null,
    alternatives: Array.isArray(base.alternatives) ? base.alternatives : [],
    missingSlots: unique(base.missingSlots || []),
    ambiguous: Boolean(base.ambiguous),
    trustedLocalRoute: Boolean(base.trustedLocalRoute),
    blockedReason: base.blockedReason || null,
  };
}

function isCustomerChatChannel(context = {}) {
  const channel = String(context?.channel || '').trim().toUpperCase();
  return ['FACEBOOK', 'MESSENGER', 'FB', 'WHATSAPP', 'WA'].includes(channel);
}

function buildCustomerClassifierSeed() {
  return {
    intent: 'general.chat',
    requiresTool: false,
    primaryTool: null,
    allowedTools: [],
    blockedTools: [],
    reason: 'Customer chat routing is model-classified only; local keyword routing is disabled',
    selectionScore: null,
    classification: null,
    alternatives: [],
    missingSlots: [],
    ambiguous: false,
    customerIntentMode: 'llm_structured_only',
  };
}

function getActiveGoal(context = {}) {
  const goal = context?.activeGoal;
  if (!goal || typeof goal !== 'object') return null;
  if (['completed', 'cancelled'].includes(goal.status)) return null;
  return goal;
}

function hasDomainHint(text = '') {
  return /(?:وكيل|ايجنت|agent|منتج|product|اوردر|order|مهاره|skill|مخزون|inventory|عميل|customer|sales|شحن|hr)/iu.test(text);
}

function isAmbiguousCreateRequest(text = '') {
  const normalized = normalizeText(stripScenarioPrefix(text));
  if (!normalized) return false;
  const addHints = ['نضيف', 'اضيف', 'ضيف', 'اضافه', 'اعمل', 'انشئ', 'create', 'add'];
  return (
    (includesAny(normalized, addHints) || /(?:^|\s)(?:انشاء|اضافه|بناء|تصميم)(?:\s|$)/u.test(normalized))
    && /(?:^|\s)(?:واحد|واحده|واحدة|حاجه|حاجة|شي|شيء)\s+(?:جديد|جديده|جديدة|تاني|تانيه|تانية)(?:\s|$)/u.test(normalized)
    && !hasDomainHint(normalized)
  );
}

function adminClassification({ reason = '', alternatives = [] } = {}) {
  return {
    mode: 'strict-rules-first',
    source: 'deterministic-signal-router',
    selected: true,
    reason,
    alternatives,
  };
}

function adminRoute(base = {}, availableTools = []) {
  const alternatives = Array.isArray(base.alternatives) ? base.alternatives : [];
  return buildPlan({
    ...base,
    trustedLocalRoute: true,
    selectionScore: Number.isFinite(base.selectionScore) ? base.selectionScore : 94,
    classification: base.classification || adminClassification({
      reason: base.reason,
      alternatives,
    }),
    alternatives,
  }, availableTools);
}

function getLastAssistantText(context = {}) {
  const recent = Array.isArray(context?.recentMessages) ? context.recentMessages : [];
  for (let index = recent.length - 1; index >= 0; index -= 1) {
    if (recent[index]?.role === 'assistant') {
      return normalizeText(recent[index].content || '');
    }
  }
  return '';
}

function hasAgentRoleSignal(text = '') {
  return /(?:فيس\s*بوك|فيسبوك|facebook|messenger|رسايل|رسائل|مبيعات|بيع|sales|support|دعم|marketing|تسويق|مخزون|مخازن|inventory|شحن|توصيل|orders?|اوردر|طلبات|hr|موظفين)/iu.test(text);
}

function isGenericAgentCreate(text = '') {
  return /(?:^|\s)(?:عايز|اعمل|انشئ|وظف|عين|ضيف|create|add)(?:\s+\S+){0,3}\s+(?:وكيل|ايجنت|agent)(?:\s|$)/iu.test(text)
    || /(?:وكيل|ايجنت|agent)\s+(?:جديد|للمخزون|للمخازن|لفيسبوك|للفيسبوك|للرد|للمبيعات|للدعم)/iu.test(text);
}

function buildAgentManageRoute({ text, availableTools, reason, extraAllowed = [], missingSlots: forcedMissingSlots = null }) {
  const missingSlots = Array.isArray(forcedMissingSlots)
    ? forcedMissingSlots
    : (hasAgentRoleSignal(text) ? [] : ['role']);
  return adminRoute({
    intent: 'agents.manage',
    requiresTool: true,
    primaryTool: 'agent.spawn',
    allowedTools: [
      'agent.spawn',
      'skill.create',
      'agent.read_state',
      'agent.update_profile',
      'agent.list_agents',
      'agent.run_task',
      'agent.assign_task',
      ...extraAllowed,
    ],
    missingSlots,
    reason,
  }, availableTools);
}

function buildSkillManageRoute({ availableTools, reason, message }) {
  const hasDetails = /(?:id|الاسم|اسم المهاره|اسم المهارة|displayname|الوصف|description)\s*[:：]/iu.test(message)
    || /(?:ثلاث|تلات|3|٣|three).{0,80}(?:مهارات|skills)/iu.test(message);
  return adminRoute({
    intent: 'skills.manage',
    requiresTool: true,
    primaryTool: 'skill.create',
    allowedTools: ['skill.create', 'agent.read_state', 'agent.update_profile', 'agent.list_agents'],
    missingSlots: hasDetails ? [] : ['displayName', 'description'],
    reason,
  }, availableTools);
}

function resolveAdminPolicyPlan({ message, availableTools = [], context = {} } = {}) {
  const text = normalizeText(stripScenarioPrefix(message));
  if (!text) return null;
  const lastAssistantText = getLastAssistantText(context);
  const lastToolIntent = String(context?.lastToolIntent || '');

  if (/(github|git\s+|main|branch)/iu.test(text) && /(?:ارفع|نشر|push|commit|deploy|التعديلات)/iu.test(text)) {
    return adminRoute({
      intent: 'implementation.advice',
      requiresTool: false,
      primaryTool: null,
      allowedTools: [],
      reason: 'Internal implementation/deployment wording should be answered without business tools',
      selectionScore: 92,
    }, availableTools);
  }

  if (/(?:برمجي|تصحيح\s+برمجي|التصحيح\s+البرمجي|\bcode\b|implementation|bug|fix)/iu.test(text)) {
    return adminRoute({
      intent: 'implementation.advice',
      requiresTool: false,
      primaryTool: null,
      allowedTools: [],
      reason: 'Internal implementation/debugging advice should not execute business tools',
      selectionScore: 92,
    }, availableTools);
  }

  if (
    /(?:حضور|غياب|محضروش|غايب|غايبين|موظف|موظفين|بصمه|بصمة|attendance|hr)/iu.test(text)
    && /(?:النهارده|انهارده|اليوم|today|حاليا|دلوقتي|كم|كام|مين|عدد)/iu.test(text)
  ) {
    return adminRoute({
      intent: 'hr.attendance.today',
      requiresTool: true,
      primaryTool: 'hr.attendance_today',
      allowedTools: ['hr.attendance_today'],
      reason: 'Internal HR attendance read request',
    }, availableTools);
  }

  if (
    /(?:فين|النتيجه|النتيجة|التقرير|تقرير|فينها|جبت|جبتها|هاتها|اعرضها)/iu.test(text)
    && (/(?:حضور|غياب|hr|attendance)/iu.test(lastAssistantText) || lastToolIntent === 'hr.attendance.today')
  ) {
    return adminRoute({
      intent: 'hr.attendance.today',
      requiresTool: true,
      primaryTool: 'hr.attendance_today',
      allowedTools: ['hr.attendance_today'],
      reason: 'Internal HR attendance follow-up',
    }, availableTools);
  }

  if (/(?:عمليات|قرارات|قرار|لوج|audit|سجل|راجع\s+(?:اخر|آخر)|الأداة|الاداه|نفذها|قام بها)/iu.test(text)) {
    return adminRoute({
      intent: 'audit.read',
      requiresTool: true,
      primaryTool: 'audit.read',
      allowedTools: ['audit.read'],
      blockedTools: ['agent.list_agents', 'agent.read_state'],
      reason: 'Internal audit trail read request',
    }, availableTools);
  }

  if (
    /(?:كلف|كلفه|شغل|جرب|اختبر|اطلب من)\s+(?:وكيل|ايجنت|agent|[\p{L}\s]{2,60})/iu.test(text)
    && /(?:يعمل|ينفذ|يجهز|يرد|يعالج|يراجع|يبحث|مسوده|مسودة|اوردر|طلب)/iu.test(text)
  ) {
    const alternatives = /(?:اوردر|طلب|مسوده|مسودة)/iu.test(text)
      ? [{ intent: 'orders.create_draft', primaryTool: 'order.create_draft', score: 82 }]
      : [];
    return adminRoute({
      intent: 'agents.run_task',
      requiresTool: true,
      primaryTool: 'agent.run_task',
      allowedTools: ['agent.run_task', 'agent.list_agents', 'agent.read_state'],
      reason: 'Explicit internal specialist delegation request',
      alternatives,
      classification: adminClassification({
        reason: 'Explicit internal specialist delegation request',
        alternatives,
      }),
    }, availableTools);
  }

  const asksNewAgentWithSkillBeforeOrder = /(?:اعمل|انشئ|انشاء|create|add).{0,40}(?:وكيل|ايجنت|agent).{0,100}(?:مهاره|مهارة|مهارات|skill)/iu.test(text)
    || /(?:وكيل|ايجنت|agent)\s+(?:جديد|لفيسبوك|للفيسبوك|للمبيعات|للدعم|للرد|بمهاره|بمهارة).{0,100}(?:مهاره|مهارة|مهارات|skill)/iu.test(text);
  if (asksNewAgentWithSkillBeforeOrder) {
    return buildAgentManageRoute({
      text,
      availableTools,
      reason: 'Internal new agent request includes a skill to attach',
    });
  }

  if (/(?:تقرير|report|ملخص|summary)/iu.test(text) && /(?:طلبات|اوردرات|اوردر|orders?)/iu.test(text)) {
    return adminRoute({
      intent: 'orders',
      requiresTool: true,
      primaryTool: 'order.summary',
      allowedTools: ['order.summary', 'order.lookup', 'order.recentList'],
      reason: 'Internal order reporting request',
    }, availableTools);
  }

  if (/(?:اعمل|انشئ|سجل|ضيف|create)/iu.test(text) && /(?:مسوده|مسودة|اوردر|طلب|order)/iu.test(text)) {
    return adminRoute({
      intent: 'orders.create_draft',
      requiresTool: true,
      primaryTool: 'order.create_draft',
      allowedTools: ['order.create_draft', 'product.search', 'customer.info'],
      reason: 'Internal order draft creation request',
      alternatives: [],
    }, availableTools);
  }

  if (/(?:اوردر|طلب|order)/iu.test(text) && /(?:وصل|فين|حالة|status|lookup|رقم|test-\d+)/iu.test(text)) {
    return adminRoute({
      intent: 'orders',
      requiresTool: true,
      primaryTool: 'order.lookup',
      allowedTools: ['order.lookup', 'order.summary', 'order.recentList'],
      reason: 'Internal order lookup request',
    }, availableTools);
  }

  if (/(?:الشحن|شحن|التوصيل|توصيل|shipping|delivery)/iu.test(text)) {
    return adminRoute({
      intent: 'shipping.rates',
      requiresTool: true,
      primaryTool: 'shipping.rates',
      allowedTools: ['shipping.rates'],
      reason: 'Internal shipping-rate read request',
    }, availableTools);
  }

  if (/(?:شكوى|شكوي|بايظ|تالف|وحشه|وحشة|complaint|damage)/iu.test(text)) {
    return adminRoute({
      intent: 'support.complaint',
      requiresTool: true,
      primaryTool: 'agent.handoff',
      allowedTools: ['agent.handoff', 'order.lookup', 'customer.info'],
      reason: 'Internal support complaint handoff request',
    }, availableTools);
  }

  if (/(?:ارجع|ارتجاع|مرتجع|استرد|فلوسي|فلوس|refund|return)/iu.test(text)) {
    return adminRoute({
      intent: 'support.refund',
      requiresTool: true,
      primaryTool: 'agent.handoff',
      allowedTools: ['agent.handoff', 'order.lookup', 'customer.info'],
      reason: 'Internal refund/return support handoff request',
    }, availableTools);
  }

  if (/(?:ابدال|استبدال|ابدل|بدل|exchange)/iu.test(text)) {
    return adminRoute({
      intent: 'support.exchange',
      requiresTool: true,
      primaryTool: 'agent.handoff',
      allowedTools: ['agent.handoff', 'order.lookup', 'customer.info'],
      reason: 'Internal exchange support handoff request',
    }, availableTools);
  }

  const recentAgentProposal = /(?:اسم الوكيل المقترح|هل توافق|الدور|وكيل|ايجنت|agent)/iu.test(lastAssistantText);
  if (recentAgentProposal && /(?:تمام|ابدء|ابدأ|انشاء|تنشاء|نفذ|كمل|ابدأ التنفيذ|ابدا التنفيذ)/iu.test(text)) {
    return buildAgentManageRoute({
      text,
      availableTools,
      reason: 'Short confirmation continues a recent internal agent proposal',
      missingSlots: [],
    });
  }

  if (
    /(?:وكيل|ايجنت|agent)/iu.test(lastAssistantText)
    && /(?:نضيف|اضيف|ضيف|منتج|كوتشي|صنف|سلعه|سلعة|product)/iu.test(text)
    && /(?:agent\.run_task|product\.create)/.test((availableTools || []).join(' '))
  ) {
    return adminRoute({
      intent: 'agents.manage',
      requiresTool: true,
      primaryTool: availableTools.includes('agent.run_task') ? 'agent.run_task' : 'product.create',
      allowedTools: ['agent.run_task', 'agent.list_agents', 'agent.read_state', 'agent.spawn', 'agent.update_profile', 'product.create'],
      reason: 'Internal follow-up asks the newly created product agent to continue product setup',
    }, availableTools);
  }

  const hasRecentAgentContext = /(?:وكيل|ايجنت|agent)/iu.test(lastAssistantText);
  if (
    hasRecentAgentContext
    && /(?:عنده القدره|عنده القدرة|يعمل منتج|capability|قدره|قدرة)/iu.test(text)
  ) {
    return adminRoute({
      intent: 'agents.read',
      requiresTool: true,
      primaryTool: 'agent.read_state',
      allowedTools: ['agent.read_state', 'agent.list_agents'],
      reason: 'Internal follow-up asks about the current specialist capability',
    }, availableTools);
  }

  if (
    hasRecentAgentContext
    && /(?:^|\s)(?:شوف|شفت|تابع|كمل)\s+[\p{L}]{2,40}(?:\s|$)/iu.test(text)
  ) {
    return adminRoute({
      intent: 'agents.manage',
      requiresTool: true,
      primaryTool: availableTools.includes('agent.run_task') ? 'agent.run_task' : 'agent.read_state',
      allowedTools: ['agent.read_state', 'agent.list_agents', 'agent.run_task', 'agent.assign_task'],
      reason: 'Internal named-specialist follow-up from recent agent context',
    }, availableTools);
  }

  const asksNewAgentWithSkill = /(?:اعمل|انشئ|انشاء|create|add).{0,40}(?:وكيل|ايجنت|agent).{0,100}(?:مهاره|مهارة|مهارات|skill)/iu.test(text)
    || /(?:وكيل|ايجنت|agent)\s+(?:جديد|لفيسبوك|للفيسبوك|للمبيعات|للدعم|للرد|بمهاره|بمهارة).{0,100}(?:مهاره|مهارة|مهارات|skill)/iu.test(text);
  if (asksNewAgentWithSkill) {
    return buildAgentManageRoute({
      text,
      availableTools,
      reason: 'Internal new agent request includes a skill to attach',
    });
  }

  if (/(?:مهاره|مهارة|مهارات|skill|skills)/iu.test(text) && /(?:اعمل|انشئ|انشاء|صمم|بناء|create|add|جديد|جديدة|جديده)/iu.test(text)) {
    return buildSkillManageRoute({
      availableTools,
      reason: 'Internal skill creation request',
      message,
    });
  }

  if (isGenericAgentCreate(text)) {
    return buildAgentManageRoute({
      text,
      availableTools,
      reason: 'Internal agent creation or agent-management request',
    });
  }

  if (
    /(?:اعمل|انشئ|اضيف|ضيف|نضيف|سجل|ارفع|create|add)/iu.test(text)
    && /(?:منتج|product|كوتشي|صنف|سلعه|سلعة|بضاعه|بضاعة|تيشيرت)/iu.test(text)
  ) {
    return adminRoute({
      intent: 'products.manage',
      requiresTool: true,
      primaryTool: 'product.create',
      allowedTools: ['product.create', 'product.search', 'inventory.check'],
      reason: 'Internal product creation request',
    }, availableTools);
  }

  if (
    /(?:كام|كم|مين|قائمه|قائمة|اختار اسم|اعرض|هات|حالة|حاله)/iu.test(text)
    && /(?:وكلاء|وكيل|ايجنت|agent)/iu.test(text)
  ) {
    const capabilityQuestion = /(?:عنده القدره|يعمل منتج|capability|قدره|قدرة)/iu.test(text)
      || /(?:وكيل|ايجنت|agent)/iu.test(lastAssistantText);
    return adminRoute({
      intent: 'agents.read',
      requiresTool: true,
      primaryTool: capabilityQuestion ? 'agent.read_state' : 'agent.list_agents',
      allowedTools: capabilityQuestion
        ? ['agent.read_state', 'agent.list_agents']
        : ['agent.list_agents', 'agent.read_state'],
      reason: 'Internal agent roster/state read request',
    }, availableTools);
  }

  if (/(?:مخزون|ستوك|stock|inventory|ناقص|منخفضة|منخفضه)/iu.test(text)) {
    return adminRoute({
      intent: 'inventory',
      requiresTool: true,
      primaryTool: 'product.lowStock',
      allowedTools: ['product.lowStock', 'inventory.check', 'product.search'],
      reason: 'Internal inventory read request',
    }, availableTools);
  }

  if (/(?:منتجات|المنتجات|كتالوج|catalog|products)/iu.test(text)) {
    return adminRoute({
      intent: 'products',
      requiresTool: true,
      primaryTool: 'product.search',
      allowedTools: ['product.search', 'product.lowStock', 'product.topSelling', 'inventory.check'],
      reason: 'Internal product catalog read request',
    }, availableTools);
  }

  return null;
}

function buildGoalContinuationPlan(activeGoal, message, availableTools, context) {
  const activeGoalReadyToExecute = activeGoal?.status === 'ready_to_execute'
    || activeGoal?.nextStep === 'execute_tool';
  const shouldExecute = activeGoalReadyToExecute;

  if (activeGoal.type === 'create_product') {
    return buildPlan({
      intent: 'goals.create_product',
      requiresTool: shouldExecute,
      primaryTool: shouldExecute ? 'product.create' : null,
      allowedTools: shouldExecute ? ['product.create'] : [],
      reason: shouldExecute
        ? 'A saved product-creation goal has all required data and was confirmed by the user'
        : 'The user is continuing a saved product-creation goal; collect missing data or ask for confirmation before using tools',
      goalRunId: activeGoal.id,
    }, availableTools);
  }

  if (activeGoal.type === 'create_agent_with_skill') {
    return buildPlan({
      intent: 'goals.create_agent_with_skill',
      requiresTool: shouldExecute,
      primaryTool: shouldExecute ? 'agent.spawn' : null,
      allowedTools: shouldExecute
        ? ['agent.spawn', 'skill.create', 'agent.read_state', 'agent.update_profile']
        : [],
      reason: shouldExecute
        ? 'A saved agent-and-skill goal has all required data and was confirmed by the user'
        : 'The user is continuing a saved agent-and-skill goal; collect corrections or ask for confirmation before using tools',
      goalRunId: activeGoal.id,
    }, availableTools);
  }

  return buildPlan({
    intent: 'general.chat',
    requiresTool: false,
    allowedTools: [],
    reason: 'Active goal continuation',
    goalRunId: activeGoal.id,
  }, availableTools);
}

function resolveToolPlan({ message, availableTools = [], context = {} } = {}) {
  const companyId = context?.companyId || context?.activeGoal?.companyId || null;

  const normalized = normalizeText(message);
  const customerChannel = isCustomerChatChannel(context);
  const isAmbiguous = isAmbiguousCreateRequest(message);
  const isDirectSkillAction = /(?:مهاره|مهارة|skill)/iu.test(normalized)
    && /(?:فقط|only|skill-only)/iu.test(normalized);

  if (!customerChannel && context?.useLLMClassifier !== true && isAmbiguous) {
    const seed = {
      intent: 'general.chat',
      requiresTool: false,
      allowedTools: [],
      blockedTools: [],
      ambiguous: true,
      reason: 'Generic create request has no object/domain; ask whether the user means product, order, agent, skill, or another workflow',
    };
    const contract = agentIntentPlannerService.buildIntentContract({
      message,
      availableTools,
      context,
      policyPlan: seed,
    });
    return agentIntentPlannerService.toToolPlan(contract, availableTools);
  }

  // Active durable goals stay deterministic (state-machine)
  const activeGoal = getActiveGoal(context);
  if (activeGoal && !isDirectSkillAction) {
    return buildGoalContinuationPlan(activeGoal, message, availableTools, context);
  }

  const adminPolicyPlan = !customerChannel
    ? resolveAdminPolicyPlan({ message, availableTools, context })
    : null;
  if (adminPolicyPlan && context?.useLLMClassifier !== true) {
    const contract = agentIntentPlannerService.buildIntentContract({
      message,
      availableTools,
      context,
      policyPlan: adminPolicyPlan,
    });
    return agentIntentPlannerService.toToolPlan(contract, availableTools);
  }

  const seed = customerChannel
    ? buildCustomerClassifierSeed()
    : adminPolicyPlan
      ? { ...adminPolicyPlan, trustedLocalRoute: false }
      : {
        intent: 'general.chat',
        requiresTool: false,
        allowedTools: [],
        blockedTools: [],
        ambiguous: isAmbiguous,
        reason: isAmbiguous ? 'Generic create request has no object/domain; ask whether the user means product, order, agent, skill, or another workflow' : undefined
      };

  const useLLM = companyId && (
    customerChannel ||
    context?.useLLMClassifier === true ||
    (context?.useLLMClassifier !== false && process.env.NODE_ENV !== 'test')
  );

  if (useLLM || customerChannel) {
    // Everything else → LLM classifier
    return (async () => {
      const contract = await agentIntentPlannerService.buildIntentContractAsync({
        message,
        availableTools,
        context: customerChannel
          ? { ...context, customerIntentMode: 'llm_structured_only' }
          : context,
        policyPlan: seed,
        companyId,
      });
      return agentIntentPlannerService.toToolPlan(contract, availableTools);
    })();
  }

  // Synchronous path (for tests or local fallback without companyId)
  const contract = agentIntentPlannerService.buildIntentContract({
    message,
    availableTools,
    context,
    policyPlan: seed,
  });
  return agentIntentPlannerService.toToolPlan(contract, availableTools);
}

function isToolRelevant(plan, toolName, options = {}) {
  if (!plan || !toolName) return true;
  if (Array.isArray(plan.blockedTools) && plan.blockedTools.includes(toolName)) return false;
  if (plan.validation && plan.validation.valid === false) return false;
  if (!Array.isArray(plan.allowedTools) || plan.allowedTools.length === 0) return false;
  if (!plan.allowedTools.includes(toolName)) return false;
  const missingSlots = Array.isArray(plan.missingSlots) ? plan.missingSlots : [];
  if (missingSlots.length === 0) return true;
  if (paramsSatisfyMissingSlots(missingSlots, options.params || {})) return true;
  return Boolean(options.readOnly && toolName !== plan.primaryTool);
}

function describeToolPlan(plan) {
  if (!plan) return 'No tool relevance plan';
  const allowed = plan.allowedTools?.length ? plan.allowedTools.join(', ') : 'none';
  return `${plan.intent}; requiresTool=${plan.requiresTool}; allowed=${allowed}; reason=${plan.reason}`;
}

module.exports = {
  normalizeText,
  resolveToolPlan,
  isToolRelevant,
  describeToolPlan,
  _private: {
    isAmbiguousCreateRequest,
    isCustomerChatChannel,
    resolveAdminPolicyPlan,
  },
};
