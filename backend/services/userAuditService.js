/**
 * 📋 User Audit Trail Service
 * Tracks user management operations for compliance and debugging
 */

const { getSharedPrismaClient } = require('./sharedDatabase');

// In-memory audit log (limited to 1000 entries)
const userAuditLog = [];
const MAX_AUDIT_LOG_SIZE = 1000;

/**
 * Audit action types for user management
 */
const USER_AUDIT_ACTIONS = {
  // User lifecycle actions
  USER_CREATED: 'USER_CREATED',
  USER_UPDATED: 'USER_UPDATED',
  USER_DELETED: 'USER_DELETED',
  USER_ACTIVATED: 'USER_ACTIVATED',
  USER_DEACTIVATED: 'USER_DEACTIVATED',
  
  // Role management
  ROLE_CHANGED: 'ROLE_CHANGED',
  
  // Authentication events
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILED: 'LOGIN_FAILED',
  LOGOUT: 'LOGOUT',
  PASSWORD_RESET_REQUESTED: 'PASSWORD_RESET_REQUESTED',
  PASSWORD_CHANGED: 'PASSWORD_CHANGED',
  
  // Invitations
  INVITATION_SENT: 'INVITATION_SENT',
  INVITATION_ACCEPTED: 'INVITATION_ACCEPTED',
  INVITATION_CANCELLED: 'INVITATION_CANCELLED',
  INVITATION_EXPIRED: 'INVITATION_EXPIRED',
  
  // Session events
  SESSION_CREATED: 'SESSION_CREATED',
  SESSION_TERMINATED: 'SESSION_TERMINATED',
  
  // Security events
  SUSPICIOUS_ACTIVITY: 'SUSPICIOUS_ACTIVITY',
  UNAUTHORIZED_ACCESS_ATTEMPT: 'UNAUTHORIZED_ACCESS_ATTEMPT'
};

/**
 * Severity levels
 */
const USER_AUDIT_SEVERITY = {
  INFO: 'INFO',
  WARNING: 'WARNING',
  ERROR: 'ERROR',
  CRITICAL: 'CRITICAL'
};

/**
 * Create audit entry for user operations
 */
