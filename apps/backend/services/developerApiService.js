/**
 * @module developerApiService
 * @description Merchant Developer Hub — API/MCP credential lifecycle,
 * verification, rate limiting and usage auditing.
 *
 * Keys are shown ONCE at creation, stored only as SHA-256 hashes, and are
 * always scoped to a single company (tenant isolation is derived from the
 * credential itself — never from request input).
 */
const crypto = require('crypto');

// ─── Key formats ────────────────────────────────────────────────────────────
// mxp_live_<48 hex>  → REST API key usable on /api/v1/ext/*
// mxp_mcp_<48 hex>   → MCP token usable by MCP clients (Cursor/Claude/…)
const API_KEY_PREFIX = 'mxp_live_';
const MCP_KEY_PREFIX = 'mxp_mcp_';
const VISIBLE_PREFIX_LENGTH = 16; // e.g. "mxp_live_a1b2c3d4"

// ─── Scopes ─────────────────────────────────────────────────────────────────
const SCOPE_DEFINITIONS = [
  { key: 'products:read', group: 'products', label_ar: 'قراءة المنتجات', label_en: 'Read products' },
  { key: 'inventory:read', group: 'inventory', label_ar: 'قراءة المخزون', label_en: 'Read inventory' },
  { key: 'orders:read', group: 'orders', label_ar: 'قراءة الطلبات', label_en: 'Read orders' },
  { key: 'customers:read', group: 'customers', label_ar: 'قراءة العملاء', label_en: 'Read customers' },
  { key: 'coupons:read', group: 'coupons', label_ar: 'قراءة الكوبونات', label_en: 'Read coupons' },
  { key: 'analytics:read', group: 'analytics', label_ar: 'قراءة التحليلات', label_en: 'Read analytics' },
  { key: 'video:read', group: 'video', label_ar: 'قراءة مهام الفيديو', label_en: 'Read video tasks' },
  { key: 'video:create', group: 'video', label_ar: 'إنشاء فيديوهات Veo', label_en: 'Create Veo videos' },
];

const ALL_SCOPE_KEYS = SCOPE_DEFINITIONS.map((s) => s.key);

// Default scopes for a new credential: read-only. Video creation stays opt-in
// (it consumes Veo credits) and must be granted explicitly by the merchant.
const DEFAULT_SCOPE_KEYS = [
  'products:read',
  'inventory:read',
  'orders:read',
  'customers:read',
  'coupons:read',
  'analytics:read',
];

const normalizeScopes = (scopes) => {
  if (!Array.isArray(scopes)) return [];
  const cleaned = scopes
    .map((s) => String(s || '').trim())
    .filter((s) => ALL_SCOPE_KEYS.includes(s));
  return [...new Set(cleaned)];
};

// ─── Prisma ─────────────────────────────────────────────────────────────────
let _prismaPromise = null;
const getPrisma = async () => {
  if (!_prismaPromise) {
    _prismaPromise = (async () => {
      const { getSharedPrismaClientAsync } = require('./sharedDatabase');
      return getSharedPrismaClientAsync();
    })();
  }
  return _prismaPromise;
};

// ─── Redis (multi-instance rate limiting) + in-memory fallback ──────────────
let _redis = null;
let _redisTried = false;
const getRedis = () => {
  if (_redisTried) return _redis;
  _redisTried = true;
  try {
    const redisConfig = require('../config/redis');
    if (!redisConfig) return null;
    const Redis = require('ioredis');
    _redis = new Redis(redisConfig);
    _redis.on('error', (err) => {
      // Degrade to in-memory limiter on Redis outage — never crash requests.
      console.warn('[developer-api] redis error:', err?.message || err);
    });
  } catch (error) {
    console.warn('[developer-api] redis unavailable, using in-memory limiter:', error?.message);
    _redis = null;
  }
  return _redis;
};

const memoryWindows = new Map(); // credentialId -> { minuteBucket, count }
const MEMORY_GC_EVERY = 500;
let _memoryOps = 0;
const gcMemoryWindows = (nowBucket) => {
  _memoryOps += 1;
  if (_memoryOps % MEMORY_GC_EVERY !== 0) return;
  for (const [id, win] of memoryWindows.entries()) {
    if (win.minuteBucket !== nowBucket) memoryWindows.delete(id);
  }
};

