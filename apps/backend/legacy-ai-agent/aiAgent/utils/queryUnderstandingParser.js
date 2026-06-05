/**
 * @module queryUnderstandingParser
 * @description Query cleanup and deterministic filter validation for product search.
 * Customer intent and semantic slots must come from the LLM classifier/tool call.
 * 
 * Solves ISSUE #1: Query Understanding Layer
 * 
 * Input:  "كوتشي أبيض مقاس 44 رجالي تحت 500 جنيه"
 * Output: { color: 'white', size: '44', gender: 'men', maxPrice: 500, category: 'sneakers', cleanedQuery: '...' }
 */

const {
  normalizeProductColor,
  normalizeProductSize,
} = require('./productAttributeCanonicalizer');

// ──────────────────────────────────────────────────────────────────────────
// Size Extraction Patterns
// ──────────────────────────────────────────────────────────────────────────

const SIZE_PATTERNS = [
  // Arabic: مقاس 44, مقاس XL
  /(?:مقاس|مقاسي|المقاس|سايز|size)\s*[:=]?\s*(\d{1,3}|[XSML]{1,3}L?)/iu,
  // Bare number in shoe-size range (35-50) when preceded/followed by product tokens
  /\b(3[5-9]|4[0-9]|50)\b/,
  // Letter sizes
  /\b(XXS|XS|S|M|L|XL|XXL|XXXL|2XL|3XL|4XL)\b/i,
];

// ──────────────────────────────────────────────────────────────────────────
// Price Extraction Patterns
// ──────────────────────────────────────────────────────────────────────────

const PRICE_PATTERNS = [
  // "تحت 500 جنيه" / "أقل من 500"
  { regex: /(?:تحت|أقل من|اقل من|under|below|less than|max)\s*(\d[\d,.]*)/iu, type: 'max' },
  // "فوق 200 جنيه" / "أكثر من 200"
  { regex: /(?:فوق|أكثر من|اكثر من|أعلى من|اعلى من|above|over|more than|min)\s*(\d[\d,.]*)/iu, type: 'min' },
  // "من 200 لـ 500" / "200-500"
  { regex: /(?:من|from)\s*(\d[\d,.]*)\s*(?:لـ|ل|إلى|الى|to|-)\s*(\d[\d,.]*)/iu, type: 'range' },
  // "200-500" range notation
  { regex: /(\d[\d,.]*)\s*[-–—]\s*(\d[\d,.]*)\s*(?:جنيه|ج\.م|LE|EGP|ر\.س|SAR)?/iu, type: 'range' },
  // "بـ 300 جنيه" / "سعره 300"
  { regex: /(?:بـ|ب|سعره?|price)\s*(\d[\d,.]*)/iu, type: 'exact' },
];

// ──────────────────────────────────────────────────────────────────────────
// SKU / Code detection
// ──────────────────────────────────────────────────────────────────────────

const SKU_PATTERN = /\b([A-Z]{2,6}[-_]?\d{2,10})\b/i;

// ──────────────────────────────────────────────────────────────────────────
// Stop words to strip from search queries
// ──────────────────────────────────────────────────────────────────────────

// arabic-strings: internal-signal-start
const ARABIC_STOP_WORDS = new Set([
  'في', 'من', 'على', 'إلى', 'الى', 'هل', 'لو', 'عندكم', 'عندكو', 'فيه',
  'ممكن', 'عايز', 'عايزة', 'عاوز', 'عاوزة', 'محتاج', 'محتاجة',
  'ابي', 'أبي', 'أبغى', 'ابغى', 'بدي',
  'كم', 'ايه', 'إيه', 'ليه', 'ازاي', 'إزاي',
  'يا', 'يعني', 'بقا', 'بقى', 'كده', 'كدة', 'كدا',
  'اللي', 'الي', 'دي', 'ده', 'دا', 'هو', 'هي', 'هم',
  'لي', 'مني', 'عني', 'فين', 'وين',
  'جنيه', 'جنية', 'ريال', 'دولار',
  'please', 'want', 'need', 'show', 'me', 'give', 'find', 'get',
  'the', 'a', 'an', 'is', 'are', 'do', 'does', 'can', 'could',
]);
// arabic-strings: internal-signal-end

// ──────────────────────────────────────────────────────────────────────────
// Main Parser
// ──────────────────────────────────────────────────────────────────────────

