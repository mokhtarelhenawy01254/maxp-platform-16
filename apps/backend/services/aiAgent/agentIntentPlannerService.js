/**
 * @module agentIntentPlannerService
 * @description Typed intent contract builder for agent routing.
 *
 * New intents must be registered as typed policies here and covered by tests.
 * Do not add new keyword-only branches to agentIntentRelevanceService.
 */

const CONTRACT_SCHEMA_VERSION = '2026-05-model-intent-v2';
const POLICY_VERSION = '2026.05';

const DEFAULT_GUARDRAILS = [
  'tenant_scope',
  'tool_allowlist',
  'schema_validation',
  'audit_trail',
];

const INTENT_POLICIES = {
  'general.chat': {
    actionType: 'chat',
    riskLevel: 'low',
    nextState: 'respond',
    requiredSlots: [],
    guardrails: ['no_live_data_claims'],
  },
  'implementation.advice': {
    actionType: 'analysis',
    riskLevel: 'low',
    nextState: 'respond',
    requiredSlots: [],
    guardrails: ['no_live_company_data'],
  },
  'goals.create_product': {
    actionType: 'write',
    riskLevel: 'high',
    nextState: 'execute_saved_goal',
    requiredSlots: ['name', 'price'],
    guardrails: [...DEFAULT_GUARDRAILS, 'draft_only_review_required', 'idempotency'],
  },
  'goals.create_agent_with_skill': {
    actionType: 'workflow',
    riskLevel: 'high',
    nextState: 'execute_saved_goal',
    requiredSlots: ['agent', 'skill'],
    guardrails: [...DEFAULT_GUARDRAILS, 'explicit_user_confirmation', 'least_privilege_tools'],
  },
  'agents.run_task': {
    actionType: 'handoff',
    riskLevel: 'medium',
    nextState: 'delegate_to_specialist',
    requiredSlots: ['task'],
    guardrails: [...DEFAULT_GUARDRAILS, 'specialist_tool_scope'],
  },
  'agents.manage': {
    actionType: 'workflow',
    riskLevel: 'high',
    nextState: 'agent_control_plane',
    requiredSlots: [],
    guardrails: [...DEFAULT_GUARDRAILS, 'least_privilege_tools', 'state_machine_or_role_slot'],
  },
  'agents.read': {
    actionType: 'read',
    riskLevel: 'low',
    nextState: 'read_current_state',
    requiredSlots: [],
    guardrails: [...DEFAULT_GUARDRAILS],
  },
  'audit.read': {
    actionType: 'read',
    riskLevel: 'medium',
    nextState: 'read_audit_trail',
    requiredSlots: [],
    guardrails: [...DEFAULT_GUARDRAILS, 'append_only_audit'],
  },
  'skills.manage': {
    actionType: 'write',
    riskLevel: 'high',
    nextState: 'create_or_update_skill',
    requiredSlots: ['displayName', 'description'],
    guardrails: [...DEFAULT_GUARDRAILS, 'controlled_skill_write', 'allowed_tool_subset'],
  },
  'skills.read': {
    actionType: 'read',
    riskLevel: 'low',
    nextState: 'read_skill_registry',
    requiredSlots: [],
    guardrails: [...DEFAULT_GUARDRAILS],
  },
  'products.manage': {
    actionType: 'write',
    riskLevel: 'high',
    nextState: 'create_product_draft',
    requiredSlots: ['name', 'price'],
    guardrails: [...DEFAULT_GUARDRAILS, 'draft_only_review_required', 'conflict_check'],
  },
  'orders.create_draft': {
    actionType: 'write',
    riskLevel: 'high',
    nextState: 'create_order_draft_pending_approval',
    requiredSlots: ['productName', 'productPrice', 'customerName', 'customerPhone'],
    guardrails: [...DEFAULT_GUARDRAILS, 'human_approval', 'conflict_check'],
  },
  'orders.create_confirmed': {
    actionType: 'write',
    riskLevel: 'high',
    nextState: 'create_confirmed_order',
    requiredSlots: ['productName', 'productPrice', 'customerName', 'customerPhone', 'city', 'confirmedByCustomer'],
    guardrails: [...DEFAULT_GUARDRAILS, 'explicit_customer_confirmation', 'idempotency', 'conflict_check'],
  },
  orders: {
    actionType: 'read',
    riskLevel: 'medium',
    nextState: 'read_order_data',
    requiredSlots: [],
    guardrails: [...DEFAULT_GUARDRAILS],
  },
  inventory: {
    actionType: 'read',
    riskLevel: 'medium',
    nextState: 'read_inventory_data',
    requiredSlots: [],
    guardrails: [...DEFAULT_GUARDRAILS],
  },
  products: {
    actionType: 'read',
    riskLevel: 'medium',
    nextState: 'read_catalog_data',
    requiredSlots: [],
    guardrails: [...DEFAULT_GUARDRAILS],
  },
  'shipping.rates': {
    actionType: 'read',
    riskLevel: 'medium',
    nextState: 'read_shipping_rate',
    requiredSlots: [],
    guardrails: [...DEFAULT_GUARDRAILS],
  },
  'support.exchange': {
    actionType: 'handoff',
    riskLevel: 'high',
    nextState: 'handoff_to_human',
    requiredSlots: [],
    guardrails: [...DEFAULT_GUARDRAILS, 'human_in_the_loop', 'no_policy_promise'],
  },
  'support.refund': {
    actionType: 'handoff',
    riskLevel: 'high',
    nextState: 'handoff_to_human',
    requiredSlots: [],
    guardrails: [...DEFAULT_GUARDRAILS, 'human_in_the_loop', 'refund_requires_review'],
  },
  'support.complaint': {
    actionType: 'handoff',
    riskLevel: 'high',
    nextState: 'handoff_to_human',
    requiredSlots: [],
    guardrails: [...DEFAULT_GUARDRAILS, 'human_in_the_loop', 'complaint_review'],
  },
  customers: {
    actionType: 'read',
    riskLevel: 'medium',
    nextState: 'read_customer_data',
    requiredSlots: [],
    guardrails: [...DEFAULT_GUARDRAILS],
  },
  sales: {
    actionType: 'read',
    riskLevel: 'medium',
    nextState: 'read_sales_data',
    requiredSlots: [],
    guardrails: [...DEFAULT_GUARDRAILS],
  },
  'company.snapshot': {
    actionType: 'read',
    riskLevel: 'medium',
    nextState: 'read_company_snapshot',
    requiredSlots: [],
    guardrails: [...DEFAULT_GUARDRAILS],
  },
  'hr.attendance.today': {
    actionType: 'read',
    riskLevel: 'medium',
    nextState: 'read_hr_attendance',
    requiredSlots: [],
    guardrails: [...DEFAULT_GUARDRAILS],
  },
};

