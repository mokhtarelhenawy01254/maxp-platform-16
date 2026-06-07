/**
 * @module productAttributeCanonicalizer
 * @description Narrow canonicalization for model-extracted product attributes.
 *
 * This module is deliberately not a customer-intent parser. It only normalizes
 * values that the LLM classifier or tool call already marked as attributes.
 */

const SIZE_VALUES = new Map([
  ['small', 'S'],
  ['s', 'S'],
  ['medium', 'M'],
  ['m', 'M'],
  ['large', 'L'],
  ['l', 'L'],
  ['extra large', 'XL'],
  ['xl', 'XL'],
  ['2xl', 'XXL'],
  ['xxl', 'XXL'],
  ['3xl', 'XXXL'],
  ['xxxl', 'XXXL'],
  ['\u0633\u0645\u0648\u0644', 'S'],
  ['\u0635\u063a\u064a\u0631', 'S'],
  ['\u0635\u063a\u064a\u0631\u0647', 'S'],
  ['\u0645\u064a\u062f\u064a\u0648\u0645', 'M'],
  ['\u0648\u0633\u0637', 'M'],
  ['\u0644\u0627\u0631\u062c', 'L'],
  ['\u0643\u0628\u064a\u0631', 'L'],
  ['\u0643\u0628\u064a\u0631\u0647', 'L'],
  ['\u0627\u0643\u0633 \u0644\u0627\u0631\u062c', 'XL'],
  ['\u0625\u0643\u0633 \u0644\u0627\u0631\u062c', 'XL'],
  ['\u0623\u0643\u0633 \u0644\u0627\u0631\u062c', 'XL'],
  ['\u0627\u0643\u0633\u062a\u0631\u0627 \u0644\u0627\u0631\u062c', 'XL'],
  ['\u062f\u0628\u0644 \u0627\u0643\u0633 \u0644\u0627\u0631\u062c', 'XXL'],
  ['\u0627\u0643\u0633 \u0627\u0643\u0633 \u0644\u0627\u0631\u062c', 'XXL'],
  ['\u0627\u0643\u0633 \u0627\u0643\u0633 \u0627\u0643\u0633 \u0644\u0627\u0631\u062c', 'XXXL'],
]);

const COLOR_TERMS = {
  black: ['black', '\u0627\u0633\u0648\u062f', '\u0623\u0633\u0648\u062f', '\u0628\u0644\u0627\u0643', 'noir'],
  white: ['white', '\u0627\u0628\u064a\u0636', '\u0623\u0628\u064a\u0636', '\u0648\u0627\u064a\u062a', 'blanc'],
  red: ['red', '\u0627\u062d\u0645\u0631', '\u0623\u062d\u0645\u0631', '\u0631\u064a\u062f', 'rouge'],
  blue: ['blue', '\u0627\u0632\u0631\u0642', '\u0623\u0632\u0631\u0642', '\u0628\u0644\u0648', 'navy'],
  green: ['green', '\u0627\u062e\u0636\u0631', '\u0623\u062e\u0636\u0631', '\u062c\u0631\u064a\u0646'],
  yellow: ['yellow', '\u0627\u0635\u0641\u0631', '\u0623\u0635\u0641\u0631', '\u064a\u0644\u0648'],
  orange: ['orange', '\u0628\u0631\u062a\u0642\u0627\u0644\u064a', '\u0627\u0648\u0631\u0646\u062c'],
  pink: ['pink', '\u0631\u0648\u0632', '\u0648\u0631\u062f\u064a', '\u0628\u064a\u0646\u0643'],
  purple: ['purple', '\u0628\u0646\u0641\u0633\u062c\u064a', '\u0645\u0648\u0641', '\u0628\u0631\u0628\u0644'],
  brown: ['brown', '\u0628\u0646\u064a', '\u0628\u0631\u0627\u0648\u0646'],
  grey: ['grey', 'gray', '\u0631\u0635\u0627\u0635\u064a', '\u0631\u0645\u0627\u062f\u064a', '\u062c\u0631\u0627\u064a'],
  beige: ['beige', '\u0628\u064a\u062c', '\u0643\u0631\u064a\u0645\u064a'],
  gold: ['gold', '\u062c\u0648\u0644\u062f', '\u0630\u0647\u0628\u064a'],
  silver: ['silver', '\u0633\u064a\u0644\u0641\u0631', '\u0641\u0636\u064a'],
};

const COLOR_LOOKUP = new Map();
for (const [canonical, terms] of Object.entries(COLOR_TERMS)) {
  for (const term of terms) {
    COLOR_LOOKUP.set(normalizeAttributeText(term), canonical);
  }
}

function normalizeAttributeText(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/[\u0622\u0623\u0625]/g, '\u0627')
    .replace(/\u0649/g, '\u064a')
    .replace(/\u0629/g, '\u0647')
    .replace(/\s+/g, ' ');
}

function stripArabicDefiniteArticle(value) {
  const normalized = normalizeAttributeText(value);
  if (normalized.startsWith('\u0627\u0644') && normalized.length > 2) {
    return normalized.slice(2);
  }
  return normalized;
}

function normalizeProductSize(value) {
  if (value === undefined || value === null) return null;
  const normalized = stripArabicDefiniteArticle(value);
  if (!normalized) return null;
  return SIZE_VALUES.get(normalized) || String(value).trim().toUpperCase();
}

function normalizeProductColor(value) {
  if (value === undefined || value === null) return null;
  const normalized = stripArabicDefiniteArticle(value);
  if (!normalized) return null;
  return COLOR_LOOKUP.get(normalized) || String(value).trim();
}

function getColorSearchTerms(value) {
  const canonical = normalizeProductColor(value);
  const terms = new Set();
  if (value) terms.add(String(value).trim());
  if (canonical) {
    terms.add(canonical);
    for (const term of COLOR_TERMS[canonical] || []) {
      terms.add(term);
    }
  }
  return [...terms].filter(Boolean);
}

module.exports = {
  normalizeProductSize,
  normalizeProductColor,
  getColorSearchTerms,
};
