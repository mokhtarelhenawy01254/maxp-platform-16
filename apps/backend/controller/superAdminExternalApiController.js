const { getSharedPrismaClient } = require('../services/sharedDatabase');
const {
  EXTERNAL_API_SCOPES,
  MARKETING_API_SCOPES,
  MARKETING_DEFAULT_SCOPES,
  generateExternalApiKey,
  maskKeyPrefix,
  normalizeScopes,
  parseStoredArray
} = require('../services/taskIntegrationService');

const parseFutureDate = (value, fieldName = 'تاريخ الانتهاء') => {
  if (!value) {
    const error = new Error(`${fieldName} إجباري`);
    error.statusCode = 400;
    throw error;
  }

  const parsed = new Date(value);
  if (isNaN(parsed.getTime())) {
    const error = new Error(`${fieldName} غير صالح`);
    error.statusCode = 400;
    throw error;
  }

  if (parsed <= new Date()) {
    const error = new Error(`${fieldName} يجب أن يكون تاريخًا مستقبليًا`);
    error.statusCode = 400;
    throw error;
  }

  return parsed;
};

/**
 * List external API credentials for Super Admin
 */
const listCredentials = async (req, res) => {
  try {
    const prisma = getSharedPrismaClient();
    const { status, search, companyId } = req.query;

    const where = {};

    if (companyId) {
      where.companyId = String(companyId).trim();
    }

    if (status === 'ACTIVE') {
      where.isActive = true;
      where.revokedAt = null;
      where.OR = [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } }
      ];
    } else if (status === 'REVOKED') {
      where.OR = [
        { isActive: false },
        { revokedAt: { not: null } }
      ];
    } else if (status === 'EXPIRED') {
      where.isActive = true;
      where.revokedAt = null;
      where.expiresAt = { lte: new Date() };
    }

    if (search && String(search).trim()) {
      const q = String(search).trim();
      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { label: { contains: q, mode: 'insensitive' } },
            { keyPrefix: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } }
          ]
        }
      ];
    }

    const credentials = await prisma.taskApiCredential.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        }
      }
    });

    const now = new Date();
    const formatted = credentials.map((cred) => {
      const isExpired = cred.expiresAt && new Date(cred.expiresAt) <= now;
      const isRevoked = !cred.isActive || Boolean(cred.revokedAt);

      let computedStatus = 'ACTIVE';
      if (isRevoked) {
        computedStatus = 'REVOKED';
      } else if (isExpired) {
        computedStatus = 'EXPIRED';
      }

      return {
        id: cred.id,
        name: cred.name,
        label: cred.label || null,
        description: cred.description || null,
        scopes: normalizeScopes(parseStoredArray(cred.scopes)),
        allowedIps: parseStoredArray(cred.allowedIps),
        isActive: cred.isActive,
        status: computedStatus,
        keyPrefixMasked: maskKeyPrefix(cred.keyPrefix),
        keyPrefix: cred.keyPrefix,
        lastUsedAt: cred.lastUsedAt,
        lastUsedIp: cred.lastUsedIp || null,
        requestCount: cred.requestCount || 0,
        expiresAt: cred.expiresAt,
        revokedAt: cred.revokedAt,
        revokedReason: cred.revokedReason,
        companyId: cred.companyId,
        companyName: cred.company?.name || 'Platform (All Companies)',
        createdAt: cred.createdAt,
        updatedAt: cred.updatedAt
      };
    });

    return res.status(200).json({
      success: true,
      data: formatted
    });
  } catch (error) {
    console.error('❌ [SUPER-ADMIN-EXTERNAL-API] listCredentials error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to list API credentials'
    });
  }
};

/**
 * Create a new external API credential
 * MANDATORY: Name, Expiration Date (must be future), Scopes.
 * REVEAL ONCE: Raw key returned only here.
 */