const INTENT_REQUIRED_SLOT_ALIASES = {
  displayName: ['displayName', 'display name', 'اسم المهارة', 'اسم المهاره', 'الاسم', 'name'],
  description: ['description', 'الوصف', 'وصف'],
  productName: ['productName', 'product name', 'اسم المنتج', 'المنتج', 'منتج'],
  productPrice: ['productPrice', 'product price', 'السعر', 'سعر', 'price'],
  customerName: ['customerName', 'customer name', 'اسم العميل', 'العميل', 'للعميل', 'اسمي', 'اسمى'],
  customerPhone: ['customerPhone', 'customer phone', 'هاتف العميل', 'رقم العميل', 'رقم الموبايل', 'رقمي', 'رقمى', 'phone'],
  task: ['task', 'المهمة', 'مهمة', 'يعمل', 'ينفذ', 'اعمل'],
  role: ['role', 'الدور', 'دور الوكيل', 'نوع الوكيل'],
  name: ['name', 'اسم المنتج', 'الاسم'],
  price: ['price', 'السعر', 'سعر'],
  agent: ['agent', 'وكيل', 'ايجنت'],
  skill: ['skill', 'مهارة', 'مهاره'],
};

const CONTRACT_ENUMS = {
  source: ['state-machine', 'typed-policy', 'tool-policy-gate', 'semantic-chat', 'llm-classifier'],
  decision: ['answer', 'execute_tool', 'delegate', 'continue_goal', 'ask_followup'],
  actionType: ['chat', 'analysis', 'read', 'write', 'workflow', 'handoff'],
  riskLevel: ['low', 'medium', 'high'],
};

const INTENT_CONTRACT_SCHEMA = {
  type: 'object',
  required: [
    'schemaVersion',
    'intent',
    'confidence',
    'source',
    'decision',
    'actionType',
    'riskLevel',
    'requiresTool',
    'route',
    'requiredSlots',
    'missingSlots',
    'guardrails',
    'reason',
  ],
  properties: {
    schemaVersion: { const: CONTRACT_SCHEMA_VERSION },
    intent: { type: 'string' },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
    source: {
      type: 'string',
      enum: ['state-machine', 'typed-policy', 'tool-policy-gate', 'semantic-chat', 'llm-classifier'],
    },
    decision: {
      type: 'string',
      enum: ['answer', 'execute_tool', 'delegate', 'continue_goal', 'ask_followup'],
    },
    actionType: {
      type: 'string',
      enum: ['chat', 'analysis', 'read', 'write', 'workflow', 'handoff'],
    },
    riskLevel: { type: 'string', enum: ['low', 'medium', 'high'] },
    requiresTool: { type: 'boolean' },
    route: {
      type: 'object',
      required: ['primaryTool', 'allowedTools', 'blockedTools'],
      properties: {
        primaryTool: { type: ['string', 'null'] },
        allowedTools: { type: 'array', items: { type: 'string' } },
        blockedTools: { type: 'array', items: { type: 'string' } },
      },
    },
    requiredSlots: { type: 'array', items: { type: 'string' } },
    missingSlots: { type: 'array', items: { type: 'string' } },
    guardrails: { type: 'array', items: { type: 'string' } },
    reason: { type: 'string' },
  },
};

