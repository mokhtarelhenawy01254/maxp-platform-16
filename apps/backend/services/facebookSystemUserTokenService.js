/**
 * facebookSystemUserTokenService.js
 * إدارة توكنات System User الدائمة من Meta Business Manager — بديل صامت لآلية
 * توكنات OAuth منتهية الصلاحية (60 يوم) لنفس فلسفة WhatsApp metaAccessToken.
 *
 * التخزين: جدول facebook_system_user_tokens (توكن مشفّر AES-256-GCM عبر fieldEncryption)
 * النطاقان: TENANT (شركة واحدة عبر companyId) أو CENTRAL (مستوى المنصة، سوبر أدمن فقط)
 * الأولوية: توكن الشركة يسبق المركزي (نفس نمط ai_keys: companyId ثم CENTRAL بترتيب priority)
 *
 * وضعا الاستخدام (mode):
 *  - PRIMARY  : التوكن يحل محل توكن الصفحة دائمًا (لكل صفحات الشركة المخصصة للسيستم يوزر)
 *  - FALLBACK : التوكن يعمل فقط عند غياب توكن الصفحة (الافتراضي — صفر مخاطرة على الموجود)
 *
 * ⚠️ عزل التعديلات: كل دوال الاستعلام ترجع null عند أي خطأ ولا تكسر أبدًا مسار الرسائل القائم.
 */

const crypto = require('crypto');
const axios = require('axios');
const { getSharedPrismaClient } = require('./sharedDatabase');
const { encryptField, decryptField } = require('../utils/fieldEncryption');
const { getMetaGraphApiVersion } = require('../config/metaApi');

const CACHE_TTL_MS = 30_000;
const GRAPH_TIMEOUT_MS = 10_000;
const PAGE_TOKEN_TTL_MS = 60 * 60 * 1000;

let schemaEnsured = false;
let schemaEnsurePromise = null;

// كاش خفيف: cacheKey ('CENTRAL' | companyId) → { value, expiresAt }
const resolutionCache = new Map();

// كاش توكنات الصفحات المسكوبة من توكن السيستم يوزر: pageId → { token, expiresAt }
// (توكنات الصفحات من سيستم يوزر لا تنتهي — TTL ساعة للكاش فقط كضمان تجديد)
const pageTokenMintCache = new Map();

function cacheKeyForScope(scope, companyId) {
  return scope === 'CENTRAL' ? 'CENTRAL' : String(companyId);
}

function invalidateSystemUserTokenCache(companyId) {
  if (companyId) {
    resolutionCache.delete(String(companyId));
  } else {
    resolutionCache.clear();
  }
  pageTokenMintCache.clear();
}

/**
 * إنشاء الجدول بشكل idempotent (نفس نمط metaAppRegistryService.ensureSchema)
 */
async function ensureSchema() {
  if (schemaEnsured) return;
  if (schemaEnsurePromise) return schemaEnsurePromise;

  schemaEnsurePromise = (async () => {
    try {
      const prisma = getSharedPrismaClient();
      if (!prisma?.$executeRawUnsafe) return;

      const ddlStatements = [
        `CREATE TABLE IF NOT EXISTS "facebook_system_user_tokens" (
          "id" TEXT PRIMARY KEY,
          "companyId" TEXT,
          "scope" TEXT NOT NULL DEFAULT 'TENANT',
          "label" TEXT,
          "tokenEncrypted" TEXT NOT NULL,
          "tokenLast4" TEXT,
          "businessId" TEXT,
          "appId" TEXT,
          "appKey" TEXT,
          "scopes" TEXT,
          "mode" TEXT NOT NULL DEFAULT 'FALLBACK',
          "isActive" BOOLEAN NOT NULL DEFAULT true,
          "priority" INT NOT NULL DEFAULT 100,
          "createdBy" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );`,
        `CREATE INDEX IF NOT EXISTS "facebook_system_user_tokens_company_idx"
           ON "facebook_system_user_tokens"("companyId", "isActive", "priority");`,
        `CREATE INDEX IF NOT EXISTS "facebook_system_user_tokens_scope_idx"
           ON "facebook_system_user_tokens"("scope", "isActive", "priority");`,
      ];

      for (const sql of ddlStatements) {
        try {
          await prisma.$executeRawUnsafe(sql);
        } catch (_) {
          /* idempotent — تجاهل تعارضات الأعمدة/الفهارس الموجودة */
        }
      }
      schemaEnsured = true;
    } catch (err) {
      console.warn('⚠️ [FB-SYSTEM-USER] ensureSchema note:', err.message);
    } finally {
      schemaEnsurePromise = null;
    }
  })();

  return schemaEnsurePromise;
}

