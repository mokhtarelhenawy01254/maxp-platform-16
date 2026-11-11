/**
 * Utilities for Arabic text normalization, synonym expansion,
 * and building product search filters for PostgreSQL / Prisma.
 *
 * Canonical choice for Taa Marbuta / Haa: `ة` -> `ه` (matches the most common
 * normalized form used across Swan/storefront product and variant lookup data).
 */

// Diacritics (Tashkeel) regex — covers \u064B-\u0652 plus extended Arabic marks (\u0653-\u065F, \u0670)
const TASHKEEL_REGEX = /[\u064B-\u065F\u0670]/g;

// Tatweel (Kashida)
const TATWEEL_REGEX = /\u0640/g;

// Arabic character detection
const ARABIC_CHAR_REGEX = /[\u0600-\u06FF]/;

/**
 * Normalizes an Arabic/mixed string:
 * - Removes tashkeel (diacritics \u064B-\u065F, \u0670)
 * - Removes tatweel (\u0640)
 * - Normalizes alefs (أ, إ, آ, ٱ -> ا)
 * - Normalizes taa marbuta (ة -> ه)
 * - Normalizes yaa / alef maqsura (ى -> ي)
 * - Normalizes hamza forms (ؤ -> و, ئ -> ي)
 * - Lowercase, trim, and collapse spaces
 */
