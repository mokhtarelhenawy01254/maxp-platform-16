/**
 * @module ceoParsers
 * @description Domain-specific parsing, extraction, and reply-building utilities
 * extracted from CEOAgent.js. Covers skill, order-draft, inventory, catalog,
 * shipping, and agent-run-task domains.
 *
 * All functions are pure (no I/O). CEOAgent imports them at module level to
 * keep processTask() readable without carrying 600+ lines of parsing logic.
 */

const { TOOLS: CEO_TOOLS } = require('./agentToolRegistry');
const { normalizeEvidenceText } = require('./agentTextNormalization');

// ─── Data Constants ────────────────────────────────────────────────────────────

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

const ORDER_DRAFT_FIELD_LABELS = [
  'conversationId',
  'conversation id',
  'customerId',
  'customer id',
  'productName',
  'product name',
  'اسم المنتج',
  'المنتج',
  'productColor',
  'product color',
  'اللون',
  'productSize',
  'product size',
  'المقاس',
  'productPrice',
  'product price',
  'السعر',
  'سعر',
  'price',
  'quantity',
  'qty',
  'الكمية',
  'كمية',
  'كميه',
  'عدد',
  'customerName',
  'customer name',
  'اسم العميل',
  'العميل',
  'customerPhone',
  'customer phone',
  'هاتف العميل',
  'رقم العميل',
  'رقم الموبايل',
  'رقمي',
  'رقمى',
  'اسمي',
  'اسمى',
  'phone',
  'city',
  'المدينة',
  'المحافظة',
  'العنوان',
  'عنوان',
  'notes',
  'ملاحظات',
];

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

const QUANTITY_WORDS = {
  واحد: 1,
  واحدة: 1,
  واحده: 1,
  قطعه: 1,
  قطعة: 1,
  حبه: 1,
  حبة: 1,
  اتنين: 2,
  اثنين: 2,
  تنتين: 2,
  قطعتين: 2,
  حبتين: 2,
  ثلاثه: 3,
  ثلاثة: 3,
  تلاته: 3,
  تلاتة: 3,
  اربعه: 4,
  أربعة: 4,
  خمسه: 5,
  خمسة: 5,
};

// ─── Text Utilities ────────────────────────────────────────────────────────────