// ─── Helpers ────────────────────────────────────────────────────────────────
const nowBucket = () => Math.floor(Date.now() / 60000);

const generateRawKey = (credentialType) => {
  const prefix = credentialType === 'MCP' ? MCP_KEY_PREFIX : API_KEY_PREFIX;
  return `${prefix}${crypto.randomBytes(24).toString('hex')}`;
};

const hashKey = (rawKey) => crypto.createHash('sha256').update(String(rawKey || '')).digest('hex');

const maskKey = (keyPrefix) => `${keyPrefix}••••••••`;

const detectTypeFromKey = (rawKey) => {
  const value = String(rawKey || '');
  if (value.startsWith(MCP_KEY_PREFIX)) return 'MCP';
  if (value.startsWith(API_KEY_PREFIX)) return 'API';
  return null;
};

const serializeCredential = (credential) => ({
  id: credential.id,
  name: credential.name,
  keyPrefix: credential.keyPrefix,
  maskedKey: maskKey(credential.keyPrefix),
  credentialType: credential.credentialType,
  scopes: credential.scopes || [],
  rateLimitPerMin: credential.rateLimitPerMin,
  isActive: credential.isActive,
  lastUsedAt: credential.lastUsedAt,
  expiresAt: credential.expiresAt,
  createdByUserId: credential.createdByUserId,
  createdAt: credential.createdAt,
  updatedAt: credential.updatedAt,
});

// ─── CRUD ───────────────────────────────────────────────────────────────────
async function createCredential({
  companyId,
  userId = null,
  name,
  credentialType = 'API',
  scopes = [],
  rateLimitPerMin = 60,
  expiresInDays = null,
}) {
  if (!companyId) throw new Error('companyId is required');
  if (!name || !String(name).trim()) throw new Error('name is required');

  const type = credentialType === 'MCP' ? 'MCP' : 'API';
  const cleanedScopes = normalizeScopes(
    scopes.length ? scopes : DEFAULT_SCOPE_KEYS,
  );
  const rawKey = generateRawKey(type);
  const prisma = await getPrisma();

  const created = await prisma.merchantApiCredential.create({
    data: {
      companyId,
      name: String(name).trim().slice(0, 120),
      keyPrefix: rawKey.slice(0, VISIBLE_PREFIX_LENGTH),
      keyHash: hashKey(rawKey),
      credentialType: type,
      scopes: cleanedScopes,
      rateLimitPerMin: Math.min(Math.max(parseInt(rateLimitPerMin, 10) || 60, 10), 600),
      createdByUserId: userId || null,
      expiresAt: expiresInDays
        ? new Date(Date.now() + Math.max(parseInt(expiresInDays, 10) || 0, 1) * 86400000)
        : null,
    },
  });

  return { credential: serializeCredential(created), rawKey };
}

async function listCredentials(companyId, { credentialType } = {}) {
  const prisma = await getPrisma();
  const where = { companyId };
  if (credentialType === 'API' || credentialType === 'MCP') {
    where.credentialType = credentialType;
  }
  const rows = await prisma.merchantApiCredential.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });
  return rows.map(serializeCredential);
}

async function updateCredential(companyId, id, patch = {}) {
  const prisma = await getPrisma();
  const existing = await prisma.merchantApiCredential.findFirst({
    where: { id, companyId },
    select: { id: true },
  });
  if (!existing) return null;

  const data = {};
  if (typeof patch.name === 'string' && patch.name.trim()) {
    data.name = patch.name.trim().slice(0, 120);
  }
  if (typeof patch.isActive === 'boolean') data.isActive = patch.isActive;
  if (Array.isArray(patch.scopes)) data.scopes = normalizeScopes(patch.scopes);
  if (patch.rateLimitPerMin !== undefined) {
    data.rateLimitPerMin = Math.min(Math.max(parseInt(patch.rateLimitPerMin, 10) || 60, 10), 600);
  }
  if (patch.expiresInDays !== undefined) {
    const days = parseInt(patch.expiresInDays, 10);
    data.expiresAt = days > 0 ? new Date(Date.now() + days * 86400000) : null;
  }

  const updated = await prisma.merchantApiCredential.update({ where: { id }, data });
  return serializeCredential(updated);
}

