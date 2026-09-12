/**
 * Universal Shipping Data Sanitizer & Normalizer
 * موحّد تنظيف وتنسيق بيانات الشحن لجميع شركات الشحن (QP Express, Turbo, Bosta, وغيرها)
 * يضمن:
 * 1. عدم تسريب JSON خام نهائياً لشركات الشحن.
 * 2. عدم ضياع أرقام الهواتف المكتوبة بأرقام عربية مشرقية (٠-٩) أو فارسية (۰-۹).
 * 3. استخراج أرقام الهواتف البديلة المكتوبة داخل نص العنوان وحذفها من العنوان ليبقى نظيفاً.
 * 4. ترقية الرقم الصحيح (11 رقم) إلى هاتف رئيسي إذا كان الهاتف الأساسي مكتوباً بخطأ (مثل 10 أرقام).
 * 5. منع ظهور نصوص النظام وسجلات الـ Audit (مثل "Bulk status update" أو "طلب تلقائي من المحادثة") على بوالص الشحن.
 * 6. منع ظهور أكواد الـ SKU التلقائية الداخلية (مثل "AUTO-1789083823768") أو حملات فيسبوك الافتراضية ("إعلان جديد بهدف المبيعات") كأسماء للمنتجات.
 * 7. توفير أسماء ومواصفات واضحة للمنتجات (الاسم + اللون + المقاس + الكمية).
 */

const ARABIC_INDIC_0 = 0x0660; // ٠-٩
const EXTENDED_ARABIC_0 = 0x06F0; // ۰-۹

/**
 * تحويل الأرقام العربية/الفارسية إلى أرقام إنجليزية
 */
function toAsciiDigits(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - ARABIC_INDIC_0))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - EXTENDED_ARABIC_0));
}

/**
 * تنظيف وتوحيد رقم الهاتف لأرقام صالحة لشركات الشحن
 * يعالج الأرقام العربية، كود الدولة (+20 / 0020 / 20)، والمسافات
 */
function cleanPhoneNumber(phone) {
  if (!phone) return '';
  const ascii = toAsciiDigits(phone);
  let digits = ascii.replace(/\D/g, '');

  if (!digits) return '';

  if (digits.startsWith('0020')) {
    digits = digits.slice(4);
  } else if (digits.startsWith('20') && digits.length === 12) {
    digits = digits.slice(2);
  }

  // لو الرقم 10 أرقام ويبدأ بـ 1 (مثل 1011545274) -> نضيف 0 في البداية
  if (digits.length === 10 && digits.startsWith('1')) {
    digits = '0' + digits;
  }

  // التأكد من الصيغة المصرية القياسية (11 رقم يبدأ بـ 01)
  if (digits.length === 11 && digits.startsWith('01')) {
    return digits;
  }

  // إذا كان 12 رقم ومعه صفر إضافي مثل 0201...
  if (digits.length === 12 && digits.startsWith('0201')) {
    return '0' + digits.slice(3);
  }

  return digits;
}

/**
 * التحقق مما إذا كان الرقم مصرياً قياسياً صحيحاً (11 رقماً يبدأ بـ 010 أو 011 أو 012 أو 015)
 */
function isValidEgyptianPhone(phone) {
  const cleaned = cleanPhoneNumber(phone);
  return /^01[0125][0-9]{8}$/.test(cleaned);
}

/**
 * استخراج أرقام الهواتف من نص وإزالتها منه
 * مفيد جداً عندما يرسل العميل رقمين في نص الرسالة ويتم تخزين الثاني داخل العنوان
 */
