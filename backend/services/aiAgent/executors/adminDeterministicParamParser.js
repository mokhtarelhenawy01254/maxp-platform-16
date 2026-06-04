/**
 * @module adminDeterministicParamParser
 * @description Legacy deterministic parameter parsing for merchant/admin/internal channels only.
 *
 * Customer-facing channels must use LLM structured classification for intent and
 * slots. Every public parser in this module accepts a context and returns null
 * for Facebook, Messenger, and WhatsApp.
 */

const CUSTOMER_CHANNELS = new Set(['FACEBOOK', 'MESSENGER', 'FB', 'WHATSAPP', 'WA']);

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
// arabic-strings: internal-signal-end

function _isCustomerChannelContext(context = {}) {
  if (context.isCustomerReplyChannel === true) return true;
  const channel = String(context.channel || context.intentContext?.channel || '').trim().toUpperCase();
  return CUSTOMER_CHANNELS.has(channel);
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

function _parseInventoryCheckParams(message = '', context = {}) {
  if (_isCustomerChannelContext(context)) return null;

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

function _parseOrderLookupParams(message = '', context = {}) {
  if (_isCustomerChannelContext(context)) return null;

  const raw = _normalizeArabicDigits(_stripScenarioPrefix(message));
  const text = _normalizeEvidenceText(raw);
  const rawFallback = raw.match(/\b(?:ORD-\d{3,}-\d{2,}|[A-Z]{2,}[-_]\d{2,}|\d{3,})\b/iu);
  const labeled = text.match(/(?:رقم\s*(?:الطلب|الاوردر)|اوردر|طلب|order)\s*[:#-]?\s*([a-z]{2,}[-_]\d{2,}|ord-\d{3,}-\d{2,}|\d{3,})/iu);
  const orderNumber = (rawFallback?.[0] || labeled?.[1] || '').trim();
  return orderNumber ? { orderNumber } : null;
}

function _parseShippingRateParams(message = '', context = {}) {
  if (_isCustomerChannelContext(context)) return null;

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

module.exports = {
  _isCustomerChannelContext,
  _normalizeArabicDigits,
  _stripScenarioPrefix,
  _normalizeEvidenceText,
  _cleanInventoryProductName,
  _extractCatalogProductCandidate,
  _extractInventoryProductCandidate,
  _parseInventoryCheckParams,
  _parseOrderLookupParams,
  _parseShippingRateParams,
  _periodFromMessage,
};
