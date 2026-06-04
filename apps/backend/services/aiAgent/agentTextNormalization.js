/**
 * @module agentTextNormalization
 * @description Shared Arabic text normalisation utilities used across the agent pipeline.
 *
 * normalizeText   — full normalisation for search/matching (strips diacritics, unifies
 *                   letter variants, converts Eastern Arabic numerals, removes noise chars).
 * normalizeEvidenceText — lighter normalisation used for reply grounding and evidence
 *                         comparison (strips diacritics + letter variants only, no numeral
 *                         conversion or noise stripping so numeric evidence stays intact).
 */

function normalizeText(value = '') {
  return String(value || '')
    .toLowerCase()
    .replace(/[ً-ٰٟـ]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[^\p{L}\p{N}_\s.,:-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeEvidenceText(value = '') {
  return String(value || '')
    .toLowerCase()
    .replace(/[ً-ٰٟـ]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/\s+/g, ' ')
    .trim();
}

module.exports = { normalizeText, normalizeEvidenceText };
