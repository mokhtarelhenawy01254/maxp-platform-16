const { getSharedPrismaClient } = require('../services/sharedDatabase');
const {
  generateDevTaskApiKey,
  maskKeyPrefix,
  normalizeDevTaskScopes,
  serializeJson
} = require('../services/devTaskIntegrationService');

const ensureCredentialAdmin = (req) => {
  if (req.user?.role === 'SUPER_ADMIN') {
    return;
  }

  const error = new Error('إدارة مفاتيح API للمهام متاحة فقط للسوبر أدمن');
  error.statusCode = 403;
  throw error;
};

const ensureActiveMember = async (prisma, memberId, label) => {
  if (!memberId) {
    return null;
  }

  const member = await prisma.devTeamMember.findFirst({
    where: {
      id: memberId,
      isActive: true,
      user: {
        isActive: true
      }
    },
    select: {
      id: true,
      user: {
        select: {
          firstName: true,
          lastName: true
        }
      }
    }
  });

  if (!member) {
    const error = new Error(`${label} غير موجود أو غير نشط`);
    error.statusCode = 400;
    throw error;
  }

  return member;
};

const ensureProjectExists = async (prisma, projectId) => {
  if (!projectId) {
    return null;
  }

  const project = await prisma.devProject.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      name: true
    }
  });

  if (!project) {
    const error = new Error('المشروع الافتراضي غير موجود');
    error.statusCode = 400;
    throw error;
  }

  return project;
};

const parseFutureDate = (value, fieldName) => {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    const error = new Error(`${fieldName} غير صالح`);
    error.statusCode = 400;
    throw error;
  }

  if (parsedDate <= new Date()) {
    const error = new Error(`${fieldName} يجب أن يكون في المستقبل`);
    error.statusCode = 400;
    throw error;
  }

  return parsedDate;
};

const buildMemberNamesMap = async (prisma, memberIds = []) => {
  const uniqueIds = [...new Set(memberIds.filter(Boolean))];
  if (uniqueIds.length === 0) {
    return {};
  }

  const members = await prisma.devTeamMember.findMany({
    where: {
      id: { in: uniqueIds }
    },
    select: {
      id: true,
      user: {
        select: {
          firstName: true,
          lastName: true
        }
      }
    }
  });

  return Object.fromEntries(
    members.map((member) => [member.id, `${member.user.firstName} ${member.user.lastName}`.trim()])
  );
};

const buildProjectNamesMap = async (prisma, projectIds = []) => {
  const uniqueIds = [...new Set(projectIds.filter(Boolean))];
  if (uniqueIds.length === 0) {
    return {};
  }

  const projects = await prisma.devProject.findMany({
    where: {
      id: { in: uniqueIds }
    },
    select: {
      id: true,
      name: true
    }
  });

  return Object.fromEntries(projects.map((project) => [project.id, project.name]));
};

const formatCredential = (credential, memberNames = {}, projectNames = {}) => ({
  id: credential.id,
  name: credential.name,
  description: credential.description,
  scopes: normalizeDevTaskScopes(credential.scopes),
  isActive: credential.isActive,
  keyPrefixMasked: maskKeyPrefix(credential.keyPrefix),
  lastUsedAt: credential.lastUsedAt,
  expiresAt: credential.expiresAt,
  revokedAt: credential.revokedAt,
  revokedReason: credential.revokedReason,
  defaultReporterMemberId: credential.defaultReporterMemberId,
  defaultReporterMemberName: credential.defaultReporterMemberId
    ? memberNames[credential.defaultReporterMemberId] || null
    : null,
  defaultAssigneeMemberId: credential.defaultAssigneeMemberId,
  defaultAssigneeMemberName: credential.defaultAssigneeMemberId
    ? memberNames[credential.defaultAssigneeMemberId] || null
    : null,
  defaultProjectId: credential.defaultProjectId,
  defaultProjectName: credential.defaultProjectId
    ? projectNames[credential.defaultProjectId] || null
    : null,
  createdAt: credential.createdAt,
  updatedAt: credential.updatedAt
});

const validateWriteDefaults = (scopes, defaultReporterMemberId) => {
  if (scopes.includes('dev-tasks:write') && !defaultReporterMemberId) {
    const error = new Error('مفاتيح الكتابة تحتاج عضو فريق افتراضي كـ reporter');
    error.statusCode = 400;
    throw error;
  }
};

const validateScopesSelection = (scopes) => {
  if (!Array.isArray(scopes) || scopes.length === 0) {
    const error = new Error('يجب اختيار صلاحية واحدة على الأقل للمفتاح');
    error.statusCode = 400;
    throw error;
  }
};

const validateBoundProject = (defaultProjectId) => {
  if (!defaultProjectId) {
    const error = new Error('كل مفتاح يجب أن يكون مقيدًا بمشروع تطوير واحد');
    error.statusCode = 400;
    throw error;
  }
};

