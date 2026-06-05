/**
 * @module agentSemanticRouterService
 * @description SOTA 2026 local semantic routing layer for merchant intent classification.
 * Matches unstructured Arabic/Egyptian queries against canonical intent templates.
 */

const INTENT_REFERENCE_TEMPLATES = {
  'hr.attendance.today': [
    'مين جه انهارده',
    'مين محضروش انهارده',
    'الموظفين الغايبين النهارده',
    'كشف الحضور والغياب اليوم',
    'مين سجل بصمه النهارده',
    'مين غايب ومين حاضر',
    'مين من الموظفين متاخر',
    'الحضور اليوم',
    'الغايبين النهارده',
    'مين مجاش النهارده',
    'مين مجاش الشغل انهارده',
    'مين سجل حضور اليوم',
    'في حد غايب النهارده',
    'الموظفين اللي سجلوا بصمة',
    'مين سجل دخول الشغل اليوم',
    'الغياب انهارده شكله ايه',
    'وريني حضور الموظفين اليوم',
    'كشف الحضور اليومي',
  ],
  'orders.create_draft': [
    'عايز اعمل اوردر',
    'ضيف طلب جديد للعميل',
    'اعمل مسودة اوردر',
    'سجل اوردر جديد للعميل',
    'اعملي طلب باسم العميل',
    'انشئ مسودة طلب للعميل',
    'عايز اعمل طلب جديد',
    'سجل مسوده اوردر جديد',
  ],
  'products.manage': [
    'عايز اضيف منتج جديد',
    'سجل سلعه جديده',
    'ضيف كوتشي جديد للمخزن',
    'انشئ منتج جديد في الكتالوج',
    'ضيف منتجات جديدة للمحل',
    'اضافة منتج جديد للمخازن',
    'اعمل منتج جديد بسعر واسم',
    'ارفع صنف جديد للمخزن',
    'سجل قطعة جديدة في المخزن',
    'ضيف بضاعة جديدة',
    'ضيف تيشيرت جديد',
    'سجل كوتش جديد في السيستم',
    'انشئ كارت منتج جديد',
    'ضيف صنف جديد بسعر',
    'عايز ارفع منتج جديد للكتالوج',
    'انشئ صنف جديد في المحل',
    'ضيف سلعة جديدة للسيستم',
  ],
  'agents.manage': [
    'اعمل ايجنت جديد',
    'عين وكيل جديد للمبيعات',
    'عايز وكيل للرد على الرسايل',
    'وظف ايجنت جديد للدعم',
    'انشئ وكيل جديد للشركة',
    'ضيف ايجنت جديد عباس',
    'تعديل اسم الوكيل المقترح',
    'غير اسم عباس',
  ],
  'audit.read': [
    'شوف الايجنت عمل ايه',
    'راجع قرارات الوكيل',
    'سجل عمليات الايجنت',
    'هات العمليات اللي نفذها الوكيل',
    'اخر قرارات اتخذها الايجنت',
    'اعرض لوج الوكيل',
    'سجل القرارات والادوات للايجنت',
  ],
  'skills.manage': [
    'اعمل مهارة جديدة للايجنت',
    'ضيف مهارة مخصصة للاستجابة',
    'انشئ مهاره جديده عباس',
    'صمم مهارة جديدة للوكلاء',
    'ضيف مهارة تالتة للايجنت',
  ],
  'sales': [
    'الارباح كام النهارده',
    'ملخص المبيعات والايرادات',
    'دخل الشركة كام اليوم',
    'اعرض تقرير المبيعات',
    'كسبنا كام النهارده',
    'ملخص الدخل اليومي',
  ],
  'orders': [
    'تقرير عن الطلبات',
    'اعرض الطلبات الاخيرة',
    'هات ملخص الاوردرات اليوم',
    'عايز اراجع الطلبات المعلقة',
    'رقم الاوردر ده كام',
    'بحث عن الطلب',
  ],
  'inventory': [
    'المخزون ناقص',
    'ايه المنتجات منخفضة المخزون',
    'عايز اراجع ستوك المخازن',
    'الكميات المتبقية من المنتجات',
    'تقرير بضاعة المخزن',
  ],
  'products': [
    'ابحث عن منتج في الكتالوج',
    'هات قائمة المنتجات',
    'اعرض الكتالوج الحالي',
    'اسعار المنتجات دي كام',
    'وريني المنتجات المتاحة',
  ],
  'company.snapshot': [
    'ملخص اداء الشركة اليوم',
    'حالة الشركة دلوقتي',
    'اعرض داشبورد الشركة',
    'تقرير عام عن الشركة',
  ],
  'general.chat': [
    'ازيك يا عباس',
    'السلام عليكم',
    'وعليكم السلام',
    'صباح الخير يا عباس',
    'مساء الخير',
    'أهلاً بك',
    'اهلا يا عباس',
    'كيف حالك اليوم',
    'شغل عالي يا عباس',
    'شكرا ليك',
  ],
};

