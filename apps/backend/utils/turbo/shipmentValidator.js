/**
 * Turbo Shipment Validator Utilities
 * دوال التحقق من صحة واكتمال بيانات الشحنة قبل الإرسال لـ Turbo
 * تمنع إرسال أي أوردر ناقص المحافظة أو المدينة لتجنب استقباله كـ "غير مكتمل" (كود 99 / 18)
 */

const { getTurboGovernorateName, isUnspecified, normalizeArabic } = require('./governorateMapper');

function validateOrderForTurbo(order = {}, orderData = {}) {
  const missingFields = [];
  const suggestions = [];

  const cleanName = (orderData.customerName || order.customerName || '').trim();
  if (!cleanName || cleanName === 'Unknown' || cleanName.length < 2) {
    missingFields.push('اسم العميل ناقص أو غير مكتمل');
    suggestions.push('يرجى كتابة اسم العميل كاملاً في تفاصيل الطلب');
  }

  const cleanPhone = (orderData.customerPhone || order.customerPhone || '').replace(/\D/g, '');
  if (!cleanPhone || cleanPhone.length < 10) {
    missingFields.push('رقم تليفون العميل ناقص أو غير صحيح (يلزم 10-11 رقم)');
    suggestions.push('يرجى إدخال رقم تليفون صحيح ومكتمل للعميل');
  }

  const rawAddress = (orderData.shippingAddress || orderData.customerAddress || order.shippingAddress || order.customerAddress || '').toString().trim();
  const nRawAddress = normalizeArabic(rawAddress);
  if (!rawAddress || rawAddress.length < 4 || nRawAddress.includes('undefined') || ['test', 'لا يوجد', 'بدون'].includes(nRawAddress)) {
    missingFields.push('عنوان الشحن ناقص أو غير تفصيلي');
    suggestions.push('يرجى كتابة الشارع والمنطقة واسم المبنى تفصيلياً');
  }

  // فحص واستنتاج المحافظة بدقة
  const rawGov = (orderData.governorate || order.governorate || '').toString().trim();
  const rawCity = (orderData.city || order.city || '').toString().trim();
  
  let resolvedGov = null;
  if (!isUnspecified(rawGov)) {
    resolvedGov = getTurboGovernorateName(rawGov, rawCity, rawAddress);
  }
  if (!resolvedGov && !isUnspecified(rawCity)) {
    resolvedGov = getTurboGovernorateName(rawCity, '', rawAddress);
  }
  if (!resolvedGov && rawAddress) {
    resolvedGov = getTurboGovernorateName('', rawCity, rawAddress);
  }

  if (!resolvedGov || isUnspecified(resolvedGov)) {
    missingFields.push('المحافظة غير محددة أو غير مدعومة لشحن تربو');
    suggestions.push('يرجى اختيار المحافظة والمنطقة الصحيحة لتوجيه الشحنة لفرع تربو المناسب');
  }

  const items = orderData.items || order.orderItems || order.items || [];
  if (!Array.isArray(items) || items.length === 0) {
    missingFields.push('قائمة أصناف المنتجات فارغة');
    suggestions.push('أضف منتجاً واحداً على الأقل للطلب قبل إرساله للشحن');
  }

  if (missingFields.length > 0) {
    return {
      isValid: false,
      missingFields,
      suggestions,
      resolvedGovernorate: resolvedGov || null,
      message: `عفواً، لا يمكن إرسال الشحنة لتربو لأن بيانات الطلب غير مكتملة (${missingFields.join('، ')}).`
    };
  }

  const result = { isValid: true };
  Object.defineProperty(result, 'resolvedGovernorate', {
    value: resolvedGov,
    enumerable: false,
    writable: true,
    configurable: true
  });
  return result;
}

module.exports = {
  validateOrderForTurbo
};
