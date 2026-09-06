// Unified Arabic text preparation and bidirectional layout engine for PDFKit.
// Uses NotoSansArabic/Cairo OpenType GSUB layout via fontkit for native Arabic glyph shaping,
// and handles bidirectional reordering for mixed Arabic, English, numbers, and dates.

const PDFDocument = require('pdfkit');

function hasArabic(text) {
  if (!text) return false;
  return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(String(text));
}

const BRACKET_PAIRS = {
  '(': ')',
  ')': '(',
  '[': ']',
  ']': '[',
  '{': '}',
  '}': '{',
  '<': '>',
  '>': '<',
  '«': '»',
  '»': '«',
};

/**
 * Prepares text for PDFKit rendering with Noto/Cairo Arabic font.
 * - Leaves Arabic characters as normal Unicode so fontkit applies OpenType contextual shaping (init, medi, fina, isol, liga).
 * - Pre-reverses contiguous LTR segments (Latin words, digits, and LTR-internal punctuation like / - . ,) so that when fontkit reverses the RTL line, they draw in the correct left-to-right reading order.
 * - Mirrors paired brackets so they render in correct orientation in RTL context.
 */
function shapeArabic(text) {
  if (!text) return '';
  const str = String(text);
  if (!hasArabic(str)) return str;

  // Contiguous LTR tokens: numbers, latin words, codes, dates, etc.
  const ltrRegex = /[A-Za-z0-9](?:[A-Za-z0-9\-_./,:+ #$€£%]*[A-Za-z0-9])?/g;
  let result = '';
  let lastIndex = 0;
  let match;

  while ((match = ltrRegex.exec(str)) !== null) {
    const ltrPart = match[0];
    const precedingRtl = str.slice(lastIndex, match.index);
    for (const ch of precedingRtl) {
      result += BRACKET_PAIRS[ch] || ch;
    }
    const reversedLtr = Array.from(ltrPart)
      .reverse()
      .map((ch) => BRACKET_PAIRS[ch] || ch)
      .join('');
    result += reversedLtr;
    lastIndex = match.index + ltrPart.length;
  }

  const remaining = str.slice(lastIndex);
  for (const ch of remaining) {
    result += BRACKET_PAIRS[ch] || ch;
  }

  return result;
}

// Automatically patch PDFKit to enable OpenType font features whenever text contains Arabic
if (!PDFDocument._arabicPatched) {
  const origText = PDFDocument.prototype.text;
  PDFDocument.prototype.text = function (text, x, y, options) {
    let opts = options;
    let hasPos = true;
    if (typeof x === 'object' && x !== null) {
      opts = x;
      hasPos = false;
    }
    opts = opts ? Object.assign({}, opts) : {};
    if (hasArabic(text)) {
      opts.features = opts.features || true;
    }
    if (!hasPos) {
      return origText.call(this, text, opts);
    }
    return origText.call(this, text, x, y, opts);
  };
  PDFDocument._arabicPatched = true;
}

module.exports = {
  shapeArabic,
  hasArabic,
  prepareArabicText: shapeArabic,
};
