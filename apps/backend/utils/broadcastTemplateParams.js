/**
 * 🆕 PRODUCTION-FIX (broadcast template params):
 * Meta Cloud API rejects a template send with (#132000) "Number of parameters does
 * not match the expected number of params" when the body params count differs from
 * the template's {{N}} placeholder count. The legacy broadcast code always sent
 * firstName/lastName (max 2) which failed for every template with >2 variables.
 *
 * These pure helpers derive the expected parameter count from the template BODY text
 * and build exactly that many params, padded with customer data.
 */

/**
 * يستخرج عدد المعاملات المتوقعة من نص body قالب ميتا (أقصى فهرس {{N}}).
 *
 * @param {string} templateBodyText - نص body القالب (فيه {{1}} {{2}} ...)
 * @returns {number}
 */
function countTemplateParams(templateBodyText) {
  const matches = (templateBodyText || '').match(/\{\{\s*\d+\s*\}\}/g) || [];
  let max = 0;
  for (const m of matches) {
    const n = parseInt(m.replace(/\D/g, ''), 10);
    if (n > max) max = n;
  }
  return max;
}

/**
 * يبني bodyParams لتطابق عدد معاملات القالب، معبأة ببيانات العميل المتاحة.
 *
 * @param {string} templateBodyText - نص body قالب ميتا
 * @param {Object} customer - بيانات العميل (firstName/lastName/phone)
 * @returns {{type: string, text: string}[]} — مصفوفة فارغة لو القالب بلا متغيرات
 */
function buildBroadcastBodyParams(templateBodyText, customer = {}) {
  const paramCount = countTemplateParams(templateBodyText);
  if (paramCount === 0) return [];

  const fullName =
    `${customer.firstName || ''} ${customer.lastName || ''}`.trim() ||
    'عزيزي العميل';

  const fallbackValues = [
    customer.firstName || 'عزيزي العميل',
    customer.lastName || '',
    customer.phone || '',
    fullName,
  ];

  const bodyParams = [];
  for (let i = 0; i < paramCount; i++) {
    let val = fallbackValues[i];
    if (val === undefined || val === '') val = `قيمة ${i + 1}`;
    // ميتا ترفض الأسطر الجديدة داخل معاملات body القالب (#132018/#131008)
    bodyParams.push({ type: 'text', text: String(val).replace(/\r?\n/g, ' ') });
  }
  return bodyParams;
}

module.exports = {
  countTemplateParams,
  buildBroadcastBodyParams,
};
