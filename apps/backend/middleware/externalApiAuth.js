const { getSharedPrismaClient } = require('../services/sharedDatabase');
const {
  credentialHasScope,
  extractKeyPrefix,
  hashTaskApiKey,
  normalizeScopes,
  parseStoredArray
} = require('../services/taskIntegrationService');

// In-memory sliding-window rate limiter per credential
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_MINUTE = 60;

const checkRateLimit = (credentialId, maxLimit = MAX_REQUESTS_PER_MINUTE) => {
  const now = Date.now();
  let record = rateLimitMap.get(credentialId);

  if (!record || now > record.resetTime) {
    record = { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS };
    rateLimitMap.set(credentialId, record);
    return {
      allowed: true,
      limit: maxLimit,
      remaining: maxLimit - 1,
      reset: Math.ceil(record.resetTime / 1000)
    };
  }

  if (record.count >= maxLimit) {
    return {
      allowed: false,
      limit: maxLimit,
      remaining: 0,
      reset: Math.ceil(record.resetTime / 1000)
    };
  }

  record.count += 1;
  return {
    allowed: true,
    limit: maxLimit,
    remaining: maxLimit - record.count,
    reset: Math.ceil(record.resetTime / 1000)
  };
};

// Periodic garbage collection for rate limiter
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [id, record] of rateLimitMap.entries()) {
    if (now > record.resetTime + 60000) {
      rateLimitMap.delete(id);
    }
  }
}, 5 * 60 * 1000);
if (cleanupInterval && typeof cleanupInterval.unref === 'function') {
  cleanupInterval.unref();
}

const getClientIp = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const ips = String(forwarded).split(',').map((ip) => ip.trim());
    if (ips.length > 0 && ips[0]) {
      return ips[0].replace(/^::ffff:/, '');
    }
  }
  const ip = req.ip || req.socket?.remoteAddress || req.connection?.remoteAddress || '';
  return String(ip).replace(/^::ffff:/, '').trim();
};

const buildCompanyUserWhere = (companyId, userId) => ({
  id: userId,
  isActive: true,
  OR: [
    { companyId },
    {
      userCompanies: {
        some: {
          companyId,
          isActive: true
        }
      }
    }
  ]
});

const extractApiKey = (req) => {
  const headerKey = req.headers['x-api-key'] || req.headers['X-API-Key'];
  if (headerKey) {
    return String(headerKey).trim();
  }

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }

  return null;
};

