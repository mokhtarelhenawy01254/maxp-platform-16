const jwt = require('jsonwebtoken');
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const redisCacheService = require('../services/redisCacheService');
const { getJwtSecret, isMissingAuthSecretError } = require('../utils/jwtSecret');

/**
 * Authentication middleware
 * Verifies JWT token and adds user info to request
 */
const requireAuth = async (req, res, next) => {
  try {
    // 1. Try to get token from Authorization header or Cookies
    let token = req.headers.authorization ? req.headers.authorization.split(' ')[1] : req.cookies?.token;

    if (!token) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'AUTH_TOKEN_MISSING'
      });
    }

    // 2. Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, getJwtSecret());
    } catch (jwtError) {
      if (isMissingAuthSecretError(jwtError)) {
        return res.status(500).json({
          error: 'Authentication is temporarily unavailable',
          code: 'AUTH_CONFIGURATION_ERROR'
        });
      }

      if (jwtError.name === 'JsonWebTokenError') {
        return res.status(401).json({
          error: 'Invalid token',
          code: 'INVALID_TOKEN'
        });
      }

      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({
          error: 'Token expired',
          code: 'TOKEN_EXPIRED'
        });
      }

      throw jwtError;
    }

    // ⚡ PERFORMANCE: Check cache for user data first
    const userCacheKey = `user:${decoded.userId}`;
    let user = await redisCacheService.get(userCacheKey);

    if (!user) {
      // Get user from database with retry logic for connection issues
      let retries = 2;
      let lastError;

      while (retries > 0) {
        try {
          user = await getSharedPrismaClient().user.findUnique({
            where: { id: decoded.userId },
            include: {
              userCompanies: true
            }
          });

          if (user) {
            // Cache user data for 5 minutes
            await redisCacheService.set(userCacheKey, user, 300);
          }
          break; // Success, exit retry loop
        } catch (dbError) {
          lastError = dbError;
          retries--;

          // Check if it's a connection error worth retrying
          const isConnectionError =
            dbError.message?.includes('Engine is not yet connected') ||
            dbError.message?.includes('Connection') ||
            dbError.message?.includes('timeout') ||
            dbError.code === 'P1001' ||
            dbError.code === 'P1008' ||
            dbError.code === 'P1017';

          if (isConnectionError && retries > 0) {
            console.warn(`[AUTH] Database connection issue, retrying... (${retries} retries left)`);
            await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms before retry
            continue;
          }

          // Log the actual error for debugging
          console.error('[AUTH ERROR] Database query failed:', {
            error: dbError.message,
            code: dbError.code,
            userId: decoded.userId,
            path: req.path
          });

          return res.status(503).json({
            error: 'Database temporarily unavailable',
            code: 'DB_CONNECTION_ERROR'
          });
        }
      }
    }

    if (!user) {
      return res.status(401).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // 🛡️ [SAAS] Secure Company Context Resolution
    // Strategy: 
    // 1. JWT 'companyId' is the MOST TRUSTED source (signed by server).
    // 2. 'x-company-id' header is only accepted as an override for SUPER_ADMIN.

    let activeCompanyId = decoded.companyId; // Start with the trusted ID from token
    const headerCompanyId = req.headers['x-company-id'] || req.headers['X-Company-Id'];
    const queryCompanyId = req.query?.companyId;
    const bodyCompanyId = req.body?.companyId;

    // Allow override from headers, query, or body (verified by membership check below)
    const requestedCompanyId = headerCompanyId || queryCompanyId || bodyCompanyId;

    if (requestedCompanyId && requestedCompanyId !== activeCompanyId) {
      if (user.role === 'SUPER_ADMIN' || !activeCompanyId) {
        console.log(`🔄 [AUTH] Company context override: ${activeCompanyId} -> ${requestedCompanyId}`);
        activeCompanyId = requestedCompanyId;
      } else {
        // Warning: Non-admin trying to override JWT token context
        console.warn(`⚠️ [AUTH] Ignored attempt to override JWT company (${activeCompanyId}) with header (${requestedCompanyId}) by ${user.email}`);
      }
    }

    // Fallback if no context found
    if (!activeCompanyId) {
      activeCompanyId = user.companyId;
    }

    // Get company details & Security check: Verify user still has access
    let activeRole = decoded.role || user.role;
    let userCompany = null;
    let activeCompany = null;

    // 🛡️ SECURITY Check: Verify the user belongs to this company (not a Zombie session)
    // Super Admin is exempt from this check
    if (user.role !== 'SUPER_ADMIN') {
      // Ensure activeCompanyId is a valid string for Prisma
      const safeCompanyId = String(activeCompanyId || '');
      if (!safeCompanyId || safeCompanyId === '[object Object]') {
        console.error(`[AUTH] INVALID company ID attempted: "${activeCompanyId}" by ${user.email} (Path: ${req.path})`);
        return res.status(400).json({ error: 'Invalid active company ID context' });
      }

      // ⚡ PERFORMANCE: Check cache for membership
      const membershipCacheKey = `mem:${user.id}:${safeCompanyId}`;
      userCompany = await redisCacheService.get(membershipCacheKey);

      if (!userCompany) {
        try {
          userCompany = await getSharedPrismaClient().userCompany.findUnique({
            where: {
              userId_companyId: {
                userId: user.id,
                companyId: safeCompanyId
              }
            }
          });

          if (userCompany) {
            // Cache membership for 5 minutes
            await redisCacheService.set(membershipCacheKey, userCompany, 300);
          }
        } catch (prismaError) {
          console.error(`[AUTH] Membership verification failed:`, prismaError.message);
          return res.status(500).json({ error: 'Database error during membership check' });
        }
      }

      if (!userCompany || !userCompany.isActive) {
        // Fallback check: maybe the user just has user.companyId set and no userCompany record yet
        if (safeCompanyId === user.companyId) {
          console.log(`[AUTH] User ${user.email} belongs to primary company ${safeCompanyId} but has no UserCompany record. Allowing.`);
        } else {
          console.warn(`[AUTH] Access Denied: User ${user.email} is not a member of company ${safeCompanyId}`);
          return res.status(403).json({
            error: 'User no longer has access to this company',
            code: 'ACCESS_REVOKED',
            requestedCompanyId: safeCompanyId,
            userPrimaryCompany: user.companyId
          });
        }
      }

      // ⚡ FIX: Use role from userCompany if available (company-specific role)
      if (userCompany && userCompany.role) {
        activeRole = userCompany.role;
      }
    }

    if (activeCompanyId && activeCompanyId !== 'null' && activeCompanyId !== 'undefined' && typeof activeCompanyId === 'string' && activeCompanyId.length > 5) {
      if (activeCompanyId !== user.companyId) {
        // Fetch the specific company details
        activeCompany = await getSharedPrismaClient().company.findUnique({
          where: { id: activeCompanyId }
        });

        if (!activeCompany) {
          // If not a Super Admin and context is invalid, deny
          if (user.role !== 'SUPER_ADMIN') {
            return res.status(403).json({
              error: 'Current company context is invalid',
              code: 'INVALID_COMPANY_CONTEXT'
            });
          }
          // For Super Admin, we just reset activeCompany to null
          activeCompany = null;
        }
      } else if (!userCompany && user.role !== 'SUPER_ADMIN') {
        // Even if same company, check userCompany for role if it exists (if not already fetched)
        // Only for non-Super Admins to avoid null companyId in where clause
        userCompany = await getSharedPrismaClient().userCompany.findFirst({
          where: {
            userId: user.id,
            companyId: activeCompanyId,
            isActive: true
          }
        });

        if (userCompany && userCompany.role) {
          activeRole = userCompany.role;
        }
      }
    }

    // Add user info to request
    req.user = {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: activeRole,
      companyId: activeCompanyId,
      company: activeCompany
    };

    // ✅ Add employeeId to req.user if user has an employee profile in this company
    if (req.user.companyId) {
      try {
        const employeeProfile = await getSharedPrismaClient().employee.findFirst({
          where: {
            userId: user.id,
            companyId: req.user.companyId
          },
          select: { id: true }
        });
        if (employeeProfile) {
          req.user.employeeId = employeeProfile.id;
        }
      } catch (e) {
        console.error('⚠️ [AUTH] Failed to fetch employeeId:', e.message);
      }
    }

    // 🛡️ [SAAS] Establish Tenants Context (RLS)
    // We explicitly wrap the next() call inside tenantContext.run to ensure 
    // all downstream DB operations in this request's trace are scoped correctly.
    const tenantContext = require('../services/tenantContext');
    return tenantContext.run(req.user.companyId, () => {
      next();
    });
  } catch (error) {
    console.error('[AUTH ERROR] Unexpected error:', {
      error: error.message,
      stack: error.stack?.substring(0, 500),
      path: req.path
    });

    return res.status(500).json({
      error: 'Authentication error',
      code: 'AUTH_ERROR'
    });
  }
};

