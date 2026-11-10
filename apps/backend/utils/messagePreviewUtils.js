// 🧼 Safe text for lastMessagePreview and any other JSONB-bound preview field.
// Raw webhook content often carries escaped unicode ("\ud83d\ude00"), truncated
// escapes ("\ud8") or lone surrogates — all of which make a PostgreSQL jsonb
// write fail with "unexpected end of hex escape". Decode what is decodable and
// drop what is not, BEFORE slicing the preview to its max length.

const ESCAPED_SURROGATE_PAIR_RE = /\\u(d[89ab][0-9a-f]{2})\\u(d[c-f][0-9a-f]{2})/gi;
const ESCAPED_CODEPOINT_RE = /\\u([0-9a-fA-F]{4})/g;
const ESCAPED_BROKEN_RE = /\\u[0-9a-fA-F]{0,3}(?![0-9a-fA-F])/gi;
// Drop only UNPAIRED surrogates — astral characters (emoji) are stored as
// valid surrogate pairs and must survive.
const LONE_SURROGATE_RE = /(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])/gu;

const decodeEscapedUnicode = (text) => {
  if (typeof text !== 'string') return text;

  let decoded = text.replace(ESCAPED_SURROGATE_PAIR_RE, (_, high, low) => {
    const hi = parseInt(high, 16);
    const lo = parseInt(low, 16);
    return String.fromCodePoint(0x10000 + (hi - 0xD800) * 0x400 + (lo - 0xDC00));
  });

  decoded = decoded.replace(ESCAPED_CODEPOINT_RE, (_, hex) => {
    const codePoint = parseInt(hex, 16);
    // Lone surrogates cannot be stored in jsonb — drop them instead of decoding.
    return codePoint >= 0xD800 && codePoint <= 0xDFFF ? '' : String.fromCodePoint(codePoint);
  });

  decoded = decoded.replace(ESCAPED_BROKEN_RE, '');
  decoded = decoded.replace(LONE_SURROGATE_RE, '');
  return decoded;
};

const safePreviewText = (text, maxLength) => {
  const decoded = decodeEscapedUnicode(typeof text === 'string' ? text : String(text ?? ''));
  if (!maxLength || decoded.length <= maxLength) return decoded;
  return `${decoded.slice(0, maxLength)}...`;
};

module.exports = { decodeEscapedUnicode, safePreviewText };