function normalizeMode(mode) {
  return String(mode || '').trim().toUpperCase() === 'PRIMARY' ? 'PRIMARY' : 'FALLBACK';
}

function normalizeScope(scope) {
  return String(scope || '').trim().toUpperCase() === 'CENTRAL' ? 'CENTRAL' : 'TENANT';
}

function maskRow(row) {
  if (!row) return null;
  let scopes = null;
  if (row.scopes) {
    try {
      const parsed = JSON.parse(row.scopes);
      scopes = Array.isArray(parsed) ? parsed : null;
    } catch (_) {
      scopes = null;
    }
  }
  return {
    id: row.id,
    scope: row.scope,
    companyId: row.companyId,
    label: row.label,
    tokenLast4: row.tokenLast4,
    businessId: row.businessId,
    appId: row.appId,
    appKey: row.appKey,
    scopes,
    mode: row.mode,
    isActive: row.isActive,
    updatedAt: row.updatedAt,
  };
}

/**
 * التحقق من التوكن مباشرة مقابل Graph API — /me هوية السيستم يوزر + /me/permissions الصلاحيات
 */
async function validateSystemUserTokenWithGraph(token) {
  if (!token || typeof token !== 'string') {
    return { valid: false, reason: 'MISSING_TOKEN' };
  }

  try {
    const meRes = await axios.get(
      `https://graph.facebook.com/${getMetaGraphApiVersion()}/me`,
      {
        params: { access_token: token, fields: 'id,name' },
        timeout: GRAPH_TIMEOUT_MS,
      },
    );

    let permissions = null;
    try {
      const permsRes = await axios.get(
        `https://graph.facebook.com/${getMetaGraphApiVersion()}/me/permissions`,
        { params: { access_token: token }, timeout: GRAPH_TIMEOUT_MS },
      );
      const raw = permsRes?.data?.data;
      if (Array.isArray(raw)) permissions = raw.map((p) => p.permission).filter(Boolean);
    } catch (_) {
      /* بعض التوكنات لا تكشف /me/permissions — ليست شرطًا للصلاحية */
    }

    return { valid: true, identity: meRes.data, permissions };
  } catch (error) {
    const graphError = error?.response?.data?.error || {};
    return {
      valid: false,
      reason: graphError.code === 190 ? 'INVALID_TOKEN' : 'GRAPH_ERROR',
      error: {
        code: graphError.code || null,
        message: graphError.message || error.message || 'Facebook API error',
      },
    };
  }
}

/**
 * جلب الصف النشط لنطاق معين (TENANT لشركة أو CENTRAL) بترتيب priority ASC
 */
async function fetchActiveRow(scope, companyId) {
  await ensureSchema();
  const prisma = getSharedPrismaClient();
  if (!prisma?.$queryRawUnsafe) return null;

  if (scope === 'TENANT') {
    if (!companyId) return null;
    const rows = await prisma.$queryRawUnsafe(
      `SELECT * FROM "facebook_system_user_tokens"
        WHERE "companyId" = $1 AND "scope" = 'TENANT' AND "isActive" = true
        ORDER BY "priority" ASC, "updatedAt" DESC LIMIT 1`,
      String(companyId),
    );
    return rows?.[0] || null;
  }

  const rows = await prisma.$queryRawUnsafe(
    `SELECT * FROM "facebook_system_user_tokens"
      WHERE "companyId" IS NULL AND "scope" = 'CENTRAL' AND "isActive" = true
      ORDER BY "priority" ASC, "updatedAt" DESC LIMIT 1`,
  );
  return rows?.[0] || null;
}

async function resolveScopeFromCache(scope, companyId) {
  const cacheKey = cacheKeyForScope(scope, companyId);
  const cached = resolutionCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  let value = null;
  try {
    const row = await fetchActiveRow(scope, companyId);
    if (row && row.tokenEncrypted) {
      const token = decryptField(row.tokenEncrypted);
      if (token) {
        value = {
          token,
          scope: row.scope,
          companyId: row.companyId,
          mode: normalizeMode(row.mode),
          businessId: row.businessId,
          appKey: row.appKey,
          appId: row.appId,
        };
      }
    }
  } catch (err) {
    console.warn('⚠️ [FB-SYSTEM-USER] resolve failed gracefully:', err.message);
    value = null;
  }

  resolutionCache.set(cacheKey, { value, expiresAt: Date.now() + CACHE_TTL_MS });
  return value;
}

/**
 * التوكن الفعّال لشركة: توكن الشركة أولًا ثم المركزي — يرجع null عند غياب الاثنين أو أي خطأ.
 */
async function resolveEffectiveSystemUserToken(companyId) {
  if (!companyId) return resolveScopeFromCache('CENTRAL', null);

  const tenant = await resolveScopeFromCache('TENANT', companyId);
  if (tenant) return tenant;

  return resolveScopeFromCache('CENTRAL', null);
}