function normalizeArabic(input) {
  if (input === null || input === undefined || typeof input !== 'string') return '';
  return input
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

// Backwards-compatible alias
const normalizeArabicText = normalizeArabic;

function containsArabicText(input) {
  return typeof input === 'string' && ARABIC_CHAR_REGEX.test(input);
}

// Broad umbrella footwear terms that expand to all shoe subcategories (one-way)
const FOOTWEAR_BROAD_TRIGGERS = new Set([
  'حذاء',
  'احذيه',
  'الأحذيه',
  'الاحذيه',
  'shoes',
  'shoe',
]);

const FOOTWEAR_ALL_KEYWORDS = [
  'حذاء',
  'احذيه',
  'احذية',
  'أحذية',
  'أحذيه',
  'الأحذية',
  'كوتشي',
  'كوتشى',
  'كوتشيات',
  'سنيكرز',
  'سنيكر',
  'سنيكرات',
  'شوز',
  'شوزات',
  'جزمه',
  'جزمة',
  'جزم',
  'بوت',
  'هاف بوت',
  'shoes',
  'shoe',
  'sneaker',
  'sneakers',
  'boot',
  'boots',
];

// Symmetric synonym groups (exact equivalent variants or tight sub-type synonyms)
// Kept isolated for specific terms like 'سنيكرز', 'كوتشي', 'sneaker' so their counts stay unchanged.
const SYNONYM_GROUPS = [
  ['كوتشي', 'كوتشى', 'كوتشيات'],
  ['سنيكرز', 'سنيكر', 'سنيكرات'],
  ['sneaker', 'sneakers'],
  ['شوز', 'شوزات'],
  ['جزمه', 'جزمة', 'جزم'],
  ['بوت', 'هاف بوت', 'boot', 'boots'],
  // Common Colors
  ['ابيض', 'أبيض', 'إبيض', 'آبيض', 'الابيض', 'الأبيض', 'بيضاء', 'white'],
  ['اسود', 'أسود', 'إسود', 'الاسود', 'الأسود', 'سوداء', 'black'],
  ['احمر', 'أحمر', 'إحمر', 'حمراء', 'red'],
  ['ازرق', 'أزرق', 'إزرق', 'زرقاء', 'blue'],
  ['اخضر', 'أخضر', 'إخضر', 'خضراء', 'green'],
  ['اصفر', 'أصفر', 'إصفر', 'صفراء', 'yellow'],
  ['رمادي', 'رمادى', 'رصاصي', 'رصاصى', 'gray', 'grey'],
  ['بني', 'بنى', 'brown'],
  ['بيج', 'beige'],
  ['كحلي', 'كحلى', 'navy'],
  ['وردي', 'وردى', 'بمبي', 'بمبى', 'فوشيا', 'pink'],
];

/**
 * Generates common Arabic spelling variations of a word (combining Alef/Hamza,
 * "ال" + Alef/Hamza, Taa Marbuta/Haa, and Yaa/Alef Maqsura).
 */
function generateArabicSpellingVariants(word) {
  if (!word || typeof word !== 'string') return [];
  const clean = word.trim().toLowerCase();
  const norm = normalizeArabic(clean);
  if (!norm && !clean) return [];

  const stems = new Set();
  if (clean) stems.add(clean);
  if (norm) stems.add(norm);

  // Alef variations at start or right after "ال"
  if (norm.startsWith('ا')) {
    const rest = norm.slice(1);
    stems.add('ا' + rest);
    stems.add('أ' + rest);
    stems.add('إ' + rest);
    stems.add('آ' + rest);
  }
  if (norm.startsWith('ال') && norm.length > 3 && norm[2] === 'ا') {
    const rest = norm.slice(3);
    stems.add('ال' + 'ا' + rest);
    stems.add('ال' + 'أ' + rest);
    stems.add('ال' + 'إ' + rest);
    stems.add('ال' + 'آ' + rest);
  }
  if (/^[أإآٱ]/.test(clean)) {
    stems.add('ا' + clean.slice(1));
  }

  // Combine stems with ending ة/ه and ى/ي variations
  const variants = new Set(stems);
  for (const stem of stems) {
    if (!containsArabicText(stem)) continue;

    if (stem.endsWith('ه')) {
      variants.add(stem.slice(0, -1) + 'ة');
    } else if (stem.endsWith('ة')) {
      variants.add(stem.slice(0, -1) + 'ه');
    }

    if (stem.endsWith('ي')) {
      variants.add(stem.slice(0, -1) + 'ى');
    } else if (stem.endsWith('ى')) {
      variants.add(stem.slice(0, -1) + 'ي');
    }
  }

  return Array.from(variants).filter((v) => v.length > 0);
}

/**
 * Expands a search token to include normalized text, spelling variants, and synonyms.
 */
function getSynonymsAndVariants(token) {
  if (!token || typeof token !== 'string') return [];
  const clean = token.trim().toLowerCase();
  const norm = normalizeArabic(clean);
  const withoutAl = norm.startsWith('ال') && norm.length > 3 ? norm.slice(2) : norm;
  const terms = new Set([clean, norm]);

  // One-way expansion for broad footwear queries (e.g. حذاء / احذيه / shoes)
  if (FOOTWEAR_BROAD_TRIGGERS.has(norm) || FOOTWEAR_BROAD_TRIGGERS.has(withoutAl)) {
    for (const item of FOOTWEAR_ALL_KEYWORDS) {
      terms.add(item);
      terms.add(normalizeArabic(item));
    }
  }

  // Symmetric synonym groups (colors + tight sub-type spellings)
  for (const group of SYNONYM_GROUPS) {
    const normalizedGroup = group.map((item) => normalizeArabic(item));
    if (
      normalizedGroup.includes(norm) ||
      normalizedGroup.includes(withoutAl) ||
      group.includes(clean)
    ) {
      for (const item of group) {
        terms.add(item);
        terms.add(normalizeArabic(item));
      }
    }
  }

  const allVariants = new Set();
  for (const term of terms) {
    for (const v of generateArabicSpellingVariants(term)) {
      allVariants.add(v);
    }
  }

  return Array.from(allVariants).filter((t) => t.length > 0);
}

/**
 * Builds a normalized list of query term sets (one set per token) for product-side matching.
 */
function getNormalizedSearchTokenGroups(rawSearch) {
  if (!rawSearch || typeof rawSearch !== 'string') return [];
  const clean = rawSearch.trim().slice(0, 100);
  if (!clean) return [];

  const tokens = clean.split(/\s+/).filter(Boolean).slice(0, 6);
  return tokens.map((token) => {
    const variants = getSynonymsAndVariants(token);
    const normalizedSet = new Set();
    const normToken = normalizeArabic(token);
    if (normToken) normalizedSet.add(normToken);
    for (const v of variants) {
      const nv = normalizeArabic(v);
      if (nv) normalizedSet.add(nv);
    }
    return Array.from(normalizedSet);
  });
}

/**
 * Normalizes a product's searchable fields using `normalizeArabic` and returns
 * the combined normalized searchable string.
 */
function buildNormalizedProductSearchText(product) {
  if (!product || typeof product !== 'object') return '';
  const parts = [
    product.name,
    product.nameEn,
    product.description,
    product.tags,
    product.sku,
    product.slug,
    product.category?.name,
    product.category?.slug,
  ];

  if (Array.isArray(product.productVariants)) {
    for (const variant of product.productVariants) {
      if (!variant) continue;
      parts.push(variant.name);
      parts.push(variant.sku);
    }
  }

  return parts
    .map((part) => normalizeArabic(typeof part === 'string' ? part : String(part || '')))
    .filter(Boolean)
    .join(' ');
}

/**
 * Matches a product against rawSearch by normalizing BOTH sides with `normalizeArabic`.
 */
function matchesNormalizedProduct(product, rawSearch) {
  const tokenGroups = getNormalizedSearchTokenGroups(rawSearch);
  if (tokenGroups.length === 0) return true;

  const normalizedProductText = buildNormalizedProductSearchText(product);
  if (!normalizedProductText) return false;

  return tokenGroups.every((normalizedTerms) =>
    normalizedTerms.some((term) => normalizedProductText.includes(term)),
  );
}

/**
 * Builds a Prisma `where` clause for product search across:
 * - Product name
 * - Product description
 * - Product tags
 * - Product sku
 * - Product slug
 * - Category name & slug
 * - Product variants sku & name
 *
 * Searches BOTH normalized Arabic tokens/variants AND original search tokens
 * to guarantee zero regression on exact/English queries.
 */
function buildProductSearchFilter(rawSearch) {
  if (!rawSearch || typeof rawSearch !== 'string') return null;
  const clean = rawSearch.trim().slice(0, 100);
  if (!clean) return null;

  const tokens = clean.split(/\s+/).filter(Boolean).slice(0, 6);
  if (tokens.length === 0) return null;

  const tokenFilters = tokens.map((token) => {
    const rawLower = token.trim().toLowerCase();
    const norm = normalizeArabic(token);
    const variants = Array.from(
      new Set([rawLower, norm, ...getSynonymsAndVariants(token)].filter(Boolean)),
    );
    const fieldConditions = [];

    for (const v of variants) {
      fieldConditions.push({ name: { contains: v, mode: 'insensitive' } });
      fieldConditions.push({ description: { contains: v, mode: 'insensitive' } });
      fieldConditions.push({ tags: { contains: v, mode: 'insensitive' } });
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
  buildNormalizedProductSearchText,
  buildProductSearchFilter,
  containsArabicText,
  generateArabicSpellingVariants,
  getNormalizedSearchTokenGroups,
  getSynonymsAndVariants,
  matchesNormalizedProduct,
  normalizeArabic,
  normalizeArabicText,
  SYNONYM_GROUPS,
};
