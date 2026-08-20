/**
 * Turbo Shipment Validator Utilities
 * دوال التحقق من صحة بيانات الشحنة قبل الإرسال لـ Turbo
 */

function validateOrderForTurbo(order, orderData) {
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
  if (!rawAddress || rawAddress.length < 4 || rawAddress.toLowerCase().includes('undefined')) {
    missingFields.push('عنوان الشحن ناقص أو غير تفصيلي');
    suggestions.push('يرجى كتابة الشارع والمنطقة واسم المبنى تفصيلياً');
  }

  const gov = (orderData.governorate || orderData.city || order.city || '').toString().trim();
  if (!gov || gov.length < 2) {
    missingFields.push('المحافظة أو المدينة غير محددة');
    suggestions.push('يرجى اختيار المحافظة والمدينة المطلوبة لشحن تربو');
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
      message: `عفواً، لا يمكن إرسال الشحنة لتربو لأن بيانات الطلب غير مكتملة (${missingFields.length} أخطاء).`
    };
  }

  return { isValid: true };
}

module.exports = {
  validateOrderForTurbo
};
