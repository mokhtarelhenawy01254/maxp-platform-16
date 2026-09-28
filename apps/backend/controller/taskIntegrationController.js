const { getSharedPrismaClient } = require('../services/sharedDatabase');
const {
  generateSigningSecret,
  generateTaskApiKey,
  maskKeyPrefix,
  maskSecret,
  normalizeOpenClawEnvironment,
  normalizeWebhookProviderConfig,
  normalizeWebhookProviderType,
  normalizeScopes,
  normalizeWebhookEvents,
  parseStoredArray,
  parseStoredObject,
  serializeJson
} = require('../services/taskIntegrationService');
const {
  retryTaskWebhookDelivery,
  testTaskWebhook
} = require('../services/taskWebhookService');
const { decrypt, encrypt } = require('../utils/encryption');

const MANAGEMENT_ROLES = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER'];

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

const ensureCompanyContext = (req, res) => {
  const companyId = req.user?.companyId;
  if (!companyId) {
    res.status(403).json({
      success: false,
      message: 'معرف الشركة مطلوب'
    });
    return null;
  }

  return companyId;
};

const getRequestUserId = (req) => req.user?.id || req.user?.userId || null;

const validateManagementRole = (req, res) => {
  if (!MANAGEMENT_ROLES.includes(req.user?.role)) {
    res.status(403).json({
      success: false,
      message: 'ليس لديك صلاحية لإدارة تكاملات المهام'
    });
    return false;
  }

  return true;
};

const resolveCompanyUsers = async (prisma, companyId, userIds = []) => {
  const uniqueIds = [...new Set(userIds.filter(Boolean))];
  if (uniqueIds.length === 0) {
    return {};
  }

  const users = await prisma.user.findMany({
    where: {
      id: { in: uniqueIds },
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
    },
    select: {
      id: true,
      firstName: true,
      lastName: true
    }
  });

  return Object.fromEntries(
    users.map((user) => [user.id, `${user.firstName} ${user.lastName}`.trim()])
  );
};

const ensureCompanyUser = async (prisma, companyId, userId, label) => {
  if (!userId) return null;

  const user = await prisma.user.findFirst({
    where: buildCompanyUserWhere(companyId, userId),
    select: {
      id: true,
      firstName: true,
      lastName: true
    }
  });

  if (!user) {
    const error = new Error(`${label} غير موجود أو غير نشط في هذه الشركة`);
    error.statusCode = 400;
    throw error;
  }

  return user;
};

const formatCredential = (credential, userNames = {}) => ({
  id: credential.id,
  name: credential.name,
  description: credential.description,
  ownershipType: credential.userId ? 'USER' : 'COMPANY',
  userId: credential.userId,
  userName: credential.userId ? userNames[credential.userId] || null : null,
  defaultActingUserId: credential.defaultActingUserId,
  defaultActingUserName: credential.defaultActingUserId
    ? userNames[credential.defaultActingUserId] || null
    : null,
  scopes: normalizeScopes(parseStoredArray(credential.scopes)),
  isActive: credential.isActive,
  keyPrefixMasked: maskKeyPrefix(credential.keyPrefix),
  lastUsedAt: credential.lastUsedAt,
  expiresAt: credential.expiresAt,
  revokedAt: credential.revokedAt,
  revokedReason: credential.revokedReason,
  createdAt: credential.createdAt,
  updatedAt: credential.updatedAt
});

const formatWebhookEndpoint = (endpoint) => ({
  id: endpoint.id,
  name: endpoint.name,
  targetUrl: endpoint.targetUrl,
  providerType: normalizeWebhookProviderType(endpoint.providerType),
  providerConfig: normalizeWebhookProviderConfig(endpoint.providerType, endpoint.providerConfig),
  subscribedEvents: normalizeWebhookEvents(parseStoredArray(endpoint.subscribedEvents)),
  customHeaders: parseStoredObject(endpoint.customHeaders),
  isActive: endpoint.isActive,
  hasSigningSecret: !!endpoint.signingSecret,
  signingSecretMasked: maskSecret(endpoint.signingSecret),
  lastTriggeredAt: endpoint.lastTriggeredAt,
  lastSuccessAt: endpoint.lastSuccessAt,
  failureCount: endpoint.failureCount,
  createdAt: endpoint.createdAt,
  updatedAt: endpoint.updatedAt
});