function extractPhonesFromText(text) {
  if (!text || typeof text !== 'string') return { cleanedText: '', phones: [] };

  const asciiText = toAsciiDigits(text);
  const phones = [];

  // البحث عن أرقام الهواتف المصرية (11 رقم تبدأ بـ 01 أو كود مصر +201 أو 00201 أو 201)
  // نستخدم [0-9 \-] فقط بدون \\s لمنع دمج سطرين بهما رقمين مختلفين
  const phonePattern = /(?:(?:\+|00)?20[ \-]*|0)?1[0125][0-9 \-]{8,10}/g;
  let match;
  while ((match = phonePattern.exec(asciiText)) !== null) {
    const raw = match[0];
    const cleaned = cleanPhoneNumber(raw);
    if (isValidEgyptianPhone(cleaned) && !phones.includes(cleaned)) {
      phones.push(cleaned);
    }
  }

  // تنظيف النص من أرقام الهواتف وأي كلمات مرافقة لها (مثل "رقم:" أو "موبايل:" أو "هاتف بديل:")
  let cleanedText = asciiText
    .replace(/(?:هاتف|تليفون|موبايل|فون|رقم|واتساب|بديل|احتياطي|phone|mobile|tel)[\s:：\-]*[0-9 \-\+]{9,15}/gi, ' ')
    .replace(/(?:(?:\+|00)?20[ \-]*|0)?1[0125][0-9 \-]{8,10}/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return { cleanedText, phones };
}

/**
 * تنظيف اسم العميل من الأرقام الزائدة في النهاية أو طوابع الشات
 */
function cleanCustomerName(name) {
  if (!name || typeof name !== 'string') return 'عميل';
  let cleaned = toAsciiDigits(name)
    .replace(/\r?\n.*?[0-9]{1,2}:[0-9]{2}\s*(ص|م|am|pm)?/gi, '') // إزالة أوقات الشات
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s*[\(\[]?(\+?20|0)?1[0125][0-9]{8}[\)\]]?\s*$/g, '') // إزالة أرقام الهواتف من الاسم
    .replace(/\s+[0-9]+\s*$/g, '') // إزالة الأرقام الزائدة في نهاية الاسم مثل "هبه ماجد 0"
    .replace(/\s+/g, ' ')
    .trim();

  return cleaned || 'عميل';
}

/**
 * فك تشفير JSON المتداخل بشكل متكرر
 */
function deeplyUnwrapJson(val) {
  if (!val) return null;
  if (typeof val === 'object' && !Array.isArray(val)) return val;

  if (typeof val === 'string') {
    const trimmed = val.trim();
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      try {
        const parsed = JSON.parse(trimmed);
        if (typeof parsed === 'string') {
          return deeplyUnwrapJson(parsed);
        }
        return parsed;
      } catch {
        return trimmed;
      }
    }
    return trimmed;
  }
  return null;
}

/**
 * تنظيف نص العنوان من طوابع المحادثات، أرقام الهواتف المكررة، والرموز الزائدة
 */
function sanitizeAddressText(text, customerNameToStrip = null) {
  if (!text || typeof text !== 'string') return '';
  let cleaned = toAsciiDigits(text)
    .replace(/\r?\n.*?[0-9]{1,2}:[0-9]{2}\s*(ص|م|am|pm)?/gi, '') // إزالة طوابع الشات مثل "١٠:٥٣ ص"
    .replace(/[\r\n]+/g, ' - ')
    .replace(/\s*-\s*-\s*/g, ' - ');

  // إزالة أرقام الهواتف من النص
  const extracted = extractPhonesFromText(cleaned);
  cleaned = extracted.cleanedText;

  // إزالة اسم العميل إذا كان مكتوباً في بداية العنوان لتفادي التكرار
  if (customerNameToStrip && typeof customerNameToStrip === 'string') {
    const trimmedName = customerNameToStrip.trim();
    if (trimmedName.length > 2) {
      const nameRegex = new RegExp(`^\\s*${trimmedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\-:،]*`, 'i');
      cleaned = cleaned.replace(nameRegex, '');
    }
  }

  // تنظيف الفواصل والشرطات المكررة أو المتطرفة
  cleaned = cleaned
    .replace(/^[\s:،\-]+|[\s:،\-]+$/g, '')
    .replace(/\s*-\s*-\s*/g, ' - ')
    .replace(/\s+/g, ' ')
    .trim();

  return cleaned;
}

/**
 * استخراج نص العنوان النظيف والمفصل لشركات الشحن
 * يمنع تسريب أي JSON خام أو عناوين متداخلة، ويعالج أرقام الهواتف المدفونة
 */
