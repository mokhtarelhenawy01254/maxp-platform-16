/**
 * 🆕 PRODUCTION-FIX (notifications-fix-plan §5.2 — variable binding):
 * نواة ربط متغيرات قوالب ميتا — دوال نقية قابلة للاختبار.
 * - mapVariablesByOrder: يبني ترتيب متغيرات قالب ميتا من ترتيب ظهور {{name}}
 *   في القالب المحلي (بدل ترتيب هاردكود META_VARIABLE_ORDER).
 * - buildMetaBodyParams: يبني bodyParams لإرسال ميتا من variables أو من نص القالب.
 */

/**
 * يبني ترتيب المتغيرات لقالب ميتا بمطابقة ترتيب ظهور {{name}} في القالب المحلي
 * مع {{1}}, {{2}} في قالب ميتا.
 *
 * @param {string} localContent - نص القالب المحلي (فيه {{customerName}} إلخ)
 * @param {string} metaBodyText - نص body قالب ميتا (فيه {{1}} {{2}})
 * @returns {{position, name}[]}
 */
function mapVariablesByOrder(localContent, metaBodyText) {
  if (!localContent) return [];
  // استخراج {{name}} من القالب المحلي بالترتيب (مع إزالة التكرار)
  const localMatches = (localContent.match(/\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g) || []);
  const seen = new Set();
  const localOrder = [];
  for (const m of localMatches) {
    const name = m.replace(/\{\{|\}\}/g, '').trim();
    if (!seen.has(name)) { seen.add(name); localOrder.push(name); }
  }
  // عدد placeholders في ميتا
  const metaCount = ((metaBodyText || '').match(/\{\{\s*\d+\s*\}\}/g) || []).length;
  // نأخذ min(localOrder.length, metaCount) ونرقمها من 1
  const count = Math.min(localOrder.length, metaCount);
  const result = [];
  for (let i = 0; i < count; i++) {
    result.push({ position: i + 1, name: localOrder[i] });
  }
  return result;
}

/**
 * يستخرج المتغيرات {{name}} من نص قالب محلي بالترتيب (مع إزالة التكرار).
 *
 * @param {string} content - نص القالب المحلي
 * @returns {string[]} أسماء المتغيرات بالترتيب
 */
function extractLocalVariableOrder(content) {
  if (!content) return [];
  const seen = new Set();
  const order = [];
  const matches = (content.match(/\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g) || []);
  for (const m of matches) {
    const name = m.replace(/\{\{|\}\}/g, '').trim();
    if (!seen.has(name)) { seen.add(name); order.push(name); }
  }
  return order;
}

/**
 * يبني bodyParams لإرسال ميتا من ترتيب variables ({position, name}) أو —
 * لو غير متوفر — من نص القالب المحلي بنفس منطق mapVariablesByOrder.
 * المتغير الناقص في values يُساب نص فاضي (مش undefined).
 *
 * ⚠️ قيود Meta Cloud API على معاملات الـ template body:
 *  - ممنوع الأسطر الجديدة (\n) داخل قيمة المعامل.
 *  - الطول يختلف حسب اللغة/القالب (غالباً بحدود صارمة على الـ BODY params).
 *  نستبدل الأسطر الجديدة بمسافة/فاصلة حتى لا يرفض ميتا المعاملات
 *  بـ (#132018) / (#131008).
 *
 * @param {{position: number, name: string}[]|null} variablesOrder - ترتيب متغيرات القالب (JSON من DB)
 * @param {string|null} localContent - نص القالب المحلي (fallback)
 * @param {Object} values - قيم المتغيرات
 * @returns {{type: string, text: string}[]}
 */
function buildMetaBodyParams(variablesOrder, localContent, values = {}) {
  let orderedVars = variablesOrder;
  if (!orderedVars || orderedVars.length === 0) {
    const localNames = extractLocalVariableOrder(localContent);
    orderedVars = localNames.map((name, idx) => ({ position: idx + 1, name }));
  }

  return orderedVars.map(v => {
    let text = values[v.name] !== undefined && values[v.name] !== null ? String(values[v.name]) : '';
    // ميتا ترفض الـ newlines داخل معاملات body القالب — نستبدلها بمسافة.
    text = text.replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim();
    return { type: 'text', text };
  });
}

module.exports = {
  mapVariablesByOrder,
  extractLocalVariableOrder,
  buildMetaBodyParams,
};
