/**
 * Unified Shipping Financial Utilities
 * معالجة المبالغ والتحصيلات للشحن الموحد لجميع الشركات
 */

/**
 * حساب المبلغ الصافي الواجب تحصيله عند الاستلام (COD)
 * يراعي:
 * 1. هل الطلب مدفوع إلكترونياً أو محفظة (Prepaid) -> 0 ج.م لمنع التحصيل المزدوج.
 * 2. هل حالة الدفع PAID أو COMPLETED -> 0 ج.م.
 * 3. هل تم دفع عربون مسبقاً (COD Deposit) -> يتم خصمه من الإجمالي.
 *
 * @param {Object} order - كائن الطلب من قاعدة البيانات أو الشحنة
 * @returns {number} المبلغ الصافي المطلوب تحصيله (>= 0)
 */
function calculateCollectableCodAmount(order) {
  if (!order || typeof order !== 'object') {
    return 0;
  }

  const method = String(order.paymentMethod || '').trim().toUpperCase();
  const status = String(order.paymentStatus || '').trim().toUpperCase();

  // 1. فحص هل الأوردر مسدد إلكترونياً أو تم دفعه بالكامل
  const isPrepaid =
    ['PAID', 'COMPLETED'].includes(status) ||
    [
      'CREDIT_CARD',
      'CARD',
      'ONLINE',
      'WALLET',
      'FAWRY',
      'INSTAPAY',
      'PREPAID',
      'KASHIER',
      'VODAFONE_CASH',
      'ORANGE_CASH',
      'ETISALAT_CASH',
      'WE_PAY',
    ].includes(method);

  if (isPrepaid) {
    return 0;
  }

  // 2. استخراج إجمالي الطلب بأمان
  let total = 0;
  if (order.total !== undefined && order.total !== null) {
    total = Number(order.total);
  } else if (order.totalAmount !== undefined && order.totalAmount !== null) {
    total = Number(order.totalAmount);
  } else if (order.grandTotal !== undefined && order.grandTotal !== null) {
    total = Number(order.grandTotal);
  }

  if (isNaN(total) || total <= 0) {
    return 0;
  }

  // 3. خصم العربون إن وجد وكان مسدداً
  const depositPaid = Boolean(order.codDepositPaid);
  const depositAmount = Number(order.codDepositAmount || 0);

  if (depositPaid && !isNaN(depositAmount) && depositAmount > 0) {
    total = Math.max(0, total - depositAmount);
  }

  return Number(total.toFixed(2));
}

module.exports = {
  calculateCollectableCodAmount,
};
