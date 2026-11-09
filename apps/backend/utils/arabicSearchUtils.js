/**
 * Utilities for Arabic text normalization, synonym expansion,
 * and building product search filters for PostgreSQL / Prisma.
 */

// Diacritics (Tashkeel) regex
const TASHKEEL_REGEX = /[\u064B-\u065F\u0670]/g;

// Tatweel (Kashida)
const TATWEEL_REGEX = /[\u0640]/g;

/**
 * Normalizes an Arabic string:
 * - Removes tashkeel (diacritics)
 * - Removes tatweel
 * - Normalizes alefs (أ, إ, آ, ٱ -> ا)
 * - Normalizes taa marbuta (ة -> ه)
 * - Normalizes yaa (ى -> ي)
 * - Normalizes hamza forms (ؤ -> و, ئ -> ي)
 * - Lowercase & trim
 */
function normalizeArabicText(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(TASHKEEL_REGEX, '')
    .replace(TATWEEL_REGEX, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

// Synonyms map: each entry is a set of related keywords (Arabic + English)
const SYNONYM_GROUPS = [
  // Shoes / Footwear
  [
    'حذاء',
    'احذيه',
    'احذية',
    'كوتشي',
    'كوتشى',
    'سنيكرز',
    'سنيكر',
    'سنيكرات',
    'شوز',
    'جزمه',
    'جزمة',
    'بوت',
    'هاف بوت',
    'shoes',
    'shoe',
    'sneaker',
    'sneakers',
    'boot',
    'boots',
  ],
  // Common Colors
  ['ابيض', 'أبيض', 'إبيض', 'آبيض', 'white'],
  ['اسود', 'أسود', 'إسود', 'black'],
  ['احمر', 'أحمر', 'إحمر', 'red'],
  ['ازرق', 'أزرق', 'إزرق', 'blue'],
  ['اخضر', 'أخضر', 'إخضر', 'green'],
  ['اصفر', 'أصفر', 'إصفر', 'yellow'],
  ['رمادي', 'رمادى', 'رصاصي', 'رصاصى', 'gray', 'grey'],
  ['بني', 'بنى', 'brown'],
  ['بيج', 'beige'],
  ['كحلي', 'كحلى', 'navy'],
  ['وردي', 'وردى', 'بمبي', 'بمبى', 'فوشيا', 'pink'],
];

/**
 * Generates common Arabic spelling variations of a word (e.g. with/without Hamza, Haa/Taa, etc.)
 */
function generateArabicSpellingVariants(word) {
  if (!word || typeof word !== 'string') return [];
  const clean = word.trim().toLowerCase();
  const norm = normalizeArabicText(clean);
  const variants = new Set([clean, norm]);

  // Alef variations at the beginning
  if (norm.startsWith('ا')) {
    variants.add('أ' + norm.slice(1));
    variants.add('إ' + norm.slice(1));
    variants.add('آ' + norm.slice(1));
  } else if (/^[أإآ]/.test(clean)) {
    variants.add('ا' + clean.slice(1));
  }

  // Taa marbuta / Haa variations at the end
  if (norm.endsWith('ه')) {
    variants.add(norm.slice(0, -1) + 'ة');
  } else if (norm.endsWith('ة')) {
    variants.add(norm.slice(0, -1) + 'ه');
  }

  // Yaa / Alef maqsura variations at the end
  if (norm.endsWith('ي')) {
    variants.add(norm.slice(0, -1) + 'ى');
  } else if (norm.endsWith('ى')) {
    variants.add(norm.slice(0, -1) + 'ي');
  }

  return Array.from(variants).filter((v) => v.length > 0);
}

/**
 * Expands a search token to include all synonyms and spelling permutations.
 */
function getSynonymsAndVariants(token) {
  if (!token || typeof token !== 'string') return [];
  const clean = token.trim().toLowerCase();
  const norm = normalizeArabicText(clean);
  const terms = new Set([clean, norm]);

  // Check synonym groups
  for (const group of SYNONYM_GROUPS) {
    const normalizedGroup = group.map((item) => normalizeArabicText(item));
    if (normalizedGroup.includes(norm) || group.includes(clean)) {
      for (const item of group) {
        terms.add(item);
        terms.add(normalizeArabicText(item));
      }
    }
  }

  // Generate spelling variations for all gathered terms
  const allVariants = new Set();
  for (const term of terms) {
    const variants = generateArabicSpellingVariants(term);
    for (const v of variants) {
      allVariants.add(v);
    }
  }

  return Array.from(allVariants).filter((t) => t.length > 0);
}

/**
 * Builds a Prisma `where` clause for product search across:
 * - Product name
 * - Product description
 * - Product sku
 * - Product slug
 * - Category name
 * - Category slug
 * - Product variants sku & name
 */
function buildProductSearchFilter(rawSearch) {
  if (!rawSearch || typeof rawSearch !== 'string') return null;
  const clean = rawSearch.trim().slice(0, 100);
  if (!clean) return null;

  const tokens = clean.split(/\s+/).filter(Boolean).slice(0, 6);
  if (tokens.length === 0) return null;

  const tokenFilters = tokens.map((token) => {
    const variants = getSynonymsAndVariants(token);
    const fieldConditions = [];

    for (const v of variants) {
      fieldConditions.push({ name: { contains: v, mode: 'insensitive' } });
      fieldConditions.push({ description: { contains: v, mode: 'insensitive' } });
      fieldConditions.push({ sku: { contains: v, mode: 'insensitive' } });
      fieldConditions.push({ slug: { contains: v, mode: 'insensitive' } });
      fieldConditions.push({ category: { name: { contains: v, mode: 'insensitive' } } });
      fieldConditions.push({ category: { slug: { contains: v, mode: 'insensitive' } } });
      fieldConditions.push({
        productVariants: {
          some: {
            OR: [
              { sku: { contains: v, mode: 'insensitive' } },
              { name: { contains: v, mode: 'insensitive' } },
            ],
          },
        },
      });
    }

    return { OR: fieldConditions };
  });

  if (tokenFilters.length === 1) {
    return tokenFilters[0];
  }

  return { AND: tokenFilters };
}

module.exports = {
  buildProductSearchFilter,
  generateArabicSpellingVariants,
  getSynonymsAndVariants,
  normalizeArabicText,
  SYNONYM_GROUPS,
};
