const jwt = require('jsonwebtoken');
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const { sanitizePotentiallyUnsafeString } = require('../utils/requestSanitizer');
const { getJwtSecret, isMissingAuthSecretError } = require('../utils/jwtSecret');

/**
 * Enhanced Authentication and Authorization Middleware
 *
 * Handles JWT token verification and permission checking
 * Enhanced with additional security features for User Management
 */

// Rate limit store for sensitive operations
const sensitiveAttempts = new Map();

/**
 * Generate JWT token for user
 */
const generateToken = (user) => {
    const jwt = require('jsonwebtoken');
    return jwt.sign(
        {
            userId: user.id,
            companyId: user.companyId,
            role: user.role,
        },
        getJwtSecret(),
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );
};

/**
 * Verify JWT token and attach user to request
 */
const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            console.log(`[AUTH] No token provided - Path: ${req.path}, IP: ${req.ip}`);
            return res.status(401).json({
                success: false,
                error: {
                    code: 'AUTH_TOKEN_MISSING',
                    message: 'Access token required'
                }
            });
        }

        // Verify token
        let decoded;
        try {
            decoded = jwt.verify(token, getJwtSecret());
        } catch (jwtError) {
            if (isMissingAuthSecretError(jwtError)) {
                return res.status(500).json({
                    success: false,
                    error: {
                        code: 'AUTH_CONFIGURATION_ERROR',
                        message: 'Authentication is temporarily unavailable'
                    }
                });
            }

            if (jwtError.name === 'JsonWebTokenError') {
                console.log(`[AUTH] Invalid token - Path: ${req.path}, IP: ${req.ip}`);
                return res.status(401).json({
                    success: false,
                    error: {
                        code: 'INVALID_TOKEN',
                        message: 'Invalid token'
                    }
                });
            }
            if (jwtError.name === 'TokenExpiredError') {
                console.log(`[AUTH] Token expired - Path: ${req.path}, IP: ${req.ip}`);
                return res.status(401).json({
                    success: false,
                    error: {
                        code: 'TOKEN_EXPIRED',
                        message: 'Token expired'
                    }
                });
            }
            throw jwtError;
        }

        // Get user from database with retry logic
        let user;
        let retries = 2;
        let lastError;

        while (retries > 0) {
            try {
                user = await getSharedPrismaClient().user.findUnique({
                    where: { id: decoded.userId },
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                        role: true,
                        isActive: true,
                        companyId: true,
                        lastActivityAt: true,
                    },
                });
                break;
            } catch (dbError) {
                lastError = dbError;
                retries--;
                if (retries === 0) {
                    console.error('[AUTH] Database error:', dbError.message);
                    return res.status(503).json({
                        success: false,
                        error: {
                            code: 'DB_CONNECTION_ERROR',
                            message: 'Database temporarily unavailable'
                        }
                    });
                }
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }

        if (!user) {
            console.log(`[AUTH] User not found - UserID: ${decoded.userId}, Path: ${req.path}`);
            return res.status(401).json({
                success: false,
                error: {
                    code: 'USER_NOT_FOUND',
                    message: 'User not found'
                }
            });
        }

        if (!user.isActive) {
            console.log(`[AUTH] User disabled - UserID: ${user.id}, Email: ${user.email}, Path: ${req.path}`);
            return res.status(401).json({
                success: false,
                error: {
                    code: 'USER_DISABLED',
                    message: 'User account is disabled'
                }
            });
        }

        // Prioritize companyId and role from token for session isolation
        const activeCompanyId = decoded.companyId || user.companyId;
        const activeRole = decoded.role || user.role;

        // Security Check: Verify the user still belongs to this company
        if (user.role !== 'SUPER_ADMIN' && activeCompanyId !== user.companyId) {
            try {
                const userCompany = await getSharedPrismaClient().userCompany.findUnique({
                    where: {
                        userId_companyId: {
                            userId: user.id,
                            companyId: activeCompanyId
                        }
                    }
                });

                if (!userCompany || !userCompany.isActive) {
                    console.log(`[AUTH] Company access revoked - User: ${user.email}, RequestedCompany: ${activeCompanyId}`);
                    return res.status(403).json({
                        success: false,
                        error: {
                            code: 'ACCESS_REVOKED',
                            message: 'User no longer has access to this company'
                        }
                    });
                }
            } catch (prismaError) {
                console.error('[AUTH] Membership verification failed:', prismaError.message);
                return res.status(500).json({
                    success: false,
                    error: {
                        code: 'DB_ERROR',
                        message: 'Database error during membership check'
                    }
                });
            }
        }

        // Prevent privilege escalation
        if (decoded.role && decoded.role !== user.role) {
            console.warn(`[AUTH] Potential privilege escalation - User: ${user.email}, TokenRole: ${decoded.role}, ActualRole: ${user.role}`);
        }

        // Update last activity (non-blocking)
        try {
            await getSharedPrismaClient().user.update({
                where: { id: user.id },
                data: { lastActivityAt: new Date() },
            });
        } catch (updateError) {
            console.warn('[AUTH] Failed to update user activity:', updateError.message);
        }

        // Attach user to request
        req.user = {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: activeRole,
            companyId: activeCompanyId,
            lastActivityAt: user.lastActivityAt || undefined,
        };

        // Add request ID for tracing
        req.requestId = req.headers['x-request-id'] || `req_${Date.now()}`;
        req.correlationId = req.headers['x-correlation-id'] || req.requestId;

        console.log(`[AUTH] Authenticated - User: ${user.email}, Company: ${activeCompanyId}, Role: ${activeRole}`);
        next();
    } catch (error) {
        console.error('[AUTH] Unexpected error:', error.message);
        return res.status(500).json({
            success: false,
            error: {
                code: 'AUTH_ERROR',
                message: 'Authentication error'
            }
        });
    }
};