function unique(items = []) {
  return [...new Set(items.filter(Boolean))];
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function getPolicy(intent = 'general.chat') {
  if (INTENT_POLICIES[intent]) return INTENT_POLICIES[intent];
  return INTENT_POLICIES['general.chat'];
}

function inferSource(policyPlan = {}, context = {}) {
  if (policyPlan.goalRunId) return 'state-machine';
  if (policyPlan.requiresTool && policyPlan.primaryTool) return 'tool-policy-gate';
  if (policyPlan.intent === 'general.chat' || policyPlan.intent === 'implementation.advice') return 'semantic-chat';
  return 'typed-policy';
}

function inferDecision({ policyPlan, policy, source, missingSlots = [] }) {
  if (policyPlan.ambiguous) return 'ask_followup';
  if (missingSlots.length > 0) return 'ask_followup';
  if (source === 'state-machine') return 'continue_goal';
  if (!policyPlan.requiresTool) return 'answer';
  if (policy.actionType === 'handoff') return 'delegate';
  return 'execute_tool';
}

function estimateConfidence({ policyPlan, source, missingSlots = [] }) {
  if (policyPlan.ambiguous) return 0.42;
  if (missingSlots.length > 0) return 0.58;
  if (source === 'state-machine') return 0.99;
  if (policyPlan.requiresTool && policyPlan.primaryTool) return 0.9;
  if (policyPlan.intent === 'general.chat') return 0.66;
  if (policyPlan.intent === 'implementation.advice') return 0.82;
  return 0.76;
}

function hasClassifierSlots(classified = {}) {
  const slots = classified?.slots && typeof classified.slots === 'object'
    ? classified.slots
    : {};
  return Object.values(slots).some((value) => {
    if (value === null || value === undefined) return false;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'object') return Object.keys(value).length > 0;
    return String(value).trim().length > 0;
  });
}

function shouldPreserveAmbiguousSeed(policyPlan = {}, classified = null) {
  if (!policyPlan?.ambiguous) return false;
  if (classified?.ambiguous) return false;
  if (!classified?.intent) return false;

  const policy = INTENT_POLICIES[classified.intent];
  const actionType = policy?.actionType || 'chat';
  const isActionIntent = ['write', 'workflow', 'handoff'].includes(actionType);
  return isActionIntent && !hasClassifierSlots(classified);
}