async function createUserAuditEntry(data) {
  const {
    action,
    companyId,
    userId,
    targetUserId,
    details,
    severity = USER_AUDIT_SEVERITY.INFO,
    correlationId = null
  } = data;

  const entry = {
    id: `user_audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    action,
    companyId,
    userId,
    targetUserId,
    details,
    severity,
    correlationId
  };

  // Add to in-memory log
  userAuditLog.push(entry);

  // Trim old entries
  if (userAuditLog.length > MAX_AUDIT_LOG_SIZE) {
    userAuditLog.shift();
  }

  // Save to database
  try {
    const prisma = getSharedPrismaClient();
    if (prisma.userAuditLog) {
      await prisma.userAuditLog.create({
        data: {
          id: entry.id,
          timestamp: entry.timestamp,
          action: entry.action,
          companyId: entry.companyId,
          userId: entry.userId,
          targetUserId: entry.targetUserId,
          details: JSON.stringify(entry.details),
          severity: entry.severity,
          correlationId: entry.correlationId
        }
      });
    }
  } catch (e) {
    console.warn('⚠️ Could not save user audit entry to database:', e.message);
  }

  console.log(`[USER_AUDIT] ${action}:`, {
    userId,
    targetUserId,
    companyId,
    severity,
    correlationId
  });

  return entry;
}

/**
 * Log user creation
 */
async function logUserCreated(companyId, userId, userData, correlationId) {
  return createUserAuditEntry({
    action: USER_AUDIT_ACTIONS.USER_CREATED,
    companyId,
    userId,
    targetUserId: userData.id,
    details: {
      email: userData.email,
      role: userData.role,
      message: `تم إنشاء المستخدم ${userData.email}`
    },
    correlationId
  });
}

/**
 * Log user update
 */
async function logUserUpdated(companyId, userId, targetUserId, changes, correlationId) {
  return createUserAuditEntry({
    action: USER_AUDIT_ACTIONS.USER_UPDATED,
    companyId,
    userId,
    targetUserId,
    details: {
      changes,
      message: `تم تحديث بيانات المستخدم`
    },
    severity: Object.keys(changes).length > 3 ? USER_AUDIT_SEVERITY.WARNING : USER_AUDIT_SEVERITY.INFO,
    correlationId
  });
}

/**
 * Log user deletion
 */
async function logUserDeleted(companyId, userId, targetUserId, deletedUserData, correlationId) {
  return createUserAuditEntry({
    action: USER_AUDIT_ACTIONS.USER_DELETED,
    companyId,
    userId,
    targetUserId,
    details: {
      deletedUser: {
        email: deletedUserData.email,
        role: deletedUserData.role
      },
      message: `تم حذف المستخدم ${deletedUserData.email}`
    },
    severity: USER_AUDIT_SEVERITY.WARNING,
    correlationId
  });
}

/**
 * Log user activation
 */
async function logUserActivated(companyId, userId, targetUserId, correlationId) {
  return createUserAuditEntry({
    action: USER_AUDIT_ACTIONS.USER_ACTIVATED,
    companyId,
    userId,
    targetUserId,
    details: {
      message: 'تم تفعيل المستخدم'
    },
    correlationId
  });
}

/**
 * Log user deactivation
 */
async function logUserDeactivated(companyId, userId, targetUserId, reason, correlationId) {
  return createUserAuditEntry({
    action: USER_AUDIT_ACTIONS.USER_DEACTIVATED,
    companyId,
    userId,
    targetUserId,
    details: {
      reason,
      message: 'تم تعطيل المستخدم'
    },
    severity: USER_AUDIT_SEVERITY.WARNING,
    correlationId
  });
}

/**
 * Log role change
 */
async function logRoleChanged(companyId, userId, targetUserId, oldRole, newRole, correlationId) {
  return createUserAuditEntry({
    action: USER_AUDIT_ACTIONS.ROLE_CHANGED,
    companyId,
    userId,
    targetUserId,
    details: {
      oldRole,
      newRole,
      message: `تم تغيير الدور من ${oldRole} إلى ${newRole}`
    },
    severity: newRole === 'COMPANY_ADMIN' ? USER_AUDIT_SEVERITY.WARNING : USER_AUDIT_SEVERITY.INFO,
    correlationId
  });
}

/**
 * Log password reset request
 */
async function logPasswordResetRequested(companyId, targetUserId, correlationId) {
  return createUserAuditEntry({
    action: USER_AUDIT_ACTIONS.PASSWORD_RESET_REQUESTED,
    companyId,
    targetUserId,
    details: {
      message: 'تم طلب إعادة تعيين كلمة المرور'
    },
    severity: USER_AUDIT_SEVERITY.WARNING,
    correlationId
  });
}

/**
 * Log suspicious activity
 */
async function logSuspiciousActivity(companyId, userId, activity, correlationId) {
  return createUserAuditEntry({
    action: USER_AUDIT_ACTIONS.SUSPICIOUS_ACTIVITY,
    companyId,
    userId,
    details: {
      activity,
      message: `نشاط مشبوه: ${activity.type}`
    },
    severity: USER_AUDIT_SEVERITY.CRITICAL,
    correlationId
  });
}

/**
 * Log unauthorized access attempt
 */
async function logUnauthorizedAccessAttempt(companyId, userId, resource, correlationId) {
  return createUserAuditEntry({
    action: USER_AUDIT_ACTIONS.UNAUTHORIZED_ACCESS_ATTEMPT,
    companyId,
    userId,
    details: {
      resource,
      message: `محاولة وصول غير مصرح به إلى: ${resource}`
    },
    severity: USER_AUDIT_SEVERITY.CRITICAL,
    correlationId
  });
}

/**
 * Get user audit logs
 */
async function getUserAuditLogs(companyId, options = {}) {
  const {
    startDate,
    endDate,
    action,
    targetUserId,
    userId,
    limit = 100,
    offset = 0
  } = options;

  // First check in-memory logs
  let filteredLogs = userAuditLog.filter(log => log.companyId === companyId);

  // Filter by date range
  if (startDate) {
    filteredLogs = filteredLogs.filter(log => new Date(log.timestamp) >= new Date(startDate));
  }
  if (endDate) {
    filteredLogs = filteredLogs.filter(log => new Date(log.timestamp) <= new Date(endDate));
  }

  // Filter by action
  if (action) {
    filteredLogs = filteredLogs.filter(log => log.action === action);
  }

  // Filter by target user
  if (targetUserId) {
    filteredLogs = filteredLogs.filter(log => log.targetUserId === targetUserId);
  }

  // Filter by performing user
  if (userId) {
    filteredLogs = filteredLogs.filter(log => log.userId === userId);
  }

  // Sort by timestamp descending
  filteredLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  // Apply pagination
  const paginatedLogs = filteredLogs.slice(offset, offset + limit);

  return {
    logs: paginatedLogs,
    total: filteredLogs.length
  };
}

/**
 * Get user audit statistics
 */
async function getUserAuditStats(companyId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const logs = userAuditLog.filter(log =>
    log.companyId === companyId &&
    new Date(log.timestamp) >= startDate
  );

  const stats = {
    totalActions: logs.length,
    usersCreated: logs.filter(l => l.action === USER_AUDIT_ACTIONS.USER_CREATED).length,
    usersUpdated: logs.filter(l => l.action === USER_AUDIT_ACTIONS.USER_UPDATED).length,
    usersDeleted: logs.filter(l => l.action === USER_AUDIT_ACTIONS.USER_DELETED).length,
    roleChanges: logs.filter(l => l.action === USER_AUDIT_ACTIONS.ROLE_CHANGED).length,
    passwordResets: logs.filter(l => l.action === USER_AUDIT_ACTIONS.PASSWORD_RESET_REQUESTED).length,
    suspiciousActivities: logs.filter(l => l.action === USER_AUDIT_ACTIONS.SUSPICIOUS_ACTIVITY).length,
    unauthorizedAccessAttempts: logs.filter(l => l.action === USER_AUDIT_ACTIONS.UNAUTHORIZED_ACCESS_ATTEMPT).length
  };

  return stats;
}

module.exports = {
  createUserAuditEntry,
  logUserCreated,
  logUserUpdated,
  logUserDeleted,
  logUserActivated,
  logUserDeactivated,
  logRoleChanged,
  logPasswordResetRequested,
  logSuspiciousActivity,
  logUnauthorizedAccessAttempt,
  getUserAuditLogs,
  getUserAuditStats,
  USER_AUDIT_ACTIONS,
  USER_AUDIT_SEVERITY
};
