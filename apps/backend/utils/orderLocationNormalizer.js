/**
 * Order Location Normalizer
 * يوحد ويطبع بيانات المحافظة والمدينة والعنوان من أي حقل (root fields أو shippingAddress أو customerAddress)
 * يدعم كائنات JSON والسلاسل النصية ومطابقة الأسماء الإنجليزية والعربية لمناطق الشحن
 */

const { getTurboGovernorateName, isUnspecified } = require('./turbo/governorateMapper');
const { cleanLocationName } = require('./turbo/addressParser');

// قاموس موحد للأسماء الإنجليزية والبدائل الشائعة للمحافظات المصرية
const ENGLISH_TO_ARABIC_GOVERNORATES = {
  cairo: 'القاهرة',
  'new cairo': 'القاهرة الجديدة',
  helwan: 'حلوان',
  '15th of may': '15 مايو',
  giza: 'الجيزة',
  '6th of october': '6 أكتوبر',
  october: '6 أكتوبر',
  'sheikh zayed': 'الشيخ زايد',
  zayed: 'الشيخ زايد',
  alexandria: 'الإسكندرية',
  alex: 'الإسكندرية',
  qalyubia: 'القليوبية',
  qalyubiya: 'القليوبية',
  qalubia: 'القليوبية',
  kalubia: 'القليوبية',
  dakahlia: 'الدقهلية',
  mansoura: 'الدقهلية',
  gharbia: 'الغربية',
  tanta: 'الغربية',
  monufia: 'المنوفية',
  menofia: 'المنوفية',
  sharqia: 'الشرقية',
  zagazig: 'الشرقية',
  'kafr el sheikh': 'كفر الشيخ',
  'kafr el-sheikh': 'كفر الشيخ',
  damietta: 'دمياط',
  'port said': 'بورسعيد',
  ismailia: 'الإسماعيلية',
  suez: 'السويس',
  beheira: 'البحيرة',
  fayoum: 'الفيوم',
  'beni suef': 'بني سويف',
  minya: 'المنيا',
  asyut: 'أسيوط',
  assiut: 'أسيوط',
  sohag: 'سوهاج',
  qena: 'قنا',
  luxor: 'الأقصر',
  aswan: 'أسوان',
  'red sea': 'البحر الأحمر',
  hurghada: 'البحر الأحمر',
  'new valley': 'الوادي الجديد',
  matrouh: 'مطروح',
  'marsa matrouh': 'مطروح',
  'north sinai': 'شمال سيناء',
  'south sinai': 'جنوب سيناء',
  'sharm el sheikh': 'جنوب سيناء'
};

/**
 * تحليل آمن لكائن العنوان إذا كان String JSON أو Object
 */
function parseAddressCandidate(input) {
  if (!input) return null;
  if (typeof input === 'object' && !Array.isArray(input)) return input;
  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          return parsed;
        }
      } catch (_) {
        return null;
      }
    }
  }
  return null;
}

/**
 * تطبيع اسم المحافظة إلى الاسم العربي المعتمد في مناطق الشحن
 */
function normalizeGovernorateName(rawGov, rawCity = '', addrText = '') {
  if (!rawGov || isUnspecified(rawGov)) {
    if (rawCity && !isUnspecified(rawCity)) {
      return normalizeGovernorateName(rawCity, '', addrText);
    }
    return null;
  }

  const trimmed = String(rawGov).trim();
  const lower = trimmed.toLowerCase();

  // 1. مطابقة مباشرة في قاموس الأسماء الإنجليزية
  if (ENGLISH_TO_ARABIC_GOVERNORATES[lower]) {
    return ENGLISH_TO_ARABIC_GOVERNORATES[lower];
  }

  // 2. محول تربو الشامل (يدعم المحافظات، الأرقام، والمناطق المركبة)
  const turboGov = getTurboGovernorateName(trimmed, rawCity, addrText);
  if (turboGov && !isUnspecified(turboGov)) {
    return turboGov;
  }

  // 3. تنظيف الاسم وإعادته كما هو إذا كان منطقة خاصة أو اسم محلي
  const cleaned = cleanLocationName(trimmed);
  return (cleaned && !isUnspecified(cleaned)) ? cleaned : null;
}

