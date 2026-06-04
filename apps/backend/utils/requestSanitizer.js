const SCRIPT_TAG_PATTERN = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;
const JAVASCRIPT_PROTOCOL_PATTERN = /javascript:/gi;
const HTML_EVENT_HANDLER_PATTERN = /(^|[\s<])on[a-z0-9_:-]+\s*=/gi;

function sanitizePotentiallyUnsafeString(value) {
  if (typeof value !== 'string') {
    return value;
  }

  return value
    .replace(SCRIPT_TAG_PATTERN, '')
    .replace(JAVASCRIPT_PROTOCOL_PATTERN, '')
    .replace(HTML_EVENT_HANDLER_PATTERN, '$1');
}

module.exports = {
  sanitizePotentiallyUnsafeString,
};
