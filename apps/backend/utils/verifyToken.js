// ==================== MIDDLEWARE ====================
const jwt = require('jsonwebtoken');
const {
  getSharedPrismaClientAsync,
  executeWithRetry,
} = require('../services/sharedDatabase');
const { getJwtSecret, isMissingAuthSecretError } = require('./jwtSecret');
/**
 * Load user permissions from the new Role-based permission system
 * Falls back gracefully if the Permission table doesn't exist yet
 */
const loadUserPermissions = async (userId, companyId) => {
  if (!userId || !companyId) return [];
  try {
    const prisma = await getSharedPrismaClientAsync();
    const userCompany = await prisma.userCompany.findUnique({
      where: { userId_companyId: { userId, companyId } },
      select: {
        role: true,
        roleId: true,
        roleRef: {
          include: {
            permissions: {
              include: { permission: true },
            },
          },
        },
      },
    });
    if (userCompany?.roleRef?.permissions) {
      return userCompany.roleRef.permissions.map(rp => rp.permission.key);
    }
    // ponytail: auto-fix missing roleId — lazy resolution
    if (userCompany?.roleId || userCompany?.role) {
      let resolvedRole = null;

      // Priority 1: try by roleId (handles custom + built-in)
      if (userCompany.roleId) {
        resolvedRole = await prisma.role.findUnique({
          where: { id: userCompany.roleId },
          include: { permissions: { include: { permission: true } } },
        });
      }

      // Priority 2: try built-in role by legacy enum
      if (!resolvedRole && userCompany.role) {
        resolvedRole = await prisma.role.findFirst({
          where: {
            key: userCompany.role,
            isBuiltIn: true,
            OR: [
              { companyId: '__system__' },
              { companyId: null },
            ],
          },
          include: { permissions: { include: { permission: true } } },
        });
      }

      // Priority 3: try custom role by key + companyId
      if (!resolvedRole && userCompany.role) {
        resolvedRole = await prisma.role.findFirst({
          where: { key: userCompany.role, companyId, isBuiltIn: false },
          include: { permissions: { include: { permission: true } } },
        });
      }

      if (resolvedRole) {
        await prisma.userCompany.update({
          where: { userId_companyId: { userId, companyId } },
          data: { roleId: resolvedRole.id },
        });
        // Re-fetch with roleRef now populated
        const refixed = await prisma.userCompany.findUnique({
          where: { userId_companyId: { userId, companyId } },
          select: {
            roleRef: {
              include: {
                permissions: { include: { permission: true } },
              },
            },
          },
        });
        if (refixed?.roleRef?.permissions) {
          return refixed.roleRef.permissions.map(rp => rp.permission.key);
        }
      }
    }
  } catch (e) {
    // Table might not exist yet (pre-migration)
    if (process.env.NODE_ENV === 'development') {
      console.debug('[PERMISSIONS] Permission table not available, skipping:', e.message?.substring(0, 100));
    }
  }
  return [];
};

const isDatabaseAvailabilityError = (error) => {
  const message = String(error?.message || '');
  return (
    message.includes('Engine is not yet connected') ||
    message.includes('Response from the Engine was empty') ||
    message.includes('Query Timeout') ||
    message.includes('Database in cooldown') ||
    message.includes('PRISMA_NOT_INITIALIZED') ||
    error?.code === 'P1001' ||
    error?.code === 'P1008' ||
    error?.code === 'P1017'
  );
};

const hasLegacyPrimaryCompanyAccess = async (prisma, userId, targetCompanyId, primaryCompanyId) => {
  if (!targetCompanyId || targetCompanyId !== primaryCompanyId) return false;

  const activeMembershipCount = await prisma.userCompany.count({
    where: {
      userId,
      isActive: true
    }
  });

  return activeMembershipCount === 0;
};

const runWithoutTenantContext = (operation) =>
  require('../services/tenantContext').run(null, operation);

function getAiServiceToken() {
  return process.env.AI_SERVICE_TOKEN || process.env.MAXP_SERVICE_TOKEN || '';
}

function resolveRequestCompanyId(req) {
  return (
    req.headers['x-company-id'] ||
    req.headers['X-Company-Id'] ||
    req.query?.companyId ||
    req.body?.companyId ||
    null
  );
}