function cleanShippingAddress(shippingAddress, customerAddress = null, customerName = null) {
  if (customerAddress && typeof customerAddress === 'object' && !Array.isArray(customerAddress)) {
    // إذا تم تمرير كائن خيارات بدلاً من عنوان العميل
    if (customerAddress.customerName || customerAddress.governorate || customerAddress.city) {
      customerName = customerAddress.customerName || customerName;
      customerAddress = customerAddress.customerAddress || customerAddress.address || null;
    }
  }

  const parsed = deeplyUnwrapJson(shippingAddress) || deeplyUnwrapJson(customerAddress);

  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    // التحقق مما إذا كانت الحقول الداخلية تحتوي أيضاً على JSON
    let street =
      parsed.address ||
      parsed['العنوان'] ||
      parsed['عنوان'] ||
      parsed.street ||
      parsed['الشارع'] ||
      parsed['شارع'] ||
      parsed.addressLine1 ||
      parsed.address_1 ||
      parsed.details ||
      '';

    if (typeof street === 'string' && street.trim().startsWith('{')) {
      const innerObj = deeplyUnwrapJson(street);
      if (innerObj && typeof innerObj === 'object') {
        street = innerObj.address || innerObj.addressLine1 || innerObj.street || innerObj['العنوان'] || '';
      }
    }

    const building = parsed.building || parsed['العمارة'] || parsed['عمارة']
      ? `عمارة ${parsed.building || parsed['العمارة'] || parsed['عمارة']}`.replace(/عمارة\s+عمارة/, 'عمارة')
      : '';
    const floor = parsed.floor || parsed['الدور'] || parsed['دور']
      ? `دور ${parsed.floor || parsed['الدور'] || parsed['دور']}`.replace(/دور\s+دور/, 'دور')
      : '';
    const apartment = parsed.apartment || parsed['الشقة'] || parsed['شقة']
      ? `شقة ${parsed.apartment || parsed['الشقة'] || parsed['شقة']}`.replace(/شقة\s+شقة/, 'شقة')
      : '';
    const landmark = parsed.landmark || parsed['علامة مميزة'] || parsed['علامه مميزه'] || '';
    const area = parsed.area || parsed['المنطقة'] || parsed['منطقة'] || parsed.district || '';

    const parts = [
      street,
      building,
      floor,
      apartment,
      landmark,
      area
    ].filter(Boolean);

    if (parts.length > 0) {
      const combined = sanitizeAddressText(parts.join(' - '), customerName);
      if (combined && !combined.startsWith('{') && combined.length > 2) {
        return combined;
      }
    }
  }

  // فحص customerAddress إذا كان نصاً عادياً
  if (typeof customerAddress === 'string' && customerAddress.trim()) {
    const cleaned = sanitizeAddressText(customerAddress, customerName);
    if (cleaned && !cleaned.startsWith('{') && cleaned.length > 2) {
      return cleaned;
    }
  }

  // فحص shippingAddress إذا كان نصاً عادياً
  if (typeof shippingAddress === 'string' && shippingAddress.trim()) {
    const cleaned = sanitizeAddressText(shippingAddress, customerName);
    if (cleaned && !cleaned.startsWith('{') && cleaned.length > 2) {
      return cleaned;
    }
  }

  return 'العنوان غير محدد';
}

/**
 * تسوية أرقام الهواتف الأساسية والبديلة
 * إذا كان رقم العميل الأساسي خاطئاً (10 أرقام أو غير صالح) ولكن العنوان يحتوي على رقم صحيح (11 رقماً)،
 * يتم استبدال الرقم بالرقم الصحيح، وتعيين الرقم الآخر كهاتف بديل.
 */
