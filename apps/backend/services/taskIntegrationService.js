const crypto = require('crypto');

const TASK_API_SCOPES = [
  'tasks:read',
  'tasks:write',
  'tasks:update',
  'goals:read',
  'goals:write'
];
const TASK_API_DEFAULT_SCOPES = ['tasks:read', 'tasks:write'];
const AGENT_INBOX_API_SCOPES = [
  'facebook-inbox:read',
  'facebook-inbox:evaluate',
  'facebook-inbox:draft'
];
const MARKETING_API_SCOPES = [
  'analytics:read',
  'orders:read',
  'products:read',
  'subscriptions:read',
  'leads:read',
  'landing:read',
  'ads:read',
  'customers:read',
  'platform:read',
  '*'
];
const MARKETING_DEFAULT_SCOPES = [
  'analytics:read',
  'orders:read',
  'products:read',
  'landing:read',
  'leads:read',
  'subscriptions:read'
];
const ADMIN_API_READ_SCOPES = [
  'admin:analytics:read',
  'admin:orders:read',
  'admin:products:read',
  'admin:customers:read',
  'admin:subscriptions:read',
  'admin:billing:read',
  'admin:revenue:read',
  'admin:marketplace:read',
  'admin:support:read',
  'admin:ai-usage:read',
  'admin:logs:read',
  'admin:users:read',
  'admin:tenants:read',
  'admin:coupons:read',
  'admin:landing:read',
  'admin:partners:read',
  'admin:settings:read',
  'admin:audit:read'
];
const ADMIN_API_WRITE_SCOPES = [
  'admin:coupons:write',
  'admin:landing:write',
  'admin:tasks:write',
  'admin:notes:write',
  'admin:leads:write',
  'admin:subscriptions:write',
  'admin:billing:write',
  'admin:modules:write',
  'admin:tenant-settings:write',
  'admin:subscriptions:cancel',
  'admin:refunds:write',
  'admin:tenants:suspend',
  'admin:broadcast:write',
  'admin:exports:write',
  'admin:tenants:delete',
  'admin:users:write',
  'admin:pricing:write',
  'admin:invoices:void'
];
const ADMIN_API_SCOPES = [
  'admin:*',
  'admin:*:read',
  'admin:*:write',
  ...ADMIN_API_READ_SCOPES,
  ...ADMIN_API_WRITE_SCOPES
];
const EXTERNAL_API_SCOPES = [
  ...TASK_API_SCOPES,
  ...AGENT_INBOX_API_SCOPES,
  ...MARKETING_API_SCOPES,
  ...ADMIN_API_SCOPES
];
const AGENT_INBOX_DEFAULT_SCOPES = ['facebook-inbox:read', 'facebook-inbox:evaluate'];
const TASK_WEBHOOK_EVENTS = ['task.created', 'task.updated', 'task.status_changed', 'task.deleted'];
const TASK_WEBHOOK_PROVIDER_TYPES = ['GENERIC', 'OPENCLAW'];
const OPENCLAW_ENVIRONMENTS = ['local', 'production'];
const OPENCLAW_WAKE_MODES = ['now', 'next-heartbeat'];
const OPENCLAW_SESSION_MODES = ['default', 'task-scoped'];
const OPENCLAW_DELIVERY_CHANNELS = [
  'last',
  'whatsapp',
  'telegram',
  'discord',
  'slack',
  'signal',
  'imessage',
  'irc',
  'googlechat',
  'line'
];
const DEFAULT_OPENCLAW_PROVIDER_CONFIG = Object.freeze({
  name: 'Tasks',
  agentId: '',
  wakeMode: 'now',
  deliver: false,
  channel: 'last',
  to: '',
  model: '',
  thinking: '',
  timeoutSeconds: null,
  sessionMode: 'default',
  sessionKeyPrefix: 'hook:task:'
});

const parseStoredArray = (value) => {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value !== 'string' || !value.trim()) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_error) {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
};

const parseStoredObject = (value) => {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value;
  }

  if (typeof value !== 'string' || !value.trim()) {
    return {};
  }

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch (_error) {
    return {};
  }
};

const serializeJson = (value, fallback = null) => {
  if (value === undefined || value === null) {
    return fallback;
  }

  return JSON.stringify(value);
};

