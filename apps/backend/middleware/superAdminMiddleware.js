const jwt = require('jsonwebtoken');
const {
  getSharedPrismaClientAsync,
} = require('../services/sharedDatabase');
const { getJwtSecret, isMissingAuthSecretError } = require('../utils/jwtSecret');

// const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues

const devSettingsService = require('../services/devSettingsService');

/**
 * 🔐 Helper to normalize role name for case-insensitive matching
 * MUST be defined FIRST before other functions use it
 */
const normalizeRole = (role) => {
  if (!role) return null;
  // Map common variations to standard names
  const roleMap = {
    'AGENT': 'Agent',
    'agent': 'Agent',
    'DEVELOPER': 'Developer',
    'developer': 'Developer',
    'TESTER': 'Tester',
    'tester': 'Tester',
    'PROJECT MANAGER': 'Project Manager',
    'project manager': 'Project Manager',
    'TEAM LEAD': 'Team Lead',
    'team lead': 'Team Lead',
  };
  return roleMap[role] || role;
};

// 🔐 Role hierarchy for privilege escalation prevention
const ROLE_HIERARCHY = {
  'SUPER_ADMIN': 100,
  'Project Manager': 80,
  'Team Lead': 60,
  'Developer': 40,
  'Tester': 40,
  'Agent': 20,
  'AGENT': 20  // 🔐 Support uppercase variant
};

/**
 * Get role level for hierarchy comparison
 */
const getRoleLevel = (role) => ROLE_HIERARCHY[normalizeRole(role)] || ROLE_HIERARCHY[role] || 0;

// Authenticate token middleware
const authenticateToken = async (req, res, next) => {
  try {
    console.log('🔐 [SUPER-ADMIN-MIDDLEWARE] authenticateToken called for:', req.method, req.path);
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      console.log('❌ [SUPER-ADMIN-MIDDLEWARE] No token provided');
      return res.status(401).json({
        success: false,
        message: 'رمز الوصول مطلوب'
      });
    }

    const decoded = jwt.verify(token, getJwtSecret());
    console.log('✅ [SUPER-ADMIN-MIDDLEWARE] Token decoded, userId:', decoded.userId);

    // Get user from database
    const prisma = await getSharedPrismaClientAsync();
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        userCompanies: true
      }
    });

    if (!user || !user.isActive) {
      console.log('❌ [SUPER-ADMIN-MIDDLEWARE] User not found or inactive');
      return res.status(401).json({
        success: false,
        message: 'رمز الوصول غير صالح'
      });
    }

    console.log('✅ [SUPER-ADMIN-MIDDLEWARE] User authenticated:', user.email, 'Role:', user.role);
    req.user = user;
    next();
  } catch (error) {
    console.error('❌ [SUPER-ADMIN-MIDDLEWARE] Token verification error:', error.message);
    if (isMissingAuthSecretError(error)) {
      return res.status(500).json({
        success: false,
        message: 'إعدادات المصادقة غير مكتملة',
        error: error.message
      });
    }

    return res.status(401).json({
      success: false,
      message: 'رمز الوصول غير صالح',
      error: error.message
    });
  }
};