// Authentication middleware
const authenticateToken = async (req, res, next) => {
  console.log('🔐 [VERIFY-TOKEN] authenticateToken called for:', req.method, req.path);
  console.log('🔐 [VERIFY-TOKEN] Headers:', req.headers.authorization ? 'Token present' : 'No token');

  const authHeader = req.headers.authorization;
  const token = (authHeader && authHeader.split(' ')[1]) || req.query?.token;

  if (!token) {
    console.log('❌ [VERIFY-TOKEN] No token found in request');
    return res.status(401).json({
      success: false,
      message: 'رمز المصادقة مطلوب',
      code: 'TOKEN_REQUIRED'
    });
  }

  const serviceToken = getAiServiceToken();
  if (serviceToken && token === serviceToken) {
    const companyId = resolveRequestCompanyId(req);
    if (!companyId || typeof companyId !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'companyId is required for service access',
        code: 'SERVICE_COMPANY_ID_REQUIRED'
      });
    }

    req.user = {
      id: 'ai-service',
      firstName: 'AI',
      lastName: 'Service',
      email: 'ai-service@maxp.local',
      role: 'AI_SERVICE',
      companyId,
      effectiveCompanyId: companyId,
      service: true
    };

    return require('../services/tenantContext').run(companyId, () => next());
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret());

    // Map userId to id for compatibility with code that expects req.user.id
    const userId = decoded.userId || decoded.id || decoded.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'رمز المصادقة غير صحيح',
        code: 'INVALID_TOKEN_PAYLOAD'
      });
    }

    // 👤 [CUSTOMER] Customer portal tokens resolve against the Customer table,
    // not the platform User table (customers are not platform users). The token
    // is scoped to a single company — we never allow company override for customers.
    if (decoded.role === 'CUSTOMER') {
      const customerId = decoded.customerId || decoded.userId || decoded.id;
      const customerCompanyId = decoded.companyId;

      if (!customerId || !customerCompanyId) {
        return res.status(401).json({
          success: false,
          message: 'رمز المصادقة غير صحيح',
          code: 'INVALID_TOKEN_PAYLOAD'
        });
      }

      const prisma = await getSharedPrismaClientAsync();
      const customer = await executeWithRetry(async () =>
        prisma.customer.findFirst({
          where: { id: customerId, companyId: customerCompanyId },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            phoneNormalized: true,
            companyId: true,
            status: true,
            tags: true
          }
        })
      );

      if (!customer) {
        return res.status(401).json({
          success: false,
          message: 'العميل غير موجود',
          code: 'USER_NOT_FOUND'
        });
      }

      req.user = {
        ...decoded,
        id: customer.id,
        customerId: customer.id,
        userId: customer.id,
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        phone: customer.phone || decoded.phone,
        role: 'CUSTOMER',
        companyId: customerCompanyId,
        effectiveCompanyId: customerCompanyId,
        userPermissions: []
      };

      return require('../services/tenantContext').run(customerCompanyId, () => next());
    }

    // 🛡️ [SAAS] Secure Company Context Resolution
    let companyId = decoded.companyId;
    const headerCompanyId = req.headers['x-company-id'] || req.headers['X-Company-Id'];

    console.log(`🔐 [VERIFY-TOKEN] Resolution - TokenCompanyId: ${decoded.companyId}, HeaderCompanyId: ${headerCompanyId}`);

    // Allow header override (validated by membership checks below)
    if (headerCompanyId) {
      if (companyId && headerCompanyId !== companyId) {
        console.log(`🔄 [VERIFY-TOKEN] Company context override: ${companyId} -> ${headerCompanyId}`);
      }
      companyId = headerCompanyId;
    }

    // Fallback: If token has no companyId (e.g. fresh register or system user), use previous logic
    if (!companyId) {
      companyId = headerCompanyId || req.query?.companyId || req.body?.companyId;

      // Secondary Fallback: Fetch from database
      if (!companyId && userId) {
        try {
          const prisma = await getSharedPrismaClientAsync();
          const user = await executeWithRetry(async () =>
            prisma.user.findUnique({
              where: { id: userId },
              select: { companyId: true }
            })
          );
          if (user?.companyId) {
            companyId = user.companyId;
          }
        } catch (dbError) {
          // Silent fail
        }
      }
    }

    const prisma = await getSharedPrismaClientAsync();
    const user = await executeWithRetry(async () =>
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          companyId: true,
          isActive: true
        }
      })
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'المستخدم غير موجود',
        code: 'USER_NOT_FOUND'
      });
    }

    if (user.isActive === false) {
      console.error(`🚫 [VERIFY-TOKEN] 403 USER_INACTIVE | userId=${userId} | email=${user.email} | path=${req.path}`);
      return res.status(403).json({
        success: false,
        message: 'الحساب غير نشط',
        code: 'USER_INACTIVE'
      });
    }

    let effectiveCompanyId = companyId || user.companyId || null;
    let effectiveRole = user.role || decoded.role;

    if (user.role === 'SUPER_ADMIN' && !effectiveCompanyId) {
      // Fallback for SUPER_ADMIN when no header is supplied (desktop clients, internal services)
      effectiveCompanyId = 'cmldvhqkx0000juj6sdbx2jw0';
    }

    if (user.role !== 'SUPER_ADMIN' && effectiveCompanyId && typeof effectiveCompanyId === 'string') {
      const membership = await executeWithRetry(async () =>
        prisma.userCompany.findUnique({
          where: {
            userId_companyId: {
              userId: user.id,
              companyId: effectiveCompanyId
            }
          },
          select: {
            role: true,
            isActive: true,
            roleId: true,
            roleRef: { select: { key: true } }
          }
        })
      );

      if (!membership || !membership.isActive) {
        const allowLegacyPrimary = await hasLegacyPrimaryCompanyAccess(
          prisma,
          user.id,
          effectiveCompanyId,
          user.companyId
        );

        if (!allowLegacyPrimary) {
          console.error(`🚫 [VERIFY-TOKEN] 403 ACCESS_REVOKED | userId=${user.id} | companyId=${effectiveCompanyId} | path=${req.path}`);
          return res.status(403).json({
            success: false,
            message: 'ليس لديك صلاحية للوصول لهذه الشركة',
            code: 'ACCESS_REVOKED'
          });
        }
      } else {
        effectiveRole = membership.roleRef?.key || membership.role || effectiveRole;

        // If roleRef didn't populate but roleId is set, resolve from Role table directly
        if (!membership.roleRef?.key && membership.roleId) {
          try {
            const resolvedRole = await executeWithRetry(() =>
              prisma.role.findUnique({
                where: { id: membership.roleId },
                select: { key: true }
              })
            );
            if (resolvedRole?.key) {
              effectiveRole = resolvedRole.key;
            }
          } catch (e) {
            console.warn('[VERIFY-TOKEN] Failed to resolve role by roleId:', e.message?.substring(0, 100));
          }
        }
      }
    }

    // Load DB-based permissions
    let userPermissions = [];
    if (effectiveCompanyId && user.role !== 'SUPER_ADMIN') {
      userPermissions = await loadUserPermissions(user.id, effectiveCompanyId);
    }

    req.user = {
      ...decoded,
      id: user.id,
      userId: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: effectiveRole,
      companyId: effectiveCompanyId,
      userPermissions
    };

    // 🛡️ [SAAS] propagate companyId to tenantContext for RLS
    const tenantContext = require('../services/tenantContext');
    if (effectiveCompanyId) {
      return tenantContext.run(effectiveCompanyId, () => {
        if (process.env.NODE_ENV === 'development') {
          console.debug(`✅ [VERIFY-TOKEN] Context set for company: ${effectiveCompanyId}`);
        }
        next();
      });
    }

    // Minimal logging
    if (process.env.NODE_ENV === 'development') {
      console.debug(`✅ [VERIFY-TOKEN] Verified user: ${userId} (Role: ${req.user.role})`);
    }
    next();
  } catch (error) {
    console.log('❌ [VERIFY-TOKEN] Token verification failed:', error.message);
    if (isMissingAuthSecretError(error)) {
      return res.status(500).json({
        success: false,
        message: 'إعدادات المصادقة غير مكتملة',
        code: 'AUTH_CONFIGURATION_ERROR'
      });
    }

    if (isDatabaseAvailabilityError(error)) {
      return res.status(503).json({
        success: false,
        message: 'قاعدة البيانات غير متاحة حالياً',
        code: 'DB_UNAVAILABLE'
      });
    }
    return res.status(401).json({
      success: false,
      message: 'رمز المصادقة غير صحيح',
      code: 'INVALID_TOKEN',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Company access middleware
const requireCompanyAccess = async (req, res, next) => {
  if (process.env.NODE_ENV === 'development') {
    console.debug(`🔐 [COMPANY-ACCESS] URL: ${req.originalUrl}, User: ${req.user?.id}, Role: ${req.user?.role}`);
  }

  try {
    const { companyId: paramCompanyId } = req.params;
    const user = req.user;

    if (!user) {
      return res.status(401).json({ success: false, message: 'المستخدم غير موجود' });
    }

    // 👑 [SUPER-ADMIN] Bypasses membership checks
    if (user.role === 'SUPER_ADMIN') {
      req.user.effectiveCompanyId = paramCompanyId || user.companyId;
      return next();
    }

    // Determine the target company ID to validate
    // Priority: URL param > Request body > Query param > User's current context
    const targetCompanyId = paramCompanyId || req.body?.companyId || req.query?.companyId || user.companyId;

    if (!targetCompanyId) {
      return res.status(400).json({ success: false, message: 'معرف الشركة مطلوب' });
    }

    const prisma = await getSharedPrismaClientAsync();
    const membership = await runWithoutTenantContext(() =>
      executeWithRetry(async () =>
        prisma.userCompany.findUnique({
          where: {
            userId_companyId: {
              userId: user.id,
              companyId: targetCompanyId
            }
          },
          select: {
            role: true,
            isActive: true,
            roleId: true
          }
        })
      )
    );

    if (!membership || !membership.isActive) {
      const allowLegacyPrimary = await runWithoutTenantContext(() =>
        hasLegacyPrimaryCompanyAccess(
          prisma,
          user.id,
          targetCompanyId,
          user.companyId
        )
      );

      if (!allowLegacyPrimary) {
        console.warn(`❌ [COMPANY-ACCESS] Denied: User ${user.id} attempting to access company ${targetCompanyId}`);
        return res.status(403).json({
          success: false,
          message: 'ليس لديك صلاحية للوصول لهذه الشركة',
          code: 'ACCESS_REVOKED'
        });
      }
    } else if (membership.role) {
      req.user.role = membership.role;
    }

    // Load DB-based permissions for this company context
    if (targetCompanyId && user.role !== 'SUPER_ADMIN') {
      req.user.userPermissions = await loadUserPermissions(user.id, targetCompanyId);
    }

    // Success: Set effective IDs for controllers
    req.user.effectiveCompanyId = targetCompanyId;
    req.user.companyId = targetCompanyId;

    // Update tenant context to match the validated company scope.
    const tenantContext = require('../services/tenantContext');
    return tenantContext.run(targetCompanyId, () => next());
  } catch (error) {
    console.error('❌ [COMPANY-ACCESS] Error:', error);
    if (isDatabaseAvailabilityError(error)) {
      return res.status(503).json({
        success: false,
        message: 'قاعدة البيانات غير متاحة حالياً',
        code: 'DB_UNAVAILABLE'
      });
    }
    return res.status(500).json({
      success: false,
      message: 'خطأ في التحقق من صلاحية الوصول'
    });
  }
};

// Role-based access control
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'غير مصرح بالوصول'
      });
    }

    // 👑 SUPER_ADMIN bypasses role checks
    if (req.user.role === 'SUPER_ADMIN') {
      return next();
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'ليس لديك صلاحية لهذا الإجراء'
      });
    }
    next();
  };
};

