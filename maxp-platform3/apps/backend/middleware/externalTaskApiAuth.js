const { getSharedPrismaClient } = require('../services/sharedDatabase');
const {
  credentialHasScope,
  extractKeyPrefix,
  hashTaskApiKey,
  normalizeScopes,
  parseStoredArray
} = require('../services/taskIntegrationService');

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

const authenticateExternalTaskApi = async (req, res, next) => {
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
        keyPrefix,
        isActive: true,
        revokedAt: null
      },
      select: {
        id: true,
        companyId: true,
        userId: true,
        defaultActingUserId: true,
        name: true,
        keyHash: true,
        scopes: true,
        expiresAt: true
      }
    });

    if (!credential) {
      return res.status(401).json({
        success: false,
        message: 'Invalid external API key'
      });
    }

    if (credential.expiresAt && credential.expiresAt <= new Date()) {
      return res.status(401).json({
        success: false,
        message: 'External API key has expired'
      });
    }

    const incomingHash = hashTaskApiKey(apiKey);
    if (incomingHash !== credential.keyHash) {
      return res.status(401).json({
        success: false,
        message: 'Invalid external API key'
      });
    }

    const actingUserId = credential.userId || credential.defaultActingUserId || null;
    if (actingUserId) {
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

    req.externalTaskApi = {
      credentialId: credential.id,
      companyId: credential.companyId,
      userId: credential.userId,
      defaultActingUserId: credential.defaultActingUserId,
      actingUserId,
      name: credential.name,
      scopes: normalizeScopes(parseStoredArray(credential.scopes))
    };

    prisma.taskApiCredential.update({
      where: { id: credential.id },
      data: { lastUsedAt: new Date() }
    }).catch((error) => {
      console.error('⚠️ [EXTERNAL-TASKS-AUTH] Failed to update lastUsedAt:', error.message);
    });

    next();
  } catch (error) {
    console.error('❌ [EXTERNAL-TASKS-AUTH] Authentication failed:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to authenticate external API key'
    });
  }
};

const requireExternalTaskScope = (requiredScope) => (req, res, next) => {
  if (!req.externalTaskApi || !credentialHasScope(req.externalTaskApi, requiredScope)) {
    return res.status(403).json({
      success: false,
      message: `This API key does not have the required scope: ${requiredScope}`
    });
  }

  next();
};

module.exports = {
  authenticateExternalTaskApi,
  requireExternalTaskScope
};