const normalizeScopes = (value, fallback = TASK_API_DEFAULT_SCOPES) => {
  const requestedScopes = parseStoredArray(value);
  const normalized = requestedScopes
    .map((scope) => String(scope).trim().toLowerCase())
    .filter(Boolean);

  if (normalized.includes('*')) {
    return ['*'];
  }

  const filtered = normalized.filter((scope) => {
    if (EXTERNAL_API_SCOPES.includes(scope)) return true;
    if (/^admin:[a-z0-9_-]+:(read|write|\*)$/.test(scope)) return true;
    if (/^admin:\*$/.test(scope)) return true;
    return false;
  });
  const unique = [...new Set(filtered)];

  return unique.length > 0 ? unique : [...fallback];
};

const normalizeWebhookEvents = (value, fallback = TASK_WEBHOOK_EVENTS) => {
  const requestedEvents = parseStoredArray(value);
  const normalized = requestedEvents
    .map((eventName) => String(eventName).trim())
    .filter(Boolean)
    .filter((eventName) => TASK_WEBHOOK_EVENTS.includes(eventName));

  const unique = [...new Set(normalized)];
  return unique.length > 0 ? unique : [...fallback];
};

const normalizeWebhookProviderType = (value) => {
  const normalized = String(value || 'GENERIC').trim().toUpperCase();
  return TASK_WEBHOOK_PROVIDER_TYPES.includes(normalized) ? normalized : 'GENERIC';
};

const normalizeOpenClawEnvironment = (value) => {
  const normalized = String(value || 'production').trim().toLowerCase();
  return OPENCLAW_ENVIRONMENTS.includes(normalized) ? normalized : 'production';
};

const normalizeOpenClawProviderConfig = (value) => {
  const source = parseStoredObject(value);
  const wakeMode = OPENCLAW_WAKE_MODES.includes(String(source.wakeMode || '').trim())
    ? String(source.wakeMode).trim()
    : DEFAULT_OPENCLAW_PROVIDER_CONFIG.wakeMode;
  const sessionMode = OPENCLAW_SESSION_MODES.includes(String(source.sessionMode || '').trim())
    ? String(source.sessionMode).trim()
    : DEFAULT_OPENCLAW_PROVIDER_CONFIG.sessionMode;
  const channel = OPENCLAW_DELIVERY_CHANNELS.includes(String(source.channel || '').trim())
    ? String(source.channel).trim()
    : DEFAULT_OPENCLAW_PROVIDER_CONFIG.channel;

  const timeoutNumber = source.timeoutSeconds === '' || source.timeoutSeconds === undefined || source.timeoutSeconds === null
    ? null
    : Number(source.timeoutSeconds);
  const timeoutSeconds = Number.isFinite(timeoutNumber) && timeoutNumber > 0
    ? Math.round(timeoutNumber)
    : null;

  const sessionKeyPrefixRaw = String(source.sessionKeyPrefix || DEFAULT_OPENCLAW_PROVIDER_CONFIG.sessionKeyPrefix).trim();

  return {
    name: String(source.name || DEFAULT_OPENCLAW_PROVIDER_CONFIG.name).trim() || DEFAULT_OPENCLAW_PROVIDER_CONFIG.name,
    agentId: String(source.agentId || '').trim(),
    wakeMode,
    deliver: Boolean(source.deliver),
    channel,
    to: String(source.to || '').trim(),
    model: String(source.model || '').trim(),
    thinking: String(source.thinking || '').trim(),
    timeoutSeconds,
    sessionMode,
    sessionKeyPrefix: sessionMode === 'task-scoped'
      ? (sessionKeyPrefixRaw || DEFAULT_OPENCLAW_PROVIDER_CONFIG.sessionKeyPrefix)
      : DEFAULT_OPENCLAW_PROVIDER_CONFIG.sessionKeyPrefix
  };
};

const normalizeWebhookProviderConfig = (providerType, value) => {
  const normalizedProviderType = normalizeWebhookProviderType(providerType);

  if (normalizedProviderType === 'OPENCLAW') {
    return normalizeOpenClawProviderConfig(value);
  }

  return {};
};

const generateTaskApiKey = (prefix = 'tsk') => {
  const normalizedPrefix = ['tsk', 'ain', 'ext'].includes(String(prefix || '').trim())
    ? String(prefix).trim()
    : 'tsk';
  const publicPart = crypto.randomBytes(8).toString('hex');
  const secretPart = crypto.randomBytes(24).toString('hex');
  const rawKey = `${normalizedPrefix}_${publicPart}_${secretPart}`;

  return {
    rawKey,
    keyPrefix: `${normalizedPrefix}_${publicPart}`,
    keyHash: crypto.createHash('sha256').update(rawKey).digest('hex')
  };
};