const createCredential = async (req, res) => {
  try {
    const prisma = getSharedPrismaClient();
    const {
      name,
      label,
      description,
      scopes,
      expiresAt,
      allowedIps,
      companyId
    } = req.body;

    const trimmedName = String(name || '').trim();
    if (!trimmedName) {
      return res.status(400).json({
        success: false,
        message: 'اسم المفتاح إجباري'
      });
    }

    // Expiration date is strictly mandatory
    const parsedExpiresAt = parseFutureDate(expiresAt, 'تاريخ انتهاء الصلاحية');

    // Scopes validation
    const requestedScopes = parseStoredArray(scopes);
    const normalizedScopes = requestedScopes.length > 0
      ? normalizeScopes(requestedScopes, MARKETING_DEFAULT_SCOPES)
      : [...MARKETING_DEFAULT_SCOPES];

    // IP allowlist parsing
    const parsedAllowedIps = parseStoredArray(allowedIps).map((ip) => String(ip).trim()).filter(Boolean);

    // If companyId is passed, verify company exists
    let verifiedCompanyId = null;
    if (companyId && String(companyId).trim()) {
      const comp = await prisma.company.findUnique({
        where: { id: String(companyId).trim() },
        select: { id: true }
      });
      if (comp) {
        verifiedCompanyId = comp.id;
      }
    }

    // Generate Key
    const generated = generateExternalApiKey();

    const created = await prisma.taskApiCredential.create({
      data: {
        name: trimmedName,
        label: label ? String(label).trim() : null,
        description: description ? String(description).trim() : null,
        keyPrefix: generated.keyPrefix,
        keyHash: generated.keyHash,
        scopes: JSON.stringify(normalizedScopes),
        allowedIps: parsedAllowedIps,
        expiresAt: parsedExpiresAt,
        isActive: true,
        createdByUserId: req.user?.id || 'super_admin',
        companyId: verifiedCompanyId
      },
      include: {
        company: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    return res.status(201).json({
      success: true,
      message: 'تم إنشاء المفتاح بنجاح. احفظ المفتاح الآن، فلن يظهر مجددًا!',
      data: {
        id: created.id,
        name: created.name,
        label: created.label,
        scopes: normalizedScopes,
        allowedIps: parsedAllowedIps,
        expiresAt: created.expiresAt,
        keyPrefixMasked: maskKeyPrefix(created.keyPrefix),
        companyId: created.companyId,
        companyName: created.company?.name || 'Platform (All Companies)',
        createdAt: created.createdAt
      },
      secret: {
        apiKey: generated.rawKey,
        warning: 'احفظ هذا المفتاح في مكان آمن. لن يتم عرضه مرة أخرى نهائيًا لأسباب أمنية.'
      }
    });
  } catch (error) {
    console.error('❌ [SUPER-ADMIN-EXTERNAL-API] createCredential error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'فشل إنشاء مفتاح API'
    });
  }
};

/**
 * Immediate revocation (kill switch)
 */
const revokeCredential = async (req, res) => {
  try {
    const { credentialId } = req.params;
    const { reason } = req.body;
    const prisma = getSharedPrismaClient();

    const existing = await prisma.taskApiCredential.findUnique({
      where: { id: credentialId }
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'مفتاح API غير موجود'
      });
    }

    const updated = await prisma.taskApiCredential.update({
      where: { id: credentialId },
      data: {
        isActive: false,
        revokedAt: new Date(),
        revokedByUserId: req.user?.id || 'super_admin',
        revokedReason: reason ? String(reason).trim() : 'إلغاء فوري بواسطة السوبر أدمن'
      }
    });

    return res.status(200).json({
      success: true,
      message: 'تم إلغاء المفتاح فورًا وتم إيقاف الوصول.',
      data: {
        id: updated.id,
        isActive: updated.isActive,
        revokedAt: updated.revokedAt,
        revokedReason: updated.revokedReason
      }
    });
  } catch (error) {
    console.error('❌ [SUPER-ADMIN-EXTERNAL-API] revokeCredential error:', error);
    return res.status(500).json({
      success: false,
      message: 'فشل إلغاء المفتاح'
    });
  }
};

/**
 * Update non-secret fields (name, label, allowedIps, description)
 */
const updateCredential = async (req, res) => {
  try {
    const { credentialId } = req.params;
    const { name, label, description, allowedIps, scopes } = req.body;
    const prisma = getSharedPrismaClient();

    const updateData = {};
    if (name !== undefined) updateData.name = String(name).trim();
    if (label !== undefined) updateData.label = label ? String(label).trim() : null;
    if (description !== undefined) updateData.description = description ? String(description).trim() : null;
    if (allowedIps !== undefined) updateData.allowedIps = parseStoredArray(allowedIps);
    if (scopes !== undefined) {
      updateData.scopes = JSON.stringify(normalizeScopes(parseStoredArray(scopes), MARKETING_DEFAULT_SCOPES));
    }

    const updated = await prisma.taskApiCredential.update({
      where: { id: credentialId },
      data: updateData
    });

    return res.status(200).json({
      success: true,
      message: 'تم تحديث بيانات المفتاح بنجاح',
      data: {
        id: updated.id,
        name: updated.name,
        label: updated.label,
        scopes: normalizeScopes(parseStoredArray(updated.scopes)),
        allowedIps: parseStoredArray(updated.allowedIps),
        isActive: updated.isActive
      }
    });
  } catch (error) {
    console.error('❌ [SUPER-ADMIN-EXTERNAL-API] updateCredential error:', error);
    return res.status(500).json({
      success: false,
      message: 'فشل تحديث المفتاح'
    });
  }
};

/**
 * List audit logs with pagination and filters
 */
const listAuditLogs = async (req, res) => {
  try {
    const prisma = getSharedPrismaClient();
    const { credentialId, statusCode, limit = 50, offset = 0 } = req.query;

    const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
    const parsedOffset = Math.max(parseInt(offset, 10) || 0, 0);

    const where = {};
    if (credentialId) {
      where.credentialId = String(credentialId).trim();
    }
    if (statusCode) {
      where.statusCode = parseInt(statusCode, 10);
    }

    const [logs, total] = await Promise.all([
      prisma.externalApiAuditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: parsedLimit,
        skip: parsedOffset,
        include: {
          credential: {
            select: {
              id: true,
              name: true,
              keyPrefix: true
            }
          }
        }
      }),
      prisma.externalApiAuditLog.count({ where })
    ]);

    const formatted = logs.map((log) => ({
      id: log.id,
      credentialId: log.credentialId,
      credentialName: log.credential?.name || 'Unknown Key',
      keyPrefixMasked: maskKeyPrefix(log.credential?.keyPrefix),
      companyId: log.companyId,
      path: log.path,
      method: log.method,
      statusCode: log.statusCode,
      ip: log.ip,
      userAgent: log.userAgent,
      responseTimeMs: log.responseTimeMs,
      createdAt: log.createdAt
    }));

    return res.status(200).json({
      success: true,
      data: {
        logs: formatted,
        total,
        limit: parsedLimit,
        offset: parsedOffset
      }
    });
  } catch (error) {
    console.error('❌ [SUPER-ADMIN-EXTERNAL-API] listAuditLogs error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve audit logs'
    });
  }
};

/**
 * Helper to fetch tenant companies for dropdown
 */
const listTenantCompanies = async (_req, res) => {
  try {
    const prisma = getSharedPrismaClient();
    const companies = await prisma.company.findMany({
      select: {
        id: true,
        name: true,
        slug: true
      },
      orderBy: { name: 'asc' }
    });

    return res.status(200).json({
      success: true,
      data: companies
    });
  } catch (error) {
    console.error('❌ [SUPER-ADMIN-EXTERNAL-API] listTenantCompanies error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to list companies'
    });
  }
};

module.exports = {
  listCredentials,
  createCredential,
  revokeCredential,
  updateCredential,
  listAuditLogs,
  listTenantCompanies
};