function _escapeRegex(value = '') {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function _normalizeArabicDigits(value = '') {
  const arabicIndic = '٠١٢٣٤٥٦٧٨٩';
  const easternArabicIndic = '۰۱۲۳۴۵۶۷۸۹';
  return String(value || '')
    .replace(/[٠-٩]/g, digit => String(arabicIndic.indexOf(digit)))
    .replace(/[۰-۹]/g, digit => String(easternArabicIndic.indexOf(digit)));
}

function _stripScenarioPrefix(value = '') {
  return String(value || '')
    .replace(/^\s*اختبار\s+كودكس\s+(?=[^:：]{0,100}[\d_-])[^:：]{1,100}[:：]\s*/iu, '')
    .trim();
}

function _normalizeNumberText(value = '') {
  return String(value || '')
    .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
    .replace(',', '.');
}

function _parseNumberField(value = '') {
  const match = _normalizeNumberText(value).match(/\d+(?:\.\d+)?/);
  if (!match) return undefined;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function _parseQuantityValue(value = '') {
  const text = normalizeEvidenceText(value);
  const numeric = _parseNumberField(value);
  if (numeric !== undefined) return numeric;
  for (const [word, amount] of Object.entries(QUANTITY_WORDS)) {
    if (new RegExp(`(?:^|\\s)${_escapeRegex(word)}(?:\\s|$)`, 'iu').test(text)) {
      return amount;
    }
  }
  return undefined;
}

// ─── Skill Parsers ─────────────────────────────────────────────────────────────

function _extractLabeledSkillField(message = '', labels = []) {
  const source = String(message || '');
  const targetPattern = labels.map(_escapeRegex).join('|');
  const allLabelsPattern = SKILL_FIELD_LABELS.map(_escapeRegex).join('|');
  const pattern = new RegExp(
    `(?:^|[\\s.،؛])(?:${targetPattern})\\s*[:：]\\s*([\\s\\S]*?)(?=(?:[\\s.،؛]+(?:${allLabelsPattern})\\s*[:：])|$)`,
    'iu'
  );
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
  const displayName = _extractLabeledSkillField(message, ['الاسم', 'اسم المهارة', 'اسم المهاره', 'displayName', 'display name']);
  const description = _extractLabeledSkillField(message, ['الوصف', 'وصف', 'description']);
  if (!displayName || !description) return null;

  const purpose = _extractLabeledSkillField(message, ['الهدف', 'purpose']);
  const triggerPhrases = _splitSkillList(_extractLabeledSkillField(message, ['عبارات التشغيل', 'triggerPhrases', 'trigger phrases', 'triggers']));
  const steps = _splitSkillList(_extractLabeledSkillField(message, ['الخطوات', 'steps']));
  const constraints = _splitSkillList(_extractLabeledSkillField(message, ['القيود', 'constraints']));
  const examples = _splitSkillList(_extractLabeledSkillField(message, ['امثلة', 'أمثلة', 'examples']));
  const allowedTools = _parseAllowedTools(_extractLabeledSkillField(message, ['الأدوات المسموحة', 'الادوات المسموحه', 'allowedTools', 'allowed tools']));

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

// ─── Order Parsers ─────────────────────────────────────────────────────────────

function _extractLabeledOrderField(message = '', labels = []) {
  const source = String(message || '');
  const targetPattern = labels.map(_escapeRegex).join('|');
  const allLabelsPattern = ORDER_DRAFT_FIELD_LABELS.map(_escapeRegex).join('|');
  const pattern = new RegExp(
    `(?:^|[\\s.،؛])(?:${targetPattern})\\s*[:：]?\\s*([\\s\\S]*?)(?=(?:[\\s.،؛]+(?:${allLabelsPattern})\\s*[:：]?)|$)`,
    'iu'
  );
  const match = source.match(pattern);
  if (!match?.[1]) return '';
  return match[1].replace(/[.،؛\s]+$/u, '').trim();
}

function _extractOrderFallback(message = '', pattern) {
  const match = String(message || '').match(pattern);
  return match?.[1]?.trim().replace(/[.،؛\s]+$/u, '') || '';
}

function _customerMessageSlice(raw = '') {
  const text = String(raw || '');
  const marker = 'Customer message:';
  const index = text.lastIndexOf(marker);
  return index >= 0 ? text.slice(index + marker.length).trim() : text;
}

function _cleanOrderProductName(value = '') {
  return String(value || '')
    .replace(/^(?:أعمل|اعمل|انشئ|أنشئ|جهز|جهزي)?\s*(?:أوردر|اوردر|طلب)\s+/iu, '')
    .replace(/^(?:واحد|واحدة|واحده|قطعة|قطعه|حبة|حبه|اتنين|اثنين|تنتين|[١٢12])\s+/iu, '')
    .replace(/\s+(?:مقاس|المقاس|size|لون|اللون|color|اسمي|اسمى|رقمي|رقمى|رقم|هاتف|المحافظة|المدينة|العنوان|عنوان)\b[\s\S]*$/iu, '')
    .replace(/^(?:من|منتج|المنتج|product)\s+/iu, '')
    .trim();
}

function _extractOrderProductName(raw = '', customerMessage = '') {
  const labeled = _extractLabeledOrderField(raw, ['productName', 'product name', 'اسم المنتج', 'المنتج'])
    || _extractOrderFallback(raw, /(?:منتج|المنتج|product)\s+(.+?)(?=\s+(?:السعر|سعر|price|الكمية|كميه|quantity|qty|العميل|اسم العميل|رقم العميل|هاتف العميل|phone|المدينة|المحافظة|المقاس|مقاس|اللون|$))/iu);
  if (labeled) return _cleanOrderProductName(labeled);

  const conversational = _extractOrderFallback(
    customerMessage,
    /(?:أوردر|اوردر|طلب|اطلب|هات|عايز|عاوز|اخد|أخد)\s+(?:أعمل|اعمل|واحد|واحدة|واحده|قطعة|قطعه|حبة|حبه|اتنين|اثنين|تنتين|[١٢12])?\s*([^،,.\n]+?)(?=\s+(?:مقاس|المقاس|size|لون|اللون|color|اسمي|اسمى|رقمي|رقمى|رقم|هاتف|المحافظة|المدينة|العنوان|عنوان|سعر|السعر|بكام|$))/iu
  );
  if (conversational) return _cleanOrderProductName(conversational);

  const englishProduct = customerMessage.match(/\b([A-Z][A-Za-z0-9-]+(?:\s+[A-Z][A-Za-z0-9-]+){1,5})\b/u);
  return _cleanOrderProductName(englishProduct?.[1] || '');
}

function _extractOrderPrice(raw = '') {
  const labeled = _extractLabeledOrderField(raw, ['productPrice', 'product price', 'السعر', 'سعر', 'price'])
    || _extractOrderFallback(raw, /(?:السعر|سعر|price)\s*[:=]?\s*([٠-٩۰-۹\d]+(?:[.,][٠-٩۰-۹\d]+)?)/iu);
  const labeledPrice = _parseNumberField(labeled);
  if (labeledPrice !== undefined) return labeledPrice;

  const contextual = String(raw || '').match(/(?:سعر|السعر|price|بسعر|بـ)[^\n٠-٩۰-۹\d]{0,120}([٠-٩۰-۹\d]+(?:[.,][٠-٩۰-۹\d]+)?)(?:\s*(?:جنيه|ج\.?|egp))?/iu);
  return _parseNumberField(contextual?.[1] || '');
}

function _extractProductSearchPrice(result, productName = '') {
  const products = Array.isArray(result)
    ? result
    : (Array.isArray(result?.products) ? result.products : []);
  if (!products.length) return undefined;

  const wanted = normalizeEvidenceText(productName);
  const matched = products.find((product) => {
    const name = normalizeEvidenceText(product.name || product.الاسم || product.productName || '');
    return name && wanted && (name.includes(wanted) || wanted.includes(name));
  }) || (products.length === 1 ? products[0] : null);

  if (!matched) return undefined;
  return _parseNumberField(
    matched.productPrice ||
    matched.price ||
    matched.السعر ||
    matched['سعر'] ||
    ''
  );
}

function _getOrderDraftPayload(result = {}) {
  const payload = result && typeof result.result === 'object' && result.result !== null
    ? result.result
    : (result || {});
  const orderDraft = payload.orderDraft
    || payload.draft?.orderDraft
    || payload.params
    || payload.draft
    || {};
  return { payload, orderDraft };
}

function _isSuccessfulOrderDraftResult(result = {}) {
  if (!result?.success) return false;
  const { payload, orderDraft } = _getOrderDraftPayload(result);
  if (payload.success === false) return false;
  return Boolean(
    payload.draftId
    || payload.approvalCode
    || payload.id
    || orderDraft.productName
    || orderDraft.customerName
  );
}

function _formatOrderDraftProductSummary(orderDraft = {}) {
  const productName = orderDraft.productName || orderDraft.name || 'المنتج';
  const quantity = Number.isFinite(Number(orderDraft.quantity))
    ? Math.max(1, Math.floor(Number(orderDraft.quantity)))
    : 1;
  const sizeText = orderDraft.productSize ? ` مقاس ${orderDraft.productSize}` : '';
  const colorText = orderDraft.productColor ? ` لون ${orderDraft.productColor}` : '';
  const price = _parseNumberField(orderDraft.productPrice || orderDraft.price || '');
  const priceText = price !== undefined ? ` بسعر ${price} جنيه` : '';
  const quantityText = quantity > 1 ? `${quantity} × ` : '';
  return `${quantityText}${productName}${sizeText}${colorText}${priceText}`;
}

// ─── Reply Builders ────────────────────────────────────────────────────────────

function _buildOrderDraftCustomerReply(result = {}) {
  const { orderDraft } = _getOrderDraftPayload(result);
  const customerName = orderDraft.customerName ? ` باسم ${orderDraft.customerName}` : '';
  const productSummary = _formatOrderDraftProductSummary(orderDraft);
  return `جهزت مسودة طلب${customerName} لـ ${productSummary}. المسودة معلقة لموافقة التاجر قبل التنفيذ النهائي.`;
}

function _buildOrderDraftFailureReply(result = {}, params = {}) {
  const { payload } = _getOrderDraftPayload(result);
  const reason = result.error || payload.error || payload.message || 'بيانات الطلب محتاجة مراجعة';
  const productName = params.productName ? ` لمنتج ${params.productName}` : '';
  return `محتاج أراجع بيانات الطلب${productName} قبل تجهيز المسودة: ${reason}`;
}

function _buildMissingOrderPriceReply(params = {}, lookupResult = {}) {
  const productName = params.productName ? ` لمنتج ${params.productName}` : '';
  const reason = lookupResult.success
    ? 'لم أجد سعراً مؤكداً في نتيجة البحث الحالية'
    : (lookupResult.error || 'تعذر البحث عن السعر الحالي');
  return `محتاج السعر المؤكد${productName} قبل تجهيز مسودة الطلب. ${reason}.`;
}

function _buildDeterministicLLMResult(text, model = 'deterministic-order-draft-reply') {
  return {
    text,
    provider: 'deterministic',
    model,
    toolCalls: [],
  };
}

// ─── Inventory & Catalog Parsers ───────────────────────────────────────────────

function _cleanInventoryProductName(value = '') {
  return String(value || '')
    .replace(/^(?:هل|فيه|في|عايز\s+اعرف|عاوز\s+اعرف|ممكن\s+اعرف|ممكن|لو\s+سمحت)\s+/iu, '')
    .replace(/^(?:سعر|price)\s+/iu, '')
    .replace(/(?:مقاسات|المقاسات|مقاس(?!ات)|المقاس|size)\s*[:=]?\s*[\p{L}\p{N}._/-]+/giu, ' ')
    .replace(/(?:لون|اللون|color)\s*[:=]?\s*[^،,.؟?\n]+/giu, ' ')
    .replace(/\b(?:كام|بكام|ايه|إيه|منه|منها|available|price|sizes?)\b/giu, ' ')
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

// ─── Shipping & Order Lookup Parsers ──────────────────────────────────────────

function _parseOrderLookupParams(message = '') {
  const raw = _normalizeArabicDigits(_stripScenarioPrefix(message));
  const text = normalizeEvidenceText(raw);
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
  const normalizeLocation = value => normalizeEvidenceText(value).replace(/^ل+/, '').replace(/^ال/, '');
  const resolvedCleaned = cleaned
    ? EGYPT_LOCATION_HINTS.find(item => normalizeLocation(item) === normalizeLocation(cleaned))
    : null;
  const location = resolvedCleaned || cleaned || EGYPT_LOCATION_HINTS.find(item => new RegExp(`(?:^|\\s|،|,)${_escapeRegex(item)}(?:\\s|،|,|$)`, 'iu').test(normalized));
  return location ? { governorate: location } : null;
}

// ─── Inventory / Catalog Reply Builders ───────────────────────────────────────

function _buildInventoryCheckCustomerReply(result = {}, params = {}) {
  if (!result?.success) {
    const product = params.productNameOrSku ? ` "${params.productNameOrSku}"` : '';
    return `مش قادر أراجع توفر المنتج${product} حالياً: ${result.error || 'تعذر تنفيذ فحص المخزون'}.`;
  }

  const payload = result.result || {};
  if (payload.found === false) {
    return payload.message || `مش لاقي المنتج "${params.productNameOrSku || 'المطلوب'}" في الكتالوج الحالي.`;
  }

  const productName = payload.المنتج || params.productNameOrSku || 'المنتج';
  const sizeText = payload.المقاس_المطلوب ? ` مقاس ${payload.المقاس_المطلوب}` : '';
  const colorText = payload.اللون_المطلوب ? ` لون ${payload.اللون_المطلوب}` : '';
  if (payload.القيد_متاح === true) {
    return `${productName} متاح${sizeText}${colorText}. ${payload.نتيجة_القيد || ''}`.trim();
  }
  if (payload.القيد_متاح === false) {
    return `${productName}${sizeText}${colorText} غير متاح حالياً. ${payload.نتيجة_القيد || ''}`.trim();
  }

  const status = payload.الحالة ? `الحالة: ${payload.الحالة}` : null;
  const stock = payload.المخزون !== undefined && payload.المخزون !== null
    ? `المخزون الحالي: ${payload.المخزون}`
    : null;
  return `${productName}: ${[status, stock].filter(Boolean).join('، ') || 'تم العثور عليه في الكتالوج الحالي.'}`;
}

function _formatVariantList(items = [], key = '') {
  if (!Array.isArray(items) || !items.length) return '';
  return items
    .slice(0, 12)
    .map(item => {
      const label = item?.[key] || '';
      const state = item?.الحالة ? ` ${item.الحالة}` : '';
      const stock = item?.المخزون !== undefined && item?.المخزون !== null ? ` (${item.المخزون})` : '';
      return `${label}${state}${stock}`.trim();
    })
    .filter(Boolean)
    .join('، ');
}

function _buildCatalogProductCustomerReply(result = {}, params = {}) {
  if (!result?.success) return _buildInventoryCheckCustomerReply(result, params);
  const payload = result.result || {};
  if (payload.found === false) {
    return payload.message || `مش لاقي المنتج "${params.productNameOrSku || 'المطلوب'}" في الكتالوج الحالي.`;
  }

  const parts = [];
  const productName = payload.المنتج || params.productNameOrSku || 'المنتج';
  if (payload.السعر) parts.push(`${productName} سعره ${payload.السعر}`);
  const sizes = _formatVariantList(payload.المقاسات_المتاحة, 'المقاس');
  if (sizes) parts.push(`المقاسات المسجلة: ${sizes}`);
  const colors = _formatVariantList(payload.الألوان_المتاحة, 'اللون');
  if (colors) parts.push(`الألوان المسجلة: ${colors}`);
  if (!parts.length) return _buildInventoryCheckCustomerReply(result, params);
  return parts.join('. ');
}

function _buildOrderLookupCustomerReply(result = {}, params = {}) {
  const orderNumber = params.orderNumber || 'المطلوب';
  if (!result?.success) {
    return `مش قادر أراجع الطلب ${orderNumber} حالياً: ${result.error || 'تعذر تنفيذ فحص الطلب'}.`;
  }
  const payload = result.result || {};
  if (payload.found === false) {
    return payload.message || `مش لاقي طلب برقم ${orderNumber} في النظام الحالي. ابعت رقم الطلب أو رقم الموبايل للتأكد.`;
  }
  const items = Array.isArray(payload.items) && payload.items.length
    ? ` المنتجات: ${payload.items.map(item => `${item.name} × ${item.qty}`).join('، ')}.`
    : '';
  return `طلب ${payload.orderNumber || orderNumber} حالته الحالية ${payload.status || 'غير محددة'}، الدفع ${payload.paymentStatus || 'غير محدد'}، والإجمالي ${payload.total || 'غير محدد'}.${items}`;
}

function _buildShippingRatesCustomerReply(result = {}, params = {}) {
  const governorate = params.governorate || 'المحافظة المطلوبة';
  if (!result?.success) {
    return `مش قادر أراجع الشحن لـ ${governorate} حالياً: ${result.error || 'تعذر تنفيذ فحص الشحن'}.`;
  }
  const payload = result.result || {};
  if (payload.found === false) {
    return payload.message || `مش لاقي إعداد شحن محدد لـ ${governorate} حالياً.`;
  }
  return payload.message || `الشحن لـ ${payload.governorate || governorate}: ${payload.price || 'غير محدد'}، ومدة التوصيل ${payload.deliveryTime || 'غير محددة'}.`;
}

function _supportReplyForIntent(intent = '', handoffResult = {}) {
  const handoffDone = Boolean(handoffResult?.success && handoffResult?.result?.handoff);
  const prefix = handoffDone ? 'حوّلت المحادثة لفريق الدعم.' : 'هتابعها مع فريق الدعم.';
  if (intent === 'support.refund') {
    return `${prefix} طلب الاسترجاع أو استرداد الفلوس محتاج مراجعة بشرية قبل أي وعد. ابعت رقم الطلب ورقم الموبايل وسبب الاسترجاع.`;
  }
  if (intent === 'support.exchange') {
    return `${prefix} للتبديل ابعت رقم الطلب والمقاس المطلوب، والدعم هيأكد المتاح وأي فرق شحن قبل التنفيذ.`;
  }
  return `${prefix} آسف إن التجربة ما كانتش كويسة. ابعت رقم الطلب وصورة واضحة للمشكلة أو تفاصيل التأخير عشان الدعم يراجعها بدقة.`;
}

// ─── Order Location & Customer Name ───────────────────────────────────────────

function _extractOrderLocation(customerMessage = '') {
  const labeled = _extractLabeledOrderField(customerMessage, ['city', 'المدينة', 'المحافظة', 'العنوان', 'عنوان'])
    || _extractOrderFallback(customerMessage, /(?:المدينة|المحافظة|العنوان|عنوان)\s*[:=]?\s+([^،,.\n]+)/iu);
  if (labeled) return labeled;
  const matched = EGYPT_LOCATION_HINTS.find(location => new RegExp(`(?:^|\\s|،|,)${_escapeRegex(location)}(?:\\s|،|,|$)`, 'iu').test(customerMessage));
  return matched || '';
}

function _cleanOrderCustomerName(value = '') {
  return String(value || '')
    .replace(/\+?\d[\d\s-]{7,}\d[\s\S]*$/u, '')
    .replace(/\s+(?:منتج|المنتج|product|السعر|سعر|price|الكمية|كميه|quantity|qty)\b[\s\S]*$/iu, '')
    .trim();
}

function _parseOrderDraftParams(message = '', options = {}) {
  const requirePrice = options.requirePrice !== false;
  const raw = String(message || '');
  const customerMessage = _customerMessageSlice(raw);
  const productName = _extractOrderProductName(raw, customerMessage);
  const customerName = _cleanOrderCustomerName(
    _extractLabeledOrderField(raw, ['customerName', 'customer name', 'اسم العميل', 'العميل'])
      || _extractOrderFallback(customerMessage, /(?:اسمي|اسمى|أنا\s+اسمي|انا\s+اسمي)\s+(.+?)(?=\s+(?:رقمي|رقمى|رقم|هاتف|الموبايل|المحافظة|المدينة|العنوان|عنوان|،|,|\.|$))/iu)
      || _extractOrderFallback(raw, /(?:للعميل|العميل|اسم العميل)\s+(.+?)(?=\s+(?:\+?\d[\d\s-]{7,}|رقم العميل|هاتف العميل|phone|منتج|المنتج|السعر|سعر|الكمية|كميه|$))/iu)
  );
  const customerPhone = _extractOrderFallback(customerMessage, /(?:رقمي|رقمى|رقم|هاتف|موبايل|تليفون|phone)\s*[:=]?\s*(\+?\d[\d\s-]{7,}\d)/iu)
    || _extractLabeledOrderField(raw, ['customerPhone', 'customer phone', 'هاتف العميل', 'رقم العميل', 'رقم الموبايل', 'phone'])
    || (customerMessage.match(/\+?\d[\d\s-]{7,}\d/u)?.[0] || raw.match(/\+?\d[\d\s-]{7,}\d/u)?.[0] || '').trim();
  const productPrice = _extractOrderPrice(raw);
  const quantity = _parseQuantityValue(
    _extractLabeledOrderField(raw, ['quantity', 'qty', 'الكمية', 'كمية', 'كميه', 'عدد'])
      || _extractOrderFallback(customerMessage, /(?:الكمية|كمية|كميه|عدد|quantity|qty)\s*[:=]?\s*([٠-٩۰-۹\d]+|واحد|واحدة|واحده|اتنين|اثنين|تنتين|ثلاثة|ثلاثه|تلاتة|تلاته)/iu)
      || _extractOrderFallback(customerMessage, /(?:أوردر|اوردر|طلب|عايز|عاوز|هات|اخد|أخد)\s+(واحد|واحدة|واحده|اتنين|اثنين|تنتين|ثلاثة|ثلاثه|تلاتة|تلاته|[٠-٩۰-۹\d]+)/iu)
  );
  if (!productName || (requirePrice && productPrice === undefined) || !customerName || !customerPhone) return null;

  const productColor = _extractLabeledOrderField(raw, ['productColor', 'product color', 'اللون'])
    || _extractOrderFallback(customerMessage, /(?:لون|اللون)\s*[:=]?\s+([^،,.\n]+)/iu);
  const productSize = _extractLabeledOrderField(raw, ['productSize', 'product size', 'المقاس', 'مقاس'])
    || _extractOrderFallback(customerMessage, /(?:مقاس|المقاس|size)\s*[:=]?\s*([٠-٩۰-۹\dA-Za-z-]+)/iu);
  const city = _extractOrderLocation(customerMessage);
  const notes = _extractLabeledOrderField(raw, ['notes', 'ملاحظات']);
  const conversationId = _extractLabeledOrderField(raw, ['conversationId', 'conversation id']);
  const customerId = _extractLabeledOrderField(raw, ['customerId', 'customer id']);

  return {
    ...(conversationId ? { conversationId } : {}),
    ...(customerId ? { customerId } : {}),
    productName,
    ...(productColor ? { productColor } : {}),
    ...(productSize ? { productSize } : {}),
    ...(productPrice !== undefined ? { productPrice } : {}),
    ...(quantity !== undefined ? { quantity: Math.max(1, Math.floor(quantity)) } : { quantity: 1 }),
    customerName,
    customerPhone,
    ...(city ? { city } : {}),
    ...(notes ? { notes } : {}),
  };
}

// ─── Agent Run Task Parser ─────────────────────────────────────────────────────

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

// ─── Exports ───────────────────────────────────────────────────────────────────

module.exports = {
  SKILL_FIELD_LABELS,
  ORDER_DRAFT_FIELD_LABELS,
  EGYPT_LOCATION_HINTS,
  QUANTITY_WORDS,
  _escapeRegex,
  _normalizeArabicDigits,
  _stripScenarioPrefix,
  _normalizeNumberText,
  _parseNumberField,
  _parseQuantityValue,
  _extractLabeledSkillField,
  _splitSkillList,
  _parseAllowedTools,
  _parseSkillCreateParams,
  _extractLabeledOrderField,
  _extractOrderFallback,
  _customerMessageSlice,
  _cleanOrderProductName,
  _extractOrderProductName,
  _extractOrderPrice,
  _extractProductSearchPrice,
  _getOrderDraftPayload,
  _isSuccessfulOrderDraftResult,
  _formatOrderDraftProductSummary,
  _buildOrderDraftCustomerReply,
  _buildOrderDraftFailureReply,
  _buildMissingOrderPriceReply,
  _buildDeterministicLLMResult,
  _cleanInventoryProductName,
  _extractCatalogProductCandidate,
  _extractInventoryProductCandidate,
  _parseInventoryCheckParams,
  _parseOrderLookupParams,
  _parseShippingRateParams,
  _buildInventoryCheckCustomerReply,
  _formatVariantList,
  _buildCatalogProductCustomerReply,
  _buildOrderLookupCustomerReply,
  _buildShippingRatesCustomerReply,
  _supportReplyForIntent,
  _extractOrderLocation,
  _cleanOrderCustomerName,
  _parseOrderDraftParams,
  _parseAgentRunTaskParams,
};
