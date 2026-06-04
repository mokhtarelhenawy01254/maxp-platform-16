/**
 * @module intentExecutionRouter
 * @description Decouples deterministic tool routing, parameter parsing, and planned executions.
 */

const { TOOLS: CEO_TOOLS } = require('../agentToolRegistry');
const agentRunRuntimeService = require('../agentRunRuntimeService');

// arabic-strings: internal-signal-start
const EGYPT_LOCATION_HINTS = [
  'القاهرة',
  'مدينة نصر',
  'الجيزة',
  'الإسكندرية',
  'اسكندرية',
  'الاسكندرية',
  'المنصورة',
  'طنطا',
  'الشرقية',
  'الغربية',
  'الدقهلية',
  'المنوفية',
  'القليوبية',
  'البحيرة',
  'الفيوم',
  'بني سويف',
  'بنى سويف',
  'المنيا',
  'أسيوط',
  'اسيوط',
  'سوهاج',
  'قنا',
  'الأقصر',
  'الاقصر',
  'أسوان',
  'اسوان',
  'بورسعيد',
  'الإسماعيلية',
  'الاسماعيلية',
  'السويس',
];

const SKILL_FIELD_LABELS = [
  'id',
  'الاسم',
  'اسم المهارة',
  'اسم المهاره',
  'displayName',
  'display name',
  'الوصف',
  'وصف',
  'description',
  'الهدف',
  'purpose',
  'عبارات التشغيل',
  'triggerPhrases',
  'trigger phrases',
  'triggers',
  'الخطوات',
  'steps',
  'القيود',
  'constraints',
  'امثلة',
  'أمثلة',
  'examples',
  'الأدوات المسموحة',
  'الادوات المسموحه',
  'allowedTools',
  'allowed tools',
];
// arabic-strings: internal-signal-end

function _safeJsonParse(value, fallback = {}) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function _safeJsonClone(value) {
  if (!value || typeof value !== 'object') return {};
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return {};
  }
}

function _escapeRegex(value = '') {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function _normalizeArabicDigits(value = '') {
  // arabic-strings: internal-signal-start
  const arabicIndic = '٠١٢٣٤٥٦٧٨٩';
  const easternArabicIndic = '۰۱۲۳۴۵۶۷۸۹';
  // arabic-strings: internal-signal-end
  return String(value || '')
    .replace(/[٠-٩]/g, digit => String(arabicIndic.indexOf(digit)))
    .replace(/[۰-۹]/g, digit => String(easternArabicIndic.indexOf(digit)));
}

function _stripScenarioPrefix(value = '') {
  return String(value || '')
    .replace(/^\s*اختبار\s+كودكس\s+(?=[^:：]{0,100}[\d_-])[^:：]{1,100}[:：]\s*/iu, '')
    .replace(/^\s*اختبار\s+بعد\s+النشر(?:\s+[\w.-]+)?\s*[:：]\s*/iu, '')
    .replace(/^\s*اختبار\s+بعد\s+التحديث\s*[:：]\s*/iu, '')
    .trim();
}

function _normalizeEvidenceText(value = '') {
  return String(value || '')
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/\s+/g, ' ')
    .trim();
}

function _periodFromMessage(message = '') {
  const text = _normalizeEvidenceText(message);
  if (/(امبارح|البارح|yesterday)/i.test(text)) return 'yesterday';
  if (/(اسبوع|الاسبوع|week)/i.test(text)) return 'week';
  if (/(شهر|الشهر|month)/i.test(text)) return 'month';
  if (/(اليوم|النهارده|حاليا|دلوقتي|today|now)/i.test(text)) return 'today';
  return null;
}

