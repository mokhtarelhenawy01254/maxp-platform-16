'use strict';

/**
 * genderDetector.js
 *
 * Lightweight, high-accuracy first-name to gender detector for Arabic and Latin/Egyptian names.
 * Used to inject gender context into AI agents to guarantee correct masculine/feminine pronouns
 * and prevent misgendering customers (e.g. addressing "Ahmed" with "تقوليلي").
 */

// Normalized lists of common names (lower-case, normalized arabic)
const MALE_NAMES_AR = new Set([
  'احمد', 'محمد', 'محمود', 'علي', 'عمر', 'عمرو', 'ابراهيم', 'مصطفي', 'مصطفى', 'حسن',
  'حسين', 'يوسف', 'كريم', 'طارق', 'خالد', 'ماجد', 'وليد', 'شريف', 'سامح', 'حازم',
  'ايمن', 'أيمن', 'اسلام', 'إسلام', 'عصام', 'مروان', 'زياد', 'فادي', 'مينا', 'جورج',
  'بيتر', 'بيشوي', 'حسام', 'هاني', 'نبيل', 'وائل', 'رامي', 'شادي', 'باسم', 'باسل',
  'ادهم', 'أدهم', 'سيف', 'حمزة', 'حمزه', 'انس', 'أنس', 'مالك', 'يحيى', 'يحيي',
  'ادم', 'آدم', 'بلال', 'ياسين', 'اشرف', 'أشرف', 'مختار', 'سامي', 'فارس', 'معاذ',
  'عادل', 'سعيد', 'صلاح', 'ممدوح', 'تامر', 'مدحت', 'بهاء', 'علاء', 'عاطف', 'اشرف',
  'صبري', 'شوقي', 'جمال', 'كمال', 'سامر', 'مازن', 'يامن', 'سليمان', 'داود', 'صالح'
]);

const MALE_PREFIXES_AR = ['عبد', 'ابو', 'أبو'];

const FEMALE_NAMES_AR = new Set([
  'سارة', 'ساره', 'نور', 'نوران', 'مريم', 'اية', 'آية', 'ايه', 'فاطمة', 'فاطمه',
  'ياسمين', 'ريم', 'رنا', 'سلمى', 'سلمي', 'مي', 'ندى', 'ندي', 'منى', 'مني',
  'هبة', 'هبه', 'دينا', 'دعاء', 'اسراء', 'إسراء', 'اسماء', 'أسماء', 'ايمان', 'إيمان',
  'رضوى', 'رضوي', 'رؤى', 'رؤي', 'منة', 'منه', 'حبيبة', 'حبيبه', 'فريدة', 'فريده',
  'شهد', 'جنى', 'جني', 'جودي', 'ملك', 'كارما', 'ليلى', 'ليلي', 'زينب', 'أميمة',
  'هاجر', 'نسمة', 'روان', 'نورهان', 'داليا', 'ريهام', 'غادة', 'غاده', 'نهى', 'نهي',
  'شروق', 'صفاء', 'وفاء', 'ولاء', 'لمياء', 'شيماء', 'ابتسام', 'رشا', 'نجلاء', 'عبير',
  'اميرة', 'أميرة', 'خلود', 'تسنيم', 'تقى', 'تقي', 'اروى', 'أروى', 'يارا', 'لارا'
]);

const MALE_NAMES_EN = new Set([
  'ahmed', 'ahmad', 'mohamed', 'mohammed', 'muhammad', 'mahmoud', 'mahmood', 'ali',
  'omar', 'amr', 'ibrahim', 'mostafa', 'mustafa', 'moustafa', 'hassan', 'hasan',
  'hussein', 'hussien', 'youssef', 'yousef', 'joseph', 'kareem', 'karim', 'tarek',
  'tariq', 'khaled', 'khalid', 'maged', 'walid', 'waleed', 'sherif', 'shereef',
  'sameh', 'hazem', 'ayman', 'islam', 'eslam', 'essam', 'issam', 'marwan', 'marouan',
  'ziad', 'zeyad', 'fady', 'fadi', 'mina', 'george', 'peter', 'beshoy', 'bishoy',
  'hossam', 'hany', 'hani', 'nabil', 'wael', 'ramy', 'rami', 'shady', 'shadi',
  'bassem', 'basem', 'basel', 'adham', 'seif', 'saif', 'hamza', 'anas', 'malek',
  'yahia', 'yahya', 'adam', 'belal', 'bilal', 'yassin', 'yasseen', 'yaseen',
  'ashraf', 'mokhtar', 'samy', 'sami', 'tamer', 'medhat', 'alaa', 'atef', 'gamal'
]);

const FEMALE_NAMES_EN = new Set([
  'sara', 'sarah', 'nour', 'nouran', 'mariam', 'maryam', 'aya', 'ayah', 'fatma',
  'fatima', 'yasmin', 'yasmine', 'reem', 'rana', 'salma', 'mai', 'may', 'nada',
  'mona', 'heba', 'dina', 'doa', 'doaa', 'esraa', 'israa', 'asmaa', 'eman', 'iman',
  'radwa', 'roaa', 'menna', 'habiba', 'farida', 'shahd', 'jana', 'jodi', 'judy',
  'malak', 'karma', 'layla', 'laila', 'zeinab', 'zainab', 'hager', 'nesma', 'rawan',
  'nourhan', 'dalia', 'reham', 'ghada', 'noha', 'shrouk', 'shorouk', 'amira', 'yara'
]);

