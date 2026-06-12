/**
 * RBAC Middleware — Granular permission-based access control
 * 
 * Usage:
 *   router.get('/settings', requirePermission('settings.read'), handler)
 *   router.post('/users', requirePermission('users.manage'), handler)
 */

const PERMISSIONS = {
  // Dashboard & Analytics
  'dashboard.view': ['SUPER_ADMIN', 'COMPANY_ADMIN', 'TEAM_LEADER', 'MODERATOR'],
  'dashboard.view.all': ['SUPER_ADMIN', 'COMPANY_ADMIN'],
  'dashboard.view.team': ['TEAM_LEADER'],
  'dashboard.view.own': ['MODERATOR'],
  'analytics.view': ['SUPER_ADMIN', 'COMPANY_ADMIN', 'TEAM_LEADER'],
  'analytics.view.own': ['MODERATOR'],

  // Inbox / Conversations
  'inbox.view': ['SUPER_ADMIN', 'COMPANY_ADMIN', 'TEAM_LEADER', 'MODERATOR'],
  'inbox.view.all': ['SUPER_ADMIN', 'COMPANY_ADMIN'],
  'inbox.view.team': ['TEAM_LEADER'],
  'inbox.view.own': ['MODERATOR'],
  'inbox.send': ['SUPER_ADMIN', 'COMPANY_ADMIN', 'TEAM_LEADER', 'MODERATOR'],
  'inbox.transfer': ['SUPER_ADMIN', 'COMPANY_ADMIN', 'TEAM_LEADER'],
  'inbox.close': ['SUPER_ADMIN', 'COMPANY_ADMIN', 'TEAM_LEADER', 'MODERATOR'],
  'inbox.archive': ['SUPER_ADMIN', 'COMPANY_ADMIN', 'TEAM_LEADER', 'MODERATOR'],

  // Notes & Tags
  'notes.create': ['SUPER_ADMIN', 'COMPANY_ADMIN', 'TEAM_LEADER', 'MODERATOR'],
  'notes.view': ['SUPER_ADMIN', 'COMPANY_ADMIN', 'TEAM_LEADER', 'MODERATOR'],
  'notes.view.all': ['SUPER_ADMIN', 'COMPANY_ADMIN', 'TEAM_LEADER'],
  'tags.manage': ['SUPER_ADMIN', 'COMPANY_ADMIN', 'TEAM_LEADER', 'MODERATOR'],

  // Customers
  'customers.view': ['SUPER_ADMIN', 'COMPANY_ADMIN', 'TEAM_LEADER', 'MODERATOR'],
  'customers.view.all': ['SUPER_ADMIN', 'COMPANY_ADMIN'],
  'customers.view.team': ['TEAM_LEADER'],
  'customers.view.own': ['MODERATOR'],

  // Settings
  'settings.read': ['SUPER_ADMIN', 'COMPANY_ADMIN', 'TEAM_LEADER'],
  'settings.manage': ['SUPER_ADMIN', 'COMPANY_ADMIN'],
  'settings.whatsapp.manage': ['SUPER_ADMIN', 'COMPANY_ADMIN'],
  'settings.roles.manage': ['SUPER_ADMIN', 'COMPANY_ADMIN'],
  'settings.moderators.manage': ['SUPER_ADMIN', 'COMPANY_ADMIN'],
  'settings.notifications.manage': ['SUPER_ADMIN', 'COMPANY_ADMIN', 'TEAM_LEADER'],
  'settings.chat.manage': ['SUPER_ADMIN', 'COMPANY_ADMIN'],

  // Users & Teams
  'users.manage': ['SUPER_ADMIN', 'COMPANY_ADMIN'],
  'users.view': ['SUPER_ADMIN', 'COMPANY_ADMIN', 'TEAM_LEADER'],
  'teams.manage': ['SUPER_ADMIN', 'COMPANY_ADMIN'],
  'teams.view': ['SUPER_ADMIN', 'COMPANY_ADMIN', 'TEAM_LEADER'],

  // Number Assignments
  'numbers.manage': ['SUPER_ADMIN', 'COMPANY_ADMIN'],
  'numbers.view': ['SUPER_ADMIN', 'COMPANY_ADMIN', 'TEAM_LEADER'],
  'numbers.assign': ['SUPER_ADMIN', 'COMPANY_ADMIN'],

  // Notifications
  'notifications.view': ['SUPER_ADMIN', 'COMPANY_ADMIN', 'TEAM_LEADER', 'MODERATOR'],
  'notifications.manage': ['SUPER_ADMIN', 'COMPANY_ADMIN', 'TEAM_LEADER'],

  // Reports
  'reports.view': ['SUPER_ADMIN', 'COMPANY_ADMIN', 'TEAM_LEADER'],
  'reports.view.own': ['MODERATOR'],
  'reports.view.team': ['TEAM_LEADER'],
  'reports.view.all': ['SUPER_ADMIN', 'COMPANY_ADMIN'],

  // Bulk Orders
  'bulkOrders.view': ['SUPER_ADMIN', 'COMPANY_ADMIN', 'TEAM_LEADER', 'MODERATOR'],
  'bulkOrders.create': ['SUPER_ADMIN', 'COMPANY_ADMIN', 'TEAM_LEADER'],
  'bulkOrders.edit': ['SUPER_ADMIN', 'COMPANY_ADMIN', 'TEAM_LEADER'],
  'bulkOrders.delete': ['SUPER_ADMIN', 'COMPANY_ADMIN'],
  'bulkOrders.export': ['SUPER_ADMIN', 'COMPANY_ADMIN', 'TEAM_LEADER'],
};