function _cleanInventoryProductName(value = '') {
  return String(value || '')
    .replace(/^(?:هل|فيه|في|عايز\s+اعرف|عاوز\s+اعرف|ممكن\s+اعرف|ممكن|لو\s+سمحت)\s+/iu, '')
    .replace(/^(?:سعر|price)\s+/iu, '')
    .replace(/(?:مقاسات|المقاسات|مقاس(?!ات)|المقاس|size)\s*[:=]?\s*[\p{L}\p{N}._/-]+/giu, ' ')
    .replace(/(?:لون|اللون|color)\s*[:=]?\s*[^،,.؟?\n]+/giu, ' ')
    .replace(/(?:^|[\s،,.؟?;:])(?:كام|بكام|ايه|إيه|منه|منها|متاح|متوفر|موجود)(?=$|[\s،,.؟?;:])/giu, ' ')
    .replace(/\b(?:available|price|sizes?)\b/giu, ' ')
    .replace(/\s+(?:رد\s+عليا|قولي|قوللي|جاوبني|لو\s+سمحت)[\s\S]*$/iu, '')
    .replace(/[؟?،,.:;]+$/gu, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function _extractCatalogProductCandidate(message = '') {
  const text = _stripScenarioPrefix(message);
  const firstQuestion = text.split(/[؟?]/u)[0] || text;
  const patterns = [
    /(?:^|\s)(?:سعر|price)\s+(.+?)(?=\s+(?:كام|بكام|متاح|متوفر|موجود|ومقاسات|ومقاساته|ومقاساتها|و\s+متاح|مقاسات|المقاسات|sizes?|$)|[؟?،,.])/iu,
    /(?:^|\s)(.+?)\s+(?:سعره|بكام|متاح|متوفر|موجود)(?:\s|$|[؟?،,.])/iu,
    /(?:^|\s)(.+?)\s+(?:مقاسات|المقاسات|مقاساته|مقاساتها|sizes?)(?:\s|$|[؟?،,.])/iu,
  ];

  for (const pattern of patterns) {
    const match = firstQuestion.match(pattern);
    const candidate = _cleanInventoryProductName(match?.[1] || '');
    if (candidate) return candidate;
  }

  return '';
}

function _extractInventoryProductCandidate(message = '') {
  const text = _stripScenarioPrefix(message);
  const catalogCandidate = _extractCatalogProductCandidate(text);
  if (catalogCandidate) return catalogCandidate;

  const firstQuestion = text.split(/[؟?]/u)[0] || text;
  const patterns = [
    /(?:^|\s)(.+?)\s+(?:متاح|متوفر|موجود|available|in\s+stock)(?:\s|$|[؟?،,.])/iu,
    /(?:متاح|متوفر|موجود|available|in\s+stock)\s+(.+?)(?:$|[؟?،,.])/iu,
  ];

  for (const pattern of patterns) {
    const match = firstQuestion.match(pattern);
    const candidate = _cleanInventoryProductName(match?.[1] || '');
    if (candidate) return candidate;
  }

  const skuMatch = text.match(/(?:sku|كود)\s*[:=]?\s*([\w.-]+)/iu);
  return _cleanInventoryProductName(skuMatch?.[1] || '');
}

function _parseInventoryCheckParams(message = '') {
  const text = _normalizeArabicDigits(_stripScenarioPrefix(message));
  const productNameOrSku = _extractInventoryProductCandidate(text);
  if (!productNameOrSku) return null;

  const sizeMatch = text.match(/(?:مقاس(?!ات)|المقاس|size)\s*[:=]?\s*([\p{L}\p{N}._/-]+)/iu);
  const colorMatch = text.match(/(?:لون|اللون|color)\s*[:=]?\s*([^،,.؟?\n]+)/iu);
  const productSize = _cleanInventoryProductName(sizeMatch?.[1] || '');
  const productColor = _cleanInventoryProductName(colorMatch?.[1] || '');

  return {
    productNameOrSku,
    ...(productSize ? { productSize } : {}),
    ...(productColor ? { productColor } : {}),
  };
}

function _parseOrderLookupParams(message = '') {
  const raw = _normalizeArabicDigits(_stripScenarioPrefix(message));
  const text = _normalizeEvidenceText(raw);
  const rawFallback = raw.match(/\b(?:ORD-\d{3,}-\d{2,}|[A-Z]{2,}[-_]\d{2,}|\d{3,})\b/iu);
  const labeled = text.match(/(?:رقم\s*(?:الطلب|الاوردر)|اوردر|طلب|order)\s*[:#-]?\s*([a-z]{2,}[-_]\d{2,}|ord-\d{3,}-\d{2,}|\d{3,})/iu);
  const orderNumber = (rawFallback?.[0] || labeled?.[1] || '').trim();
  return orderNumber ? { orderNumber } : null;
}

function _parseShippingRateParams(message = '') {
  const text = _stripScenarioPrefix(message);
  const normalized = _normalizeArabicDigits(text);
  const explicit = normalized.match(/(?:الشحن|شحن|التوصيل|توصيل)\s+(?:ل|الى|إلى|في|فى)?\s*([^،,.؟?\n]+?)(?=\s+(?:كام|بكام|بيوصل|يوصل|مدة|قد|في|فى|$)|[،,.؟?])/iu);
  const cleaned = _cleanInventoryProductName(explicit?.[1] || '');
  const normalizeLocation = value => _normalizeEvidenceText(value).replace(/^ل+/, '').replace(/^ال/, '');
  const resolvedCleaned = cleaned
    ? EGYPT_LOCATION_HINTS.find(item => normalizeLocation(item) === normalizeLocation(cleaned))
    : null;
  // arabic-strings: internal-signal-start
  const location = resolvedCleaned || cleaned || EGYPT_LOCATION_HINTS.find(item => new RegExp(`(?:^|\\s|،|,)${_escapeRegex(item)}(?:\\s|،|,|$)`, 'iu').test(normalized));
  // arabic-strings: internal-signal-end
  return location ? { governorate: location } : null;
}

function _getDeterministicReadToolParams(tool, message = '', relevancePlan = {}) {
  const period = _periodFromMessage(message);
  switch (tool) {
    case 'agent.list_agents':
    case 'hr.attendance_today':
    case 'company.snapshot':
      return {};
    case 'audit.read':
      return { limit: 5 };
    case 'agent.read_state':
      if (relevancePlan.intent === 'skills.read' || relevancePlan.intent === 'skills.manage') {
        return { include: ['agents', 'skills'] };
      }
      return { include: ['agents', 'skills', 'inbox'] };
    case 'order.summary':
      return { period: period || 'today' };
    case 'order.lookup':
      return _parseOrderLookupParams(message);
    case 'shipping.rates':
      return _parseShippingRateParams(message);
    case 'sales.revenue':
      return { period: period || 'month' };
    case 'product.lowStock':
    case 'product.topSelling':
    case 'customer.topBuyers':
      return {};
    case 'inventory.check':
      return _parseInventoryCheckParams(message);
    default:
      return null;
  }
}

function _getDeterministicReadToolExecution(relevancePlan = {}, message = '', nativeTools = []) {
  if (!relevancePlan.requiresTool || !relevancePlan.primaryTool) return null;
  const toolDefinition = CEO_TOOLS[relevancePlan.primaryTool];
  if (!toolDefinition || toolDefinition.readOnly === false) return null;
  const params = _getDeterministicReadToolParams(relevancePlan.primaryTool, message, relevancePlan);
  if (!params) return null;
  const nativeName = nativeTools.find(tool => tool.metadata?.internalName === relevancePlan.primaryTool)?.function?.name || relevancePlan.primaryTool;
  return {
    tool: relevancePlan.primaryTool,
    nativeName,
    params,
  };
}

function _firstNonEmptySlot(slots = {}, names = []) {
  for (const name of names) {
    const value = slots[name];
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return value;
    }
  }
  return undefined;
}

function _getModelClassifiedReadToolParams(tool, relevancePlan = {}) {
  const slots = {
    ..._safeJsonClone(relevancePlan.classification?.slots || {}),
    ..._safeJsonClone(relevancePlan.slots || {}),
  };
  switch (tool) {
    case 'product.search': {
      const query = _firstNonEmptySlot(slots, ['productName', 'productNameOrSku', 'name', 'sku', 'query']);
      return query ? { query: String(query), limit: 5 } : null;
    }
    case 'inventory.check': {
      const productNameOrSku = _firstNonEmptySlot(slots, ['productNameOrSku', 'productName', 'name', 'sku', 'query']);
      if (!productNameOrSku) return null;
      const params = { productNameOrSku: String(productNameOrSku) };
      const productSize = _firstNonEmptySlot(slots, ['productSize', 'size']);
      const productColor = _firstNonEmptySlot(slots, ['productColor', 'color']);
      if (productSize !== undefined) params.productSize = String(productSize);
      if (productColor !== undefined) params.productColor = String(productColor);
      return params;
    }
    case 'order.lookup': {
      const orderNumber = _firstNonEmptySlot(slots, ['orderNumber', 'orderId']);
      const customerPhone = _firstNonEmptySlot(slots, ['customerPhone', 'phone']);
      if (!orderNumber && !customerPhone) return null;
      return {
        ...(orderNumber ? { orderNumber: String(orderNumber) } : {}),
        ...(customerPhone ? { customerPhone: String(customerPhone) } : {}),
      };
    }
    case 'shipping.rates': {
      const governorate = _firstNonEmptySlot(slots, ['governorate', 'city', 'destination', 'area']);
      const city = _firstNonEmptySlot(slots, ['city', 'area']);
      return governorate
        ? {
          governorate: String(governorate),
          ...(city && city !== governorate ? { city: String(city) } : {}),
        }
        : null;
    }
    default:
      return null;
  }
}

function _getModelClassifiedReadToolExecution(relevancePlan = {}, nativeTools = []) {
  if (!relevancePlan.requiresTool || !relevancePlan.primaryTool) return null;
  const toolDefinition = CEO_TOOLS[relevancePlan.primaryTool];
  if (!toolDefinition || toolDefinition.readOnly === false) return null;
  const params = _getModelClassifiedReadToolParams(relevancePlan.primaryTool, relevancePlan);
  if (!params) return null;
  const nativeName = nativeTools.find(tool => tool.metadata?.internalName === relevancePlan.primaryTool)?.function?.name || relevancePlan.primaryTool;
  return {
    tool: relevancePlan.primaryTool,
    nativeName,
    params,
  };
}

function _getModelClassifiedWriteToolParams(tool, relevancePlan = {}) {
  const slots = {
    ..._safeJsonClone(relevancePlan.classification?.slots || {}),
    ..._safeJsonClone(relevancePlan.slots || {}),
  };
  if (tool === 'order.create_draft') {
    const productName = _firstNonEmptySlot(slots, ['productName', 'product_name', 'product', 'name']);
    const customerName = _firstNonEmptySlot(slots, ['customerName', 'customer_name', 'name']);
    const customerPhone = _firstNonEmptySlot(slots, ['customerPhone', 'customer_phone', 'phone']);
    if (!productName || !customerPhone) return null;
    const params = {
      productName: String(productName),
      ...(customerName ? { customerName: String(customerName) } : {}),
      customerPhone: String(customerPhone),
    };
    const productPrice = _firstNonEmptySlot(slots, ['productPrice', 'product_price', 'price']);
    if (productPrice !== undefined) params.productPrice = Number(productPrice) || undefined;
    const productColor = _firstNonEmptySlot(slots, ['productColor', 'product_color', 'color']);
    if (productColor !== undefined) params.productColor = String(productColor);
    const productSize = _firstNonEmptySlot(slots, ['productSize', 'product_size', 'size']);
    if (productSize !== undefined) params.productSize = String(productSize);
    const quantity = _firstNonEmptySlot(slots, ['quantity', 'qty']);
    if (quantity !== undefined) params.quantity = Number(quantity) || 1;
    const city = _firstNonEmptySlot(slots, ['city', 'governorate', 'destination']);
    if (city !== undefined) params.city = String(city);
    return params;
  }
  return null;
}

function _getModelClassifiedWriteToolExecution(relevancePlan = {}, nativeTools = []) {
  if (!relevancePlan.requiresTool || !relevancePlan.primaryTool) return null;
  const params = _getModelClassifiedWriteToolParams(relevancePlan.primaryTool, relevancePlan);
  if (!params) return null;
  const nativeName = nativeTools.find(tool => tool.metadata?.internalName === relevancePlan.primaryTool)?.function?.name
    || toNativeNameFallback(relevancePlan.primaryTool);
  return {
    tool: relevancePlan.primaryTool,
    nativeName,
    params,
  };
}

function _getModelClassifiedHandoffExecution(relevancePlan = {}, message = '', nativeTools = [], context = {}) {
  if (!relevancePlan.requiresTool || relevancePlan.primaryTool !== 'agent.handoff') return null;
  if (!['support.exchange', 'support.refund', 'support.complaint'].includes(relevancePlan.intent)) return null;
  const toolDefinition = CEO_TOOLS['agent.handoff'];
  if (!toolDefinition) return null;
  const nativeName = nativeTools.find(tool => tool.metadata?.internalName === 'agent.handoff')?.function?.name || 'agent.handoff';
  const reasonByIntent = {
    'support.exchange': 'customer_exchange_request',
    'support.refund': 'customer_refund_request',
    'support.complaint': 'customer_complaint_or_damage',
  };
  return {
    tool: 'agent.handoff',
    nativeName,
    params: {
      targetType: 'human',
      reason: reasonByIntent[relevancePlan.intent] || 'customer_support_handoff',
      summary: _stripScenarioPrefix(message).slice(0, 500),
      conversationId: context.conversationId || null,
      customerId: context.customerId || null,
      priority: relevancePlan.intent === 'support.complaint' ? 'high' : 'medium',
    },
  };
}

function _getDeterministicActionToolExecution(relevancePlan = {}, message = '', nativeTools = [], context = {}) {
  return _getModelClassifiedHandoffExecution(relevancePlan, message, nativeTools, context);
}

function _getPlannedToolExecutions(relevancePlan = {}, context = {}) {
  const goal = context?.activeGoal;
  if (!goal || (goal.status !== 'ready_to_execute' && goal.nextStep !== 'execute_tool')) return [];
  if (!goal.executionParams || typeof goal.executionParams !== 'object') return [];

  if (goal.type === 'create_product') {
    if (relevancePlan.primaryTool !== 'product.create') return [];
    return agentRunRuntimeService.prepareExecutionSteps(goal, [{
      tool: 'product.create',
      nativeName: 'agenttool__product_create',
      params: goal.executionParams,
      goalRunId: goal.id,
    }]);
  }

  if (goal.type === 'create_agent_with_skill') {
    if (relevancePlan.primaryTool !== 'agent.spawn') return [];
    const steps = [];
    if (goal.executionParams.agent) {
      steps.push({
        tool: 'agent.spawn',
        nativeName: 'agenttool__agent_spawn',
        params: goal.executionParams.agent,
        goalRunId: goal.id,
      });
    }
    if (goal.executionParams.skill) {
      steps.push({
        tool: 'skill.create',
        nativeName: 'agenttool__skill_create',
        params: goal.executionParams.skill,
        goalRunId: goal.id,
        after: 'agent.spawn',
      });
    }
    return agentRunRuntimeService.prepareExecutionSteps(goal, steps);
  }

  return [];
}

function _extractLabeledSkillField(message = '', labels = []) {
  const source = String(message || '');
  const targetPattern = labels.map(_escapeRegex).join('|');
  const allLabelsPattern = SKILL_FIELD_LABELS.map(_escapeRegex).join('|');
  // arabic-strings: internal-signal-start
  const pattern = new RegExp(
    `(?:^|[\\s.،؛])(?:${targetPattern})\\s*[:：]\\s*([\\s\\S]*?)(?=(?:[\\s.،؛]+(?:${allLabelsPattern})\\s*[:：])|$)`,
    'iu'
  );
  // arabic-strings: internal-signal-end
  const match = source.match(pattern);
  if (!match?.[1]) return '';
  return match[1].replace(/[.،؛\s]+$/u, '').trim();
}

function _splitSkillList(value = '') {
  return String(value || '')
    .split(/[,،؛\n]+|\s+-\s+/u)
    .map(item => item.trim().replace(/^[-•]\s*/u, ''))
    .filter(Boolean)
    .slice(0, 12);
}

function _parseAllowedTools(value = '') {
  const names = String(value || '').match(/[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)+/gi) || [];
  return [...new Set(names.map(name => name.trim()).filter(name => CEO_TOOLS[name]))].slice(0, 3);
}

function _parseSkillCreateParams(message = '') {
  const id = _extractLabeledSkillField(message, ['id']);
  // arabic-strings: internal-signal-start
  const displayName = _extractLabeledSkillField(message, ['الاسم', 'اسم المهارة', 'اسم المهاره', 'displayName', 'display name']);
  const description = _extractLabeledSkillField(message, ['الوصف', 'وصف', 'description']);
  if (!displayName || !description) return null;

  const purpose = _extractLabeledSkillField(message, ['الهدف', 'purpose']);
  const triggerPhrases = _splitSkillList(_extractLabeledSkillField(message, ['عبارات التشغيل', 'triggerPhrases', 'trigger phrases', 'triggers']));
  const steps = _splitSkillList(_extractLabeledSkillField(message, ['الخطوات', 'steps']));
  const constraints = _splitSkillList(_extractLabeledSkillField(message, ['القيود', 'constraints']));
  const examples = _splitSkillList(_extractLabeledSkillField(message, ['امثلة', 'أمثلة', 'examples']));
  const allowedTools = _parseAllowedTools(_extractLabeledSkillField(message, ['الأدوات المسموحة', 'الادوات المسموحه', 'allowedTools', 'allowed tools']));
  // arabic-strings: internal-signal-end

  return {
    ...(id ? { id } : {}),
    displayName,
    description,
    ...(purpose ? { purpose } : {}),
    ...(triggerPhrases.length ? { triggerPhrases } : {}),
    ...(steps.length ? { steps } : {}),
    ...(constraints.length ? { constraints } : {}),
    ...(examples.length ? { examples } : {}),
    ...(allowedTools.length ? { allowedTools } : {}),
  };
}

function _parseAgentRunTaskParams(message = '') {
  const raw = String(message || '');
  const agentMatch = raw.match(/(?:كلف|كلفه|اختبر|جرب|شغل|اطلب من)\s+(.+?)\s+(?:يعمل|ينفذ|يجهز|يرد|يعالج|يراجع|يبحث|يعمللي|اعملي|اعمل)/iu);
  const agentName = (agentMatch?.[1] || '')
    .replace(/^(?:ال)?وكيل\s+/iu, 'وكيل ')
    .trim();
  const taskMatch = raw.match(/(?:يعمل|ينفذ|يجهز|يعالج|يراجع|يبحث|يعمللي|اعملي|اعمل)\s+([\s\S]+)$/iu);
  const task = taskMatch?.[1]
    ? taskMatch[1].trim()
    : raw.replace(/^(?:اختبار تشغيل الوكيل|اختبر الوكيل|كلف|كلفه|جرب|شغل|اطلب من)\s+/iu, '').trim();
  if (!agentName || !task) return null;
  return {
    agentName,
    task,
  };
}

function toNativeNameFallback(toolName = '') {
  return `agenttool__${String(toolName).replace(/[^A-Za-z0-9_-]/g, '_')}`;
}

function _getDeterministicWriteToolExecution(relevancePlan = {}, message = '', nativeTools = []) {
  if (!relevancePlan.requiresTool) return null;
  if (!['skill.create', 'order.create_draft', 'agent.run_task'].includes(relevancePlan.primaryTool)) return null;
  const nativeName = nativeTools.find(tool => tool.metadata?.internalName === relevancePlan.primaryTool)?.function?.name
    || toNativeNameFallback(relevancePlan.primaryTool);
  let params = null;
  if (relevancePlan.primaryTool === 'skill.create') params = _parseSkillCreateParams(message);
  if (relevancePlan.primaryTool === 'order.create_draft') {
    // orderDraftEngine will be required dynamically to avoid any import cycle issues
    const orderDraftEngine = require('./orderDraftEngine');
    params = orderDraftEngine._parseOrderDraftParams(message);
  }
  if (relevancePlan.primaryTool === 'agent.run_task') params = _parseAgentRunTaskParams(message);
  if (!params) return null;
  return {
    tool: relevancePlan.primaryTool,
    nativeName,
    params,
  };
}

module.exports = {
  _normalizeArabicDigits,
  _stripScenarioPrefix,
  _normalizeEvidenceText,
  _cleanInventoryProductName,
  _extractCatalogProductCandidate,
  _extractInventoryProductCandidate,
  _parseInventoryCheckParams,
  _parseOrderLookupParams,
  _parseShippingRateParams,
  _getDeterministicReadToolParams,
  _getDeterministicReadToolExecution,
  _firstNonEmptySlot,
  _getModelClassifiedReadToolParams,
  _getModelClassifiedReadToolExecution,
  _getModelClassifiedWriteToolParams,
  _getModelClassifiedWriteToolExecution,
  _getModelClassifiedHandoffExecution,
  _getDeterministicActionToolExecution,
  _getPlannedToolExecutions,
  _getDeterministicWriteToolExecution,
  toNativeNameFallback,
};