/**
 * Parse a search query into structured filters + cleaned query text.
 * 
 * @param {string} rawQuery - Raw user query text
 * @param {object} [intentSlots] - Optional pre-extracted slots from intent classifier
 * @returns {ParsedQuery}
 * 
 * @typedef {object} ParsedQuery
 * @property {string} cleanedQuery - Query text with extracted tokens removed
 * @property {string} expandedQuery - Query text with synonyms appended
 * @property {string|null} size - Extracted size (e.g., '44', 'XL')
 * @property {string|null} color - Canonical English color (e.g., 'white')
 * @property {string|null} gender - Canonical gender (e.g., 'men', 'women')
 * @property {string|null} category - Resolved category (e.g., 'sneakers')
 * @property {number|null} minPrice - Min price constraint
 * @property {number|null} maxPrice - Max price constraint
 * @property {string|null} sku - Detected SKU/code
 * @property {boolean} isSKUQuery - Whether the query is primarily a SKU/code lookup
 * @property {boolean} isAbstractQuery - Whether the query is abstract/occasion-based (e.g., "حاجة للبحر")
 * @property {string} querySignature - Classification of query type for weight selection
 */
function parseSearchQuery(rawQuery, intentSlots = {}) {
  const query = String(rawQuery || '').trim();
  if (!query) {
    return _emptyResult();
  }

  let workingQuery = query;
  const extracted = {
    size: intentSlots.productSize || null,
    color: intentSlots.productColor || null,
    gender: null,
    category: null,
    minPrice: null,
    maxPrice: null,
    sku: null,
  };

  // 1. SKU detection
  const skuMatch = query.match(SKU_PATTERN);
  if (skuMatch) {
    extracted.sku = skuMatch[1];
    workingQuery = workingQuery.replace(skuMatch[0], ' ');
  }

  // 2. Price extraction
  for (const pricePattern of PRICE_PATTERNS) {
    const match = workingQuery.match(pricePattern.regex);
    if (match) {
      if (pricePattern.type === 'max') {
        extracted.maxPrice = parseFloat(match[1].replace(/,/g, ''));
      } else if (pricePattern.type === 'min') {
        extracted.minPrice = parseFloat(match[1].replace(/,/g, ''));
      } else if (pricePattern.type === 'range') {
        extracted.minPrice = parseFloat(match[1].replace(/,/g, ''));
        extracted.maxPrice = parseFloat(match[2].replace(/,/g, ''));
      } else if (pricePattern.type === 'exact') {
        const val = parseFloat(match[1].replace(/,/g, ''));
        extracted.minPrice = val * 0.8;
        extracted.maxPrice = val * 1.2;
      }
      workingQuery = workingQuery.replace(match[0], ' ');
      break;
    }
  }

  // 3. Size cleanup. Size slot extraction is model-owned; this only removes
  // a supplied size mention from the text search query and canonicalizes it.
  if (extracted.size) {
    for (const sizePattern of SIZE_PATTERNS) {
      workingQuery = workingQuery.replace(sizePattern, ' ');
    }
  }

  // 4. Clean generic search text without deriving semantic slots from tokens.
  const tokens = workingQuery.split(/\s+/).filter(Boolean);
  const remainingTokens = [];

  for (const token of tokens) {
    const lower = token.toLowerCase();

    // Skip stop words
    if (ARABIC_STOP_WORDS.has(lower)) continue;

    remainingTokens.push(token);
  }

  // Canonicalize model/tool-provided slots.
  if (extracted.size) {
    extracted.size = normalizeProductSize(extracted.size);
  }
  if (extracted.color) {
    extracted.color = normalizeProductColor(extracted.color);
  }
  if (intentSlots.productCategory) {
    extracted.category = String(intentSlots.productCategory).trim() || null;
  }
  if (intentSlots.productGender) {
    extracted.gender = String(intentSlots.productGender).trim() || null;
  }

  // 5. Build cleaned query
  const cleanedQuery = remainingTokens.join(' ').replace(/\s+/g, ' ').trim();

  // 6. Determine query signature for dynamic weight selection
  const querySignature = _classifyQuerySignature(query, extracted);

  return {
    cleanedQuery,
    expandedQuery: cleanedQuery || query,
    size: extracted.size,
    color: extracted.color,
    gender: extracted.gender,
    category: extracted.category,
    minPrice: extracted.minPrice,
    maxPrice: extracted.maxPrice,
    sku: extracted.sku,
    isSKUQuery: Boolean(extracted.sku && cleanedQuery.length < 5),
    isAbstractQuery: querySignature === 'abstract',
    querySignature,
  };
}