async function deleteCredential(companyId, id) {
  const prisma = await getPrisma();
  const result = await prisma.merchantApiCredential.deleteMany({ where: { id, companyId } });
  return result.count > 0;
}

// ─── Verification ───────────────────────────────────────────────────────────
/**
 * Verify a raw API/MCP key. Returns { ok, reason, credential } where reason is
 * one of: invalid | inactive | expired.
 */
async function verifyCredential(rawKey, { requiredType = null } = {}) {
  const detectedType = detectTypeFromKey(rawKey);
  if (!detectedType) return { ok: false, reason: 'invalid', credential: null };
  if (requiredType && detectedType !== requiredType) {
    return { ok: false, reason: 'invalid', credential: null };
  }

  const prisma = await getPrisma();
  const record = await prisma.merchantApiCredential.findUnique({
    where: { keyHash: hashKey(rawKey) },
  });
  if (!record || record.credentialType !== detectedType) {
    return { ok: false, reason: 'invalid', credential: null };
  }
  if (!record.isActive) return { ok: false, reason: 'inactive', credential: record };
  if (record.expiresAt && new Date(record.expiresAt).getTime() < Date.now()) {
    return { ok: false, reason: 'expired', credential: record };
  }
  return { ok: true, reason: null, credential: record };
}

// ─── Rate limiting ──────────────────────────────────────────────────────────
async function consumeRateLimit(credential) {
  const limit = credential.rateLimitPerMin || 60;
  const bucket = nowBucket();
  const redis = getRedis();

  if (redis) {
    try {
      const redisKey = `developer:rl:${credential.id}:${bucket}`;
      const count = await redis.incr(redisKey);
      if (count === 1) await redis.expire(redisKey, 120);
      return {
        allowed: count <= limit,
        limit,
        remaining: Math.max(limit - count, 0),
        resetSeconds: 60 - (Math.floor(Date.now() / 1000) % 60),
      };
    } catch {
      // fall through to memory
    }
  }

  gcMemoryWindows(bucket);
  let win = memoryWindows.get(credential.id);
  if (!win || win.minuteBucket !== bucket) {
    win = { minuteBucket: bucket, count: 0 };
    memoryWindows.set(credential.id, win);
  }
  win.count += 1;
  return {
    allowed: win.count <= limit,
    limit,
    remaining: Math.max(limit - win.count, 0),
    resetSeconds: 60 - (Math.floor(Date.now() / 1000) % 60),
  };
}

// ─── Usage logging (fire-and-forget) ────────────────────────────────────────
const LAST_USED_THROTTLE_MS = 60000;

function logUsage({
  credentialId,
  companyId,
  source = 'API',
  method = null,
  path = null,
  tool = null,
  statusCode = null,
  durationMs = null,
  ip = null,
  credentialLastUsedAt = null,
}) {
  getPrisma()
    .then(async (prisma) => {
      await prisma.apiUsageLog.create({
        data: {
          credentialId,
          companyId,
          source,
          method: method ? String(method).slice(0, 10) : null,
          path: path ? String(path).slice(0, 300) : null,
          tool: tool ? String(tool).slice(0, 120) : null,
          statusCode: Number.isFinite(statusCode) ? statusCode : null,
          durationMs: Number.isFinite(durationMs) ? durationMs : null,
          ip: ip ? String(ip).slice(0, 64) : null,
        },
      });
      const lastUsedMs = credentialLastUsedAt ? new Date(credentialLastUsedAt).getTime() : 0;
      if (Date.now() - lastUsedMs > LAST_USED_THROTTLE_MS) {
        await prisma.merchantApiCredential.updateMany({
          where: { id: credentialId },
          data: { lastUsedAt: new Date() },
        });
      }
    })
    .catch((error) => {
      console.warn('[developer-api] usage log failed:', error?.message || error);
    });
}