/**
 * Optional authentication - doesn't throw error if no token
 */
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];

        if (token) {
            await authenticateToken(req, res, next);
        } else {
            next();
        }
    } catch (error) {
        next();
    }
};

/**
 * Check if user has required role
 */
const requireRole = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: {
                    code: 'AUTH_REQUIRED',
                    message: 'Authentication required'
                }
            });
        }

        if (!allowedRoles.includes(req.user.role)) {
            console.log(`[AUTH] Role check failed - User: ${req.user.email}, Role: ${req.user.role}, Required: ${allowedRoles.join(', ')}`);
            return res.status(403).json({
                success: false,
                error: {
                    code: 'INSUFFICIENT_PERMISSIONS',
                    message: `Access denied. Required role: ${allowedRoles.join(' or ')}`,
                    required: allowedRoles,
                    current: req.user.role
                }
            });
        }

        next();
    };
};

/**
 * Check if user is super admin
 */
const requireSuperAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            error: {
                code: 'AUTH_REQUIRED',
                message: 'Authentication required'
            }
        });
    }

    if (req.user.role !== 'SUPER_ADMIN') {
        console.log(`[AUTH] Super admin check failed - User: ${req.user.email}, Role: ${req.user.role}`);
        return res.status(403).json({
            success: false,
            error: {
                code: 'NOT_SUPER_ADMIN',
                message: 'Super admin access required'
            }
        });
    }

    next();
};

/**
 * Check if user is company admin or owner
 */
const requireCompanyAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            error: {
                code: 'AUTH_REQUIRED',
                message: 'Authentication required'
            }
        });
    }

    const allowedRoles = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER'];

    if (!allowedRoles.includes(req.user.role)) {
        console.log(`[AUTH] Company admin check failed - User: ${req.user.email}, Role: ${req.user.role}`);
        return res.status(403).json({
            success: false,
            error: {
                code: 'NOT_COMPANY_ADMIN',
                message: 'Company admin access required'
            }
        });
    }

    next();
};

/**
 * Prevent self-modification/deletion
 */
const preventSelfModification = (paramName = 'userId') => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: {
                    code: 'AUTH_REQUIRED',
                    message: 'Authentication required'
                }
            });
        }

        const targetUserId = req.params[paramName];

        if (targetUserId === req.user.id) {
            console.warn(`[AUTH] Self-modification attempt - User: ${req.user.email}, Path: ${req.path}`);
            return res.status(403).json({
                success: false,
                error: {
                    code: 'SELF_MODIFICATION',
                    message: 'Cannot perform this action on your own account'
                }
            });
        }

        next();
    };
};

/**
 * Validate that the requested user belongs to the same company
 */
