/**
 * 🚗 Helper: Format Order Items for WhatsApp Messages & Notifications
 * يستخرج مواصفات المنتجات بدقة (نوع وموديل وسنة صنع السيارة، النوع، عدد القطع، اللون، المقاس)
 * لضمان وصول تفاصيل وموديل السيارة للعميل في رسائل واتساب (إنشاء الطلب، تأكيد الطلب، وتفاصيل الطلب).
 */

/**
 * استخراج موديل السيارة من ملاحظات الطلب
 */
function extractCarModelFromNotes(notes) {
  if (!notes || typeof notes !== 'string') return null;
  const patterns = [
    /(?:نوع\s*وموديل\s*وسنة\s*صنع\s*السيارة|نوع\s*وموديل\s*السيارة|موديل\s*السيارة|نوع\s*السيارة|موديل\s*العربية|نوع\s*العربية)\s*:\s*([^\n\r]+)/i,
    /(?:car[_\s-]?model|vehicle[_\s-]?model)\s*:\s*([^\n\r]+)/i
  ];
  for (const pattern of patterns) {
    const match = notes.match(pattern);
    if (match && match[1]) {
      const val = match[1].trim();
      if (val && val !== '-' && val !== 'لا يوجد') return val;
    }
  }
  return null;
}

/**
 * استخراج موديل السيارة لمنتج معين
 */
function extractCarModel(item, order, notesCarModelFallback = null) {
  if (!item) return notesCarModelFallback || null;

  let meta = {};
  if (typeof item.metadata === 'string') {
    try { meta = JSON.parse(item.metadata); } catch (_) {}
  } else if (item.metadata && typeof item.metadata === 'object') {
    meta = item.metadata;
  }

  const attributeValues = (meta && typeof meta.attributeValues === 'object' && meta.attributeValues)
    || (meta && typeof meta.attributes === 'object' && meta.attributes)
    || (item.attributes && typeof item.attributes === 'object' && !Array.isArray(item.attributes) ? item.attributes : {})
    || {};

  // 1. Direct or attributeValues keys
  const carKeys = [
    'car_model',
    'carModel',
    'car-model',
    'موديل_السيارة',
    'نوع_السيارة',
    'نوع وموديل وسنة صنع السيارة',
    'نوع وموديل السيارة',
    'موديل السيارة',
    'نوع السيارة',
    'موديل العربية',
    'نوع العربية'
  ];

  for (const k of carKeys) {
    if (attributeValues[k] && typeof attributeValues[k] === 'string' && attributeValues[k].trim()) {
      return attributeValues[k].trim();
    }
    if (meta[k] && typeof meta[k] === 'string' && meta[k].trim()) {
      return meta[k].trim();
    }
    if (item[k] && typeof item[k] === 'string' && item[k].trim()) {
      return item[k].trim();
    }
  }

  // 2. Dynamic check on any key containing car / سيار / موديل
  for (const [k, v] of Object.entries(attributeValues)) {
    if (!v || typeof v !== 'string' || !v.trim()) continue;
    const lower = k.toLowerCase();
    if (lower.includes('car_model') || lower.includes('carmodel') || lower.includes('موديل') || (lower.includes('سيار') && !lower.includes('ستائر'))) {
      return v.trim();
    }
  }

  // 3. Array attributes check
  if (Array.isArray(item.attributes)) {
    const found = item.attributes.find(a => {
      const k = String(a.key || a.name || a.label || '').toLowerCase();
      return k.includes('car') || k.includes('سيار') || k.includes('موديل');
    });
    if (found && (found.value || found.val)) {
      const val = String(found.value || found.val).trim();
      if (val) return val;
    }
  }

  // 4. Fallback to order notes
  return notesCarModelFallback || extractCarModelFromNotes(order?.notes || order?.customerNotes);
}

/**
 * تنسيق تفاصيل عنصر واحد من عناصر الطلب لرسائل واتساب
 */