const STOP_WORDS = new Set([
  'من', 'إلى', 'عن', 'على', 'في', 'هو', 'هي', 'تم', 'ان', 'حتي', 'او', 'و', 'ف', 'ب', 'ك',
  'the', 'a', 'an', 'and', 'or', 'but', 'is', 'are', 'in', 'on', 'at'
]);

function normalizeText(text = '') {
  return String(text || '')
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[^\p{L}\p{N}_\s.-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getNgrams(text, n) {
  const ngrams = [];
  for (let i = 0; i <= text.length - n; i++) {
    ngrams.push(text.slice(i, i + n));
  }
  return ngrams;
}

/**
 * Calculates similarity between two normalized strings using hybrid overlap
 */
function getSimilarity(query, reference) {
  const queryWords = query.split(/\s+/).filter(w => w && !STOP_WORDS.has(w));
  const refWords = reference.split(/\s+/).filter(w => w && !STOP_WORDS.has(w));
  
  if (queryWords.length === 0 || refWords.length === 0) return 0;

  // 1. Word overlap score with containment bias
  const wordOverlap = queryWords.filter(w => refWords.includes(w)).length;
  const isQueryWordLonger = queryWords.length > refWords.length;
  const wordDivisor = isQueryWordLonger
    ? (refWords.length + (queryWords.length - refWords.length) * 0.1)
    : Math.max(queryWords.length, refWords.length);
  const wordScore = wordOverlap / wordDivisor;

  // 2. Character bigram overlap with containment bias
  const queryBigrams = getNgrams(query, 2).filter(b => b.trim().length === 2);
  const refBigrams = getNgrams(reference, 2).filter(b => b.trim().length === 2);
  const bigramOverlap = queryBigrams.filter(b => refBigrams.includes(b)).length;
  const isQueryBigramLonger = queryBigrams.length > refBigrams.length;
  const bigramDivisor = isQueryBigramLonger
    ? (refBigrams.length + (queryBigrams.length - refBigrams.length) * 0.1)
    : Math.max(queryBigrams.length, refBigrams.length);
  const bigramScore = queryBigrams.length > 0 && refBigrams.length > 0
    ? bigramOverlap / bigramDivisor
    : 0;

  // 3. Character trigram overlap with containment bias
  const queryTrigrams = getNgrams(query, 3).filter(t => t.trim().length === 3);
  const refTrigrams = getNgrams(reference, 3).filter(t => t.trim().length === 3);
  const trigramOverlap = queryTrigrams.filter(t => refTrigrams.includes(t)).length;
  const isQueryTrigramLonger = queryTrigrams.length > refTrigrams.length;
  const trigramDivisor = isQueryTrigramLonger
    ? (refTrigrams.length + (queryTrigrams.length - refTrigrams.length) * 0.1)
    : Math.max(queryTrigrams.length, refTrigrams.length);
  const trigramScore = queryTrigrams.length > 0 && refTrigrams.length > 0
    ? trigramOverlap / trigramDivisor
    : 0;

  // Combine scores
  return wordScore * 0.4 + bigramScore * 0.3 + trigramScore * 0.3;
}

/**
 * Matches user query against intent templates
 * @param {string} message
 * @param {number} threshold Default 0.58 to support shorter dialect entries
 * @returns {object|null} Matched intent candidate with confidence, or null
 */
function matchIntent(message, threshold = 0.58) {
  const normalizedQuery = normalizeText(message);
  if (!normalizedQuery) return null;

  let bestIntent = null;
  let bestScore = 0;
  let matchedPhrase = '';

  for (const [intent, templates] of Object.entries(INTENT_REFERENCE_TEMPLATES)) {
    for (const template of templates) {
      const normalizedTemplate = normalizeText(template);
      const score = getSimilarity(normalizedQuery, normalizedTemplate);
      if (score > bestScore) {
        bestScore = score;
        bestIntent = intent;
        matchedPhrase = template;
      }
    }
  }

  if (bestScore >= threshold) {
    return {
      intent: bestIntent,
      confidence: Math.min(1, Number(bestScore.toFixed(4))),
      matchedPhrase,
    };
  }

  return null;
}

module.exports = {
  matchIntent,
  normalizeText,
  getSimilarity,
};