const ROLES_HIERARCHY = {
  SUPER_ADMIN: Infinity,
  COMPANY_ADMIN: 100,
  TEAM_LEADER: 50,
  MODERATOR: 10,
};

/**
 * Normalize legacy roles to new RBAC role names
 */
const normalizeRole = (role) => {
  const normalizedInput =
    typeof role === 'string' ? role.trim().toUpperCase() : role;
  const ROLE_MAP = {
    AGENT: 'MODERATOR',
    MODERATOR: 'MODERATOR',
    EMPLOYEE: 'MODERATOR',
    MANAGER: 'TEAM_LEADER',
    TEAM_LEADER: 'TEAM_LEADER',
    OWNER: 'COMPANY_ADMIN',
    ADMIN: 'COMPANY_ADMIN',
    COMPANY_ADMIN: 'COMPANY_ADMIN',
    SUPER_ADMIN: 'SUPER_ADMIN',
  };
  return ROLE_MAP[normalizedInput] || normalizedInput || role;
};

/**
 * Check if a role has a specific permission
 */
const hasPermission = (role, permission) => {
  const normalizedRole = normalizeRole(role);
  const allowedRoles = PERMISSIONS[permission];
  if (!allowedRoles) return false;
  return allowedRoles.includes(normalizedRole);
};

/**
 * Middleware factory — requires a specific permission
 */
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userRole = req.user.role;

    if (!hasPermission(userRole, permission)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
        requiredPermission: permission,
        currentRole: userRole
      });
    }

    next();
  };
};

/**
 * Middleware factory — requires a minimum role level
 */
const requireMinRole = (minRole) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userLevel = ROLES_HIERARCHY[normalizeRole(req.user.role)] || 0;
    const requiredLevel = ROLES_HIERARCHY[normalizeRole(minRole)] || 0;

    if (userLevel < requiredLevel) {
      return res.status(403).json({
        error: 'Insufficient role level',
        code: 'INSUFFICIENT_ROLE',
        required: minRole,
        current: req.user.role
      });
    }

    next();
  };
};

/**
 * Check if user can view a specific conversation based on assignment
 */
const canViewConversation = async (prisma, userId, companyId, conversationId) => {
  const userRole = normalizeRole((await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true }
  }))?.role);

  if (
    userRole === 'SUPER_ADMIN' ||
    userRole === 'COMPANY_ADMIN' ||
    userRole === 'TEAM_LEADER'
  ) {
    return true;
  }

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { assignedUserId: true, metadata: true }
  });

  if (!conversation) return false;
  if (conversation.assignedUserId === userId) return true;

  let sessionId = null;
  try {
    const meta = JSON.parse(conversation.metadata || '{}');
    sessionId = meta.sessionId || meta.whatsappSessionId;
  } catch (e) { /* ignore */ }

  if (!sessionId) return false;

  const assignment = await prisma.whatsAppNumberAssignment.findFirst({
    where: {
      sessionId,
      companyId,
      isActive: true
    },
    include: {
      team: {
        select: {
          members: {
            where: { isActive: true },
            select: { userId: true }
          }
        }
      }
    }
  });

  if (!assignment) return false;

  const teamMembers = assignment.team?.members || [];

  const hasNumberAccess =
    teamMembers.some((member) => member.userId === userId);

  if (!hasNumberAccess) return false;

  return true;
};

module.exports = {
  requirePermission,
  requireMinRole,
  hasPermission,
  canViewConversation,
  normalizeRole,
  PERMISSIONS,
  ROLES_HIERARCHY
};
