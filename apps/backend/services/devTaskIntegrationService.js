const {
  extractKeyPrefix,
  generateTaskApiKey,
  hashTaskApiKey,
  maskKeyPrefix,
  parseStoredArray,
  serializeJson
} = require('./taskIntegrationService');

const DEV_TASK_API_SCOPES = ['dev-tasks:read', 'dev-tasks:write'];

const normalizeDevTaskScopes = (value, fallback = DEV_TASK_API_SCOPES) => {
  const isMissingValue = value === undefined
    || value === null
    || (typeof value === 'string' && !value.trim());
  const requestedScopes = parseStoredArray(value);
  const normalized = requestedScopes
    .map((scope) => String(scope).trim().toLowerCase())
    .filter(Boolean);

  const filtered = normalized.filter((scope) => DEV_TASK_API_SCOPES.includes(scope));
  const unique = [...new Set(filtered)];

  if (unique.length > 0) {
    return unique;
  }

  return isMissingValue ? [...fallback] : [];
};

const credentialHasDevTaskScope = (credential, requiredScope) => {
  const scopes = normalizeDevTaskScopes(credential?.scopes || []);
  return scopes.includes(requiredScope);
};

const generateDevTaskApiKey = () => generateTaskApiKey('dtk');

module.exports = {
  DEV_TASK_API_SCOPES,
  credentialHasDevTaskScope,
  extractKeyPrefix,
  generateDevTaskApiKey,
  hashTaskApiKey,
  maskKeyPrefix,
  normalizeDevTaskScopes,
  parseStoredArray,
  serializeJson
};
