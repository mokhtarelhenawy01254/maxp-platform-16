/**
 * @module orderDraftEngine
 * @description Extracts and manages the complex order draft creation flow, price lookup, and parameter extraction.
 */

const ORDER_DRAFT_FIELD_LABELS = [
  // arabic-strings: internal-signal-start
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
  // arabic-strings: internal-signal-end
];

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
// arabic-strings: internal-signal-end

function _escapeRegex(value = '') {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function _isCustomerChannelContext(context = {}) {
  if (context.isCustomerReplyChannel === true) return true;
  const channel = String(context.channel || context.intentContext?.channel || '').trim().toUpperCase();
  return CUSTOMER_CHANNELS.has(channel);
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

function _extractLabeledOrderField(message = '', labels = []) {
  const source = String(message || '');
  const targetPattern = labels.map(_escapeRegex).join('|');
  const allLabelsPattern = ORDER_DRAFT_FIELD_LABELS.map(_escapeRegex).join('|');
  // arabic-strings: internal-signal-start
  const pattern = new RegExp(
    `(?:^|[\\s.،؛])(?:${targetPattern})\\s*[:：]?\\s*([\\s\\S]*?)(?=(?:[\\s.،؛]+(?:${allLabelsPattern})\\s*[:：]?)|$)`,
    'iu'
  );
  // arabic-strings: internal-signal-end
  const match = source.match(pattern);
  if (!match?.[1]) return '';
  return match[1].replace(/[.،؛\s]+$/u, '').trim();
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
  const text = _normalizeEvidenceText(value);
  const numeric = _parseNumberField(value);
  if (numeric !== undefined) return numeric;
  for (const [word, amount] of Object.entries(QUANTITY_WORDS)) {
    if (new RegExp(`(?:^|\\s)${_escapeRegex(word)}(?:\\s|$)`, 'iu').test(text)) {
      return amount;
    }
  }
  return undefined;
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
  // arabic-strings: internal-signal-start
  const labeled = _extractLabeledOrderField(raw, ['productName', 'product name', 'اسم المنتج', 'المنتج'])
    || _extractOrderFallback(raw, /(?:منتج|المنتج|product)\s+(.+?)(?=\s+(?:السعر|سعر|price|الكمية|كميه|quantity|qty|العميل|اسم العميل|رقم العميل|هاتف العميل|phone|المدينة|المحافظة|المقاس|مقاس|اللون|$))/iu);
  // arabic-strings: internal-signal-end
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
  // arabic-strings: internal-signal-start
  const labeled = _extractLabeledOrderField(raw, ['productPrice', 'product price', 'السعر', 'سعر', 'price'])
    || _extractOrderFallback(raw, /(?:السعر|سعر|price)\s*[:=]?\s*([٠-٩۰-۹\d]+(?:[.,][٠-٩۰-۹\d]+)?)/iu);
  // arabic-strings: internal-signal-end
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

  const wanted = _normalizeEvidenceText(productName);
  const matched = products.find((product) => {
    const name = _normalizeEvidenceText(product.name || product.productName || product.title || '');
    return name && wanted && (name.includes(wanted) || wanted.includes(name));
  }) || (products.length === 1 ? products[0] : null);

  if (!matched) return undefined;
  return _parseNumberField(
    matched.productPrice ||
    matched.price ||
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

function _extractOrderLocation(customerMessage = '') {
  // arabic-strings: internal-signal-start
  const labeled = _extractLabeledOrderField(customerMessage, ['city', 'المدينة', 'المحافظة', 'العنوان', 'عنوان'])
    || _extractOrderFallback(customerMessage, /(?:المدينة|المحافظة|العنوان|عنوان)\s*[:=]?\s+([^،,.\n]+)/iu);
  if (labeled) return labeled;
  const matched = EGYPT_LOCATION_HINTS.find(location => new RegExp(`(?:^|\\s|،|,)${_escapeRegex(location)}(?:\\s|،|,|$)`, 'iu').test(customerMessage));
  // arabic-strings: internal-signal-end
  return matched || '';
}

function _cleanOrderCustomerName(value = '') {
  return String(value || '')
    .replace(/\+?\d[\d\s-]{7,}\d[\s\S]*$/u, '')
    .replace(/\s+(?:منتج|المنتج|product|السعر|سعر|price|الكمية|كميه|quantity|qty)\b[\s\S]*$/iu, '')
    .trim();
}

function _parseOrderDraftParams(message = '', options = {}) {
  if (_isCustomerChannelContext(options)) return null;

  const requirePrice = options.requirePrice !== false;
  const raw = String(message || '');
  const customerMessage = _customerMessageSlice(raw);
  const productName = _extractOrderProductName(raw, customerMessage);
  // arabic-strings: internal-signal-start
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
  // arabic-strings: internal-signal-end
  if (!productName || (requirePrice && productPrice === undefined) || !customerName || !customerPhone) return null;

  // arabic-strings: internal-signal-start
  const productColor = _extractLabeledOrderField(raw, ['productColor', 'product color', 'اللون'])
    || _extractOrderFallback(customerMessage, /(?:لون|اللون)\s*[:=]?\s+([^،,.\n]+)/iu);
  const productSize = _extractLabeledOrderField(raw, ['productSize', 'product size', 'المقاس', 'مقاس'])
    || _extractOrderFallback(customerMessage, /(?:مقاس|المقاس|size)\s*[:=]?\s*([٠-٩۰-۹\dA-Za-z-]+)/iu);
  const city = _extractOrderLocation(customerMessage);
  const notes = _extractLabeledOrderField(raw, ['notes', 'ملاحظات']);
  // arabic-strings: internal-signal-end
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

module.exports = {
  _parseOrderDraftParams,
  _isCustomerChannelContext,
  _extractProductSearchPrice,
  _isSuccessfulOrderDraftResult,
  _getOrderDraftPayload,
};