function formatSingleOrderItem(item, index, order, notesCarModelFallback = null) {
  if (!item) return '';

  let meta = {};
  if (typeof item.metadata === 'string') {
    try { meta = JSON.parse(item.metadata); } catch (_) {}
  } else if (item.metadata && typeof item.metadata === 'object') {
    meta = item.metadata;
  }

  const attributeValues = (meta && typeof meta.attributeValues === 'object' && meta.attributeValues)
    || (meta && typeof meta.attributes === 'object' && meta.attributes)
    || (item.attributes && typeof item.attributes === 'object' && !Array.isArray(item.attributes) ? item.attributes : {})
    || {};

  // 1. موديل السيارة
  const carModel = extractCarModel(item, order, notesCarModelFallback);

  // 2. نوع الستارة / المنتج (جرار / ثابت / نوع مخصص)
  const typeVal = attributeValues['النوع'] || attributeValues['Type'] || attributeValues.type || null;

  // 3. عدد القطع
  const piecesVal = attributeValues['عدد_القطع'] || attributeValues['Pieces'] || attributeValues.pieces || null;

  // 4. اللون والمقاس الخام
  const rawColor = item.productColor || item.color || attributeValues['اللون'] || attributeValues['Color'] || attributeValues.color || null;
  const rawSize = item.productSize || item.size || attributeValues['المقاس'] || attributeValues['Size'] || attributeValues.size || null;

  // تمييز ما إذا كان "اللون" هو في الواقع نوع الستارة (مثل جرار / ثابت)
  const isCurtainType = rawColor === 'جرار' || rawColor === 'ثابت';
  const curtainType = typeVal || (isCurtainType ? rawColor : null);
  const colorDisplay = isCurtainType ? null : rawColor;

  // تمييز ما إذا كان "المقاس" هو في الواقع عدد القطع للستارة
  const isPiecesCount = piecesVal != null || (isCurtainType && rawSize != null);
  const piecesDisplay = piecesVal || (isCurtainType ? rawSize : null);
  const sizeDisplay = isPiecesCount ? null : rawSize;

  let itemDetails = `${index + 1}. ${item.product?.name || item.productName || item.name || 'منتج'}`;

  if (carModel) {
    itemDetails += ` | نوع وموديل السيارة: ${carModel}`;
  }
  if (curtainType) {
    itemDetails += ` | النوع: ${curtainType}`;
  }
  if (colorDisplay) {
    itemDetails += ` | اللون: ${colorDisplay}`;
  }
  if (piecesDisplay) {
    itemDetails += ` | عدد القطع: ${piecesDisplay}`;
  }
  if (sizeDisplay) {
    itemDetails += ` | المقاس: ${sizeDisplay}`;
  }

  // إضافة أي مواصفات إضافية خاصة من attributeValues لم يتم تضمينها أعلاه
  const ignoredKeys = new Set([
    'النوع', 'type', 'عدد_القطع', 'pieces', 'اللون', 'color', 'colour', 'المقاس', 'size',
    'car_model', 'carmodel', 'نوع_السيارة', 'موديل_السيارة', 'نوع وموديل وسنة صنع السيارة',
    'نوع وموديل السيارة', 'موديل السيارة', 'نوع السيارة', 'image', 'baseprice', 'shippingclass'
  ]);

  if (attributeValues && typeof attributeValues === 'object') {
    for (const [k, v] of Object.entries(attributeValues)) {
      if (!v || typeof v !== 'string' || !v.trim()) continue;
      const cleanK = k.toLowerCase().replace(/[-_\s]/g, '');
      if (ignoredKeys.has(k) || ignoredKeys.has(cleanK)) continue;
      itemDetails += ` | ${k}: ${v.trim()}`;
    }
  }

  itemDetails += ` | الكمية: ${item.quantity || 1}`;
  return itemDetails;
}

/**
 * تجميع وتنسيق قائمة عناصر الطلب كاملة لنص رسالة واتساب
 */
function formatOrderItemsText(order, itemsSource = null) {
  const source = Array.isArray(itemsSource) && itemsSource.length > 0
    ? itemsSource
    : (Array.isArray(order?.orderItems) && order.orderItems.length > 0
      ? order.orderItems
      : (Array.isArray(order?.items) ? order.items : []));

  if (!source || source.length === 0) {
    return 'لا يوجد';
  }

  // استخراج موديل السيارة العام من ملاحظات الطلب إن وجد للاستخدام كـ fallback
  const notesCarModel = extractCarModelFromNotes(order?.notes || order?.customerNotes);

  let orderItemsText = '\n📋 تفاصيل الطلب:\n';
  source.forEach((item, index) => {
    const formatted = formatSingleOrderItem(item, index, order, notesCarModel);
    if (formatted) {
      orderItemsText += formatted + '\n';
    }
  });

  orderItemsText += '------------------------------\n';
  return orderItemsText;
}

module.exports = {
  extractCarModelFromNotes,
  extractCarModel,
  formatSingleOrderItem,
  formatOrderItemsText
};