const generateExternalApiKey = () => generateTaskApiKey('ext');
const generateAgentInboxApiKey = () => generateTaskApiKey('ain');

const generateSigningSecret = () => crypto.randomBytes(32).toString('hex');

const maskKeyPrefix = (keyPrefix) => {
  if (!keyPrefix) return null;
  if (keyPrefix.length <= 8) return `${keyPrefix}****`;
  return `${keyPrefix.substring(0, 8)}****`;
};

const maskSecret = (value) => {
  if (!value) return null;
  if (value.length <= 8) return '********';
  return `${value.substring(0, 4)}****${value.substring(value.length - 4)}`;
};

const extractKeyPrefix = (rawKey) => {
  if (typeof rawKey !== 'string') return null;

  const trimmed = rawKey.trim();
  const segments = trimmed.split('_');
  if (segments.length < 3) return null;
  if (!['tsk', 'ain', 'ext'].includes(segments[0])) return null;

  return `${segments[0]}_${segments[1]}`;
};

const hashTaskApiKey = (rawKey) => crypto.createHash('sha256').update(String(rawKey || '')).digest('hex');

const credentialHasScope = (credential, requiredScope) => {
  if (Array.isArray(requiredScope)) {
    return requiredScope.some((scope) => credentialHasScope(credential, scope));
  }

  const scopes = normalizeScopes(credential?.scopes || []);
  if (scopes.includes('*')) return true;
  if (scopes.includes(requiredScope)) return true;

  // tasks:read / tasks:write cover goals:read / goals:write for backwards compatibility
  if (requiredScope === 'goals:read' && (scopes.includes('tasks:read') || scopes.includes('tasks:write') || scopes.includes('tasks:*'))) {
    return true;
  }
  if (requiredScope === 'goals:write' && (scopes.includes('tasks:write') || scopes.includes('tasks:*'))) {
    return true;
  }

  if (requiredScope.startsWith('admin:')) {
    if (scopes.includes('admin:*')) return true;
    const parts = requiredScope.split(':');
    if (parts.length === 3) {
      const [prefix, domain, action] = parts;
      if (scopes.includes(`${prefix}:${domain}:*`)) return true;
      if (action === 'read' && scopes.includes('admin:*:read')) return true;
      if (action === 'write' && scopes.includes('admin:*:write')) return true;
      // Also map backward compatible scopes e.g. 'analytics:read' -> 'admin:analytics:read'
      if (action === 'read' && scopes.includes(`${domain}:read`)) return true;
      // Also check normalized domain without hyphens e.g. 'landing-pages' vs 'landing_pages'
      const altDomain = domain.includes('-') ? domain.replace(/-/g, '_') : domain.replace(/_/g, '-');
      if (scopes.includes(`${prefix}:${altDomain}:${action}`) || scopes.includes(`${prefix}:${altDomain}:*`)) return true;
    }
  }

  // Domain prefix matching e.g. 'tasks:*' matches 'tasks:read'
  const colonIndex = requiredScope.indexOf(':');
  if (colonIndex !== -1) {
    const domainPrefix = requiredScope.substring(0, colonIndex);
    if (scopes.includes(`${domainPrefix}:*`)) return true;
  }

  return false;
};

module.exports = {
  ADMIN_API_READ_SCOPES,
  ADMIN_API_WRITE_SCOPES,
  ADMIN_API_SCOPES,
  AGENT_INBOX_API_SCOPES,
  AGENT_INBOX_DEFAULT_SCOPES,
  EXTERNAL_API_SCOPES,
  MARKETING_API_SCOPES,
  MARKETING_DEFAULT_SCOPES,
  TASK_API_DEFAULT_SCOPES,
  TASK_API_SCOPES,
  TASK_WEBHOOK_EVENTS,
  TASK_WEBHOOK_PROVIDER_TYPES,
  OPENCLAW_ENVIRONMENTS,
  DEFAULT_OPENCLAW_PROVIDER_CONFIG,
  credentialHasScope,
  extractKeyPrefix,
  generateAgentInboxApiKey,
  generateExternalApiKey,
  generateSigningSecret,
  generateTaskApiKey,
  hashTaskApiKey,
  maskKeyPrefix,
  maskSecret,
  normalizeOpenClawProviderConfig,
  normalizeOpenClawEnvironment,
  normalizeScopes,
  normalizeWebhookEvents,
  normalizeWebhookProviderConfig,
  normalizeWebhookProviderType,
  parseStoredArray,
  parseStoredObject,
  serializeJson
};