const normalizeOpenClawBaseUrl = (value) => {
  try {
    const parsed = new URL(validateUrl(value));
    parsed.search = '';
    parsed.hash = '';

    let normalizedPath = parsed.pathname.replace(/\/+$/, '');
    if (normalizedPath.endsWith('/hooks/agent')) {
      normalizedPath = normalizedPath.slice(0, -'/hooks/agent'.length);
    }

    return `${parsed.origin}${normalizedPath}`;
  } catch (_error) {
    const error = new Error('Base URL الخاصة بـ OpenClaw يجب أن تكون رابطًا صحيحًا يبدأ بـ http أو https');
    error.statusCode = 400;
    throw error;
  }
};

const formatOpenClawProfile = (profile, { includeHookToken = false } = {}) => {
  let decryptedHookToken = null;

  if (profile.hookTokenEncrypted) {
    try {
      decryptedHookToken = decrypt(profile.hookTokenEncrypted);
    } catch (error) {
      console.error('❌ [TASK-INTEGRATIONS] Failed to decrypt OpenClaw profile token:', error);
    }
  }

  return {
    id: profile.id,
    environment: normalizeOpenClawEnvironment(profile.environment),
    name: profile.name,
    baseUrl: profile.baseUrl,
    agentId: profile.agentId || '',
    wakeMode: profile.wakeMode || 'now',
    sessionMode: profile.sessionMode || 'default',
    deliver: Boolean(profile.deliver),
    hasHookToken: Boolean(profile.hookTokenEncrypted),
    hookTokenMasked: decryptedHookToken ? maskSecret(decryptedHookToken) : null,
    hookToken: includeHookToken ? (decryptedHookToken || '') : undefined,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt
  };
};

const validateOpenClawProfilePayload = (payload = {}, existingProfile = null) => {
  const normalizedName = String(payload.name || existingProfile?.name || '').trim();
  if (!normalizedName) {
    const error = new Error('اسم إعداد OpenClaw مطلوب');
    error.statusCode = 400;
    throw error;
  }

  const normalizedBaseUrl = normalizeOpenClawBaseUrl(
    payload.baseUrl !== undefined ? payload.baseUrl : existingProfile?.baseUrl
  );
  const normalizedEnvironment = normalizeOpenClawEnvironment(
    payload.environment !== undefined ? payload.environment : existingProfile?.environment
  );
  const normalizedConfig = normalizeWebhookProviderConfig('OPENCLAW', {
    agentId: payload.agentId !== undefined ? payload.agentId : existingProfile?.agentId,
    wakeMode: payload.wakeMode !== undefined ? payload.wakeMode : existingProfile?.wakeMode,
    sessionMode: payload.sessionMode !== undefined ? payload.sessionMode : existingProfile?.sessionMode,
    deliver: payload.deliver !== undefined ? payload.deliver : existingProfile?.deliver
  });

  const rawHookToken = payload.hookToken !== undefined ? String(payload.hookToken || '').trim() : null;
  const nextHookTokenEncrypted = rawHookToken
    ? encrypt(rawHookToken)
    : (existingProfile?.hookTokenEncrypted || null);

  if (!nextHookTokenEncrypted) {
    const error = new Error('Hook Token الخاصة بـ OpenClaw مطلوبة');
    error.statusCode = 400;
    throw error;
  }

  return {
    environment: normalizedEnvironment,
    name: normalizedName,
    baseUrl: normalizedBaseUrl,
    agentId: normalizedConfig.agentId,
    wakeMode: normalizedConfig.wakeMode,
    sessionMode: normalizedConfig.sessionMode,
    deliver: normalizedConfig.deliver,
    hookTokenEncrypted: nextHookTokenEncrypted
  };
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

const validateUrl = (value) => {
  try {
    const parsed = new URL(value);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error('invalid protocol');
    }
    return parsed.toString();
  } catch (_error) {
    const error = new Error('targetUrl يجب أن يكون رابطًا صحيحًا يبدأ بـ http أو https');
    error.statusCode = 400;
    throw error;
  }
};

const validateWebhookTargetUrl = (value, providerType) => {
  const finalUrl = validateUrl(value);
  const normalizedProviderType = normalizeWebhookProviderType(providerType);

  if (normalizedProviderType === 'OPENCLAW') {
    const parsed = new URL(finalUrl);
    const normalizedPath = parsed.pathname.replace(/\/+$/, '');
    if (!normalizedPath.endsWith('/hooks/agent')) {
      const error = new Error('OpenClaw webhook يجب أن يشير إلى /hooks/agent');
      error.statusCode = 400;
      throw error;
    }
  }

  return finalUrl;
};

