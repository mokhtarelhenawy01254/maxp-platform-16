/**
 * Turbo Governorate Mapper Utilities
 * دوال مطابقة وتطبيع المحافظات والمدن لشحن Turbo
 * تم تزويدها بمعالج توحيد الحروف العربية وقاموس الأحياء المصرية والتعامل الذكي مع المناطق المركبة
 */

const {
  GOVERNORATE_MAP,
  CITY_TO_GOVERNMENT_MAP,
  DISTRICT_TO_GOVERNMENT_MAP,
  COMPOUND_SHIPPING_ZONES,
  FALLBACK_GOVERNMENTS
} = require('./constants');
const { cleanLocationName } = require('./addressParser');

/**
 * توحيد ومعالجة النصوص والحروف العربية لضمان دقة المطابقة
 * يعالج الهمزات، التاء المربوطة والهاء، الياء والألف المقصورة، التشكيل والتطويل
 */
function normalizeArabic(text) {
  if (!text) return '';
  return String(text).toLowerCase().trim()
    .replace(/[\u0660-\u0669]/g, d => String.fromCharCode(d.charCodeAt(0) - 0x0660 + 48))
    .replace(/[\u06F0-\u06F9]/g, d => String.fromCharCode(d.charCodeAt(0) - 0x06F0 + 48))
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/[\u064B-\u065F\u0670]/g, '') // تنوين وتشكيل
    .replace(/\u0640/g, '') // تطويل
    .replace(/[^a-z0-9\u0600-\u06FF\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * فحص ما إذا كان النص يشير لمنطقة شحن مركبة (مثل أطراف القاهرة والجيزة)
 */
function isCompoundShippingZone(text) {
  if (!text) return false;
  const normalized = normalizeArabic(text);
  if (!normalized) return false;

  for (const zone of (COMPOUND_SHIPPING_ZONES || [])) {
    if (normalized === normalizeArabic(zone) || normalized.includes(normalizeArabic(zone))) {
      return true;
    }
  }

  // كشف إضافي بالكلمات الدلالية
  if (normalized.includes('اطراف') && (normalized.includes('قاهره') || normalized.includes('جيزه'))) {
    return true;
  }
  if (normalized.includes('قاهره') && normalized.includes('جيزه')) {
    return true;
  }

  return false;
}

/**
 * فحص ما إذا كانت القيمة المدخلة فارغة أو تدل على عدم التحديد
 */
function isUnspecified(val) {
  if (!val) return true;
  const n = normalizeArabic(val);
  const invalidKeywords = ['غير محدد', 'غيرمعروف', 'غير معروف', 'unknown', 'none', 'null', 'undefined', 'لا يوجد', 'بدون'];
  return invalidKeywords.includes(n) || n.length < 2;
}

/**
 * استنتاج المحافظة من النص الكامل للعنوان أو المدينة باستخدام قاموس الأحياء والمدن
 */
function inferGovernorateFromText(text, allowedGovs = null) {
  if (!text) return null;
  const nText = normalizeArabic(text);
  if (!nText || nText.length < 2) return null;

  // 1. فحص قاموس الأحياء (الأطول فالأقصر لدقة المطابقة مثل "مدينة نصر" قبل "نصر")
  let districtEntries = Object.entries(DISTRICT_TO_GOVERNMENT_MAP || {})
    .sort(([a], [b]) => b.length - a.length);

  if (allowedGovs && Array.isArray(allowedGovs)) {
    districtEntries = districtEntries.filter(([_, gov]) => allowedGovs.includes(gov));
  }

  for (const [district, gov] of districtEntries) {
    const nDist = normalizeArabic(district);
    if (nDist.length >= 3 && nText.includes(nDist)) {
      return gov;
    }
  }

  // 2. فحص قاموس المدن
  let cityEntries = Object.entries(CITY_TO_GOVERNMENT_MAP || {})
    .sort(([a], [b]) => b.length - a.length);

  if (allowedGovs && Array.isArray(allowedGovs)) {
    cityEntries = cityEntries.filter(([_, gov]) => allowedGovs.includes(gov));
  }

  for (const [city, gov] of cityEntries) {
    const nCity = normalizeArabic(city);
    if (nCity.length >= 3 && nText.includes(nCity)) {
      return gov;
    }
  }

  // 3. فحص أسماء المحافظات المباشرة
  let govEntries = Object.entries(GOVERNORATE_MAP || {})
    .sort(([a], [b]) => b.length - a.length);

  if (allowedGovs && Array.isArray(allowedGovs)) {
    govEntries = govEntries.filter(([_, gov]) => allowedGovs.includes(gov));
  }

  for (const [key, gov] of govEntries) {
    const nKey = normalizeArabic(key);
    if (nKey.length >= 4 && nText.includes(nKey)) {
      return gov;
    }
  }

  return null;
}

/**
 * استخراج الاسم الرسمي لمحافظة تربو مع دعم التطبيع والاستنتاج وحل المناطق المركبة
 */
function getTurboGovernorateName(governorate, contextCity = '', fullAddress = '') {
  const cleanedGov = cleanLocationName(governorate);
  const trimmed = String(cleanedGov || '').trim();

  // Direct key check in GOVERNORATE_MAP (handles numeric IDs '1', '2' and exact keys)
  if (trimmed && GOVERNORATE_MAP[trimmed]) {
    return GOVERNORATE_MAP[trimmed];
  }

  // 1. إذا كانت المحافظة فارغة أو غير محددة، نستنتجها من المدينة والعنوان
  if (!trimmed || isUnspecified(trimmed)) {
    const combinedContext = `${contextCity || ''} ${fullAddress || ''}`;
    const inferred = inferGovernorateFromText(combinedContext);
    if (inferred) return inferred;
    if (contextCity && !isUnspecified(contextCity)) {
      return findGovernmentByCity(contextCity, null, fullAddress);
    }
    return null;
  }

  // 2. إذا كانت المحافظة منطقة مركبة (مثل أطراف القاهرة والجيزة)
  if (isCompoundShippingZone(cleanedGov)) {
    const combinedContext = `${contextCity || ''} ${fullAddress || ''}`;
    // حصر البحث في النطاق الجغرافي المعني (الجيزة، القليوبية، القاهرة) لمنع الخلط مع أسماء محطات بمحافظات أخرى
    const inferred = inferGovernorateFromText(combinedContext, ['الجيزة', 'القليوبية', 'القاهرة']);
    if (inferred) {
      return inferred;
    }
    return 'القاهرة';
  }

  const nGov = normalizeArabic(cleanedGov);

  // 3. مطابقة مباشرة وتطبيعية دقيقة مع GOVERNORATE_MAP
  for (const [key, value] of Object.entries(GOVERNORATE_MAP)) {
    if (normalizeArabic(key) === nGov || normalizeArabic(value) === nGov) {
      return value;
    }
  }

  // 4. مطابقة مع قاموس الأحياء والمدن
  if (DISTRICT_TO_GOVERNMENT_MAP) {
    for (const [district, gov] of Object.entries(DISTRICT_TO_GOVERNMENT_MAP)) {
      if (normalizeArabic(district) === nGov) {
        return gov;
      }
    }
  }

  // 5. مطابقة جزئية مع أسماء المحافظات مرتبة بالأطول
  const sortedEntries = Object.entries(GOVERNORATE_MAP)
    .sort(([a], [b]) => b.length - a.length);

  for (const [key, value] of sortedEntries) {
    const nKey = normalizeArabic(key);
    if (nKey.length >= 3 && (nGov.includes(nKey) || nKey.includes(nGov))) {
      return value;
    }
  }

  // 6. استنتاج من سياق المدينة أو العنوان كحل احتياطي
  if (contextCity || fullAddress) {
    const inferred = inferGovernorateFromText(`${contextCity} ${fullAddress}`);
    if (inferred) return inferred;
  }

  return cleanedGov || null;
}

/**
 * استخراج المحافظة بدلالة المدينة أو الحي
 */
function findGovernmentByCity(cityName, governments = null, fullAddress = '') {
  if (!cityName && !fullAddress) return 'القاهرة';

  const cleanCity = cleanLocationName(cityName);
  const nCleanCity = normalizeArabic(cleanCity);

  // إذا كانت المدينة تشير لمنطقة مركبة
  if (isCompoundShippingZone(cleanCity)) {
    const inferred = inferGovernorateFromText(fullAddress);
    return inferred || 'القاهرة';
  }

  // محاولة الاستنتاج من قاموس الأحياء أولاً
  if (DISTRICT_TO_GOVERNMENT_MAP) {
    for (const [dist, gov] of Object.entries(DISTRICT_TO_GOVERNMENT_MAP)) {
      const nDist = normalizeArabic(dist);
      if (nCleanCity === nDist || (nDist.length >= 3 && nCleanCity.includes(nDist))) {
        if (governments && governments.length > 0) {
          const matchGov = governments.find(g => normalizeArabic(g.name) === normalizeArabic(gov));
          if (matchGov) return matchGov.name;
        }
        return gov;
      }
    }
  }

  // فحص قاموس المدن
  for (const [city, gov] of Object.entries(CITY_TO_GOVERNMENT_MAP)) {
    const nCity = normalizeArabic(city);
    if (nCleanCity === nCity || nCleanCity.includes(nCity) || nCity.includes(nCleanCity)) {
      if (governments && governments.length > 0) {
        const foundGov = governments.find(g => {
          const nG = normalizeArabic(g.name);
          const nTarget = normalizeArabic(gov);
          return nG === nTarget || nG.includes(nTarget) || nTarget.includes(nG);
        });
        if (foundGov) return foundGov.name;
      }
      return gov;
    }
  }

  // لو تم تمرير قائمة المحافظات من تربو
  if (governments && governments.length > 0) {
    for (const gov of governments) {
      const nG = normalizeArabic(gov.name);
      if (nG === nCleanCity) return gov.name;
    }

    for (const gov of governments) {
      const nG = normalizeArabic(gov.name);
      if (nG.includes(nCleanCity) || nCleanCity.includes(nG)) return gov.name;
    }

    const cityWords = nCleanCity.split(' ').filter(w => w.length > 2);
    for (const gov of governments) {
      const nG = normalizeArabic(gov.name);
      for (const word of cityWords) {
        if (nG.includes(word)) return gov.name;
      }
    }
  }

  return getTurboGovernorateName(cityName, '', fullAddress) || 'القاهرة';
}

module.exports = {
  normalizeArabic,
  isCompoundShippingZone,
  isUnspecified,
  inferGovernorateFromText,
  getTurboGovernorateName,
  findGovernmentByCity
};