// Super Admin access control middleware - Now with dynamic roles!
const requireSuperAdmin = async (req, res, next) => {
  try {
    console.log('👑 [SUPER-ADMIN-MIDDLEWARE] requireSuperAdmin called');
    if (!req.user) {
      console.log('❌ [SUPER-ADMIN-MIDDLEWARE] No user in request');
      return res.status(401).json({
        success: false,
        message: 'غير مصرح بالوصول - يجب تسجيل الدخول أولاً'
      });
    }

    // 🔧 FIX: Platform admins come from an explicit allowlist. Company roles
    // (even legacy names like "Team Lead"/"Developer") must never be treated
    // as platform admins.
    let systemRoles = ['SUPER_ADMIN'];

    try {
      const settings = await devSettingsService.getSettings();
      if (Array.isArray(settings.platformAdminRoles)) {
        systemRoles = ['SUPER_ADMIN', ...settings.platformAdminRoles];
      }
    } catch (settingsError) {
      console.warn('⚠️ [SUPER-ADMIN-MIDDLEWARE] Could not load platform admin roles, using defaults:', settingsError.message);
    }

    // Check if the user has a system role
    const hasSystemRole = systemRoles.includes(req.user.role);

    if (!hasSystemRole) {
      console.log(`❌ [SUPER-ADMIN-MIDDLEWARE] Access denied for role: ${req.user.role}`);
      return res.status(403).json({
        success: false,
        message: 'ليس لديك صلاحية الوصول للوحة تحكم إدارة النظام'
      });
    }

    // 🔧 FIX: Attach user permissions to request for later use
    try {
      const settings = await devSettingsService.getSettings();

      // 🔐 FIX: Try both original role and normalized role to find permissions
      const originalRole = req.user.role;
      const normalizedRole = normalizeRole(originalRole);

      const permissions = settings.permissions || {};
      let rolePermissions = permissions[originalRole] || permissions[normalizedRole];

      console.log(`🔍 [PERMISSION-LOOKUP] Looking for role: ${originalRole}, normalized: ${normalizedRole}`);
      console.log(`🔍 [PERMISSION-LOOKUP] Found permissions:`, rolePermissions ? 'YES' : 'NO');

      req.userPermissions = req.user.role === 'SUPER_ADMIN'
        ? { viewScope: 'all', canCreate: true, canEdit: true, canDelete: true, canComment: true, canAssign: true, canChangeStatus: true, canArchive: true, canViewReports: true, canManageProjects: true, canExport: true, canAccessSettings: true, canManageTaskSettings: true, canViewAll: true }
        : (rolePermissions || { viewScope: 'assigned_only' });
    } catch (e) {
      console.error('⚠️ Error loading permissions:', e.message);
      req.userPermissions = { viewScope: 'assigned_only' };
    }

    console.log(`✅ [SUPER-ADMIN-MIDDLEWARE] Access granted for role: ${req.user.role}, viewScope: ${req.userPermissions.viewScope}`);

    // 🛡️ CRITICAL: Auto-Tenant Isolation must never constrain super admin operations to a caller's accidental token company.
    // If a specific target company is provided in params or query, scope the context to that company.
    // Otherwise, bypass tenant isolation so platform-wide queries execute cleanly without tenant hijacking.
    const tenantContext = require('../services/tenantContext');
    const targetCompanyId = req.params.companyId || req.query.companyId;
    if (targetCompanyId) {
      return tenantContext.run(targetCompanyId, () => next());
    }
    return tenantContext.bypass(() => next());
  } catch (error) {
    console.error('❌ [SUPER-ADMIN-MIDDLEWARE] Authorization error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في التحقق من الصلاحيات'
    });
  }
};

/**
 * Middleware to check for specific permissions stored in DevSystemSettings
 * @param {string} permissionKey - e.g., 'canDelete', 'canManageProjects'
 */
const checkPermission = (permissionKey) => {
  return async (req, res, next) => {
    try {
      if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });

      // SUPER_ADMIN role always has all permissions
      if (req.user.role === 'SUPER_ADMIN') return next();

      const settings = await devSettingsService.getSettings();
      const rolePermissions = settings.permissions[req.user.role];

      if (!rolePermissions || !rolePermissions[permissionKey]) {
        console.log(`❌ [PERMISSION-DENIED] Role ${req.user.role} lacks ${permissionKey}`);
        return res.status(403).json({
          success: false,
          message: 'ليس لديك الصلاحية الكافية للقيام بهذا الإجراء'
        });
      }

      next();
    } catch (error) {
      console.error('❌ [PERMISSION-ERROR]', error);
      res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  };
};

/**
 * 🔐 NEW: Middleware to prevent privilege escalation
 * Prevents users from assigning roles higher than their own
 */