// Super Admin access control middleware
const requireSuperAdmin = (req, res, next) => {
  console.log('👑 [VERIFY-TOKEN] requireSuperAdmin called, user role:', req.user?.role);
  if (!req.user) {
    console.log('❌ [VERIFY-TOKEN] No user found in request');
    return res.status(401).json({
      success: false,
      message: 'غير مصرح بالوصول'
    });
  }

  if (req.user.role !== 'SUPER_ADMIN') {
    console.log('❌ [VERIFY-TOKEN] Access denied: User is not SUPER_ADMIN, role is:', req.user.role);
    return res.status(403).json({
      success: false,
      message: 'هذا المورد متاح لمدير النظام فقط'
    });
  }

  console.log('✅ [VERIFY-TOKEN] Super Admin access granted');

  // 🛡️ CRITICAL: Auto-Tenant Isolation must never constrain super admin operations to a caller's accidental token company.
  // If a specific target company is provided in params or query, scope the context to that company.
  // Otherwise, bypass tenant isolation so platform-wide queries execute cleanly without tenant hijacking.
  const tenantContext = require('../services/tenantContext');
  const targetCompanyId = req.params.companyId || req.query.companyId;
  if (targetCompanyId) {
    return tenantContext.run(targetCompanyId, () => next());
  }
  return tenantContext.bypass(() => next());
};


// Optional authentication - doesn't throw if no token, just continues
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    if (token) {
      return authenticateToken(req, res, next);
    }
    next();
  } catch {
    next();
  }
};

// Support both callable middleware usage and named property destructuring
authenticateToken.authenticateToken = authenticateToken;
authenticateToken.verifyToken = authenticateToken;
authenticateToken.requireSuperAdmin = requireSuperAdmin;
authenticateToken.requireRole = requireRole;
authenticateToken.requireCompanyAccess = requireCompanyAccess;
authenticateToken.optionalAuth = optionalAuth;

module.exports = authenticateToken;