function resolveBestPhoneNumbers(primaryPhone, secondaryPhone = null, rawAddressText = '') {
  // إذا تم تمرير كائن أو نص العنوان كمعامل ثاني
  if (secondaryPhone && typeof secondaryPhone === 'object' && !Array.isArray(secondaryPhone)) {
    rawAddressText = secondaryPhone.address || secondaryPhone.shippingAddress || secondaryPhone.customerAddress || secondaryPhone.rawAddressText || '';
    secondaryPhone = secondaryPhone.secondaryPhone || secondaryPhone.phone2 || secondaryPhone.alternativePhone || null;
  } else if (typeof secondaryPhone === 'string' && !rawAddressText) {
    // إذا كان المعامل الثاني نصاً طويلاً أو يحتوي مسافات أو حروفاً غير رقمية فهو عنوان
    if (/[^\d\s\+\-\(\)]/.test(secondaryPhone) || secondaryPhone.length > 20 || secondaryPhone.includes('\n')) {
      rawAddressText = secondaryPhone;
      secondaryPhone = null;
    }
  }

  let p1 = cleanPhoneNumber(primaryPhone);
  let p2 = cleanPhoneNumber(secondaryPhone);

  // حصر أرقام الهواتف من نص العنوان ومن أي هاتف إضافي
  const { phones: addressPhones } = extractPhonesFromText(`${rawAddressText || ''} ${secondaryPhone || ''}`);

  // فحص صحة p2 - إذا لم يكن هاتفاً مصرياً قياسياً لا نعتبره هاتفاً بديلاً (لحماية البوليصة من أرقام الطوابق/الساعات)
  if (p2 && !isValidEgyptianPhone(p2)) {
    p2 = '';
  }

  // إذا كان الرقم الأساسي غير صالح لكن وجدنا رقم صالح في العنوان
  if (!isValidEgyptianPhone(p1)) {
    const validCandidate = addressPhones.find(isValidEgyptianPhone);
    if (validCandidate) {
      p2 = (isValidEgyptianPhone(p1) ? p1 : (p2 || ''));
      p1 = validCandidate;
    }
  }

  // إذا كان الهاتف البديل فارغاً ووجدنا أرقام إضافية في العنوان
  if (!p2) {
    const otherPhone = addressPhones.find(p => p !== p1 && isValidEgyptianPhone(p));
    if (otherPhone) {
      p2 = otherPhone;
    }
  }

  // تفادي تكرار نفس الرقم في p1 و p2
  if (p1 && p2 && p1 === p2) {
    p2 = '';
  }

  return {
    primaryPhone: p1,
    secondaryPhone: p2 || '',
  };
}

/**
 * تنظيف ملاحظات الشحنة لمنع تسريب سجلات النظام (مثل Bulk status update) إلى البوليصة
 */
function cleanShippingNotes(notes, defaultNoticeOrOptions = 'المعاينة في وجود المندوب ولا يوجد استرجاع إلا في حالة عيوب الصناعة', maybeSecondaryPhone = null) {
  let defaultNotice = 'المعاينة في وجود المندوب ولا يوجد استرجاع إلا في حالة عيوب الصناعة';
  let secondaryPhone = maybeSecondaryPhone;

  if (defaultNoticeOrOptions && typeof defaultNoticeOrOptions === 'object' && !Array.isArray(defaultNoticeOrOptions)) {
    if (typeof defaultNoticeOrOptions.defaultNotice === 'string') {
      defaultNotice = defaultNoticeOrOptions.defaultNotice;
    }
    if (defaultNoticeOrOptions.secondaryPhone) {
      secondaryPhone = defaultNoticeOrOptions.secondaryPhone;
    }
  } else if (typeof defaultNoticeOrOptions === 'string') {
    defaultNotice = defaultNoticeOrOptions;
  }

  let cleaned = '';
  const trimmed = notes && typeof notes === 'string' ? notes.trim() : '';

  // فحص ما إذا كانت الملاحظة نصاً داخلياً للنظام
  const isInternalAuditNote =
    !trimmed ||
    /^Bulk\s+(status\s+update|trash|restore|preparation)/i.test(trimmed) ||
    /^طلب تلقائي من المحادثة/i.test(trimmed) ||
    /معرف المحادثة:/i.test(trimmed) ||
    /تاريخ الإنشاء:/i.test(trimmed) ||
    /^Auto-transition/i.test(trimmed) ||
    /^cm[a-z0-9]{20,}/i.test(trimmed);

  if (isInternalAuditNote) {
    cleaned = defaultNotice;
  } else {
    // لو كانت الملاحظة تحتوي بالفعل على إذن المعاينة لا نكررها
    if (trimmed.includes('معاين') || trimmed.includes('فتح') || trimmed.includes('مندوب')) {
      cleaned = trimmed;
    } else {
      cleaned = defaultNotice ? `${defaultNotice} - ${trimmed}` : trimmed;
    }
  }

  // إذا كان هناك رقم هاتف بديل صالح، نضيفه بشكل احترافي في الملاحظات
  if (secondaryPhone && isValidEgyptianPhone(secondaryPhone) && !cleaned.includes(secondaryPhone)) {
    cleaned = cleaned ? `${cleaned} | هاتف بديل: ${secondaryPhone}` : `هاتف بديل: ${secondaryPhone}`;
  }

  return cleaned;
}

