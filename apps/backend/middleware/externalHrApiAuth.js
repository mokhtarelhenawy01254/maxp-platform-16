/**
 * 🛡️ External HR API Authentication & Scope Middleware
 * التحقق من صلاحيات ومفاتيح الـ API الخارجية وعزل الشركات
 */

const { getSharedPrismaClient } = require('../services/sharedDatabase');
const {
  extractKeyPrefix,
  hashHrApiKey,
  credentialHasScope
} = require('../services/hrIntegrationService');

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

const authenticateExternalHrApi = async (req, res, next) => {
  try {
    const apiKey = extractApiKey(req);
    if (!apiKey) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_KEY_REQUIRED',
          message: 'External HR API key is required. Pass via x-api-key header or Authorization: Bearer <key>'
        }
      });
    }

    const keyPrefix = extractKeyPrefix(apiKey);
    if (!keyPrefix) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_KEY_FORMAT',
          message: 'Invalid HR API key format. Expected prefix hrk_...'
        }
      });
    }

    const prisma = getSharedPrismaClient();
    const keyHash = hashHrApiKey(apiKey);

    const credential = await prisma.hrApiCredential.findUnique({
      where: { keyPrefix },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            isActive: true,
            timezone: true
          }
        }
      }
    });

    if (!credential || credential.keyHash !== keyHash) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'HR API key is invalid or unrecognized'
        }
      });
    }

    if (!credential.isActive || credential.revokedAt) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'KEY_REVOKED',
          message: 'HR API key has been deactivated or revoked',
          reason: credential.revokedReason || null
        }
      });
    }

    if (credential.expiresAt && new Date(credential.expiresAt) < new Date()) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'KEY_EXPIRED',
          message: 'HR API key has expired'
        }
      });
    }

    if (!credential.company || !credential.company.isActive) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'COMPANY_INACTIVE',
          message: 'Associated tenant company is inactive or suspended'
        }
      });
    }

    // Update lastUsedAt asynchronously without blocking request
    prisma.hrApiCredential.update({
      where: { id: credential.id },
      data: { lastUsedAt: new Date() }
    }).catch(() => {});

    // Attach verified context
    req.hrCredential = credential;
    req.externalApiCredential = credential;
    req.companyId = credential.companyId;
    req.company = credential.company;
    req.user = {
      id: credential.createdByUserId || 'external-system',
      companyId: credential.companyId,
      role: 'EXTERNAL_HR_AGENT',
      isExternalApi: true
    };

    return next();
  } catch (error) {
    console.error('❌ [ExternalHrApiAuth] Error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_AUTH_ERROR',
        message: 'Internal server error while authenticating API key'
      }
    });
  }
};

const requireExternalHrScope = (requiredScope) => {
  return (req, res, next) => {
    if (!req.hrCredential) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Unauthenticated API request'
        }
      });
    }

    if (!credentialHasScope(req.hrCredential, requiredScope)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN_SCOPE',
          message: `This API key lacks the required scope: '${requiredScope}'`,
          requiredScope
        }
      });
    }

    next();
  };
};

module.exports = {
  authenticateExternalHrApi,
  requireExternalHrScope
};
