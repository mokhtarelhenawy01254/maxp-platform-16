/**
 * Pure in-memory TTL deduplication guard for order status-change alerts.
 * Prevents duplicate team/owner alerts for the same (companyId + orderId + statusCode)
 * within the configured windowMinutes without adding DB indexes or migrations.
 *
 * Accepts an injectable `now` timestamp for deterministic unit testing.
 */

const DEFAULT_WINDOW_MINUTES = 5;
const MAX_ENTRIES = 5000;

// key -> { expiresAt: number }
const dedupCache = new Map();

function buildStatusAlertDedupKey({ companyId, orderId, statusCode }) {
  const normalizedCode = String(statusCode || '').trim().toUpperCase();
  return `${String(companyId || '').trim()}:${String(orderId || '').trim()}:${normalizedCode}`;
}

function pruneExpired(now) {
  for (const [key, entry] of dedupCache.entries()) {
    if (!entry || now >= entry.expiresAt) {
      dedupCache.delete(key);
    }
  }
}

/**
 * Checks whether an alert for (companyId, orderId, statusCode) is allowed right now,
 * and records the send timestamp when allowed.
 *
 * @param {object} params
 * @param {string} params.companyId
 * @param {string} params.orderId
 * @param {string} params.statusCode
 * @param {number} [params.windowMinutes=5]
 * @param {number} [params.now=Date.now()]
 * @returns {{ allowed: boolean, retryAfterMs: number }}
 */
function checkStatusAlertDedup({
  companyId,
  orderId,
  statusCode,
  windowMinutes = DEFAULT_WINDOW_MINUTES,
  now = Date.now(),
} = {}) {
  if (!companyId || !orderId || !statusCode) {
    return { allowed: true, retryAfterMs: 0 };
  }

  const parsedWindow =
    windowMinutes === undefined || windowMinutes === null
      ? DEFAULT_WINDOW_MINUTES
      : Number(windowMinutes);

  const effectiveMinutes =
    Number.isFinite(parsedWindow) && parsedWindow >= 0
      ? parsedWindow
      : DEFAULT_WINDOW_MINUTES;

  if (effectiveMinutes === 0) {
    return { allowed: true, retryAfterMs: 0 };
  }

  const windowMs = effectiveMinutes * 60 * 1000;
  const key = buildStatusAlertDedupKey({ companyId, orderId, statusCode });
  const existing = dedupCache.get(key);

  if (existing && now < existing.expiresAt) {
    return {
      allowed: false,
      retryAfterMs: existing.expiresAt - now,
    };
  }

  if (dedupCache.size >= MAX_ENTRIES) {
    pruneExpired(now);
    if (dedupCache.size >= MAX_ENTRIES) {
      const oldestKey = dedupCache.keys().next().value;
      if (oldestKey !== undefined) {
        dedupCache.delete(oldestKey);
      }
    }
  }

  dedupCache.set(key, { expiresAt: now + windowMs });
  return { allowed: true, retryAfterMs: 0 };
}

function clearStatusAlertDedupCache() {
  dedupCache.clear();
}

module.exports = {
  DEFAULT_WINDOW_MINUTES,
  buildStatusAlertDedupKey,
  checkStatusAlertDedup,
  clearStatusAlertDedupCache,
};
