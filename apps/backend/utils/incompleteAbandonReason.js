/**
 * كشف السبب الحقيقي لعدم اكتمال السلة (Incomplete Cart) بناءً على
 * إشارات فعلية مسجلة في بيانات السلة نفسها — مش سبب افتراضي أو وهمي.
 */

const QUICK_EXIT_MINUTES = 2;

const NAME_KEYS = ['customerName', 'guestName', 'fullName', 'customerFullName', 'name'];
const CONTACT_KEYS = ['phone', 'guestPhone', 'customerPhone', 'phoneNumber', 'mobileNumber', 'mobile'];
const EMAIL_KEYS = ['email', 'guestEmail', 'customerEmail', 'emailAddress'];
const ADDRESS_KEYS = ['address', 'street', 'addressLine1'];
const GOVERNORATE_KEYS = ['governorate', 'gov'];
const CITY_KEYS = ['city'];
const PAYMENT_KEYS = ['paymentMethod', 'payment_method'];
const SHIPPING_KEYS = [...ADDRESS_KEYS, ...GOVERNORATE_KEYS, ...CITY_KEYS];

const firstValue = (obj, keys) => {
  if (!obj || typeof obj !== 'object') return '';
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (value !== undefined && value !== null) return String(value).trim();
  }
  return '';
};

const parseJsonObject = (value) => {
  if (!value) return null;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
      return null;
    }
  }
  return typeof value === 'object' ? value : null;
};

/**
 * يستخرج الحقول الفعلية الناقصة من بيانات الشحن المخزنة في السلة.
 * @param {object} checkoutData
 * @returns {string[]} مفاتيح الحقول الناقصة (address / governorate / city)
 */
const getMissingShippingFields = (checkoutData) => {
  const missing = [];
  if (!firstValue(checkoutData, ADDRESS_KEYS)) missing.push('address');
  if (!firstValue(checkoutData, GOVERNORATE_KEYS)) missing.push('governorate');
  if (!firstValue(checkoutData, CITY_KEYS)) missing.push('city');
  return missing;
};

/**
 * يحلل بيانات السلة ويكشف السبب الحقيقي لعدم إكمال الطلب.
 * @param {object} cart سجلة GuestCart (items / checkoutData / checkoutStartedAt / checkoutUpdatedAt / status)
 * @param {object} options { lostAfterHours }
 * @returns {object|null} { code, evidence } أو null لو مفيش سلة صالحة
 */
const detectAbandonReason = (cart = {}, options = {}) => {
  const checkoutData = parseJsonObject(cart.checkoutData) || {};

  const name = firstValue(checkoutData, NAME_KEYS);
  const phone = firstValue(checkoutData, CONTACT_KEYS);
  const email = firstValue(checkoutData, EMAIL_KEYS);
  const paymentMethod = firstValue(checkoutData, PAYMENT_KEYS);

  const hasCheckoutSignal = Boolean(
    name || phone || email || firstValue(checkoutData, SHIPPING_KEYS),
  );

  // 1) السلة فيها منتجات لكن لم يبدأ الشيك آوت إطلاقاً (ولا بيانات واحدة)
  if (!hasCheckoutSignal) {
    return { code: 'no_checkout', evidence: [] };
  }

  // 2) لم يترك رقم هاتف — لا يمكن التواصل معه ولا تحويل السلة لطلب
  if (!phone) {
    return { code: 'no_phone', evidence: [] };
  }

  // 3) بدأ إدخال بيانات الشحن ولم يكملها — الدليل: الحقول الفعلية الناقصة
  const missingShipping = getMissingShippingFields(checkoutData);
  if (missingShipping.length > 0) {
    return { code: 'partial_shipping', evidence: missingShipping };
  }

  // 4) أكمل بيانات الشحن لكن لم يختر طريقة دفع
  if (!paymentMethod) {
    return { code: 'no_payment', evidence: [] };
  }

  // 5) ترك الصفحة بعد وقت قصير جداً من بدء الشيك آوت (حفظ واحد وبعدها اختفى)
  const started = cart.checkoutStartedAt ? new Date(cart.checkoutStartedAt).getTime() : null;
  const updated = cart.checkoutUpdatedAt ? new Date(cart.checkoutUpdatedAt).getTime() : null;
  if (
    started &&
    updated &&
    updated > started &&
    updated - started < QUICK_EXIT_MINUTES * 60 * 1000
  ) {
    return { code: 'quick_exit', evidence: [] };
  }

  // 6) انتهت السلة — لم يعد لإتمام الطلب قبل انتهاء المهلة
  const lostAfterHours = Number(options.lostAfterHours) > 0 ? Number(options.lostAfterHours) : 24;
  if (cart.status === 'lost') {
    return { code: 'lost', evidence: [String(lostAfterHours)] };
  }

  // 7) أكمل البيانات كاملة لكن لم يُرسل الطلب النهائي
  return { code: 'not_submitted', evidence: [] };
};

module.exports = {
  detectAbandonReason,
  getMissingShippingFields,
  parseJsonObject,
  QUICK_EXIT_MINUTES,
};
