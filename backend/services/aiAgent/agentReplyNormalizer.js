/**
 * @module agentReplyNormalizer
 * @description Normalizes model-generated assistant text without inventing a reply.
 */

const BLOCKED_SYNTHETIC_REPLIES = new Set([
  'task processed. no specific reply generated.',
  'i was unable to process your request.',
]);

const INTERNAL_TOOL_PERMISSION_PATTERNS = [
  /هل\s+يمكنني\s+استخدام\s+أداة/iu,
  /هل\s+يمكنني\s+استخدام\s+اداة/iu,
  /هل\s+يمكنني\s+استخدام\s+رقم\s+(?:ال)?(?:طلب|أوردر|اوردر)[^.!؟\n]*/iu,
  /can\s+i\s+use\s+(?:the\s+)?(?:tool|search|lookup|check)/iu,
];

const INTERNAL_TOOL_STATEMENT_PATTERNS = [
  /(?:^|[\s\n])(?:سأستخدم|سوف\s+أستخدم|هستخدم|سأستعمل|سوف\s+أستعمل)\s+(?:أداة|اداة)[^.!؟\n]*(?:[.!؟]|\n|$)/giu,
  /(?:^|[\s\n])(?:سأقوم\s+ب)?(?:استخدام|تشغيل)\s+(?:أداة|اداة)[^.!؟\n]*(?:[.!؟]|\n|$)/giu,
  /[^.!؟\n]*(?:أداة|اداة)\s+(?:إنشاء|انشاء|البحث|الفحص)[^.!؟\n]*(?:[.!؟]|\n|$)/giu,
  /(?:^|[\s\n])(?:سأفحص|سوف\s+أفحص|هفحص)\s+(?:توفر|المتاح|المخزون)[^.!؟\n]*(?:[.!؟]|\n|$)/giu,
  /(?:^|[\s\n])(?:سأنتظر|سوف\s+أنتظر|هستنى)\s+النتيجة[^.!؟\n]*(?:[.!؟]|\n|$)/giu,
];

const INTERNAL_TOOL_TRACE_PATTERNS = [
  /\b(?:agent\.handoff|customer\.info|inventory\.check|order\.create_draft|order\.lookup|product\.search|shipping\.rates)\b/iu,
  /\b(?:city|customerName|customerPhone|governorate|orderNumber|productColor|productNameOrSku|productPrice|productSize|quantity|sku|query|limit)\s*:/iu,
  /(?:^|\n)\s*parameters\s*:\s*(?:\n|$)/iu,
  /(?:^|\n)\s*[-*]\s*(?:query|limit|productName|productNameOrSku|productSize|productColor|customerName|customerPhone|orderId)\s*:/iu,
  /\b(?:tool_calls?|function_call|schema|raw\s+json|execution\s+trace)\b/iu,
  /(?:^|[\s\n])check\s+للتحقق/iu,
];

const INTERNAL_REASONING_TAGS = 'think|thinking|reasoning|analysis';
const INTERNAL_REASONING_BLOCK_PATTERN = new RegExp(
  `<(${INTERNAL_REASONING_TAGS})\\b[^>]*>[\\s\\S]*?<\\/\\1>`,
  'giu'
);
const INTERNAL_REASONING_TAG_PATTERN = new RegExp(
  `<\\/?(?:${INTERNAL_REASONING_TAGS})\\b[^>]*>`,
  'iu'
);

function tryParseJsonString(text) {
  if (!text.startsWith('"') || !text.endsWith('"')) return null;
  try {
    const parsed = JSON.parse(text);
    return typeof parsed === 'string' ? parsed : null;
  } catch {
    return null;
  }
}

function stripOuterQuotes(value) {
  const text = String(value || '').trim();
  if (text.length < 2) return text;

  if (
    (text.startsWith('"') && text.endsWith('"')) ||
    (text.startsWith("'") && text.endsWith("'")) ||
    (text.startsWith('“') && text.endsWith('”')) ||
    (text.startsWith('«') && text.endsWith('»'))
  ) {
    const parsed = tryParseJsonString(text);
    return (typeof parsed === 'string' ? parsed : text.slice(1, -1)).trim();
  }

  return text;
}

function stripInternalReasoningBlocks(text) {
  const output = cleanupWhitespace(
    String(text || '').replace(INTERNAL_REASONING_BLOCK_PATTERN, ' ')
  );

  return {
    text: output,
    invalid: INTERNAL_REASONING_TAG_PATTERN.test(output),
  };
}

function cleanupWhitespace(text) {
  return String(text || '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\s+([.!؟])/g, '$1')
    .trim();
}

function stripInternalToolStatements(text) {
  let output = text;
  for (const pattern of INTERNAL_TOOL_STATEMENT_PATTERNS) {
    output = output.replace(pattern, ' ');
  }
  return cleanupWhitespace(output);
}

function hasInternalToolTrace(text) {
  return INTERNAL_TOOL_TRACE_PATTERNS.some(pattern => pattern.test(text));
}

function normalizeAgentReply(value) {
  if (typeof value !== 'string') return '';
  const text = stripOuterQuotes(stripOuterQuotes(value));
  if (!text) return '';
  if (BLOCKED_SYNTHETIC_REPLIES.has(text.toLowerCase())) return '';
  const withoutReasoning = stripInternalReasoningBlocks(text);
  if (withoutReasoning.invalid || !withoutReasoning.text) return '';
  if (
    INTERNAL_TOOL_PERMISSION_PATTERNS.some(pattern => pattern.test(withoutReasoning.text)) ||
    hasInternalToolTrace(withoutReasoning.text)
  ) {
    return '';
  }
  const withoutInternalToolStatements = stripInternalToolStatements(withoutReasoning.text);
  if (!withoutInternalToolStatements || hasInternalToolTrace(withoutInternalToolStatements)) {
    return '';
  }
  return withoutInternalToolStatements;
}

module.exports = {
  normalizeAgentReply,
};