const validateWebhookProviderConfig = (providerType, value) => {
  const normalizedProviderType = normalizeWebhookProviderType(providerType);
  const normalizedConfig = normalizeWebhookProviderConfig(normalizedProviderType, value);

  if (normalizedProviderType === 'OPENCLAW') {
    if (normalizedConfig.timeoutSeconds !== null && normalizedConfig.timeoutSeconds <= 0) {
      const error = new Error('timeoutSeconds في OpenClaw يجب أن يكون أكبر من صفر');
      error.statusCode = 400;
      throw error;
    }

    if (normalizedConfig.sessionMode === 'task-scoped' && !normalizedConfig.sessionKeyPrefix.trim()) {
      const error = new Error('sessionKeyPrefix مطلوب عند اختيار task-scoped session mode');
      error.statusCode = 400;
      throw error;
    }
  }

  return normalizedConfig;
};

const taskIntegrationController = {
  listCredentials: async (req, res) => {
    try {
      if (!validateManagementRole(req, res)) return;
      const companyId = ensureCompanyContext(req, res);
      if (!companyId) return;

      const prisma = getSharedPrismaClient();
      const includeRevoked = String(req.query.includeRevoked || 'false').toLowerCase() === 'true';
      const credentials = await prisma.taskApiCredential.findMany({
        where: {
          companyId,
          ...(includeRevoked ? {} : { revokedAt: null })
        },
        orderBy: { createdAt: 'desc' }
      });

      const userNames = await resolveCompanyUsers(
        prisma,
        companyId,
        credentials.flatMap((credential) => [credential.userId, credential.defaultActingUserId])
      );

      return res.json({
        success: true,
        data: credentials.map((credential) => formatCredential(credential, userNames))
      });
    } catch (error) {
      console.error('❌ [TASK-INTEGRATIONS] Failed to list credentials:', error);
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'فشل في جلب مفاتيح تكامل المهام'
      });
    }
  },

  createCredential: async (req, res) => {
    try {
      if (!validateManagementRole(req, res)) return;
      const companyId = ensureCompanyContext(req, res);
      if (!companyId) return;

      const prisma = getSharedPrismaClient();
      const requestUserId = getRequestUserId(req);
      const {
        name,
        description = null,
        userId = null,
        defaultActingUserId = null,
        scopes,
        expiresAt
      } = req.body;

      if (!name || !String(name).trim()) {
        return res.status(400).json({
          success: false,
          message: 'اسم المفتاح مطلوب'
        });
      }

      if (userId && defaultActingUserId) {
        return res.status(400).json({
          success: false,
          message: 'لا يمكن الجمع بين userId و defaultActingUserId في نفس المفتاح'
        });
      }

      const normalizedScopes = normalizeScopes(scopes);
      if ((normalizedScopes.includes('tasks:write') || normalizedScopes.includes('tasks:update')) && !userId && !defaultActingUserId) {
        return res.status(400).json({
          success: false,
          message: 'المفاتيح التي تملك صلاحية كتابة تحتاج userId أو defaultActingUserId'
        });
      }

      await ensureCompanyUser(prisma, companyId, userId, 'userId');
      await ensureCompanyUser(prisma, companyId, defaultActingUserId, 'defaultActingUserId');

      const parsedExpiresAt = parseFutureDate(expiresAt, 'expiresAt');
      const { rawKey, keyPrefix, keyHash } = generateTaskApiKey();

      const createdCredential = await prisma.taskApiCredential.create({
        data: {
          companyId,
          name: String(name).trim(),
          description: description ? String(description).trim() : null,
          userId: userId || null,
          defaultActingUserId: defaultActingUserId || null,
          keyPrefix,
          keyHash,
          scopes: serializeJson(normalizedScopes, '[]'),
          expiresAt: parsedExpiresAt,
          createdByUserId: requestUserId
        }
      });

      const userNames = await resolveCompanyUsers(prisma, companyId, [
        createdCredential.userId,
        createdCredential.defaultActingUserId
      ]);

      return res.status(201).json({
        success: true,
        data: formatCredential(createdCredential, userNames),
        secret: {
          apiKey: rawKey
        },
        message: 'تم إنشاء مفتاح تكامل المهام بنجاح'
      });
    } catch (error) {
      console.error('❌ [TASK-INTEGRATIONS] Failed to create credential:', error);
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'فشل في إنشاء مفتاح تكامل المهام'
      });
    }
  },

  updateCredential: async (req, res) => {
    try {
      if (!validateManagementRole(req, res)) return;
      const companyId = ensureCompanyContext(req, res);
      if (!companyId) return;

      const prisma = getSharedPrismaClient();
      const { credentialId } = req.params;
      const {
        name,
        description,
        userId,
        defaultActingUserId,
        scopes,
        expiresAt,
        isActive
      } = req.body;

      const existingCredential = await prisma.taskApiCredential.findFirst({
        where: { id: credentialId, companyId }
      });

      if (!existingCredential) {
        return res.status(404).json({
          success: false,
          message: 'مفتاح التكامل غير موجود'
        });
      }

      if (userId && defaultActingUserId) {
        return res.status(400).json({
          success: false,
          message: 'لا يمكن الجمع بين userId و defaultActingUserId في نفس المفتاح'
        });
      }

      const nextUserId = userId !== undefined ? (userId || null) : existingCredential.userId;
      const nextDefaultActingUserId = defaultActingUserId !== undefined
        ? (defaultActingUserId || null)
        : existingCredential.defaultActingUserId;

      await ensureCompanyUser(prisma, companyId, nextUserId, 'userId');
      await ensureCompanyUser(prisma, companyId, nextDefaultActingUserId, 'defaultActingUserId');

      const nextScopes = scopes !== undefined
        ? normalizeScopes(scopes)
        : normalizeScopes(parseStoredArray(existingCredential.scopes));

      if ((nextScopes.includes('tasks:write') || nextScopes.includes('tasks:update')) && !nextUserId && !nextDefaultActingUserId) {
        return res.status(400).json({
          success: false,
          message: 'المفاتيح التي تملك صلاحية كتابة تحتاج userId أو defaultActingUserId'
        });
      }

      const parsedExpiresAt = parseFutureDate(expiresAt, 'expiresAt');

      if (name !== undefined && !String(name || '').trim()) {
        return res.status(400).json({
          success: false,
          message: 'اسم المفتاح لا يمكن أن يكون فارغًا'
        });
      }

      const updatedCredential = await prisma.taskApiCredential.update({
        where: { id: credentialId },
        data: {
          ...(name !== undefined && { name: String(name || '').trim() }),
          ...(description !== undefined && { description: description ? String(description).trim() : null }),
          ...(userId !== undefined && { userId: userId || null }),
          ...(defaultActingUserId !== undefined && { defaultActingUserId: defaultActingUserId || null }),
          ...(scopes !== undefined && { scopes: serializeJson(nextScopes, '[]') }),
          ...(expiresAt !== undefined && { expiresAt: parsedExpiresAt }),
          ...(isActive !== undefined && { isActive: Boolean(isActive) })
        }
      });

      const userNames = await resolveCompanyUsers(prisma, companyId, [
        updatedCredential.userId,
        updatedCredential.defaultActingUserId
      ]);

      return res.json({
        success: true,
        data: formatCredential(updatedCredential, userNames),
        message: 'تم تحديث مفتاح تكامل المهام'
      });
    } catch (error) {
      console.error('❌ [TASK-INTEGRATIONS] Failed to update credential:', error);
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'فشل في تحديث مفتاح تكامل المهام'
      });
    }
  },

  rotateCredential: async (req, res) => {
    try {
      if (!validateManagementRole(req, res)) return;
      const companyId = ensureCompanyContext(req, res);
      if (!companyId) return;

      const prisma = getSharedPrismaClient();
      const { credentialId } = req.params;

      const existingCredential = await prisma.taskApiCredential.findFirst({
        where: {
          id: credentialId,
          companyId,
          revokedAt: null
        }
      });

      if (!existingCredential) {
        return res.status(404).json({
          success: false,
          message: 'مفتاح التكامل غير موجود'
        });
      }

      const { rawKey, keyPrefix, keyHash } = generateTaskApiKey();
      const rotatedCredential = await prisma.taskApiCredential.update({
        where: { id: credentialId },
        data: {
          keyPrefix,
          keyHash,
          lastUsedAt: null,
          isActive: true
        }
      });

      const userNames = await resolveCompanyUsers(prisma, companyId, [
        rotatedCredential.userId,
        rotatedCredential.defaultActingUserId
      ]);

      return res.json({
        success: true,
        data: formatCredential(rotatedCredential, userNames),
        secret: {
          apiKey: rawKey
        },
        message: 'تم تدوير مفتاح تكامل المهام بنجاح'
      });
    } catch (error) {
      console.error('❌ [TASK-INTEGRATIONS] Failed to rotate credential:', error);
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'فشل في تدوير مفتاح تكامل المهام'
      });
    }
  },

  revokeCredential: async (req, res) => {
    try {
      if (!validateManagementRole(req, res)) return;
      const companyId = ensureCompanyContext(req, res);
      if (!companyId) return;

      const prisma = getSharedPrismaClient();
      const requestUserId = getRequestUserId(req);
      const { credentialId } = req.params;
      const { reason = null } = req.body || {};

      const existingCredential = await prisma.taskApiCredential.findFirst({
        where: {
          id: credentialId,
          companyId,
          revokedAt: null
        }
      });

      if (!existingCredential) {
        return res.status(404).json({
          success: false,
          message: 'مفتاح التكامل غير موجود'
        });
      }

      await prisma.taskApiCredential.update({
        where: { id: credentialId },
        data: {
          isActive: false,
          revokedAt: new Date(),
          revokedReason: reason ? String(reason).trim() : null,
          revokedByUserId: requestUserId
        }
      });

      return res.json({
        success: true,
        message: 'تم إلغاء مفتاح تكامل المهام'
      });
    } catch (error) {
      console.error('❌ [TASK-INTEGRATIONS] Failed to revoke credential:', error);
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'فشل في إلغاء مفتاح تكامل المهام'
      });
    }
  },

  listOpenClawProfiles: async (req, res) => {
    try {
      if (!validateManagementRole(req, res)) return;
      const companyId = ensureCompanyContext(req, res);
      if (!companyId) return;

      const prisma = getSharedPrismaClient();
      const profiles = await prisma.taskOpenClawProfile.findMany({
        where: { companyId },
        orderBy: [
          { environment: 'asc' },
          { updatedAt: 'desc' }
        ]
      });

      return res.json({
        success: true,
        data: profiles.map((profile) => formatOpenClawProfile(profile))
      });
    } catch (error) {
      console.error('❌ [TASK-INTEGRATIONS] Failed to list OpenClaw profiles:', error);
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'فشل في جلب إعدادات OpenClaw المحفوظة'
      });
    }
  },

  createOpenClawProfile: async (req, res) => {
    try {
      if (!validateManagementRole(req, res)) return;
      const companyId = ensureCompanyContext(req, res);
      if (!companyId) return;

      const prisma = getSharedPrismaClient();
      const requestUserId = getRequestUserId(req);
      const normalizedProfile = validateOpenClawProfilePayload(req.body || {});

      const existingProfile = await prisma.taskOpenClawProfile.findFirst({
        where: {
          companyId,
          environment: normalizedProfile.environment
        }
      });

      if (existingProfile) {
        return res.status(409).json({
          success: false,
          message: 'يوجد إعداد محفوظ بالفعل لهذه البيئة. حدّثه بدلًا من إنشاء إعداد جديد.'
        });
      }

      const createdProfile = await prisma.taskOpenClawProfile.create({
        data: {
          companyId,
          ...normalizedProfile,
          createdByUserId: requestUserId
        }
      });

      return res.status(201).json({
        success: true,
        data: formatOpenClawProfile(createdProfile),
        message: 'تم حفظ إعداد OpenClaw لهذه الشركة'
      });
    } catch (error) {
      console.error('❌ [TASK-INTEGRATIONS] Failed to create OpenClaw profile:', error);
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'فشل في حفظ إعداد OpenClaw'
      });
    }
  },

  updateOpenClawProfile: async (req, res) => {
    try {
      if (!validateManagementRole(req, res)) return;
      const companyId = ensureCompanyContext(req, res);
      if (!companyId) return;

      const prisma = getSharedPrismaClient();
      const requestUserId = getRequestUserId(req);
      const { profileId } = req.params;

      const existingProfile = await prisma.taskOpenClawProfile.findFirst({
        where: { id: profileId, companyId }
      });

      if (!existingProfile) {
        return res.status(404).json({
          success: false,
          message: 'إعداد OpenClaw غير موجود'
        });
      }

      const normalizedProfile = validateOpenClawProfilePayload(req.body || {}, existingProfile);

      const conflictingProfile = await prisma.taskOpenClawProfile.findFirst({
        where: {
          companyId,
          environment: normalizedProfile.environment,
          id: { not: profileId }
        },
        select: { id: true }
      });

      if (conflictingProfile) {
        return res.status(409).json({
          success: false,
          message: 'يوجد إعداد آخر محفوظ لهذه البيئة بالفعل'
        });
      }

      const updatedProfile = await prisma.taskOpenClawProfile.update({
        where: { id: profileId },
        data: {
          ...normalizedProfile,
          updatedByUserId: requestUserId
        }
      });

      return res.json({
        success: true,
        data: formatOpenClawProfile(updatedProfile),
        message: 'تم تحديث إعداد OpenClaw المحفوظ'
      });
    } catch (error) {
      console.error('❌ [TASK-INTEGRATIONS] Failed to update OpenClaw profile:', error);
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'فشل في تحديث إعداد OpenClaw'
      });
    }
  },

  deleteOpenClawProfile: async (req, res) => {
    try {
      if (!validateManagementRole(req, res)) return;
      const companyId = ensureCompanyContext(req, res);
      if (!companyId) return;

      const prisma = getSharedPrismaClient();
      const { profileId } = req.params;

      const existingProfile = await prisma.taskOpenClawProfile.findFirst({
        where: { id: profileId, companyId },
        select: { id: true }
      });

      if (!existingProfile) {
        return res.status(404).json({
          success: false,
          message: 'إعداد OpenClaw غير موجود'
        });
      }

      await prisma.taskOpenClawProfile.delete({
        where: { id: profileId }
      });

      return res.json({
        success: true,
        message: 'تم حذف إعداد OpenClaw المحفوظ'
      });
    } catch (error) {
      console.error('❌ [TASK-INTEGRATIONS] Failed to delete OpenClaw profile:', error);
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'فشل في حذف إعداد OpenClaw'
      });
    }
  },

  revealOpenClawProfile: async (req, res) => {
    try {
      if (!validateManagementRole(req, res)) return;
      const companyId = ensureCompanyContext(req, res);
      if (!companyId) return;

      const prisma = getSharedPrismaClient();
      const { profileId } = req.params;
      const profile = await prisma.taskOpenClawProfile.findFirst({
        where: { id: profileId, companyId }
      });

      if (!profile) {
        return res.status(404).json({
          success: false,
          message: 'إعداد OpenClaw غير موجود'
        });
      }

      return res.json({
        success: true,
        data: formatOpenClawProfile(profile, { includeHookToken: true }),
        message: 'تم تحميل إعداد OpenClaw المحفوظ'
      });
    } catch (error) {
      console.error('❌ [TASK-INTEGRATIONS] Failed to reveal OpenClaw profile:', error);
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'فشل في تحميل إعداد OpenClaw المحفوظ'
      });
    }
  },

  listWebhooks: async (req, res) => {
    try {
      if (!validateManagementRole(req, res)) return;
      const companyId = ensureCompanyContext(req, res);
      if (!companyId) return;

      const prisma = getSharedPrismaClient();
      const webhooks = await prisma.taskWebhookEndpoint.findMany({
        where: { companyId },
        orderBy: { createdAt: 'desc' }
      });

      return res.json({
        success: true,
        data: webhooks.map(formatWebhookEndpoint)
      });
    } catch (error) {
      console.error('❌ [TASK-INTEGRATIONS] Failed to list webhooks:', error);
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'فشل في جلب Webhooks المهام'
      });
    }
  },

  createWebhook: async (req, res) => {
    try {
      if (!validateManagementRole(req, res)) return;
      const companyId = ensureCompanyContext(req, res);
      if (!companyId) return;

      const prisma = getSharedPrismaClient();
      const requestUserId = getRequestUserId(req);
      const {
        name,
        targetUrl,
        providerType,
        providerConfig,
        subscribedEvents,
        customHeaders,
        signingSecret
      } = req.body;

      if (!name || !String(name).trim()) {
        return res.status(400).json({
          success: false,
          message: 'اسم الـ webhook مطلوب'
        });
      }

      if (!targetUrl) {
        return res.status(400).json({
          success: false,
          message: 'targetUrl مطلوب'
        });
      }

      const finalProviderType = normalizeWebhookProviderType(providerType);
      const finalUrl = validateWebhookTargetUrl(targetUrl, finalProviderType);
      const finalProviderConfig = validateWebhookProviderConfig(finalProviderType, providerConfig);
      const finalEvents = normalizeWebhookEvents(subscribedEvents);
      const finalHeaders = customHeaders ? parseStoredObject(customHeaders) : {};
      const finalSigningSecret = signingSecret === ''
        ? null
        : (signingSecret || generateSigningSecret());

      const createdWebhook = await prisma.taskWebhookEndpoint.create({
        data: {
          companyId,
          name: String(name).trim(),
          targetUrl: finalUrl,
          providerType: finalProviderType,
          providerConfig: finalProviderType === 'OPENCLAW'
            ? serializeJson(finalProviderConfig, '{}')
            : null,
          subscribedEvents: serializeJson(finalEvents, '[]'),
          customHeaders: Object.keys(finalHeaders).length > 0 ? serializeJson(finalHeaders, '{}') : null,
          signingSecret: finalSigningSecret,
          createdByUserId: requestUserId
        }
      });

      return res.status(201).json({
        success: true,
        data: formatWebhookEndpoint(createdWebhook),
        secret: finalSigningSecret ? { signingSecret: finalSigningSecret } : null,
        message: 'تم إنشاء Webhook المهام بنجاح'
      });
    } catch (error) {
      console.error('❌ [TASK-INTEGRATIONS] Failed to create webhook:', error);
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'فشل في إنشاء Webhook المهام'
      });
    }
  },

  updateWebhook: async (req, res) => {
    try {
      if (!validateManagementRole(req, res)) return;
      const companyId = ensureCompanyContext(req, res);
      if (!companyId) return;

      const prisma = getSharedPrismaClient();
      const requestUserId = getRequestUserId(req);
      const { webhookId } = req.params;
      const {
        name,
        targetUrl,
        providerType,
        providerConfig,
        subscribedEvents,
        customHeaders,
        signingSecret,
        rotateSigningSecret,
        isActive
      } = req.body;

      const existingWebhook = await prisma.taskWebhookEndpoint.findFirst({
        where: { id: webhookId, companyId }
      });

      if (!existingWebhook) {
        return res.status(404).json({
          success: false,
          message: 'Webhook غير موجود'
        });
      }

      let revealedSigningSecret = null;
      let nextSigningSecret;

      if (name !== undefined && !String(name || '').trim()) {
        return res.status(400).json({
          success: false,
          message: 'اسم الـ webhook لا يمكن أن يكون فارغًا'
        });
      }

      const nextProviderType = providerType !== undefined
        ? normalizeWebhookProviderType(providerType)
        : normalizeWebhookProviderType(existingWebhook.providerType);
      const nextProviderConfig = providerType !== undefined || providerConfig !== undefined
        ? validateWebhookProviderConfig(
          nextProviderType,
          providerConfig !== undefined ? providerConfig : existingWebhook.providerConfig
        )
        : normalizeWebhookProviderConfig(existingWebhook.providerType, existingWebhook.providerConfig);

      if (rotateSigningSecret) {
        revealedSigningSecret = generateSigningSecret();
        nextSigningSecret = revealedSigningSecret;
      } else if (signingSecret !== undefined) {
        nextSigningSecret = signingSecret ? String(signingSecret) : null;
        revealedSigningSecret = nextSigningSecret;
      }

      const updatedWebhook = await prisma.taskWebhookEndpoint.update({
        where: { id: webhookId },
        data: {
          ...(name !== undefined && { name: String(name || '').trim() }),
          ...((targetUrl !== undefined || providerType !== undefined) && {
            targetUrl: validateWebhookTargetUrl(
              targetUrl !== undefined ? targetUrl : existingWebhook.targetUrl,
              nextProviderType
            )
          }),
          ...((providerType !== undefined || providerConfig !== undefined) && {
            providerType: nextProviderType,
            providerConfig: nextProviderType === 'OPENCLAW'
              ? serializeJson(nextProviderConfig, '{}')
              : null
          }),
          ...(subscribedEvents !== undefined && {
            subscribedEvents: serializeJson(normalizeWebhookEvents(subscribedEvents), '[]')
          }),
          ...(customHeaders !== undefined && {
            customHeaders: Object.keys(parseStoredObject(customHeaders)).length > 0
              ? serializeJson(parseStoredObject(customHeaders), '{}')
              : null
          }),
          ...(nextSigningSecret !== undefined && { signingSecret: nextSigningSecret }),
          ...(isActive !== undefined && { isActive: Boolean(isActive) }),
          updatedByUserId: requestUserId
        }
      });

      return res.json({
        success: true,
        data: formatWebhookEndpoint(updatedWebhook),
        secret: revealedSigningSecret ? { signingSecret: revealedSigningSecret } : null,
        message: 'تم تحديث Webhook المهام'
      });
    } catch (error) {
      console.error('❌ [TASK-INTEGRATIONS] Failed to update webhook:', error);
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'فشل في تحديث Webhook المهام'
      });
    }
  },

  deleteWebhook: async (req, res) => {
    try {
      if (!validateManagementRole(req, res)) return;
      const companyId = ensureCompanyContext(req, res);
      if (!companyId) return;

      const prisma = getSharedPrismaClient();
      const { webhookId } = req.params;

      const existingWebhook = await prisma.taskWebhookEndpoint.findFirst({
        where: { id: webhookId, companyId }
      });

      if (!existingWebhook) {
        return res.status(404).json({
          success: false,
          message: 'Webhook غير موجود'
        });
      }

      await prisma.taskWebhookEndpoint.delete({
        where: { id: webhookId }
      });

      return res.json({
        success: true,
        message: 'تم حذف Webhook المهام'
      });
    } catch (error) {
      console.error('❌ [TASK-INTEGRATIONS] Failed to delete webhook:', error);
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'فشل في حذف Webhook المهام'
      });
    }
  },

  testWebhook: async (req, res) => {
    try {
      if (!validateManagementRole(req, res)) return;
      const companyId = ensureCompanyContext(req, res);
      if (!companyId) return;

      const prisma = getSharedPrismaClient();
      const requestUserId = getRequestUserId(req);
      const { webhookId } = req.params;

      const existingWebhook = await prisma.taskWebhookEndpoint.findFirst({
        where: { id: webhookId, companyId },
        select: {
          id: true,
          name: true,
          subscribedEvents: true
        }
      });

      if (!existingWebhook) {
        return res.status(404).json({
          success: false,
          message: 'Webhook غير موجود'
        });
      }

      const subscribedEvents = normalizeWebhookEvents(
        parseStoredArray(existingWebhook.subscribedEvents)
      );
      const requestedEvent = req.body?.event ? String(req.body.event).trim() : null;
      const selectedEvent = requestedEvent && subscribedEvents.includes(requestedEvent)
        ? requestedEvent
        : (subscribedEvents[0] || 'task.updated');

      const actorUser = requestUserId
        ? await prisma.user.findFirst({
          where: buildCompanyUserWhere(companyId, requestUserId),
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        })
        : null;

      const actorUserId = actorUser?.id || requestUserId || null;
      const nowIso = new Date().toISOString();
      const sampleTask = {
        id: `task-webhook-test-${Date.now()}`,
        companyId,
        projectId: null,
        title: `Task Webhook Test - ${existingWebhook.name}`,
        description: 'This is a generated webhook test payload from the tasks integrations screen.',
        status: selectedEvent === 'task.status_changed' ? 'IN_PROGRESS' : 'PENDING',
        priority: 'MEDIUM',
        type: 'integration_test',
        assignedTo: actorUserId,
        createdBy: actorUserId,
        dueDate: null,
        startDate: null,
        completedDate: null,
        estimatedHours: 0,
        actualHours: 0,
        progress: selectedEvent === 'task.status_changed' ? 35 : 0,
        tags: ['webhook-test'],
        dependencies: [],
        categoryId: null,
        isRecurring: false,
        recurringRule: null,
        createdAt: nowIso,
        updatedAt: nowIso,
        assignee: actorUser || null,
        creator: actorUser || null,
        project: null
      };

      const previousTask = selectedEvent === 'task.status_changed'
        ? {
          ...sampleTask,
          status: 'PENDING',
          progress: 0
        }
        : null;

      const result = await testTaskWebhook({
        webhookId,
        companyId,
        event: selectedEvent,
        task: sampleTask,
        previousTask,
        actorUserId,
        requestId: `task-webhook-test-${Date.now()}`
      });

      return res.json({
        success: true,
        data: {
          webhookId,
          event: selectedEvent,
          result
        },
        message: result.success
          ? 'تم إرسال اختبار الـ Webhook بنجاح'
          : 'تم تنفيذ اختبار الـ Webhook مع فشل في الإرسال'
      });
    } catch (error) {
      console.error('❌ [TASK-INTEGRATIONS] Failed to test webhook:', error);
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'فشل في اختبار Webhook المهام'
      });
    }
  },

  retryWebhookDelivery: async (req, res) => {
    try {
      if (!validateManagementRole(req, res)) return;
      const companyId = ensureCompanyContext(req, res);
      if (!companyId) return;

      const { webhookId, deliveryId } = req.params;

      const result = await retryTaskWebhookDelivery({
        webhookId,
        deliveryId,
        companyId
      });

      return res.json({
        success: true,
        data: {
          webhookId,
          deliveryId,
          result
        },
        message: result.success
          ? 'تمت إعادة إرسال الـ Webhook بنجاح'
          : 'تم تنفيذ إعادة الإرسال لكن الـ Webhook فشلت'
      });
    } catch (error) {
      console.error('❌ [TASK-INTEGRATIONS] Failed to retry webhook delivery:', error);
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'فشل في إعادة إرسال Webhook المهام'
      });
    }
  },

  listWebhookDeliveries: async (req, res) => {
    try {
      if (!validateManagementRole(req, res)) return;
      const companyId = ensureCompanyContext(req, res);
      if (!companyId) return;

      const prisma = getSharedPrismaClient();
      const { webhookId } = req.params;
      const page = Math.max(1, parseInt(req.query.page || '1', 10));
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '20', 10)));
      const skip = (page - 1) * limit;

      const existingWebhook = await prisma.taskWebhookEndpoint.findFirst({
        where: { id: webhookId, companyId },
        select: { id: true }
      });

      if (!existingWebhook) {
        return res.status(404).json({
          success: false,
          message: 'Webhook غير موجود'
        });
      }

      const where = {
        companyId,
        webhookId
      };

      const [deliveries, total] = await Promise.all([
        prisma.taskWebhookDelivery.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit
        }),
        prisma.taskWebhookDelivery.count({ where })
      ]);

      return res.json({
        success: true,
        data: deliveries,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error('❌ [TASK-INTEGRATIONS] Failed to list webhook deliveries:', error);
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'فشل في جلب سجلات Webhook المهام'
      });
    }
  }
};

module.exports = taskIntegrationController;