/**
 * Verify + rate-limit + audit in one call. Used by internal bridges
 * (ai-service MCP path) where the raw key arrives on the Authorization header.
 */
async function verifyAndConsume(rawKey, meta = {}) {
  const { ok, reason, credential } = await verifyCredential(rawKey);
  if (!ok) return { ok: false, reason, credential: null };

  const rl = await consumeRateLimit(credential);
  if (!rl.allowed) {
    return {
      ok: false,
      reason: 'rate_limited',
      credential: { ...serializeCredential(credential), companyId: credential.companyId },
      rateLimit: rl,
    };
  }

  logUsage({
    credentialId: credential.id,
    companyId: credential.companyId,
    source: credential.credentialType === 'MCP' ? 'MCP' : 'API',
    method: meta.method || null,
    path: meta.path || null,
    tool: meta.tool || null,
    statusCode: meta.statusCode ?? 200,
    durationMs: meta.durationMs || null,
    ip: meta.ip || null,
    credentialLastUsedAt: credential.lastUsedAt,
  });

  return {
    ok: true,
    reason: null,
    credential: { ...serializeCredential(credential), companyId: credential.companyId },
    rateLimit: rl,
  };
}

const hasScope = (scopes, required) => {
  if (!required) return true;
  const list = scopes || [];
  return list.includes(required) || list.includes('*');
};

// ─── Usage summary ──────────────────────────────────────────────────────────
async function getUsageSummary(companyId, days = 30) {
  const safeDays = Math.min(Math.max(parseInt(days, 10) || 30, 1), 90);
  const since = new Date(Date.now() - safeDays * 86400000);
  const prisma = await getPrisma();

  const [rows, credentials] = await Promise.all([
    prisma.apiUsageLog.findMany({
      where: { companyId, createdAt: { gte: since } },
      select: {
        credentialId: true,
        source: true,
        tool: true,
        path: true,
        statusCode: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 5000,
    }),
    prisma.merchantApiCredential.findMany({
      where: { companyId },
      select: { id: true, name: true, keyPrefix: true, credentialType: true },
    }),
  ]);

  const daily = new Map();
  const byCredential = new Map();
  const topEndpoints = new Map();
  let okCount = 0;
  let errorCount = 0;

  for (const row of rows) {
    const day = row.createdAt.toISOString().slice(0, 10);
    daily.set(day, (daily.get(day) || 0) + 1);
    byCredential.set(row.credentialId, (byCredential.get(row.credentialId) || 0) + 1);
    const label = row.tool ? `tool:${row.tool}` : row.path || 'unknown';
    topEndpoints.set(label, (topEndpoints.get(label) || 0) + 1);
    if ((row.statusCode || 200) >= 400) errorCount += 1;
    else okCount += 1;
  }

  const credentialIndex = new Map(credentials.map((c) => [c.id, c]));

  return {
    windowDays: safeDays,
    totals: { requests: rows.length, ok: okCount, errors: errorCount },
    daily: [...daily.entries()]
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    byCredential: [...byCredential.entries()]
      .map(([credentialId, count]) => {
        const meta = credentialIndex.get(credentialId);
        return {
          credentialId,
          count,
          name: meta?.name || 'Deleted key',
          maskedKey: meta ? maskKey(meta.keyPrefix) : null,
          credentialType: meta?.credentialType || null,
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 20),
    topEndpoints: [...topEndpoints.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15),
  };
}

module.exports = {
  API_KEY_PREFIX,
  MCP_KEY_PREFIX,
  SCOPE_DEFINITIONS,
  ALL_SCOPE_KEYS,
  DEFAULT_SCOPE_KEYS,
  detectTypeFromKey,
  createCredential,
  listCredentials,
  updateCredential,
  deleteCredential,
  verifyCredential,
  consumeRateLimit,
  verifyAndConsume,
  hasScope,
  logUsage,
  getUsageSummary,
  maskKey,
  serializeCredential,
};