const validateUserCompanyAccess = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: {
                    code: 'AUTH_REQUIRED',
                    message: 'Authentication required'
                }
            });
        }

        const targetUserId = req.params.userId || req.params.id;

        if (!targetUserId) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'User ID is required'
                }
            });
        }

        // Super admins can access any user
        if (req.user.role === 'SUPER_ADMIN') {
            return next();
        }

        const targetUser = await getSharedPrismaClient().user.findUnique({
            where: { id: targetUserId },
            select: { companyId: true, role: true },
        });

        if (!targetUser) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'USER_NOT_FOUND',
                    message: 'User not found'
                }
            });
        }

        // Check if target user belongs to the same company
        if (targetUser.companyId !== req.user.companyId) {
            console.warn(`[AUTH] Company access denied - User: ${req.user.email}, TargetUser: ${targetUserId}`);
            return res.status(403).json({
                success: false,
                error: {
                    code: 'COMPANY_ACCESS_DENIED',
                    message: 'Access denied: User belongs to a different company'
                }
            });
        }

        // Prevent modifying SUPER_ADMIN of other companies
        if (targetUser.role === 'SUPER_ADMIN' && req.user.role !== 'SUPER_ADMIN') {
            return res.status(403).json({
                success: false,
                error: {
                    code: 'CANNOT_MODIFY_SUPER_ADMIN',
                    message: 'Cannot modify super admin accounts'
                }
            });
        }

        next();
    } catch (error) {
        console.error('[AUTH] User company access validation error:', error);
        return res.status(500).json({
            success: false,
            error: {
                code: 'VALIDATION_ERROR',
                message: 'Error validating user access'
            }
        });
    }
};

/**
 * Rate limiting for sensitive operations (password reset, user delete)
 */
const sensitiveOperationRateLimit = (maxAttempts = 10, windowMs = 60000) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: {
                    code: 'AUTH_REQUIRED',
                    message: 'Authentication required'
                }
            });
        }

        const key = `${req.user.id}_${req.path}`;
        const now = Date.now();

        let record = sensitiveAttempts.get(key);

        if (!record || now > record.resetTime) {
            sensitiveAttempts.set(key, {
                count: 1,
                resetTime: now + windowMs,
            });
            return next();
        }

        if (record.count >= maxAttempts) {
            console.warn(`[RATE_LIMIT] Sensitive operation - User: ${req.user.email}, Path: ${req.path}`);
            res.setHeader('Retry-After', Math.ceil((record.resetTime - now) / 1000));
            return res.status(429).json({
                success: false,
                error: {
                    code: 'RATE_LIMIT_EXCEEDED',
                    message: 'Too many attempts. Please try again later.',
                    retryAfter: Math.ceil((record.resetTime - now) / 1000),
                },
            });
        }

        record.count++;
        next();
    };
};

/**
 * Sanitize user input - prevent XSS and injection attacks
 */
const sanitizeUserInput = (req, res, next) => {
    const sanitize = (obj) => {
        if (typeof obj === 'string') {
            return sanitizePotentiallyUnsafeString(obj.trim())
                .replace(/<iframe/gi, '')
                .replace(/object/gi, '')
                .replace(/embed/gi, '');
        }
        if (typeof obj === 'object' && obj !== null && !Array.isArray(obj)) {
            const sanitized = {};
            for (const key in obj) {
                sanitized[key] = sanitize(obj[key]);
            }
            return sanitized;
        }
        return obj;
    };

    if (req.body) {
        req.body = sanitize(req.body);
    }
    if (req.query) {
        req.query = sanitize(req.query);
    }

    next();
};

/**
 * Clean up old rate limit entries periodically
 */
setInterval(() => {
    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5 minutes

    for (const [key, record] of sensitiveAttempts) {
        if (now > record.resetTime) {
            sensitiveAttempts.delete(key);
        }
    }

    // Enforce max size
    if (sensitiveAttempts.size > 10000) {
        const keysToDelete = Array.from(sensitiveAttempts.keys()).slice(0, 1000);
        keysToDelete.forEach(key => sensitiveAttempts.delete(key));
    }
}, 60000);

module.exports = {
    generateToken,
    authenticateToken,
    optionalAuth,
    requireRole,
    requireSuperAdmin,
    requireCompanyAdmin,
    preventSelfModification,
    validateUserCompanyAccess,
    sensitiveOperationRateLimit,
    sanitizeUserInput
};