const authenticateExternalApi = async (req, res, next) => {
  const startTime = Date.now();

  try {
    const apiKey = extractApiKey(req);
    if (!apiKey) {
      return res.status(401).json({
        success: false,
        message: 'External API key is required'
      });
    }

    const keyPrefix = extractKeyPrefix(apiKey);
    if (!keyPrefix) {
      return res.status(401).json({
        success: false,
        message: 'Invalid external API key format'
      });
    }

    const prisma = getSharedPrismaClient();
    const credential = await prisma.taskApiCredential.findFirst({
      where: {
        keyPrefix
      },
      select: {
        id: true,
        companyId: true,
        userId: true,
        defaultActingUserId: true,
        name: true,
        keyHash: true,
        scopes: true,
        allowedIps: true,
        expiresAt: true,
        isActive: true,
        revokedAt: true
      }
    });

    if (!credential) {
      return res.status(401).json({
        success: false,
        message: 'Invalid external API key'
      });
    }

    // 1. Check revocation / active status immediately
    if (credential.revokedAt || !credential.isActive) {
      return res.status(401).json({
        success: false,
        message: 'External API key has been revoked'
      });
    }

    // 2. Check expiration
    if (credential.expiresAt && credential.expiresAt <= new Date()) {
      return res.status(401).json({
        success: false,
        message: 'External API key has expired'
      });
    }

    // 3. Hash check
    const incomingHash = hashTaskApiKey(apiKey);
    if (incomingHash !== credential.keyHash) {
      return res.status(401).json({
        success: false,
        message: 'Invalid external API key'
      });
    }

    // 4. IP Allowlist check
    const clientIp = getClientIp(req);
    const allowedIps = parseStoredArray(credential.allowedIps);
    if (allowedIps.length > 0) {
      const isAllowed = allowedIps.includes(clientIp) || allowedIps.includes('*');
      if (!isAllowed) {
        return res.status(403).json({
          success: false,
          message: `IP ${clientIp} is not authorized for this API key`
        });
      }
    }

    // 5. Rate limiting (120 req/min reads, 20 req/min writes for admin-api, 60 req/min default)
    const isWrite = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method.toUpperCase());
    const isAdminApi = (req.originalUrl || req.path || '').includes('/admin-api');
    const dynamicLimit = isAdminApi ? (isWrite ? 20 : 120) : MAX_REQUESTS_PER_MINUTE;

    const rateLimit = checkRateLimit(credential.id, dynamicLimit);
    res.setHeader('X-RateLimit-Limit', rateLimit.limit);
    res.setHeader('X-RateLimit-Remaining', rateLimit.remaining);
    res.setHeader('X-RateLimit-Reset', rateLimit.reset);

    if (!rateLimit.allowed) {
      res.setHeader('Retry-After', Math.max(1, rateLimit.reset - Math.floor(Date.now() / 1000)));
      return res.status(429).json({
        success: false,
        message: `Rate limit exceeded. Maximum ${rateLimit.limit} requests per minute.`
      });
    }

    // 6. Acting user check (if bound to a specific user)
    const actingUserId = credential.userId || credential.defaultActingUserId || null;
    if (actingUserId && credential.companyId) {
      const actingUser = await prisma.user.findFirst({
        where: buildCompanyUserWhere(credential.companyId, actingUserId),
        select: { id: true }
      });

      if (!actingUser) {
        return res.status(403).json({
          success: false,
          message: 'The API key is linked to an inactive or unauthorized user'
        });
      }
    }

    const normalizedScopes = normalizeScopes(parseStoredArray(credential.scopes));
    const hasPlatformRead = normalizedScopes.includes('*') || normalizedScopes.includes('platform:read');

    // 7. Attach to request
    req.externalApi = req.externalTaskApi = {
      credentialId: credential.id,
      companyId: credential.companyId,
      userId: credential.userId,
      defaultActingUserId: credential.defaultActingUserId,
      actingUserId,
      name: credential.name,
      scopes: normalizedScopes,
      allowedIps,
      hasPlatformRead
    };

    // 8. Update usage telemetry asynchronously
    prisma.taskApiCredential.update({
      where: { id: credential.id },
      data: {
        lastUsedAt: new Date(),
        lastUsedIp: clientIp,
        requestCount: { increment: 1 }
      }
    }).catch((error) => {
      console.warn('⚠️ [EXTERNAL-API-AUTH] Failed to update telemetry:', error.message);
    });

    // 9. Immutable Audit Logging on response finish
    res.on('finish', () => {
      try {
        const duration = Date.now() - startTime;
        if (prisma.externalApiAuditLog) {
          prisma.externalApiAuditLog.create({
            data: {
              credentialId: credential.id,
              companyId: credential.companyId || null,
              path: req.originalUrl || req.path || req.url,
              method: req.method,
              statusCode: res.statusCode,
              ip: clientIp,
              userAgent: req.headers['user-agent'] || null,
              responseTimeMs: duration
            }
          }).catch((err) => {
            console.warn('⚠️ [EXTERNAL-API-AUDIT] Log insert error:', err.message);
          });
        }
      } catch (_logErr) {
        // Safe silence
      }
    });

    next();
  } catch (error) {
    console.error('❌ [EXTERNAL-API-AUTH] Authentication failed:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to authenticate external API key'
    });
  }
};

const requireExternalScope = (requiredScope) => (req, res, next) => {
  const credential = req.externalApi || req.externalTaskApi;
  if (!credential || !credentialHasScope(credential, requiredScope)) {
    return res.status(403).json({
      success: false,
      message: `This API key does not have the required scope: ${requiredScope}`
    });
  }

  next();
};

module.exports = {
  authenticateExternalApi,
  authenticateExternalTaskApi: authenticateExternalApi,
  requireExternalScope,
  requireExternalTaskScope: requireExternalScope,
  getClientIp,
  checkRateLimit
};