/**
 * نقطة التطبيع المركزية لبيانات موقع الطلب (المحافظة والمدينة والعنوان)
 * @param {Object} data - بيانات الطلب المدخلة
 * @returns {Object} بيانات الموقع الموحدة
 */
function normalizeOrderLocation(data = {}) {
  if (!data || typeof data !== 'object') {
    return {
      governorate: null,
      rawGovernorate: null,
      city: null,
      rawCity: null,
      area: null,
      address: null,
      shippingAddress: null,
      customerAddress: null
    };
  }

  const shippingAddr = parseAddressCandidate(data.shippingAddress);
  const customerAddr = parseAddressCandidate(data.customerAddress);
  const generalAddr = parseAddressCandidate(data.address);

  // استخراج المحافظة الخام مع الأخذ بالاعتبار كافة الحقول والبدائل الممكنة
  const rawGov =
    data.governorate ||
    data.government ||
    shippingAddr?.governorate ||
    shippingAddr?.state ||
    shippingAddr?.region ||
    shippingAddr?.province ||
    customerAddr?.governorate ||
    customerAddr?.state ||
    customerAddr?.region ||
    customerAddr?.province ||
    generalAddr?.governorate ||
    generalAddr?.state ||
    generalAddr?.region ||
    generalAddr?.province ||
    '';

  // استخراج المدينة الخام
  const rawCity =
    data.city ||
    data.town ||
    shippingAddr?.city ||
    shippingAddr?.town ||
    customerAddr?.city ||
    customerAddr?.town ||
    generalAddr?.city ||
    generalAddr?.town ||
    '';

  // استخراج المنطقة / الحي
  const rawArea =
    data.area ||
    data.district ||
    data.neighborhood ||
    shippingAddr?.area ||
    shippingAddr?.district ||
    shippingAddr?.neighborhood ||
    customerAddr?.area ||
    customerAddr?.district ||
    customerAddr?.neighborhood ||
    generalAddr?.area ||
    generalAddr?.district ||
    generalAddr?.neighborhood ||
    '';

  // استخراج نص العنوان الصريح
  const addrText =
    (typeof data.customerAddress === 'string' && !data.customerAddress.trim().startsWith('{') ? data.customerAddress : '') ||
    (typeof data.address === 'string' && !data.address.trim().startsWith('{') ? data.address : '') ||
    shippingAddr?.address ||
    shippingAddr?.street ||
    shippingAddr?.addressLine1 ||
    customerAddr?.address ||
    customerAddr?.street ||
    generalAddr?.address ||
    generalAddr?.street ||
    '';

  const normalizedGov = normalizeGovernorateName(rawGov, rawCity, addrText);

  // المدينة: إذا لم تكن محددة نستخدم rawCity، أو rawArea، أو المحافظة كـ fallback
  const rawCityStr = String(rawCity || '').trim();
  const cleanedCity = cleanLocationName(
    !isUnspecified(rawCityStr) ? rawCityStr : (rawArea || normalizedGov || '')
  );
  const normalizedCity = cleanedCity || rawCityStr || null;

  return {
    governorate: normalizedGov,
    rawGovernorate: String(rawGov || '').trim() || null,
    city: normalizedCity,
    rawCity: rawCityStr || null,
    area: rawArea || null,
    address: addrText || null,
    shippingAddress: shippingAddr,
    customerAddress: customerAddr
  };
}

module.exports = {
  normalizeOrderLocation,
  normalizeGovernorateName,
  parseAddressCandidate,
  ENGLISH_TO_ARABIC_GOVERNORATES
};