const preventPrivilegeEscalation = async (req, res, next) => {
  try {
    const { role: targetRole } = req.body;
    const currentUserRole = req.user?.role;

    if (!targetRole) return next(); // No role change requested

    // SUPER_ADMIN can assign any role
    if (currentUserRole === 'SUPER_ADMIN') return next();

    const currentLevel = getRoleLevel(currentUserRole);
    const targetLevel = getRoleLevel(targetRole);

    // Cannot assign a role equal to or higher than own role
    if (targetLevel >= currentLevel) {
      console.log(`🚫 [PRIVILEGE-ESCALATION] User ${req.user.email} (${currentUserRole}) tried to assign role ${targetRole}`);
      return res.status(403).json({
        success: false,
        message: 'لا يمكنك تعيين دور أعلى من أو مساوي لدورك الحالي'
      });
    }

    next();
  } catch (error) {
    console.error('❌ [PRIVILEGE-ESCALATION-ERROR]', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

/**
 * 🔐 NEW: Helper to get user's viewScope filter for tasks
 * Returns a Prisma where clause based on viewScope
 */
const getViewScopeFilter = async (req) => {
  try {
    // Check if user exists
    if (!req.user || !req.user.id) {
      console.warn('⚠️ [getViewScopeFilter] No user in request, returning no access filter');
      return { id: { in: [] } };
    }

    // 🔐 FIX: Normalize role name for permission lookup
    const userRole = normalizeRole(req.user?.role);
    const userId = req.user?.id;

    // Get permissions with normalized role
    let viewScope = 'assigned_only';
    try {
      const settings = await devSettingsService.getSettings();
      const rolePermissions = settings.permissions[userRole] || settings.permissions[req.user?.role];
      viewScope = rolePermissions?.viewScope || 'assigned_only';
      console.log(`🔒 [getViewScopeFilter] User: ${req.user?.email}, Role: ${req.user?.role} → Normalized: ${userRole}, viewScope: ${viewScope}`);
    } catch (e) {
      console.warn('⚠️ Could not load permissions for viewScope:', e.message);
    }

    // SUPER_ADMIN or viewScope 'all' = no filter
    if (req.user?.role === 'SUPER_ADMIN' || viewScope === 'all') {
      console.log(`🔓 [getViewScopeFilter] No filter applied (SUPER_ADMIN or viewScope=all)`);
      return {};
    }

    // Get user's DevTeamMember ID if exists
    let teamMemberId = null;
    try {
      const teamMember = await getSharedPrismaClient().devTeamMember.findFirst({
        where: { userId: userId }
      });
      teamMemberId = teamMember?.id;
      console.log(`👤 [getViewScopeFilter] TeamMember ID for user ${userId}: ${teamMemberId || 'NOT FOUND'}`);
    } catch (e) {
      console.warn('⚠️ Could not find team member for user:', userId, e.message);
    }

    if (viewScope === 'assigned_only') {
      // Only see tasks assigned to this user
      if (!teamMemberId) {
        console.log(`🚫 [getViewScopeFilter] No TeamMember found for user ${userId}, returning NO ACCESS filter`);
        // Return a filter that will match nothing - empty array in 'in' clause matches nothing
        return {
          id: { in: [] }  // Empty array = no matches
        };
      }
      console.log(`🔒 [getViewScopeFilter] Filtering by assigneeId: ${teamMemberId}`);
      return { assigneeId: teamMemberId };
    }

    if (viewScope === 'project') {
      // See tasks in same project(s) as user's assigned tasks
      if (!teamMemberId) {
        return { id: { in: [] } };  // No access
      }

      // Get projects where user has tasks
      const userProjects = await getSharedPrismaClient().devTask.findMany({
        where: { assigneeId: teamMemberId },
        select: { projectId: true }
      });
      // Get unique project IDs
      const projectIds = [...new Set(userProjects.map(t => t.projectId).filter(Boolean))];

      console.log(`🔒 [getViewScopeFilter] User has tasks in projects: ${projectIds.join(', ') || 'none'}`);
      return projectIds.length > 0 ? { projectId: { in: projectIds } } : { assigneeId: teamMemberId };
    }

    return {};
  } catch (error) {
    console.error('❌ [getViewScopeFilter] Unexpected error:', error);
    console.error('❌ [getViewScopeFilter] Error stack:', error.stack);
    // Return no access filter on error for security
    return { id: { in: [] } };
  }
};

/**
 * 📝 NEW: Audit log for permission changes
 */
const logPermissionChange = async (action, actorId, targetId, details) => {
  try {
    await getSharedPrismaClient().auditLog.create({
      data: {
        id: require('crypto').randomUUID(),
        action: action,
        actorId: actorId,
        targetId: targetId,
        details: JSON.stringify(details),
        timestamp: new Date()
      }
    }).catch(() => {
      // If AuditLog table doesn't exist, log to console
      console.log(`📝 [AUDIT-LOG] ${action} by ${actorId} on ${targetId}:`, details);
    });
  } catch (e) {
    console.log(`📝 [AUDIT-LOG] ${action} by ${actorId} on ${targetId}:`, details);
  }
};

module.exports = {
  authenticateToken,
  requireSuperAdmin,
  checkPermission,
  preventPrivilegeEscalation,
  getViewScopeFilter,
  logPermissionChange,
  getRoleLevel,
  normalizeRole,  // 🔐 Export for use in controllers
  ROLE_HIERARCHY
};