/**
 * Classify the query type for dynamic weight selection.
 * @param {string} rawQuery
 * @param {object} extracted
 * @returns {'sku' | 'filtered' | 'abstract' | 'misspelled' | 'standard'}
 */
function _classifyQuerySignature(rawQuery, extracted) {
  // SKU/code query: mostly alphanumeric with dashes
  if (extracted.sku && rawQuery.replace(/\s+/g, '').length < 15) {
    return 'sku';
  }

  // Abstract/occasion-based query: resolved category from occasion mapping but no specific product name
  const lowerQuery = rawQuery.toLowerCase();
  // arabic-strings: internal-signal-start
  const abstractKeywords = ['حاجة', 'حاجه', 'شيء', 'شي', 'حاجه حلوة', 'something', 'anything'];
  // arabic-strings: internal-signal-end
  if (abstractKeywords.some(k => lowerQuery.includes(k))) {
    return 'abstract';
  }

  // Filtered query: has specific size/color/price constraints
  if (extracted.size || extracted.color || extracted.minPrice || extracted.maxPrice) {
    return 'filtered';
  }

  // Check for potential misspellings: short tokens with no synonym match
  const tokens = rawQuery.split(/\s+/).filter(t => t.length >= 3);
  const hasUnrecognizedTokens = tokens.length > 0 && !extracted.category && !extracted.color;
  if (hasUnrecognizedTokens && tokens.some(t => t.length < 6)) {
    return 'misspelled';
  }

  return 'standard';
}

/**
 * Calculate dynamic search weights based on query signature.
 * Solves ISSUE #4: Dynamic Hybrid Weights
 * 
 * @param {string} querySignature
 * @returns {{ vector: number, text: number, exact: number }}
 */
function calculateDynamicWeights(querySignature) {
  switch (querySignature) {
    case 'sku':
      // SKU/code lookup: exact match dominates
      return { vector: 0.1, text: 0.1, exact: 0.8 };
    case 'abstract':
      // Abstract/semantic query: vector search dominates
      return { vector: 0.85, text: 0.1, exact: 0.05 };
    case 'misspelled':
      // Misspelled text: trigram similarity helps most
      return { vector: 0.3, text: 0.6, exact: 0.1 };
    case 'filtered':
      // Filtered query with specific constraints: balanced
      return { vector: 0.5, text: 0.3, exact: 0.2 };
    case 'standard':
    default:
      // Standard query: balanced hybrid
      return { vector: 0.6, text: 0.3, exact: 0.1 };
  }
}

/**
 * Strip filters from query text for recovery/relaxation purposes.
 * Returns the query with size, color, and price removed.
 * Solves ISSUE #7 (partial): Query relaxation for recovery.
 * 
 * @param {string} rawQuery
 * @returns {string} Relaxed query
 */
function relaxQuery(rawQuery) {
  let q = String(rawQuery || '');

  // Remove sizes
  for (const pattern of SIZE_PATTERNS) {
    q = q.replace(pattern, ' ');
  }

  // Remove price patterns
  for (const pricePattern of PRICE_PATTERNS) {
    q = q.replace(pricePattern.regex, ' ');
  }

  // Remove known color words
  const tokens = q.split(/\s+/).filter(Boolean);
  const cleaned = tokens;

  // Remove stop words
  const meaningful = cleaned.filter(t => !ARABIC_STOP_WORDS.has(t.toLowerCase()) || t.length >= 4);

  return meaningful.join(' ').replace(/\s+/g, ' ').trim();
}

function _emptyResult() {
  return {
    cleanedQuery: '',
    expandedQuery: '',
    size: null,
    color: null,
    gender: null,
    category: null,
    minPrice: null,
    maxPrice: null,
    sku: null,
    isSKUQuery: false,
    isAbstractQuery: false,
    querySignature: 'standard',
  };
}

module.exports = {
  parseSearchQuery,
  calculateDynamicWeights,
  relaxQuery,
};