/**
 * سكب page access token من توكن السيستم يوزر — عمليات الصفحات (/posts، الرسائل، النشر)
 * تتطلب توكن صفحة وليس توكن سيستم يوزر مباشرة (خطأ Graph 190/2069032).
 * التوكن الناتج لا ينتهي صلاحيته؛ يُكاش لمدة ساعة.
 */
async function mintPageTokenFromSystemUserToken(systemUserToken, pageId) {
  if (!systemUserToken || !pageId) return null;

  const cached = pageTokenMintCache.get(String(pageId));
  if (cached && cached.expiresAt > Date.now()) return cached.token;

  try {
    const res = await axios.get(
      `https://graph.facebook.com/${getMetaGraphApiVersion()}/${pageId}`,
      {
        params: { fields: 'access_token', access_token: systemUserToken },
        timeout: GRAPH_TIMEOUT_MS,
      },
    );
    const pageToken = res.data?.access_token;
    if (pageToken) {
      pageTokenMintCache.set(String(pageId), {
        token: pageToken,
        expiresAt: Date.now() + PAGE_TOKEN_TTL_MS,
      });
      return pageToken;
    }
  } catch (_) {
    /* الصفحة غير مخصصة أو خطأ شبكة — تراجع صامت للمسار القائم */
  }
  return null;
}

/**
 * قرار الاستخدام لصفحة محددة — النقطة الوحيدة التي تستشيرها getPageToken والنشر:
 *  - PRIMARY  → توكن صفحة مسكوب من السيستم يوزر يحل محل توكن الصفحة دائمًا
 *  - FALLBACK → فقط عند غياب توكن الصفحة
 * يرجع توكن صفحة (وليس توكن السيستم يوزر) لتتوافق مع كل مسارات الكود القائمة.
 */
async function resolveSystemUserPageToken(page) {
  try {
    if (!page?.companyId || !page?.pageId) return null;
    const effective = await resolveEffectiveSystemUserToken(page.companyId);
    if (!effective) return null;
    const shouldUse = effective.mode === 'PRIMARY' || !page.pageAccessToken;
    if (!shouldUse) return null;
    return await mintPageTokenFromSystemUserToken(effective.token, page.pageId);
  } catch (_) {
    return null;
  }
}

/**
 * حفظ توكن جديد (مع تعطيل أي صف نشط سابق لنفس النطاق) بعد التحقق منه مقابل Graph
 */
async function saveSystemUserToken({
  companyId = null,
  scope = 'TENANT',
  token,
  businessId = null,
  appId = null,
  appKey = null,
  mode = 'FALLBACK',
  label = null,
  createdBy = null,
  priority = 100,
  validate = true,
}) {
  const normalizedScope = normalizeScope(scope);
  const normalizedMode = normalizeMode(mode);

  if (!token || typeof token !== 'string' || token.trim().length < 20) {
    throw new Error('INVALID_TOKEN_FORMAT');
  }
  const cleanToken = token.trim();
  if (normalizedScope === 'TENANT' && !companyId) {
    throw new Error('TENANT_SCOPE_REQUIRES_COMPANY');
  }
  if (normalizedScope === 'CENTRAL' && companyId) {
    throw new Error('CENTRAL_SCOPE_MUST_BE_PLATFORM_WIDE');
  }

  let validation = null;
  if (validate) {
    validation = await validateSystemUserTokenWithGraph(cleanToken);
    if (!validation.valid) {
      const err = new Error(validation.reason === 'INVALID_TOKEN' ? 'INVALID_TOKEN' : 'GRAPH_VALIDATION_FAILED');
      err.detail = validation.error || null;
      throw err;
    }
  }

  await ensureSchema();
  const prisma = getSharedPrismaClient();
  const id = crypto.randomUUID();
  const scopesJson = validation?.permissions ? JSON.stringify(validation.permissions) : null;
  const effectiveCompanyId = normalizedScope === 'TENANT' ? String(companyId) : null;

  // عطّل الصفوف النشطة السابقة لنفس النطاق (صف واحد نشط لكل نطاق)
  if (normalizedScope === 'TENANT') {
    await prisma.$executeRawUnsafe(
      `UPDATE "facebook_system_user_tokens" SET "isActive" = false, "updatedAt" = CURRENT_TIMESTAMP
        WHERE "companyId" = $1 AND "scope" = 'TENANT' AND "isActive" = true`,
      effectiveCompanyId,
    );
  } else {
    await prisma.$executeRawUnsafe(
      `UPDATE "facebook_system_user_tokens" SET "isActive" = false, "updatedAt" = CURRENT_TIMESTAMP
        WHERE "companyId" IS NULL AND "scope" = 'CENTRAL' AND "isActive" = true`,
    );
  }

  await prisma.$executeRawUnsafe(
    `INSERT INTO "facebook_system_user_tokens"
      ("id", "companyId", "scope", "label", "tokenEncrypted", "tokenLast4", "businessId",
       "appId", "appKey", "scopes", "mode", "isActive", "priority", "createdBy")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true, $12, $13)`,
    id,
    effectiveCompanyId,
    normalizedScope,
    label || null,
    encryptField(cleanToken),
    cleanToken.slice(-4),
    businessId || null,
    appId || null,
    appKey || null,
    scopesJson,
    normalizedMode,
    Number.isFinite(Number(priority)) ? Number(priority) : 100,
    createdBy || null,
  );

  invalidateSystemUserTokenCache(effectiveCompanyId);

  return {
    id,
    scope: normalizedScope,
    companyId: effectiveCompanyId,
    mode: normalizedMode,
    identity: validation?.identity || null,
    permissions: validation?.permissions || null,
  };
}

