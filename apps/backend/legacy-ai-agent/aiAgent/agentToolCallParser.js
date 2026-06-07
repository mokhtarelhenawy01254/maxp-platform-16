/**
 * @module agentToolCallParser
 * @description Parses model-emitted tool instructions from both structured and
 * leaked text dialects, then strips internal runtime syntax from user-visible replies.
 */

const {
  parseToolCalls,
  fromNativeToolName,
} = require('./agentToolRegistry');

const INTERNAL_SYNTAX_RE = /CALL_TOOL\s*:|agenttool__|tool_calls|<\s*\/?\s*DSML|\bDSML\b|invoke\s+name\s*=/i;
const INTERNAL_TRACE_RE = /\b(?:agent\.handoff|customer\.info|inventory\.check|order\.create_draft|order\.lookup|product\.search|shipping\.rates)\b|\b(?:city|customerName|customerPhone|governorate|orderNumber|productColor|productNameOrSku|productPrice|productSize|quantity|sku|query|limit)\s*:|(?:^|\n)\s*parameters\s*:/i;
const NATIVE_TOOL_NAME_RE = /agenttool__[A-Za-z0-9_-]+/g;

function safeJsonParse(value, fallback = {}) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(String(value));
  } catch (_) {
    return fallback;
  }
}

function decodeModelText(text = '') {
  return String(text || '')
    .replace(/&quot;/g, '"')
    .replace(/&#34;/g, '"')
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'");
}

function readBalancedJson(text, startIndex) {
  if (startIndex < 0 || startIndex >= text.length) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = startIndex; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
    } else if (ch === '{') {
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0) {
        return {
          raw: text.slice(startIndex, i + 1),
          end: i + 1,
        };
      }
    }
  }

  return null;
}

function inferParamsNearName(text, nameIndex) {
  const window = text.slice(nameIndex, Math.min(text.length, nameIndex + 700));
  const paramKey = /\b(?:arguments|args|params|input)\s*=\s*["']?\s*/i.exec(window);
  if (!paramKey) return {};

  const afterKeyStart = nameIndex + paramKey.index + paramKey[0].length;
  const jsonStart = text.indexOf('{', afterKeyStart);
  if (jsonStart === -1 || jsonStart > afterKeyStart + 120) return {};

  const balanced = readBalancedJson(text, jsonStart);
  return safeJsonParse(balanced?.raw, {});
}

function pushUnique(calls, call) {
  if (!call?.tool) return;
  const key = `${call.tool}:${JSON.stringify(call.params || {})}`;
  if (calls.some(existing => `${existing.tool}:${JSON.stringify(existing.params || {})}` === key)) return;
  calls.push(call);
}

function parseJsonToolCallObjects(text, calls) {
  const decoded = decodeModelText(text);
  let searchFrom = 0;

  while (searchFrom < decoded.length) {
    const nameIdx = decoded.indexOf('"name"', searchFrom);
    if (nameIdx === -1) break;
    const objectStart = decoded.lastIndexOf('{', nameIdx);
    if (objectStart === -1) {
      searchFrom = nameIdx + 6;
      continue;
    }

    const balanced = readBalancedJson(decoded, objectStart);
    if (!balanced) {
      searchFrom = nameIdx + 6;
      continue;
    }

    const parsed = safeJsonParse(balanced.raw, null);
    const fn = parsed?.function || parsed?.functionCall || parsed;
    const nativeName = fn?.name || parsed?.name;
    if (typeof nativeName === 'string' && nativeName.startsWith('agenttool__')) {
      pushUnique(calls, {
        id: parsed.id || `text-json-${calls.length + 1}`,
        nativeName,
        tool: fromNativeToolName(nativeName),
        params: safeJsonParse(fn.arguments ?? fn.args ?? parsed.arguments ?? parsed.args, {}),
        textDialect: 'json-tool-call',
      });
    }

    searchFrom = balanced.end;
  }
}

function parseTextToolCalls(text = '') {
  const decoded = decodeModelText(text);
  const calls = [];

  for (const call of parseToolCalls(decoded)) {
    pushUnique(calls, {
      id: `call-tool-${calls.length + 1}`,
      nativeName: call.tool,
      tool: call.tool,
      params: call.params || {},
      textDialect: 'call-tool',
      legacy: true,
    });
  }

  parseJsonToolCallObjects(decoded, calls);

  const nativeNames = decoded.match(NATIVE_TOOL_NAME_RE) || [];
  nativeNames.forEach((nativeName, index) => {
    pushUnique(calls, {
      id: `text-native-${index + 1}`,
      nativeName,
      tool: fromNativeToolName(nativeName),
      params: inferParamsNearName(decoded, decoded.indexOf(nativeName)),
      textDialect: 'native-text',
      legacy: true,
    });
  });

  return calls;
}

function stripCallToolBlocks(text = '') {
  const prefixRe = /CALL_TOOL\s*:/gi;
  let result = '';
  let cursor = 0;
  const source = String(text || '');
  let match;

  while ((match = prefixRe.exec(source)) !== null) {
    result += source.slice(cursor, match.index);
    const jsonStart = source.indexOf('{', prefixRe.lastIndex);
    if (jsonStart === -1) {
      cursor = prefixRe.lastIndex;
      break;
    }
    const balanced = readBalancedJson(source, jsonStart);
    cursor = balanced ? balanced.end : jsonStart + 1;
    prefixRe.lastIndex = cursor;
  }

  result += source.slice(cursor);
  return result;
}

function stripInternalToolSyntax(text = '') {
  const withoutCallTool = stripCallToolBlocks(decodeModelText(text));
  return withoutCallTool
    .split(/\r?\n/)
    .filter(line => !INTERNAL_SYNTAX_RE.test(line) && !INTERNAL_TRACE_RE.test(line))
    .join('\n')
    .replace(NATIVE_TOOL_NAME_RE, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function containsInternalToolSyntax(text = '') {
  const decoded = decodeModelText(text);
  return INTERNAL_SYNTAX_RE.test(decoded) || INTERNAL_TRACE_RE.test(decoded);
}

module.exports = {
  parseTextToolCalls,
  stripInternalToolSyntax,
  containsInternalToolSyntax,
  _private: {
    decodeModelText,
    inferParamsNearName,
    readBalancedJson,
  },
};
