// ==================== MIDDLEWARE ====================
const jwt = require('jsonwebtoken');
const {
  getSharedPrismaClientAsync,
  executeWithRetry,
} = require('../services/sharedDatabase');
const tenantContext = require('../services/tenantContext');
const { getJwtSecret, isMissingAuthSecretError } = require('./jwtSecret');

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
  tenantContext.run(null, operation);

// Authentication middleware
const authenticateToken = async (req, res, next) => {
  console.log('🔐 [VERIFY-TOKEN] authenticateToken called for:', req.method, req.path);
  console.log('🔐 [VERIFY-TOKEN] Headers:', req.headers.authorization ? 'Token present' : 'No token');

  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    console.log('❌ [VERIFY-TOKEN] No token found in request');
    return res.status(401).json({
      success: false,
      message: 'رمز المصادقة مطلوب',
      code: 'TOKEN_REQUIRED'
    });
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
      return res.status(403).json({
        success: false,
        message: 'الحساب غير نشط',
        code: 'USER_INACTIVE'
      });
    }

    let effectiveCompanyId = companyId || user.companyId || null;
    let effectiveRole = user.role || decoded.role;

    if (user.role !== 'SUPER_ADMIN' && effectiveCompanyId && typeof effectiveCompanyId === 'string' && effectiveCompanyId.length > 5) {
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
            isActive: true
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
          return res.status(403).json({
            success: false,
            message: 'User no longer has access to this company',
            code: 'ACCESS_REVOKED',
            requestedCompanyId: effectiveCompanyId,
            userPrimaryCompany: user.companyId
          });
        }
      } else if (membership.role) {
        effectiveRole = membership.role;
      }
    }

    req.user = {
      ...decoded,
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: effectiveRole,
      companyId: effectiveCompanyId
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
            isActive: true
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
  next();
};


module.exports = { requireSuperAdmin, requireRole, requireCompanyAccess, authenticateToken }