/**
 * Role-based authorization middleware
 */
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
        required: allowedRoles,
        current: req.user.role
      });
    }

    next();
  };
};

/**
 * Company isolation middleware
 */
const requireCompanyAccess = (req, res, next) => {
  if (!req.user || !req.user.companyId) {
    return res.status(401).json({
      error: 'Company authentication required',
      code: 'COMPANY_AUTH_REQUIRED'
    });
  }

  req.companyId = req.user.companyId;
  next();
};

/**
 * Optional authentication middleware
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : req.cookies?.token;

    if (!token) {
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await getSharedPrismaClient().user.findUnique({
      where: { id: decoded.userId },
      include: { userCompanies: true }
    });

    if (user) {
      const activeCompanyId = decoded.companyId || user.companyId;
      const activeRole = decoded.role || user.role;
      let activeCompany = null;

      if (activeCompanyId) {
        activeCompany = await getSharedPrismaClient().company.findUnique({
          where: { id: activeCompanyId }
        });
      }

      req.user = {
        id: user.id,
        email: user.email,
        role: activeRole,
        companyId: activeCompanyId,
        company: activeCompany
      };
    }

    next();
  } catch (error) {
    next();
  }
};

module.exports = {
  requireAuth,
  requireRole,
  requireCompanyAccess,
  optionalAuth
};
