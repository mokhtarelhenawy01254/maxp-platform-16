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

// أسماء المتغيرات الخاصة بالطلبات — ممنوع تعبئتها باسم العميل/لقبه
const ORDER_VARIABLE_NAMES = new Set([
  'ordernumber', 'orderitems', 'orderdate', 'subtotal', 'shipping', 'total',
  'currency', 'trackingnumber', 'trackinglink', 'estimateddays', 'reason',
  'productimage', 'status',
]);

/**
 * هل يحتوي ترتيب متغيرات قالب محلي على متغيرات طلب؟
 * لو آه → نجلب أحدث طلب للعميل قبل تعبئة البارامز.
 *
 * @param {{position: number, name: string}[]} localVariables
 * @returns {boolean}
 */
function hasOrderVariables(localVariables) {
  if (!Array.isArray(localVariables)) return false;
  return localVariables.some((v) => {
    const n = String(v?.name || '').toLowerCase().replace(/[^a-z]/g, '');
    return ORDER_VARIABLE_NAMES.has(n) || n.startsWith('order') || n.includes('orderitem');
  });
}

/**
 * يُحل قيمة متغير محلي حسب اسمه من بيانات العميل وأحدث طلب (إن وُجد).
 * يعالج متغيرات العميل (customerName/firstName/customerPhone...) و متغيرات
 * الطلب (orderNumber/total/status...) — حتى لا يُرسَل اسم العميل أو لقبه
 * في خانة رقم الطلب (مشكلة قالب deliveredmsj72rwc وقت البث الجماعي).
 *
 * @param {string} name - اسم المتغير المحلي (مثال: orderNumber)
 * @param {Object} customer - بيانات العميل (firstName/lastName/phone)
 * @param {Object|null} order - أحدث طلب للعميل (مشروحات الحقول اختيارية)
 * @returns {string}
 */
function resolveBroadcastVariableValue(name, customer = {}, order = null) {
  const n = String(name || '').toLowerCase();
  const fullName = `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'عزيزي العميل';

  if (n === 'fullname' || n === 'customerfullname') return fullName;
  if (n === 'firstname' || n === 'customerfirstname') return customer.firstName || 'عزيزي العميل';
  if (n === 'lastname' || n === 'customerlastname') return customer.lastName || '';
  if (n.includes('phone') || n.includes('mobile')) return customer.phone || '';
  if (n.includes('customer') || n === 'name' || n.endsWith('name')) return fullName;

  if (order) {
    switch (n) {
      case 'ordernumber': return order.orderNumber || '';
      case 'total': return order.total != null ? String(order.total) : '';
      case 'subtotal': return order.subtotal != null ? String(order.subtotal) : '';
      case 'shipping': return order.shipping != null ? String(order.shipping) : '';
      case 'currency': return order.currency || 'EGP';
      case 'status': return order.statusLabel || order.status || '';
      case 'trackingnumber': return order.turboTrackingNumber || '';
      case 'trackinglink': return order.trackingLink || '';
      case 'orderdate': return order.orderDateLabel || '';
      case 'reason': return order.reason || '';
      case 'orderitems': return order.orderItemsText || '';
      default: return '';
    }
  }
  return '';
}

/**
 * يبني bodyParams لتطابق عدد معاملات القالب.
 *
 * 🚨 PRODUCTION-FIX (broadcast template semantics):
 * لما القالب مربوط بقالب محلي معروف المتغيرات (localVariables = [{position, name}]),
 * نعبّي كل موضع باسم متغيّره الصحيح (customerName→الاسم، orderNumber→رقم أحدث طلب...)
 * بدل التعبئة العشوائية [firstName, lastName, phone, fullName] التي كانت تضع
 * اسم العميل في خانة رقم الطلب (مثال حقيقي: deliveredmsj72rwc).
 *
 * @param {string} templateBodyText - نص body قالب ميتا
 * @param {Object} customer - بيانات العميل (firstName/lastName/phone)
 * @param {{position: number, name: string}[]|null} [localVariables] - ترتيب متغيرات القالب المحلي
 * @param {Object|null} [order] - أحدث طلب للعميل (لمتغيرات الطلب)
 * @returns {{type: string, text: string}[]} — مصفوفة فارغة لو القالب بلا متغيرات
 */
function buildBroadcastBodyParams(templateBodyText, customer = {}, localVariables = null, order = null) {
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

  const hasLocalMapping = Array.isArray(localVariables) && localVariables.length > 0;

  const bodyParams = [];
  for (let i = 0; i < paramCount; i++) {
    let val;
    if (hasLocalMapping) {
      const def = localVariables.find((v) => Number(v.position) === i + 1);
      val = def ? resolveBroadcastVariableValue(def.name, customer, order) : fallbackValues[i];
    } else {
      val = fallbackValues[i];
    }
    if (val === undefined || val === null || val === '') val = `قيمة ${i + 1}`;
    // ميتا ترفض الأسطر الجديدة داخل معاملات body القالب (#132018/#131008)
    bodyParams.push({ type: 'text', text: String(val).replace(/\r?\n/g, ' ') });
  }
  return bodyParams;
}

/**
 * يستخرج تنسيق HEADER من تعريف قالب ميتا (listTemplates).
 * Meta template components للـ HEADER: { type: 'HEADER', format: 'IMAGE'|'VIDEO'|'DOCUMENT'|'TEXT', ... }
 *
 * @param {object} templateDef - عنصر من MetaCloudProvider.listTemplates
 * @returns {{format: string, hasMedia: boolean}|null}
 */
function getTemplateHeaderFormat(templateDef) {
  if (!templateDef?.components || !Array.isArray(templateDef.components)) return null;
  const header = templateDef.components.find(c => String(c.type).toUpperCase() === 'HEADER');
  if (!header) return null;
  const format = String(header.format || 'TEXT').toUpperCase();
  return {
    format,
    hasMedia: format !== 'TEXT'
  };
}

/**
 * يبني header component مع معامل وسائط (image/video/document) للإرسال —
 * يدعم صورة/وسيطاً مختلفاً لكل رسالة عبر media id أو رابط HTTPS عام.
 *
 * @param {string} media - media id (من Resumable/Media API) أو رابط HTTPS
 * @param {string} kind - 'image' | 'video' | 'document' (يُستنتج من header format لو غائب)
 * @returns {object|null} component بصيغة ميتا، أو null لو مفيش وسيط
 */
function buildBroadcastHeaderParams(media, kind = 'image') {
  if (!media) return null;

  const normalizedKind = String(kind).toLowerCase();
  const validKinds = ['image', 'video', 'document'];
  const type = validKinds.includes(normalizedKind) ? normalizedKind : 'image';

  const mediaObj = /^https?:\/\//i.test(media)
    ? { link: media }
    : { id: media };

  return {
    type: 'header',
    parameters: [
      {
        type,
        [type]: mediaObj
      }
    ]
  };
}

module.exports = {
  countTemplateParams,
  buildBroadcastBodyParams,
  hasOrderVariables,
  resolveBroadcastVariableValue,
  getTemplateHeaderFormat,
  buildBroadcastHeaderParams,
};