/**
 * فحص ما إذا كان النص اسماً وهمياً أو داخلياً لا يمثل اسم منتج حقيقي
 */
function isGenericOrInternalIdentifier(name) {
  if (!name || typeof name !== 'string') return true;
  const t = name.trim();
  if (t.length < 2) return true;

  // أسماء عامة غير محددة
  if (['منتج', 'منتج غير محدد', 'منتج عادي', 'منتجات', 'item', 'product', 'default', 'none', 'null', 'undefined'].includes(t.toLowerCase())) {
    return true;
  }

  // أكواد النظام التلقائية مثل AUTO-1789083823768 أو CUID / UUID
  if (/^AUTO-[0-9]+/i.test(t) || /^cm[a-z0-9]{20,}/i.test(t) || /^[0-9a-f]{8}-[0-9a-f]{4}/i.test(t)) {
    return true;
  }

  // حملات فيسبوك الافتراضية
  if (
    /إعلان جديد/i.test(t) ||
    /حملة جديدة/i.test(t) ||
    /بهدف المبيعات/i.test(t) ||
    /بهدف التفاعل/i.test(t) ||
    /New Campaign/i.test(t) ||
    /New Sales/i.test(t) ||
    /New Leads/i.test(t)
  ) {
    return true;
  }

  return false;
}

/**
 * تنسيق محتويات الشحنة بشكل مفهوم للبوليصة بدلاً من "منتج × 1"
 */
function formatShipmentContents(items, orderMetadata = null, defaultPrefix = 'منتجات متنوعة') {
  let metaObj = orderMetadata;
  if (typeof metaObj === 'string') {
    try { metaObj = JSON.parse(metaObj); } catch { metaObj = {}; }
  }

  // محاولة استخراج اسم المنتج أو عنوان الإعلان الحقيقي كـ fallback
  let fallbackProductName = '';
  if (metaObj?.productName && !isGenericOrInternalIdentifier(metaObj.productName)) {
    fallbackProductName = metaObj.productName;
  } else if (metaObj?.attribution?.ad_title && !isGenericOrInternalIdentifier(metaObj.attribution.ad_title)) {
    fallbackProductName = metaObj.attribution.ad_title;
  } else if (metaObj?.ad_title && !isGenericOrInternalIdentifier(metaObj.ad_title)) {
    fallbackProductName = metaObj.ad_title;
  } else if (metaObj?.attribution?.campaignName && !isGenericOrInternalIdentifier(metaObj.attribution.campaignName)) {
    fallbackProductName = metaObj.attribution.campaignName;
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    return fallbackProductName ? `${fallbackProductName} × 1` : defaultPrefix;
  }

  const parts = items.map(item => {
    let name =
      item.productName ||
      item.product?.name ||
      item.product?.title ||
      item.title ||
      item.name;

    const qty = item.quantity || 1;
    const size = item.productSize || item.size || '';
    const color = item.productColor || item.color || '';
    const variantParts = [size, color, item.variant].filter(Boolean);
    const variant = variantParts.length > 0 ? variantParts.join(' - ') : '';

    // إذا كان الاسم غير محدد أو داخلي، استرجع من الخصائص أو المتغيرات
    if (isGenericOrInternalIdentifier(name)) {
      name =
        (!isGenericOrInternalIdentifier(item.variantName) ? item.variantName : null) ||
        (!isGenericOrInternalIdentifier(item.productVariant?.name) ? item.productVariant?.name : null) ||
        (!isGenericOrInternalIdentifier(item.productDetails) ? item.productDetails : null) ||
        fallbackProductName ||
        (variant ? defaultPrefix : 'منتجات متنوعة');
    }

    return variant ? `${name} (${variant}) × ${qty}` : `${name} × ${qty}`;
  });

  const result = parts.join(' + ');
  return result.length > 250 ? result.substring(0, 247) + '...' : result;
}

/**
 * كشف اسم المحافظة من نص العنوان في حال كانت المدينة والمحافظة فارغة
 */