/**
 * إلغاء التوكن النشط لنطاق معين
 */
async function clearSystemUserToken({ companyId = null, scope = 'TENANT' } = {}) {
  const normalizedScope = normalizeScope(scope);
  if (normalizedScope === 'TENANT' && !companyId) {
    throw new Error('TENANT_SCOPE_REQUIRES_COMPANY');
  }

  await ensureSchema();
  const prisma = getSharedPrismaClient();
  let cleared = 0;

  if (normalizedScope === 'TENANT') {
    const res = await prisma.$executeRawUnsafe(
      `UPDATE "facebook_system_user_tokens" SET "isActive" = false, "updatedAt" = CURRENT_TIMESTAMP
        WHERE "companyId" = $1 AND "scope" = 'TENANT' AND "isActive" = true`,
      String(companyId),
    );
    cleared = res || 0;
  } else {
    const res = await prisma.$executeRawUnsafe(
      `UPDATE "facebook_system_user_tokens" SET "isActive" = false, "updatedAt" = CURRENT_TIMESTAMP
        WHERE "companyId" IS NULL AND "scope" = 'CENTRAL' AND "isActive" = true`,
    );
    cleared = res || 0;
  }

  invalidateSystemUserTokenCache(normalizedScope === 'CENTRAL' ? null : companyId);
  return { cleared };
}

/**
 * حالة الإعداد لشركة (بدون كشف التوكن) — للواجهة
 */
async function getSystemUserTokenStatus(companyId) {
  const [tenantRow, centralRow] = await Promise.all([
    companyId ? fetchActiveRow('TENANT', companyId).catch(() => null) : Promise.resolve(null),
    fetchActiveRow('CENTRAL', null).catch(() => null),
  ]);

  const tenant = maskRow(tenantRow);
  const central = maskRow(centralRow);

  let effective = null;
  if (tenant) effective = { source: 'TENANT', mode: tenant.mode };
  else if (central) effective = { source: 'CENTRAL', mode: central.mode };

  return { tenant, central, effective };
}

/**
 * الصفحات المتاحة للتوكن الفعّال — GET /me/accounts بصف الصفحات المخصصة للسيستم يوزر
 */
async function listPagesForSystemUserToken(companyId) {
  const effective = await resolveEffectiveSystemUserToken(companyId);
  if (!effective) {
    return { token: null, pages: [], reason: 'NO_ACTIVE_SYSTEM_USER_TOKEN' };
  }

  try {
    const res = await axios.get(
      `https://graph.facebook.com/${getMetaGraphApiVersion()}/me/accounts`,
      {
        params: { access_token: effective.token, fields: 'id,name,category', limit: 100 },
        timeout: GRAPH_TIMEOUT_MS,
      },
    );
    const pages = Array.isArray(res.data?.data)
      ? res.data.data.map((p) => ({ id: p.id, name: p.name, category: p.category || null }))
      : [];
    return { token: effective, pages, reason: pages.length === 0 ? 'NO_PAGES_ASSIGNED' : null };
  } catch (error) {
    const graphError = error?.response?.data?.error || {};
    return {
      token: effective,
      pages: [],
      reason: 'GRAPH_ERROR',
      error: { code: graphError.code || null, message: graphError.message || error.message },
    };
  }
}

module.exports = {
  ensureSchema,
  saveSystemUserToken,
  clearSystemUserToken,
  getSystemUserTokenStatus,
  resolveEffectiveSystemUserToken,
  resolveSystemUserPageToken,
  mintPageTokenFromSystemUserToken,
  listPagesForSystemUserToken,
  validateSystemUserTokenWithGraph,
  invalidateSystemUserTokenCache,
};
