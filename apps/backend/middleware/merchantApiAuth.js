/**
 * @module merchantApiAuth
 * @description Authentication middleware for the public merchant API
 * (`/api/v1/public/ext/*`). Authenticates merchant keys sent in the standard
 * bearer header (or the x-api-key header) from the Developer Hub, which
 * enforces per-credential rate limits, checks scopes, and audits usage.
 *
 * Tenant isolation: the company scope ALWAYS comes from the credential row —
 * body/query/header company identifiers are ignored on this surface.
 */
const developerApiService = require('../services/developerApiService');

const getClientIp = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const ips = String(forwarded).split(',').map((ip) => ip.trim());
    if (ips[0]) return ips[0].replace(/^::ffff:/, '');
  }
  const ip = req.ip || req.socket?.remoteAddress || req.connection?.remoteAddress || '';
  return String(ip).replace(/^::ffff:/, '').trim();
};

const extractRawKey = (req) => {
  const authHeader = String(req.headers.authorization || '').trim();
  const extendedValue = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : authHeader;
  const alternateValue = String(req.headers['x-api-key'] || req.headers['X-Api-Key'] || '').trim();
  return extendedValue || alternateValue;
};

/**
 * Authenticate a merchant API key. Only `mxp_live_` keys are accepted on the
 * REST surface — MCP tokens (`mxp_mcp_`) are rejected here so a leaked MCP
 * token cannot be replayed against the REST API (and vice versa).
 */
/**
 * Factory so each surface binds the credential type it accepts:
 *  - REST API keys (mxp_live_…) for /api/v1/public/ext/*
 *  - MCP tokens (mxp_mcp_…) for the video bridge consumed by video-mcp
 */
const createMerchantApiAuth = ({ credentialType = 'API' } = {}) => async (req, res, next) => {
  const startedAt = Date.now();
  const rawKey = extractRawKey(req);

  if (!rawKey) {
    return res.status(401).json({
      success: false,
      code: 'API_KEY_REQUIRED',
      message: 'مفتاح API مطلوب في هيدر Authorization',
    });
  }

  const detectedType = developerApiService.detectTypeFromKey(rawKey);
  if (!detectedType || detectedType !== credentialType) {
    return res.status(401).json({
      success: false,
      code: 'INVALID_API_KEY',
      message: 'مفتاح غير صالح لهذه الواجهة',
    });
  }

  try {
    const { ok, reason, credential } = await developerApiService.verifyCredential(rawKey, {
      requiredType: credentialType,
    });

    if (!ok) {
      const statusMap = { inactive: 403, expired: 403, invalid: 401 };
      const codeMap = {
        inactive: 'API_KEY_INACTIVE',
        expired: 'API_KEY_EXPIRED',
        invalid: 'INVALID_API_KEY',
      };
      const status = statusMap[reason] || 401;
      if (credential) {
        developerApiService.logUsage({
          credentialId: credential.id,
          companyId: credential.companyId,
          source: credential.credentialType === 'MCP' ? 'MCP' : 'API',
          method: req.method,
          path: req.originalUrl?.split('?')[0],
          statusCode: status,
          durationMs: Date.now() - startedAt,
          ip: getClientIp(req),
          credentialLastUsedAt: credential.lastUsedAt,
        });
      }
      return res.status(status).json({
        success: false,
        code: codeMap[reason] || 'INVALID_API_KEY',
        message:
          reason === 'inactive'
            ? 'هذا المفتاح معطّل'
            : reason === 'expired'
              ? 'هذا المفتاح منتهي الصلاحية'
              : 'مفتاح API غير صالح',
      });
    }

    // Rate limiting (Redis-backed with in-memory fallback)
    const rl = await developerApiService.consumeRateLimit(credential);
    res.setHeader('X-RateLimit-Limit', String(rl.limit));
    res.setHeader('X-RateLimit-Remaining', String(rl.remaining));
    res.setHeader('X-RateLimit-Reset', String(rl.resetSeconds));

    if (!rl.allowed) {
      developerApiService.logUsage({
        credentialId: credential.id,
        companyId: credential.companyId,
        source: credential.credentialType === 'MCP' ? 'MCP' : 'API',
        method: req.method,
        path: req.originalUrl?.split('?')[0],
        statusCode: 429,
        durationMs: Date.now() - startedAt,
        ip: getClientIp(req),
        credentialLastUsedAt: credential.lastUsedAt,
      });
      res.setHeader('Retry-After', String(rl.resetSeconds));
      return res.status(429).json({
        success: false,
        code: 'RATE_LIMITED',
        message: 'تجاوزت الحد المسموح من الطلبات، حاول بعد قليل',
      });
    }

    const serialized = {
      ...developerApiService.serializeCredential(credential),
      companyId: credential.companyId,
    };
    req.merchantCredential = serialized;

    // Log after the response finishes so status/duration reflect reality.
    res.on('finish', () => {
      developerApiService.logUsage({
        credentialId: serialized.id,
        companyId: credential.companyId,
        source: credential.credentialType === 'MCP' ? 'MCP' : 'API',
        method: req.method,
        path: req.originalUrl?.split('?')[0],
        statusCode: res.statusCode,
        durationMs: Date.now() - startedAt,
        ip: getClientIp(req),
        credentialLastUsedAt: credential.lastUsedAt,
      });
    });

    // Attach tenant context for downstream Prisma RLS, matching verifyToken.
    try {
      const tenantContext = require('../services/tenantContext');
      return tenantContext.run(credential.companyId, () => next());
    } catch {
      return next();
    }
  } catch (error) {
    console.error('[merchant-api-auth] verification failed:', error?.message || error);
    return res.status(503).json({
      success: false,
      code: 'AUTH_UNAVAILABLE',
      message: 'خدمة المصادقة غير متاحة حالياً',
    });
  }
};

// Default surface binding: REST API keys for /api/v1/public/ext/*.
const merchantApiAuth = createMerchantApiAuth();

/**
 * Scope guard factory: requireScope('orders:read')
 */
const requireScope = (scope) => (req, res, next) => {
  const credential = req.merchantCredential;
  if (!credential) {
    return res.status(401).json({ success: false, code: 'API_KEY_REQUIRED', message: 'مفتاح API مطلوب' });
  }
  if (!developerApiService.hasScope(credential.scopes, scope)) {
    return res.status(403).json({
      success: false,
      code: 'SCOPE_REQUIRED',
      message: `هذا المفتاح لا يملك صلاحية ${scope}`,
    });
  }
  return next();
};

module.exports = { merchantApiAuth, createMerchantApiAuth, requireScope, getClientIp };
