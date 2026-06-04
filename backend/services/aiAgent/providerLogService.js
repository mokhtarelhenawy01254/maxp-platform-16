const { getSharedPrismaClient } = require('../sharedDatabase');

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;

function getPrisma() {
  return getSharedPrismaClient();
}

function normalizeProvider(provider) {
  const value = String(provider || '').trim().toUpperCase();
  return value || null;
}

function normalizeStatus(status) {
  const value = String(status || '').trim().toLowerCase();
  if (!value) return null;
  if (['ok', 'success', 'succeeded'].includes(value)) return 'success';
  if (['fail', 'failed', 'error'].includes(value)) return 'failed';
  return value;
}

function truncate(value, maxLength = 2000) {
  const text = String(value || '').trim();
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

function redactSecrets(value) {
  return String(value || '')
    .replace(/AIza[A-Za-z0-9_-]+/g, 'AIza***REDACTED***')
    .replace(/gsk_[A-Za-z0-9_-]+/g, 'gsk_***REDACTED***')
    .replace(/nvapi-[A-Za-z0-9_-]+/g, 'nvapi-***REDACTED***')
    .replace(/\bsk-[A-Za-z0-9_-]{16,}\b/g, 'sk-***REDACTED***')
    .replace(/(Authorization["']?\s*:\s*["']?Bearer\s+)[^"',\s}]+/gi, '$1***REDACTED***')
    .replace(/(apiKey["']?\s*:\s*["']?)[^"',\s}]+/gi, '$1***REDACTED***');
}

function safeJson(value) {
  if (!value) return null;
  try {
    return redactSecrets(JSON.stringify(value));
  } catch (_error) {
    return redactSecrets(String(value));
  }
}

function parseJson(value, fallback = null) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch (_error) {
    return fallback;
  }
}

function toSafeLimit(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_LIMIT;
  return Math.max(1, Math.min(Math.floor(parsed), MAX_LIMIT));
}

function serializeProviderLog(log = {}) {
  return {
    id: log.id,
    provider: log.provider,
    keyId: log.keyId || null,
    keyName: log.keyName || null,
    companyId: log.companyId || null,
    conversationId: log.conversationId || null,
    customerId: log.customerId || null,
    scope: log.scope || 'runtime',
    action: log.action,
    status: log.status,
    latencyMs: log.latencyMs ?? null,
    model: log.model || null,
    message: log.message || null,
    metadata: parseJson(log.metadata, null),
    createdAt: log.createdAt,
  };
}

async function recordProviderEvent(event = {}) {
  const prisma = getPrisma();
  if (!prisma?.aiProviderLog?.create) {
    return null;
  }

  const provider = normalizeProvider(event.provider) || 'UNKNOWN';
  const action = truncate(event.action || 'unknown_action', 120);
  const status = normalizeStatus(event.status) || 'info';

  try {
    const created = await prisma.aiProviderLog.create({
      data: {
        provider,
        keyId: event.keyId || null,
        keyName: event.keyName ? truncate(event.keyName, 180) : null,
        companyId: event.companyId || null,
        conversationId: event.conversationId || null,
        customerId: event.customerId || null,
        scope: truncate(event.scope || 'runtime', 80),
        action,
        status,
        latencyMs: Number.isFinite(Number(event.latencyMs))
          ? Math.max(0, Math.round(Number(event.latencyMs)))
          : null,
        model: event.model ? truncate(event.model, 180) : null,
        message: event.message ? truncate(redactSecrets(event.message), 2000) : null,
        metadata: safeJson(event.metadata),
      },
    });
    return serializeProviderLog(created);
  } catch (error) {
    console.warn('[PROVIDER-LOG] failed to persist provider event:', error.message);
    return null;
  }
}

async function listProviderLogs(filters = {}) {
  const prisma = getPrisma();
  if (!prisma?.aiProviderLog?.findMany) {
    return [];
  }

  const where = {};
  const provider = normalizeProvider(filters.provider);
  const status = normalizeStatus(filters.status);
  const action = truncate(filters.action || '', 120);

  if (provider) where.provider = provider;
  if (status) where.status = status;
  if (action) where.action = action;
  if (filters.keyId) where.keyId = String(filters.keyId);
  if (filters.companyId) where.companyId = String(filters.companyId);
  if (filters.scope) where.scope = String(filters.scope);

  const sinceHours = Number(filters.sinceHours);
  if (Number.isFinite(sinceHours) && sinceHours > 0) {
    where.createdAt = {
      gte: new Date(Date.now() - Math.min(sinceHours, 24 * 30) * 60 * 60 * 1000),
    };
  }

  const logs = await prisma.aiProviderLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: toSafeLimit(filters.limit),
  });

  return logs.map(serializeProviderLog);
}

function buildSummary(logs = []) {
  const byProvider = {};
  const byAction = {};
  const byStatus = {};
  let latencyTotal = 0;
  let latencyCount = 0;

  for (const log of logs) {
    byProvider[log.provider] = (byProvider[log.provider] || 0) + 1;
    byAction[log.action] = (byAction[log.action] || 0) + 1;
    byStatus[log.status] = (byStatus[log.status] || 0) + 1;

    if (Number.isFinite(Number(log.latencyMs))) {
      latencyTotal += Number(log.latencyMs);
      latencyCount += 1;
    }
  }

  return {
    total: logs.length,
    success: byStatus.success || 0,
    failed: byStatus.failed || 0,
    warning: byStatus.warning || 0,
    avgLatencyMs: latencyCount > 0 ? Math.round(latencyTotal / latencyCount) : null,
    byProvider,
    byAction,
    byStatus,
  };
}

async function getProviderLogSummary(filters = {}) {
  const logs = await listProviderLogs({
    ...filters,
    limit: filters.summaryLimit || 500,
  });
  return buildSummary(logs);
}

module.exports = {
  recordProviderEvent,
  listProviderLogs,
  getProviderLogSummary,
  buildSummary,
  _private: {
    normalizeProvider,
    normalizeStatus,
    redactSecrets,
    serializeProviderLog,
  },
};
