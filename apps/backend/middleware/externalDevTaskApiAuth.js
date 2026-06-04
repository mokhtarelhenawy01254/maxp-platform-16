const { getSharedPrismaClient } = require('../services/sharedDatabase');
const {
  credentialHasDevTaskScope,
  extractKeyPrefix,
  hashTaskApiKey,
  normalizeDevTaskScopes,
  parseStoredArray
} = require('../services/devTaskIntegrationService');

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

const ensureActiveMember = async (prisma, memberId) => {
  if (!memberId) {
    return null;
  }

  return prisma.devTeamMember.findFirst({
    where: {
      id: memberId,
      isActive: true,
      user: {
        isActive: true
      }
    },
    select: {
      id: true,
      userId: true
    }
  });
};

const ensureActiveProject = async (prisma, projectId) => {
  if (!projectId) {
    return null;
  }

  return prisma.devProject.findUnique({
    where: { id: projectId },
    select: {
      id: true
    }
  });
};

const authenticateExternalDevTaskApi = async (req, res, next) => {
  try {
    const apiKey = extractApiKey(req);
    if (!apiKey) {
      return res.status(401).json({
        success: false,
        message: 'External dev task API key is required'
      });
    }

    const keyPrefix = extractKeyPrefix(apiKey);
    if (!keyPrefix || !keyPrefix.startsWith('dtk_')) {
      return res.status(401).json({
        success: false,
        message: 'Invalid external dev task API key format'
      });
    }

    const prisma = getSharedPrismaClient();
    const credential = await prisma.devTaskApiCredential.findFirst({
      where: {
        keyPrefix,
        isActive: true,
        revokedAt: null
      },
      select: {
        id: true,
        name: true,
        keyHash: true,
        scopes: true,
        expiresAt: true,
        defaultReporterMemberId: true,
        defaultAssigneeMemberId: true,
        defaultProjectId: true
      }
    });

    if (!credential) {
      return res.status(401).json({
        success: false,
        message: 'Invalid external dev task API key'
      });
    }

    if (credential.expiresAt && credential.expiresAt <= new Date()) {
      return res.status(401).json({
        success: false,
        message: 'External dev task API key has expired'
      });
    }

    const incomingHash = hashTaskApiKey(apiKey);
    if (incomingHash !== credential.keyHash) {
      return res.status(401).json({
        success: false,
        message: 'Invalid external dev task API key'
      });
    }

    const reporterMember = await ensureActiveMember(prisma, credential.defaultReporterMemberId);
    if (credential.defaultReporterMemberId && !reporterMember) {
      return res.status(403).json({
        success: false,
        message: 'The API key is linked to an inactive reporter member'
      });
    }

    const assigneeMember = await ensureActiveMember(prisma, credential.defaultAssigneeMemberId);
    if (credential.defaultAssigneeMemberId && !assigneeMember) {
      return res.status(403).json({
        success: false,
        message: 'The API key is linked to an inactive assignee member'
      });
    }

    if (!credential.defaultProjectId) {
      return res.status(403).json({
        success: false,
        message: 'The API key is not bound to a development project'
      });
    }

    const project = await ensureActiveProject(prisma, credential.defaultProjectId);
    if (!project) {
      return res.status(403).json({
        success: false,
        message: 'The API key is linked to a missing development project'
      });
    }

    req.externalDevTaskApi = {
      credentialId: credential.id,
      name: credential.name,
      scopes: normalizeDevTaskScopes(parseStoredArray(credential.scopes)),
      defaultReporterMemberId: reporterMember?.id || null,
      defaultReporterUserId: reporterMember?.userId || null,
      defaultAssigneeMemberId: assigneeMember?.id || null,
      defaultAssigneeUserId: assigneeMember?.userId || null,
      defaultProjectId: credential.defaultProjectId || null
    };

    prisma.devTaskApiCredential.update({
      where: { id: credential.id },
      data: { lastUsedAt: new Date() }
    }).catch((error) => {
      console.error('⚠️ [EXTERNAL-DEV-TASKS-AUTH] Failed to update lastUsedAt:', error.message);
    });

    next();
  } catch (error) {
    console.error('❌ [EXTERNAL-DEV-TASKS-AUTH] Authentication failed:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to authenticate external dev task API key'
    });
  }
};

const requireExternalDevTaskScope = (requiredScope) => (req, res, next) => {
  if (!req.externalDevTaskApi || !credentialHasDevTaskScope(req.externalDevTaskApi, requiredScope)) {
    return res.status(403).json({
      success: false,
      message: `This API key does not have the required scope: ${requiredScope}`
    });
  }

  next();
};

module.exports = {
  authenticateExternalDevTaskApi,
  requireExternalDevTaskScope
};
