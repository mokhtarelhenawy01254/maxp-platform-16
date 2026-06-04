/**
 * @module productSearchQueryService
 * @description Query normalization helpers for catalog and inventory tools.
 */

const {
  normalizeComparableText,
  parseVariantMetadata,
  normalizeOptionalString,
} = require('./toolHelpers');

const PRODUCT_PHRASE_ALIASES = [
  {
    phrase: 'platform sneakers',
    patterns: [
      /\bplatform\s+sneakers?\b/iu,
      /\bplatform\b/iu,
      /\u0628\u0644\u0627\u062a\s*\u0641\u0648\u0631\u0645/iu,
      /\u0628\u0644\u0627\u062a\u0641\u0648\u0631\u0645/iu,
      /\u0628\u0644\u062a\u0641\u0648\u0631\u0645/iu,
    ],
  },
  {
    phrase: 'sneakers',
    patterns: [
      /\bsneakers?\b/iu,
      /\u0633\u0646\u064a\u0643\u0631\u0632/iu,
      /\u0633\u0646\u064a\u0643\u0631\u0633/iu,
      /\u0633\u0646\u064a\u0643\u0631/iu,
      /\u0643\u0648\u062a\u0634\u064a/iu,
      /\u0643\u0648\u062a\u0634\u0649/iu,
      /\u0643\u0627\u062a\u0634\u064a/iu,
    ],
  },
];

const TOKEN_ALIASES = [
  { pattern: /\u0627\u0633\u0648\u062f|\u0623\u0633\u0648\u062f|\bblack\b/giu, replacement: ' black ' },
  { pattern: /\u0627\u0628\u064a\u0636|\u0623\u0628\u064a\u0636|\u0627\u0628\u064a\u0636|\bwhite\b/giu, replacement: ' white ' },
  { pattern: /\u0631\u062c\u0627\u0644\u064a|\u0631\u062c\u0627\u0644\u0649|\bmen'?s?\b|\bmale\b/giu, replacement: ' men ' },
  { pattern: /\u062d\u0631\u064a\u0645\u064a|\u062d\u0631\u064a\u0645\u0649|\bwomen'?s?\b|\bfemale\b/giu, replacement: ' women ' },
];

const QUERY_STOPWORDS = new Set([
  'please',
  'price',
  'available',
  'availability',
  'size',
  'color',
  'image',
  'images',
  'order',
  'cod',
]);

function unique(values = []) {
  const seen = new Set();
  const result = [];
  for (const value of values) {
    const text = normalizeOptionalString(value);
    if (!text) continue;
    const key = normalizeComparableText(text);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(text);
  }
  return result;
}

function expandKnownAliases(query = '') {
  let expanded = String(query || '');
  for (const alias of TOKEN_ALIASES) {
    expanded = expanded.replace(alias.pattern, alias.replacement);
  }
  for (const alias of PRODUCT_PHRASE_ALIASES) {
    for (const pattern of alias.patterns) {
      if (pattern.test(expanded)) {
        expanded = expanded.replace(pattern, ` ${alias.phrase} `);
      }
    }
  }
  return normalizeComparableText(expanded);
}

function getKnownPhraseCandidates(query = '') {
  const candidates = [];
  for (const alias of PRODUCT_PHRASE_ALIASES) {
    if (alias.patterns.some(pattern => pattern.test(query))) {
      candidates.push(alias.phrase);
    }
  }
  return candidates;
}

function tokenize(value = '') {
  return normalizeComparableText(value)
    .split(/\s+/)
    .map(token => token.trim())
    .filter(token => token.length >= 3 && !QUERY_STOPWORDS.has(token));
}

function buildProductSearchCandidates(query = '') {
  const raw = normalizeOptionalString(query);
  if (!raw) return [];

  const expanded = expandKnownAliases(raw);
  const tokens = tokenize(expanded);
  const adjacentPairs = [];
  for (let index = 0; index < tokens.length - 1; index += 1) {
    adjacentPairs.push(`${tokens[index]} ${tokens[index + 1]}`);
  }

  return unique([
    raw,
    expanded,
    ...getKnownPhraseCandidates(raw),
    ...adjacentPairs,
    ...tokens.filter(token => token.length >= 5),
  ]).slice(0, 12);
}

function scoreProductMatch(product = {}, query = '') {
  const candidates = buildProductSearchCandidates(query);
  const name = normalizeComparableText(product.name || product.productName || '');
  const sku = normalizeComparableText(product.sku || '');
  const tags = normalizeComparableText(product.tags || '');
  const haystack = `${name} ${sku} ${tags}`.trim();
  if (!haystack || candidates.length === 0) return 0;

  let score = 0;
  for (const candidate of candidates) {
    const normalized = normalizeComparableText(candidate);
    if (!normalized) continue;
    if (name === normalized || sku === normalized) score += 100;
    if (name.includes(normalized)) score += 50;
    if (normalized.includes(name) && name.length >= 5) score += 35;
    if (sku.includes(normalized)) score += 40;
    if (tags.includes(normalized)) score += 20;
    for (const token of tokenize(normalized)) {
      if (haystack.includes(token)) score += 5;
    }
  }

  return score;
}

function buildProductSearchWhere(companyId, query = '') {
  const candidates = buildProductSearchCandidates(query);
  const or = [];
  for (const candidate of candidates) {
    or.push({ name: { contains: candidate, mode: 'insensitive' } });
    or.push({ sku: { contains: candidate, mode: 'insensitive' } });
    or.push({ tags: { contains: candidate, mode: 'insensitive' } });
  }
  return {
    companyId,
    isActive: true,
    OR: or.length ? or : [{ name: { contains: String(query || ''), mode: 'insensitive' } }],
  };
}

function parseImageList(...values) {
  const images = [];
  const add = (value) => {
    if (!value) return;
    if (Array.isArray(value)) {
      value.forEach(add);
      return;
    }
    if (typeof value !== 'string') return;
    const text = value.trim();
    if (!text) return;
    if (text.startsWith('[')) {
      try {
        const parsed = JSON.parse(text);
        add(parsed);
        return;
      } catch {
        // Fall through and use the raw string.
      }
    }
    images.push(text);
  };
  values.forEach(add);
  return unique(images);
}

function getVariantImageList(variant = {}) {
  const metadata = parseVariantMetadata(variant);
  return parseImageList(variant.images, metadata.image, metadata.images);
}

module.exports = {
  buildProductSearchCandidates,
  buildProductSearchWhere,
  scoreProductMatch,
  parseImageList,
  getVariantImageList,
  expandKnownAliases,
};