const devTaskIntegrationController = {
  listCredentials: async (req, res) => {
    try {
      ensureCredentialAdmin(req);
      const prisma = getSharedPrismaClient();
      const includeRevoked = String(req.query.includeRevoked || 'false').toLowerCase() === 'true';
      const credentials = await prisma.devTaskApiCredential.findMany({
        where: includeRevoked ? {} : { revokedAt: null },
        orderBy: { createdAt: 'desc' }
      });

      const memberNames = await buildMemberNamesMap(
        prisma,
        credentials.flatMap((credential) => [
          credential.defaultReporterMemberId,
          credential.defaultAssigneeMemberId
        ])
      );
      const projectNames = await buildProjectNamesMap(
        prisma,
        credentials.map((credential) => credential.defaultProjectId)
      );

      return res.json({
        success: true,
        data: credentials.map((credential) => formatCredential(credential, memberNames, projectNames))
      });
    } catch (error) {
      console.error('❌ [DEV-TASK-INTEGRATIONS] Failed to list credentials:', error);
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'فشل في جلب مفاتيح API لمهام السوبر أدمن'
      });
    }
  },

  createCredential: async (req, res) => {
    try {
      ensureCredentialAdmin(req);
      const prisma = getSharedPrismaClient();
      const {
        name,
        description = null,
        scopes,
        expiresAt,
        defaultReporterMemberId = null,
        defaultAssigneeMemberId = null,
        defaultProjectId = null
      } = req.body || {};

      if (!name || !String(name).trim()) {
        return res.status(400).json({
          success: false,
          message: 'اسم المفتاح مطلوب'
        });
      }

      const normalizedScopes = normalizeDevTaskScopes(scopes);
      validateScopesSelection(normalizedScopes);
      validateBoundProject(defaultProjectId);
      validateWriteDefaults(normalizedScopes, defaultReporterMemberId);

      await ensureActiveMember(prisma, defaultReporterMemberId, 'عضو الـ reporter');
      await ensureActiveMember(prisma, defaultAssigneeMemberId, 'عضو الـ assignee');
      await ensureProjectExists(prisma, defaultProjectId);

      const parsedExpiresAt = parseFutureDate(expiresAt, 'expiresAt');
      const { rawKey, keyPrefix, keyHash } = generateDevTaskApiKey();

      const createdCredential = await prisma.devTaskApiCredential.create({
        data: {
          name: String(name).trim(),
          description: description ? String(description).trim() : null,
          scopes: serializeJson(normalizedScopes, '[]'),
          keyPrefix,
          keyHash,
          expiresAt: parsedExpiresAt,
          defaultReporterMemberId: defaultReporterMemberId || null,
          defaultAssigneeMemberId: defaultAssigneeMemberId || null,
          defaultProjectId: defaultProjectId || null,
          createdByUserId: req.user.id
        }
      });

      const memberNames = await buildMemberNamesMap(prisma, [
        createdCredential.defaultReporterMemberId,
        createdCredential.defaultAssigneeMemberId
      ]);
      const projectNames = await buildProjectNamesMap(prisma, [createdCredential.defaultProjectId]);

      return res.status(201).json({
        success: true,
        data: formatCredential(createdCredential, memberNames, projectNames),
        secret: {
          apiKey: rawKey
        },
        message: 'تم إنشاء مفتاح API لمهام السوبر أدمن'
      });
    } catch (error) {
      console.error('❌ [DEV-TASK-INTEGRATIONS] Failed to create credential:', error);
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'فشل في إنشاء مفتاح API لمهام السوبر أدمن'
      });
    }
  },

  updateCredential: async (req, res) => {
    try {
      ensureCredentialAdmin(req);
      const prisma = getSharedPrismaClient();
      const { credentialId } = req.params;
      const {
        name,
        description,
        scopes,
        expiresAt,
        isActive,
        defaultReporterMemberId,
        defaultAssigneeMemberId,
        defaultProjectId
      } = req.body || {};

      const existingCredential = await prisma.devTaskApiCredential.findUnique({
        where: { id: credentialId }
      });

      if (!existingCredential) {
        return res.status(404).json({
          success: false,
          message: 'مفتاح API غير موجود'
        });
      }

      if (name !== undefined && !String(name || '').trim()) {
        return res.status(400).json({
          success: false,
          message: 'اسم المفتاح لا يمكن أن يكون فارغًا'
        });
      }

      const nextReporterMemberId = defaultReporterMemberId !== undefined
        ? (defaultReporterMemberId || null)
        : existingCredential.defaultReporterMemberId;
      const nextAssigneeMemberId = defaultAssigneeMemberId !== undefined
        ? (defaultAssigneeMemberId || null)
        : existingCredential.defaultAssigneeMemberId;
      const nextProjectId = defaultProjectId !== undefined
        ? (defaultProjectId || null)
        : existingCredential.defaultProjectId;
      const nextScopes = scopes !== undefined
        ? normalizeDevTaskScopes(scopes)
        : normalizeDevTaskScopes(existingCredential.scopes);

      validateScopesSelection(nextScopes);
      validateBoundProject(nextProjectId);
      validateWriteDefaults(nextScopes, nextReporterMemberId);

      await ensureActiveMember(prisma, nextReporterMemberId, 'عضو الـ reporter');
      await ensureActiveMember(prisma, nextAssigneeMemberId, 'عضو الـ assignee');
      await ensureProjectExists(prisma, nextProjectId);

      const parsedExpiresAt = parseFutureDate(expiresAt, 'expiresAt');

      const updatedCredential = await prisma.devTaskApiCredential.update({
        where: { id: credentialId },
        data: {
          ...(name !== undefined && { name: String(name || '').trim() }),
          ...(description !== undefined && { description: description ? String(description).trim() : null }),
          ...(scopes !== undefined && { scopes: serializeJson(nextScopes, '[]') }),
          ...(expiresAt !== undefined && { expiresAt: parsedExpiresAt }),
          ...(isActive !== undefined && { isActive: Boolean(isActive) }),
          ...(defaultReporterMemberId !== undefined && { defaultReporterMemberId: nextReporterMemberId }),
          ...(defaultAssigneeMemberId !== undefined && { defaultAssigneeMemberId: nextAssigneeMemberId }),
          ...(defaultProjectId !== undefined && { defaultProjectId: nextProjectId })
        }
      });

      const memberNames = await buildMemberNamesMap(prisma, [
        updatedCredential.defaultReporterMemberId,
        updatedCredential.defaultAssigneeMemberId
      ]);
      const projectNames = await buildProjectNamesMap(prisma, [updatedCredential.defaultProjectId]);

      return res.json({
        success: true,
        data: formatCredential(updatedCredential, memberNames, projectNames),
        message: 'تم تحديث مفتاح API'
      });
    } catch (error) {
      console.error('❌ [DEV-TASK-INTEGRATIONS] Failed to update credential:', error);
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'فشل في تحديث مفتاح API'
      });
    }
  },

  rotateCredential: async (req, res) => {
    try {
      ensureCredentialAdmin(req);
      const prisma = getSharedPrismaClient();
      const { credentialId } = req.params;

      const existingCredential = await prisma.devTaskApiCredential.findFirst({
        where: {
          id: credentialId,
          revokedAt: null
        }
      });

      if (!existingCredential) {
        return res.status(404).json({
          success: false,
          message: 'مفتاح API غير موجود'
        });
      }

      const { rawKey, keyPrefix, keyHash } = generateDevTaskApiKey();
      const rotatedCredential = await prisma.devTaskApiCredential.update({
        where: { id: credentialId },
        data: {
          keyPrefix,
          keyHash,
          lastUsedAt: null,
          isActive: true
        }
      });

      const memberNames = await buildMemberNamesMap(prisma, [
        rotatedCredential.defaultReporterMemberId,
        rotatedCredential.defaultAssigneeMemberId
      ]);
      const projectNames = await buildProjectNamesMap(prisma, [rotatedCredential.defaultProjectId]);

      return res.json({
        success: true,
        data: formatCredential(rotatedCredential, memberNames, projectNames),
        secret: {
          apiKey: rawKey
        },
        message: 'تم تدوير مفتاح API بنجاح'
      });
    } catch (error) {
      console.error('❌ [DEV-TASK-INTEGRATIONS] Failed to rotate credential:', error);
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'فشل في تدوير مفتاح API'
      });
    }
  },

  revokeCredential: async (req, res) => {
    try {
      ensureCredentialAdmin(req);
      const prisma = getSharedPrismaClient();
      const { credentialId } = req.params;
      const reason = req.body?.reason ? String(req.body.reason).trim() : null;

      const existingCredential = await prisma.devTaskApiCredential.findUnique({
        where: { id: credentialId },
        select: {
          id: true,
          revokedAt: true
        }
      });

      if (!existingCredential) {
        return res.status(404).json({
          success: false,
          message: 'مفتاح API غير موجود'
        });
      }

      if (existingCredential.revokedAt) {
        return res.json({
          success: true,
          message: 'تم إلغاء هذا المفتاح سابقًا'
        });
      }

      await prisma.devTaskApiCredential.update({
        where: { id: credentialId },
        data: {
          isActive: false,
          revokedAt: new Date(),
          revokedReason: reason || 'revoked_by_super_admin',
          revokedByUserId: req.user.id
        }
      });

      return res.json({
        success: true,
        message: 'تم إلغاء مفتاح API'
      });
    } catch (error) {
      console.error('❌ [DEV-TASK-INTEGRATIONS] Failed to revoke credential:', error);
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'فشل في إلغاء مفتاح API'
      });
    }
  }
};

module.exports = devTaskIntegrationController;