function normalizeText(value = '') {
  return String(value || '')
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[^\p{L}\p{N}_\s.:=-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function messageHasSlot(message = '', slot = '') {
  const text = normalizeText(message);
  if (!text) return false;
  if (slot === 'role') {
    return /(?:^|\s)(?:sales|support|marketing|inventory|shipping|hr|مبيعات|بيع|اوردر|طلبات|دعم|تسويق|اعلان|اعلانات|مخزون|مخازن|شحن|توصيل|موارد\s+بشريه|موظفين|رسايل\s+الفيس|رسائل\s+الفيس|فيس\s*بوك|فيسبوك|messenger)(?:\s|$)/iu.test(text)
      || text.includes('facebook');
  }
  if (slot === 'customerPhone') {
    return /\+?\d[\d\s-]{7,}\d/u.test(String(message || ''));
  }
  if (slot === 'productPrice') {
    return /(?:سعر|السعر|price|بسعر|بـ)[^\n٠-٩۰-۹\d]{0,120}[٠-٩۰-۹\d]+/iu.test(String(message || ''));
  }
  if (slot === 'productName') {
    const raw = String(message || '');
    if (/(?:أوردر|اوردر|طلب|اطلب|هات|عايز|عاوز|اخد|أخد)\s+(?:أعمل|اعمل|واحد|واحدة|واحده|قطعة|قطعه|حبة|حبه|اتنين|اثنين|تنتين|[١٢12])?\s*[A-Za-z\p{L}][A-Za-z\p{L}0-9\s-]{2,80}(?=\s+(?:مقاس|المقاس|size|لون|اللون|اسمي|اسمى|رقمي|رقمى|رقم|هاتف|المحافظة|المدينة|العنوان|سعر|السعر|،|,|$))/iu.test(raw)) {
      return true;
    }
  }
  if (slot === 'customerName') {
    if (/(?:اسمي|اسمى|انا\s+اسمي|أنا\s+اسمي)\s+\p{L}/iu.test(String(message || ''))) {
      return true;
    }
  }
  const aliases = INTENT_REQUIRED_SLOT_ALIASES[slot] || [slot];
  return aliases.some((alias) => {
    const normalized = normalizeText(alias);
    if (!normalized) return false;
    return text.includes(`${normalized}:`)
      || text.includes(`${normalized} `)
      || text.includes(` ${normalized}`)
      || text === normalized;
  });
}

function hasEnoughSkillDetail(message = '') {
  const text = normalizeText(message);
  if (!text) return false;
  if (/(?:^|\s)[a-z][a-z0-9]+(?:-[a-z0-9]+)+(?:\s|$)/i.test(String(message || ''))) return true;
  if (/(?:ثلاث|تلات|3|٣|three).{0,80}(?:مهارات|skills)/iu.test(String(message || ''))) return true;
  if (/(?:للتسويق|للمبيعات|للدعم|للمخزون|facebook|فيسبوك|sales|support|marketing|inventory)/iu.test(String(message || ''))) {
    return text.split(/\s+/).filter(Boolean).length >= 5;
  }
  return false;
}

function inferMissingSlots({ policyPlan = {}, context = {}, message = '', requiredSlots = [] }) {
  const activeGoal = policyPlan.goalRunId ? context?.activeGoal : null;
  if (Array.isArray(activeGoal?.missingFields) && activeGoal.missingFields.length) {
    return unique(activeGoal.missingFields);
  }
  if (Array.isArray(policyPlan.missingSlots) && policyPlan.missingSlots.length) {
    return unique(policyPlan.missingSlots);
  }
  if (
    policyPlan.requiresTool
    && policyPlan.primaryTool
    && ['write', 'workflow'].includes(getPolicy(policyPlan.intent).actionType)
    && !policyPlan.goalRunId
    && !['products.manage', 'goals.create_product', 'goals.create_agent_with_skill'].includes(policyPlan.intent)
  ) {
    if (policyPlan.intent === 'skills.manage' && hasEnoughSkillDetail(message)) {
      return [];
    }
    const slotMessage = context?.slotMessage || message;
    const classifiedSlots = context?.classifiedSlots || {};
    return unique(requiredSlots.filter(slot => {
      // If the LLM classifier already extracted this slot, it's not missing
      if (classifiedSlots[slot] != null && classifiedSlots[slot] !== '') return false;
      return !messageHasSlot(slotMessage, slot);
    }));
  }
  return [];
}

function inferSlots({ policyPlan = {}, context = {} }) {
  const slots = {};
  const activeGoal = policyPlan.goalRunId ? context?.activeGoal : null;
  if (activeGoal?.id) slots.goalRunId = activeGoal.id;
  if (activeGoal?.type) slots.goalType = activeGoal.type;
  if (activeGoal?.status) slots.goalStatus = activeGoal.status;
  if (policyPlan.primaryTool) slots.primaryTool = policyPlan.primaryTool;
  return slots;
}

function validateContract(contract) {
  const errors = [];
  if (contract.schemaVersion !== CONTRACT_SCHEMA_VERSION) errors.push('schemaVersion is invalid');
  if (!contract.intent) errors.push('intent is required');
  if (!INTENT_POLICIES[contract.intent]) {
    errors.push(`intent ${contract.intent} has no typed policy`);
  }
  if (!Number.isFinite(contract.confidence) || contract.confidence < 0 || contract.confidence > 1) {
    errors.push('confidence must be between 0 and 1');
  }
  if (!CONTRACT_ENUMS.source.includes(contract.source)) errors.push('source is invalid');
  if (!CONTRACT_ENUMS.decision.includes(contract.decision)) errors.push('decision is invalid');
  if (!CONTRACT_ENUMS.actionType.includes(contract.actionType)) errors.push('actionType is invalid');
  if (!CONTRACT_ENUMS.riskLevel.includes(contract.riskLevel)) errors.push('riskLevel is invalid');
  if (!contract.route || typeof contract.route !== 'object') errors.push('route is required');
  if (contract.requiresTool && !contract.route.primaryTool) {
    errors.push('primaryTool is required when requiresTool=true');
  }
  if (contract.route?.primaryTool && !asArray(contract.route.allowedTools).includes(contract.route.primaryTool)) {
    errors.push('primaryTool must be included in allowedTools');
  }
  const overlap = asArray(contract.route?.allowedTools)
    .filter(tool => asArray(contract.route?.blockedTools).includes(tool));
  if (overlap.length) {
    errors.push(`blocked tool(s) cannot also be allowed: ${overlap.join(', ')}`);
  }
  return {
    valid: errors.length === 0,
    errors,
  };
}

function normalizeInventoryRouteText(message = '') {
  return String(message || '')
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/\s+/g, ' ')
    .trim();
}

function isInventoryCheckRequest(message = '', classified = null) {
  const text = normalizeInventoryRouteText(message);
  if (!text) return false;

  // If LLM classifier has extracted a product name or SKU, it is an inventory check request
  const hasProductSlot = classified?.slots?.productName || classified?.slots?.productNameOrSku;
  if (hasProductSlot) return true;

  const asksAvailability = /(?:^|\s)(?:متاح|متوفر|موجود|available|in\s+stock)(?:\s|$)/iu.test(text);
  const hasVariantSignal = /(?:^|\s)(?:مقاس|مقاسات|لون|اللون|الوان|size|color)(?:\s|:|=|$)/iu.test(text);
  const hasSkuSignal = /(?:^|\s)(?:sku|كود)(?:\s|:|=|$)/iu.test(text);
  return asksAvailability && (hasVariantSignal || hasSkuSignal || /[a-z][a-z0-9_-]{2,}/iu.test(text));
}

function _resolveToolsForIntent(matchedIntent, message, availableTools, context = {}, classified = null) {
  let primaryTool = null;
  let allowedTools = [];
  let blockedTools = [];
  const customerIntentMode = context?.customerIntentMode === 'llm_structured_only';
  if (matchedIntent === 'hr.attendance.today') {
    primaryTool = 'hr.attendance_today';
    allowedTools = ['hr.attendance_today'];
  } else if (matchedIntent === 'agents.read') {
    primaryTool = 'agent.read_state';
    allowedTools = ['agent.read_state', 'agent.list_agents'];
  } else if (matchedIntent === 'skills.read') {
    primaryTool = 'agent.read_state';
    allowedTools = ['agent.read_state'];
  } else if (matchedIntent === 'agents.run_task') {
    primaryTool = 'agent.run_task';
    allowedTools = ['agent.run_task', 'agent.list_agents', 'agent.read_state'];
  } else if (matchedIntent === 'orders.create_draft') {
    primaryTool = 'order.create_draft';
    allowedTools = ['order.create_draft', 'product.search', 'customer.info'];
  } else if (matchedIntent === 'orders.create_confirmed') {
    primaryTool = 'order.create_confirmed';
    allowedTools = ['order.create_confirmed', 'product.search', 'customer.info'];
  } else if (matchedIntent === 'products.manage') {
    primaryTool = 'product.create';
    allowedTools = ['product.create', 'product.search', 'inventory.check'];
  } else if (matchedIntent === 'agents.manage') {
    primaryTool = 'agent.spawn';
    allowedTools = ['agent.spawn', 'skill.create', 'agent.read_state', 'agent.update_profile', 'agent.list_agents'];
  } else if (matchedIntent === 'audit.read') {
    primaryTool = 'audit.read';
    allowedTools = ['audit.read'];
    blockedTools = ['agent.list_agents', 'agent.read_state'];
  } else if (matchedIntent === 'skills.manage') {
    primaryTool = 'skill.create';
    allowedTools = ['skill.create', 'agent.read_state', 'agent.update_profile'];
  } else if (matchedIntent === 'sales') {
    primaryTool = 'sales.revenue';
    allowedTools = ['sales.revenue', 'product.topSelling', 'order.summary'];
  } else if (matchedIntent === 'orders') {
    primaryTool = customerIntentMode ? 'order.lookup' : (message.match(/\b\d{3,}\b/) ? 'order.lookup' : 'order.summary');
    allowedTools = ['order.summary', 'order.lookup', 'order.recentList'];
  } else if (matchedIntent === 'inventory') {
    primaryTool = customerIntentMode ? 'inventory.check' : (isInventoryCheckRequest(message, classified) ? 'inventory.check' : 'product.lowStock');
    allowedTools = ['inventory.check', 'product.lowStock', 'product.search'];
  } else if (matchedIntent === 'products') {
    primaryTool = customerIntentMode ? 'product.search' : (isInventoryCheckRequest(message, classified) ? 'inventory.check' : 'product.search');
    allowedTools = ['product.search', 'product.lowStock', 'product.topSelling', 'inventory.check'];
  } else if (matchedIntent === 'shipping.rates') {
    primaryTool = 'shipping.rates';
    allowedTools = ['shipping.rates'];
  } else if (['support.exchange', 'support.refund', 'support.complaint'].includes(matchedIntent)) {
    primaryTool = 'agent.handoff';
    allowedTools = ['agent.handoff', 'order.lookup', 'customer.info'];
  } else if (matchedIntent === 'customers') {
    primaryTool = 'customer.info';
    allowedTools = ['customer.info', 'customer.topBuyers'];
  } else if (matchedIntent === 'company.snapshot') {
    primaryTool = 'company.snapshot';
    allowedTools = ['company.snapshot', 'order.summary', 'sales.revenue', 'product.lowStock'];
  }

  const filterAvailable = (tools, avail) => {
    const availSet = new Set(avail || []);
    return [...new Set(tools.filter(Boolean))].filter(t => availSet.has(t));
  };
  const activeAllowed = filterAvailable(allowedTools, availableTools);
  const activePrimary = activeAllowed.includes(primaryTool) ? primaryTool : (activeAllowed[0] || null);

  return {
    primaryTool: activePrimary,
    allowedTools: activeAllowed,
    blockedTools: unique(blockedTools),
  };
}

function chooseContractConfidence({ activeSource, activePolicyPlan, source, missingSlots }) {
  if (Array.isArray(missingSlots) && missingSlots.length > 0) {
    return estimateConfidence({ policyPlan: activePolicyPlan, source, missingSlots });
  }
  if (
    ['semantic-chat', 'llm-classifier'].includes(activeSource)
    && !activePolicyPlan.ambiguous
    && Number.isFinite(activePolicyPlan.selectionScore)
  ) {
    return activePolicyPlan.selectionScore / 100;
  }
  return estimateConfidence({ policyPlan: activePolicyPlan, source, missingSlots });
}

function buildIntentContract({ message = '', policyPlan = {}, context = {}, availableTools = [] } = {}) {
  let activePolicyPlan = { ...policyPlan };
  let activeIntent = activePolicyPlan.intent || 'general.chat';
  let activeSource = inferSource(activePolicyPlan, context);
  const explicitPolicyPlan = Boolean(
    activePolicyPlan.trustedLocalRoute
    || activePolicyPlan.goalRunId
    || activePolicyPlan.primaryTool
    || activePolicyPlan.requiresTool
    || asArray(activePolicyPlan.allowedTools).length
    || asArray(activePolicyPlan.blockedTools).length
  );
  const customerIntentMode = context?.customerIntentMode === 'llm_structured_only'
    || activePolicyPlan.customerIntentMode === 'llm_structured_only';

  // 1. Run local semantic router first (unless explicitly ambiguous)
  let semanticMatch = null;
  if (!activePolicyPlan.ambiguous && !explicitPolicyPlan && !customerIntentMode) {
    try {
      const agentSemanticRouterService = require('./agentSemanticRouterService');
      semanticMatch = agentSemanticRouterService.matchIntent(message, 0.58, context);
    } catch (err) {
      console.error('[AGENT-INTENT-PLANNER] Semantic routing failed:', err);
    }
  }

  // 2. If semantic match exists, override keyword plan
  if (semanticMatch) {
    const matchedIntent = semanticMatch.intent;
    const matchedPolicy = INTENT_POLICIES[matchedIntent];
    if (matchedPolicy) {
      activeIntent = matchedIntent;
      activeSource = 'semantic-chat';
      
      const resolved = _resolveToolsForIntent(matchedIntent, message, availableTools, context, semanticMatch);
      activePolicyPlan = {
        ...activePolicyPlan,
        intent: matchedIntent,
        requiresTool: Boolean(resolved.primaryTool),
        primaryTool: resolved.primaryTool,
        allowedTools: resolved.allowedTools,
        blockedTools: activePolicyPlan.blockedTools || [],
        reason: `Semantically routed query to ${matchedIntent} (matched phrase: "${semanticMatch.matchedPhrase}")`,
        selectionScore: semanticMatch.confidence * 100,
      };
    }
  }

  const policy = getPolicy(activeIntent);
  const source = activeSource;
  const requiredSlots = unique(policy.requiredSlots || []);
  const missingSlots = inferMissingSlots({ policyPlan: activePolicyPlan, context, message, requiredSlots });
  const requestedRequiresTool = Boolean(activePolicyPlan.requiresTool && activePolicyPlan.primaryTool);
  const blockedReason = activePolicyPlan.blockedReason || (requestedRequiresTool && missingSlots.length > 0 ? 'MISSING_REQUIRED_SLOTS' : null);
  const effectiveRequiresTool = Boolean(requestedRequiresTool && missingSlots.length === 0);
  const route = {
    primaryTool: activePolicyPlan.primaryTool || null,
    allowedTools: unique(asArray(activePolicyPlan.allowedTools)),
    blockedTools: unique(asArray(activePolicyPlan.blockedTools)),
  };
  const contract = {
    schemaVersion: CONTRACT_SCHEMA_VERSION,
    policyVersion: POLICY_VERSION,
    intent: activeIntent,
    confidence: chooseContractConfidence({ activeSource, activePolicyPlan, source, missingSlots }),
    source,
    decision: inferDecision({
      policyPlan: { ...activePolicyPlan, requiresTool: effectiveRequiresTool },
      policy,
      source,
      missingSlots,
    }),
    actionType: policy.actionType,
    riskLevel: policy.riskLevel,
    requiresTool: effectiveRequiresTool,
    blockedReason,
    route,
    requiredSlots,
    missingSlots,
    slots: inferSlots({ policyPlan: activePolicyPlan, context }),
    goalRunId: activePolicyPlan.goalRunId || null,
    nextState: policy.nextState,
    guardrails: unique(policy.guardrails || DEFAULT_GUARDRAILS),
    reason: activePolicyPlan.reason || 'Typed intent contract resolved',
    selectionScore: Number.isFinite(activePolicyPlan.selectionScore) ? activePolicyPlan.selectionScore : null,
    classification: activePolicyPlan.classification || null,
    alternatives: Array.isArray(activePolicyPlan.alternatives) ? activePolicyPlan.alternatives : [],
    ambiguous: Boolean(activePolicyPlan.ambiguous),
  };

  return {
    ...contract,
    validation: validateContract(contract),
  };
}

async function buildIntentContractAsync({ message = '', policyPlan = {}, context = {}, availableTools = [], companyId = null } = {}) {
  let activePolicyPlan = { ...policyPlan };
  let activeIntent = activePolicyPlan.intent || 'general.chat';
  let activeSource = inferSource(activePolicyPlan, context);
  let classified = null;
  const activeCompanyId = companyId || context?.companyId || context?.activeGoal?.companyId || null;
  const isTrustedStatePlan = Boolean(
    activePolicyPlan.goalRunId ||
    activePolicyPlan.trustedLocalRoute ||
    activeSource === 'state-machine'
  );

  if (!isTrustedStatePlan && activeCompanyId) {
    // Reuse pre-computed classification from aiChatService if available —
    // avoids a duplicate LLM call on the same turn.
    if (context?.preClassified) {
      classified = context.preClassified;
    } else {
      try {
        const agentIntentClassifierService = require('./agentIntentClassifierService');
        classified = await agentIntentClassifierService.classifyIntentFromLLM({
          message,
          companyId: activeCompanyId,
          availableTools,
          context,
        });
      } catch (err) {
        console.error('[AGENT-INTENT-PLANNER] LLM intent classification failed:', err.message);
      }
    }
  }

  if (!isTrustedStatePlan) {
    activeSource = 'llm-classifier';
    if (shouldPreserveAmbiguousSeed(activePolicyPlan, classified)) {
      activeIntent = 'general.chat';
      activePolicyPlan = {
        ...activePolicyPlan,
        intent: 'general.chat',
        requiresTool: false,
        primaryTool: null,
        allowedTools: [],
        blockedTools: activePolicyPlan.blockedTools || [],
        reason: 'Generic create request has no explicit target domain; ask whether the user means product, order, agent, skill, or another workflow',
        selectionScore: Math.min((classified?.confidence || 0.42) * 100, 42),
        classification: classified || null,
        ambiguous: true,
      };
    } else if (classified?.ambiguous) {
      activeIntent = 'general.chat';
      activePolicyPlan = {
        ...activePolicyPlan,
        intent: 'general.chat',
        requiresTool: false,
        primaryTool: null,
        allowedTools: [],
        blockedTools: activePolicyPlan.blockedTools || [],
        reason: classified.clarificationQuestion || 'Ambiguous request from schema-bound intent classifier',
        selectionScore: (classified.confidence || 0.42) * 100,
        classification: classified,
        ambiguous: true,
      };
    } else if (classified && INTENT_POLICIES[classified.intent] && !['ALL_PROVIDERS_FAILED', 'CLASSIFICATION_ERROR', 'SCHEMA_VALIDATION_FAILED'].includes(classified.toolEligibility?.blockedReason)) {
      activeIntent = classified.intent;
      const resolved = _resolveToolsForIntent(classified.intent, message, availableTools, context, classified);
      const mergedAllowedTools = unique([
        ...asArray(activePolicyPlan.allowedTools),
        ...asArray(resolved.allowedTools),
      ]);
      const mergedPrimaryTool = mergedAllowedTools.includes(activePolicyPlan.primaryTool)
        ? activePolicyPlan.primaryTool
        : resolved.primaryTool;
      activePolicyPlan = {
        ...activePolicyPlan,
        intent: classified.intent,
        requiresTool: Boolean(mergedPrimaryTool),
        primaryTool: mergedPrimaryTool,
        allowedTools: mergedAllowedTools,
        blockedTools: resolved.blockedTools?.length ? resolved.blockedTools : (activePolicyPlan.blockedTools || []),
        missingSlots: activePolicyPlan.missingSlots || [],
        reason: `Schema-bound classifier selected ${classified.intent} (confidence: ${classified.confidence})`,
        selectionScore: (classified.confidence || 0.8) * 100,
        classification: classified,
        alternatives: Array.isArray(classified.alternatives) ? classified.alternatives : (activePolicyPlan.alternatives || []),
        ambiguous: false,
      };
    } else {
      activeIntent = 'general.chat';
      activePolicyPlan = {
        ...activePolicyPlan,
        intent: 'general.chat',
        requiresTool: false,
        primaryTool: null,
        allowedTools: [],
        blockedTools: activePolicyPlan.blockedTools || [],
        reason: activeCompanyId
          ? 'Intent classifier did not return a schema-bound decision; tool execution is disabled for this turn'
          : 'No tenant classifier context; tool execution is disabled for this turn',
        selectionScore: 35,
        classification: classified || null,
        ambiguous: true,
        blockedReason: 'INTENT_CLASSIFICATION_UNAVAILABLE',
      };
    }
  }

  const policy = getPolicy(activeIntent);
  const source = activeSource;
  const requiredSlots = unique(policy.requiredSlots || []);

  // Resolve missing slots — durable goals that are ready_to_execute already have
  // all slots collected; skip slot validation so effectiveRequiresTool stays true.
  const activeGoalCtx = context?.activeGoal;
  const goalIsReadyToExecute = activeGoalCtx
    && (activeGoalCtx.status === 'ready_to_execute' || activeGoalCtx.nextStep === 'execute_tool');
  const messageSlots = (classified && classified.slots) || context?.classifiedSlots || {};
  const slotMessage = context?.slotMessage || message;
  const explicitMissingSlots = unique(asArray(activePolicyPlan.missingSlots));
  const missingSlots = (activePolicyPlan.goalRunId && goalIsReadyToExecute)
    ? []
    : unique([
        ...explicitMissingSlots,
        ...requiredSlots.filter(slot => {
          if (messageSlots[slot] !== undefined && messageSlots[slot] !== null && messageSlots[slot] !== '') {
            return false;
          }
          if (context?.customerIntentMode === 'llm_structured_only') {
            return true;
          }
          return !messageHasSlot(slotMessage, slot);
        }),
      ]);

  const requestedRequiresTool = Boolean(activePolicyPlan.requiresTool && activePolicyPlan.primaryTool);
  const blockedReason = activePolicyPlan.blockedReason || (requestedRequiresTool && missingSlots.length > 0 ? 'MISSING_REQUIRED_SLOTS' : null);
  const effectiveRequiresTool = Boolean(requestedRequiresTool && missingSlots.length === 0);
  const route = {
    primaryTool: activePolicyPlan.primaryTool || null,
    allowedTools: unique(asArray(activePolicyPlan.allowedTools)),
    blockedTools: unique(asArray(activePolicyPlan.blockedTools)),
  };

  const contract = {
    schemaVersion: CONTRACT_SCHEMA_VERSION,
    policyVersion: POLICY_VERSION,
    intent: activeIntent,
    confidence: chooseContractConfidence({ activeSource, activePolicyPlan, source, missingSlots }),
    source,
    decision: inferDecision({
      policyPlan: { ...activePolicyPlan, requiresTool: effectiveRequiresTool },
      policy,
      source,
      missingSlots,
    }),
    actionType: policy.actionType,
    riskLevel: policy.riskLevel,
    requiresTool: effectiveRequiresTool,
    blockedReason,
    route,
    requiredSlots,
    missingSlots,
    slots: {
      ...inferSlots({ policyPlan: activePolicyPlan, context }),
      ...messageSlots,
    },
    goalRunId: activePolicyPlan.goalRunId || null,
    nextState: policy.nextState,
    guardrails: unique(policy.guardrails || DEFAULT_GUARDRAILS),
    reason: activePolicyPlan.reason || 'Typed intent contract resolved',
    selectionScore: Number.isFinite(activePolicyPlan.selectionScore) ? activePolicyPlan.selectionScore : null,
    classification: activePolicyPlan.classification || null,
    alternatives: Array.isArray(activePolicyPlan.alternatives) ? activePolicyPlan.alternatives : [],
    ambiguous: Boolean(activePolicyPlan.ambiguous),
  };

  return {
    ...contract,
    validation: validateContract(contract),
  };
}

function toToolPlan(contract = {}) {
  return {
    intent: contract.intent || 'general.chat',
    requiresTool: Boolean(contract.requiresTool && contract.route?.primaryTool),
    primaryTool: contract.route?.primaryTool || null,
    allowedTools: unique(asArray(contract.route?.allowedTools)),
    blockedTools: unique(asArray(contract.route?.blockedTools)),
    reason: contract.reason || 'Typed intent contract resolved',
    goalRunId: contract.goalRunId || null,
    schemaVersion: contract.schemaVersion || CONTRACT_SCHEMA_VERSION,
    policyVersion: contract.policyVersion || POLICY_VERSION,
    confidence: Number.isFinite(contract.confidence) ? contract.confidence : 0.5,
    source: contract.source || 'typed-policy',
    decision: contract.decision || 'answer',
    actionType: contract.actionType || 'chat',
    riskLevel: contract.riskLevel || 'low',
    requiredSlots: unique(asArray(contract.requiredSlots)),
    missingSlots: unique(asArray(contract.missingSlots)),
    slots: contract.slots || {},
    nextState: contract.nextState || 'respond',
    blockedReason: contract.blockedReason || null,
    guardrails: unique(asArray(contract.guardrails)),
    validation: contract.validation || { valid: true, errors: [] },
    selectionScore: Number.isFinite(contract.selectionScore) ? contract.selectionScore : null,
    classification: contract.classification || null,
    alternatives: Array.isArray(contract.alternatives) ? contract.alternatives : [],
    ambiguous: Boolean(contract.ambiguous),
    contract,
  };
}

module.exports = {
  CONTRACT_SCHEMA_VERSION,
  POLICY_VERSION,
  INTENT_CONTRACT_SCHEMA,
  INTENT_POLICIES,
  buildIntentContract,
  buildIntentContractAsync,
  toToolPlan,
  validateContract,
};