const EGYPT_GOVS = [
  { name: 'القاهرة', aliases: ['قاهرة', 'cairo', 'حلوان', 'المعادي', 'مدينة نصر', 'التجمع', 'شبرا'] },
  { name: 'الإسكندرية', aliases: ['الاسكندرية', 'اسكندرية', 'alexandria', 'سموحة', 'سيدي جابر', 'الفلكي', 'العجمي'] },
  { name: 'الجيزة', aliases: ['جيزة', 'giza', 'الهرم', 'فيصل', 'الدقي', 'المهندسين', 'اكتوبر', 'الشيخ زايد'] },
  { name: 'القليوبية', aliases: ['قليوبية', 'قليوبيه', 'بنها', 'شبرا الخيمة', 'qalyubia'] },
  { name: 'الشرقية', aliases: ['شرقية', 'شرقيه', 'الزقازيق', 'العاشر من رمضان', 'sharqia'] },
  { name: 'الغربية', aliases: ['غربية', 'غربيه', 'طنطا', 'المحلة', 'قطور', 'gharbia'] },
  { name: 'الدقهلية', aliases: ['دقهلية', 'دقهليه', 'المنصورة', 'منصورة', 'بلقاس', 'dakahlia'] },
  { name: 'البحيرة', aliases: ['بحيرة', 'بحيره', 'دمنهور', 'كفر الدوار', 'beheira'] },
  { name: 'كفر الشيخ', aliases: ['كفرالشيخ', 'دسوق', 'kafr el sheikh'] },
  { name: 'المنوفية', aliases: ['منوفية', 'منوفيه', 'شبين الكوم', 'السادات', 'monufia'] },
  { name: 'دمياط', aliases: ['دمياط الجديدة', 'damietta'] },
  { name: 'بورسعيد', aliases: ['بور سعيد', 'port said'] },
  { name: 'الإسماعيلية', aliases: ['اسماعيلية', 'اسماعيليه', 'ismailia'] },
  { name: 'السويس', aliases: ['سويس', 'suez'] },
  { name: 'الفيوم', aliases: ['فيوم', 'fayoum'] },
  { name: 'بني سويف', aliases: ['بنى سويف', 'beni suef'] },
  { name: 'المنيا', aliases: ['منيا', 'بني مزار', 'ملوي', 'مغاغة', 'minya'] },
  { name: 'أسيوط', aliases: ['اسيوط', 'ديروط', 'منفلوط', 'asyut'] },
  { name: 'سوهاج', aliases: ['البلينا', 'جرجا', 'طهطا', 'اخميم', 'sohag'] },
  { name: 'قنا', aliases: ['نجع حمادي', 'دشنا', 'قوص', 'qena'] },
  { name: 'الأقصر', aliases: ['الاقصر', 'اسنا', 'luxor'] },
  { name: 'أسوان', aliases: ['اسوان', 'كوم امبو', 'ادفو', 'aswan'] },
  { name: 'البحر الأحمر', aliases: ['الغردقة', 'سفاجا', 'القصير', 'مرسى علم', 'red sea'] },
  { name: 'شمال سيناء', aliases: ['العريش', 'رفح', 'north sinai'] },
  { name: 'جنوب سيناء', aliases: ['شرم الشيخ', 'دهب', 'نويبع', 'طور سيناء', 'south sinai'] },
  { name: 'مطروح', aliases: ['مرسى مطروح', 'الضبعة', 'العلمين', 'الحمام', 'matrouh'] },
  { name: 'الوادي الجديد', aliases: ['الخارجة', 'الداخلة', 'الفرافرة', 'new valley'] }
];

function detectGovernorateFromText(text) {
  if (!text || typeof text !== 'string') return null;
  const normalized = text.toLowerCase().replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي');

  for (const gov of EGYPT_GOVS) {
    const nGov = gov.name.toLowerCase().replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي');
    if (normalized.includes(nGov)) {
      return gov.name;
    }
    for (const alias of gov.aliases) {
      const nAlias = alias.toLowerCase().replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي');
      if (normalized.includes(nAlias)) {
        return gov.name;
      }
    }
  }
  return null;
}

module.exports = {
  toAsciiDigits,
  cleanPhoneNumber,
  isValidEgyptianPhone,
  extractPhonesFromText,
  resolveBestPhoneNumbers,
  cleanCustomerName,
  deeplyUnwrapJson,
  cleanShippingAddress,
  cleanShippingNotes,
  isGenericOrInternalIdentifier,
  formatShipmentContents,
  detectGovernorateFromText,
};