/**
 * Normalize Arabic string: strips harakat, standardizes alef, yaa, taa marbuta
 */
function normalizeArabic(str) {
  if (!str) return '';
  return str
    .replace(/[\u064B-\u0652]/g, '') // remove tashkeel
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .trim();
}

/**
 * Extracts first name and cleans punctuation / titles
 */
function extractFirstName(fullName) {
  if (!fullName || typeof fullName !== 'string') return '';
  // Clean emojis, titles (Dr., Eng., أ/د/مهندس)
  const cleaned = fullName
    .replace(/^(?:dr\.?|eng\.?|mr\.?|mrs\.?|ms\.?|د\.?|م\.?|أ\.?|أستاذ|دكتور|مهندس|باشمهندس)\s+/i, '')
    .trim();

  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';

  const normPart0 = normalizeArabic(parts[0]);
  // Handle compound names like "عبد الرحمن" or "ابو بكر"
  if (parts.length > 1 && MALE_PREFIXES_AR.includes(normPart0)) {
    return `${parts[0]} ${parts[1]}`;
  }
  if (parts.length > 1 && parts[0].toLowerCase() === 'abdel' || parts[0].toLowerCase() === 'abdul') {
    return `${parts[0]} ${parts[1]}`;
  }

  return parts[0];
}

/**
 * Detects gender from customer full name or first name.
 *
 * @param {string} fullName
 * @returns {{ gender: 'MALE' | 'FEMALE' | 'UNKNOWN', confidence: number, firstName: string, instruction: string }}
 */
function detectGenderFromName(fullName) {
  const firstName = extractFirstName(fullName);
  if (!firstName) {
    return {
      gender: 'UNKNOWN',
      confidence: 0,
      firstName: '',
      instruction: 'خاطب العميل بصيغة محايدة ومهذبة.'
    };
  }

  const normAr = normalizeArabic(firstName);
  const lowerEn = firstName.toLowerCase().replace(/[^a-z]/g, '');

  // 1. Check Compound Arabic Male Names (عبد الرحمن, عبد الله...)
  if (normAr.startsWith('عبد ') || normAr.startsWith('ابو ')) {
    return {
      gender: 'MALE',
      confidence: 0.98,
      firstName,
      instruction: `العميل رجل (اسمه "${fullName.trim()}") — خاطبه بصيغة المذكر المحترمة فقط (مثل: حضرتك، يا فندم، ممكن توضحلي)، وممنوع منعاً باتاً تأنيث الخطاب له (ممنوع تقوليلي/توضحيلي).`
    };
  }

  // 2. Check Arabic Dictionary
  if (MALE_NAMES_AR.has(normAr)) {
    return {
      gender: 'MALE',
      confidence: 0.95,
      firstName,
      instruction: `العميل رجل (اسمه "${fullName.trim()}") — خاطبه بصيغة المذكر المحترمة فقط (مثل: حضرتك، يا فندم، ممكن توضحلي)، وممنوع منعاً باتاً تأنيث الخطاب له (ممنوع تقوليلي/توضحيلي).`
    };
  }
  if (FEMALE_NAMES_AR.has(normAr)) {
    return {
      gender: 'FEMALE',
      confidence: 0.95,
      firstName,
      instruction: `العميل سيدة (اسمها "${fullName.trim()}") — خاطبيها بصيغة المؤنث المهذبة (مثل: حضرتك، يا فندم، ممكن توضحيلي).`
    };
  }

  // 3. Check English / Transliterated Dictionary
  if (MALE_NAMES_EN.has(lowerEn)) {
    return {
      gender: 'MALE',
      confidence: 0.95,
      firstName,
      instruction: `العميل رجل (اسمه "${fullName.trim()}") — خاطبه بصيغة المذكر المحترمة فقط (مثل: حضرتك، يا فندم، ممكن توضحلي)، وممنوع منعاً باتاً تأنيث الخطاب له (ممنوع تقوليلي/توضحيلي).`
    };
  }
  if (FEMALE_NAMES_EN.has(lowerEn)) {
    return {
      gender: 'FEMALE',
      confidence: 0.95,
      firstName,
      instruction: `العميل سيدة (اسمها "${fullName.trim()}") — خاطبيها بصيغة المؤنث المهذبة (مثل: حضرتك، يا فندم، ممكن توضحيلي).`
    };
  }

  return {
    gender: 'UNKNOWN',
    confidence: 0,
    firstName,
    instruction: `اسم العميل "${fullName.trim()}" — خاطبه بأسلوب راقٍ ومحايد.`
  };
}

module.exports = {
  detectGenderFromName,
  extractFirstName,
  normalizeArabic
};
