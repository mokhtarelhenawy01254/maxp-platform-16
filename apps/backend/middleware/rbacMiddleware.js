/**
 * RBAC Middleware — Granular permission-based access control
 * 
 * Usage:
 *   router.get('/settings', requirePermission('settings.read'), handler)
 *   router.post('/users', requirePermission('users.manage'), handler)
 */

const permissionService = require('../services/permissionService');

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

  // Products
  'products.view': ['SUPER_ADMIN', 'COMPANY_ADMIN', 'TEAM_LEADER', 'MODERATOR', 'AFFILIATE'],
  'products.create': ['SUPER_ADMIN', 'COMPANY_ADMIN', 'TEAM_LEADER'],
  'products.edit': ['SUPER_ADMIN', 'COMPANY_ADMIN', 'TEAM_LEADER'],
  'products.delete': ['SUPER_ADMIN', 'COMPANY_ADMIN'],

  // Customers
  'customers.view': ['SUPER_ADMIN', 'COMPANY_ADMIN', 'TEAM_LEADER', 'MODERATOR'],
  'customers.view.all': ['SUPER_ADMIN', 'COMPANY_ADMIN'],
  'customers.view.team': ['TEAM_LEADER'],
  'customers.view.own': ['MODERATOR'],
  'customers.create': ['SUPER_ADMIN', 'COMPANY_ADMIN', 'TEAM_LEADER'],
  'customers.edit': ['SUPER_ADMIN', 'COMPANY_ADMIN', 'TEAM_LEADER'],
  'customers.delete': ['SUPER_ADMIN', 'COMPANY_ADMIN'],

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

  // WhatsApp
  'whatsapp.reply': ['SUPER_ADMIN', 'COMPANY_ADMIN', 'TEAM_LEADER', 'MODERATOR'],
  'whatsapp.broadcast': ['SUPER_ADMIN', 'COMPANY_ADMIN', 'TEAM_LEADER'],
  'whatsapp.groups.manage': ['SUPER_ADMIN', 'COMPANY_ADMIN', 'TEAM_LEADER'],
  'whatsapp.chats.manage': ['SUPER_ADMIN', 'COMPANY_ADMIN', 'TEAM_LEADER', 'MODERATOR'],
  'whatsapp.contacts.manage': ['SUPER_ADMIN', 'COMPANY_ADMIN', 'TEAM_LEADER'],
  'whatsapp.labels.manage': ['SUPER_ADMIN', 'COMPANY_ADMIN', 'TEAM_LEADER'],
  'whatsapp.analytics.view': ['SUPER_ADMIN', 'COMPANY_ADMIN', 'TEAM_LEADER', 'MODERATOR'],
  'whatsapp.quick-replies.manage': ['SUPER_ADMIN', 'COMPANY_ADMIN', 'TEAM_LEADER', 'MODERATOR'],

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
  'bulkOrders.import': ['SUPER_ADMIN', 'COMPANY_ADMIN', 'TEAM_LEADER'],
  'bulkOrders.execute': ['SUPER_ADMIN', 'COMPANY_ADMIN', 'TEAM_LEADER'],

  // Orders — main
  'orders.view': ['SUPER_ADMIN', 'COMPANY_ADMIN', 'TEAM_LEADER', 'MODERATOR'],
  'orders.create': ['SUPER_ADMIN', 'COMPANY_ADMIN', 'TEAM_LEADER', 'MODERATOR'],
  'orders.edit': ['SUPER_ADMIN', 'COMPANY_ADMIN', 'TEAM_LEADER'],
  'orders.delete': ['SUPER_ADMIN', 'COMPANY_ADMIN'],
  'orders.status.change': ['SUPER_ADMIN', 'COMPANY_ADMIN', 'TEAM_LEADER', 'MODERATOR'],
  'orders.assign': ['SUPER_ADMIN', 'COMPANY_ADMIN', 'TEAM_LEADER'],
  'orders.export': ['SUPER_ADMIN', 'COMPANY_ADMIN', 'TEAM_LEADER'],
  'orders.bulk.view': ['SUPER_ADMIN', 'COMPANY_ADMIN', 'TEAM_LEADER', 'MODERATOR'],
  'orders.bulk.create': ['SUPER_ADMIN', 'COMPANY_ADMIN', 'TEAM_LEADER'],
  'orders.bulk.edit': ['SUPER_ADMIN', 'COMPANY_ADMIN', 'TEAM_LEADER'],
  'orders.bulk.delete': ['SUPER_ADMIN', 'COMPANY_ADMIN'],
  'orders.bulk.export': ['SUPER_ADMIN', 'COMPANY_ADMIN', 'TEAM_LEADER'],
  'orders.invoice.print': ['SUPER_ADMIN', 'COMPANY_ADMIN', 'TEAM_LEADER', 'MODERATOR'],

  // Orders — Incomplete Orders section
  'orders.incomplete.view': ['SUPER_ADMIN', 'COMPANY_ADMIN', 'TEAM_LEADER', 'MODERATOR'],
  'orders.incomplete.edit': ['SUPER_ADMIN', 'COMPANY_ADMIN', 'TEAM_LEADER'],
  'orders.incomplete.delete': ['SUPER_ADMIN', 'COMPANY_ADMIN'],

  // Orders — Preparation Queue section
  'orders.preparation.view': ['SUPER_ADMIN', 'COMPANY_ADMIN', 'TEAM_LEADER', 'MODERATOR'],
  'orders.preparation.manage': ['SUPER_ADMIN', 'COMPANY_ADMIN', 'TEAM_LEADER'],

  // Orders — Agent Workspace / Confirmation Queue section
  'orders.workspace.view': ['SUPER_ADMIN', 'COMPANY_ADMIN', 'TEAM_LEADER', 'MODERATOR'],
  'orders.confirmation.view': ['SUPER_ADMIN', 'COMPANY_ADMIN', 'TEAM_LEADER', 'MODERATOR'],
  'orders.confirmation.manage': ['SUPER_ADMIN', 'COMPANY_ADMIN', 'TEAM_LEADER'],

  // Orders — Quick Status Change section
  'orders.quickstatus.view': ['SUPER_ADMIN', 'COMPANY_ADMIN', 'TEAM_LEADER', 'MODERATOR'],
  'orders.quickstatus.manage': ['SUPER_ADMIN', 'COMPANY_ADMIN', 'TEAM_LEADER'],

  // Orders — Turbo Records section
  'orders.turbo.view': ['SUPER_ADMIN', 'COMPANY_ADMIN', 'TEAM_LEADER', 'MODERATOR'],
  'orders.turbo.manage': ['SUPER_ADMIN', 'COMPANY_ADMIN', 'TEAM_LEADER'],

  // Orders — Bosta Records section
  'orders.bosta.view': ['SUPER_ADMIN', 'COMPANY_ADMIN', 'TEAM_LEADER', 'MODERATOR'],
  'orders.bosta.manage': ['SUPER_ADMIN', 'COMPANY_ADMIN', 'TEAM_LEADER'],

  // Orders — Stats section
  'orders.stats.view': ['SUPER_ADMIN', 'COMPANY_ADMIN', 'TEAM_LEADER', 'MODERATOR'],

  // Orders — Automation
  'orders.automation.view': ['SUPER_ADMIN', 'COMPANY_ADMIN', 'TEAM_LEADER', 'MODERATOR'],
  'orders.automation.manage': ['SUPER_ADMIN', 'COMPANY_ADMIN', 'TEAM_LEADER'],

  // Orders — Invoices section
  'orders.invoices.view': ['SUPER_ADMIN', 'COMPANY_ADMIN', 'TEAM_LEADER', 'MODERATOR'],
  'orders.invoices.manage': ['SUPER_ADMIN', 'COMPANY_ADMIN', 'TEAM_LEADER'],
  'orders.invoices.print': ['SUPER_ADMIN', 'COMPANY_ADMIN', 'TEAM_LEADER', 'MODERATOR'],

  // Orders — Manual Order
  'orders.manual.create': ['SUPER_ADMIN', 'COMPANY_ADMIN', 'TEAM_LEADER', 'MODERATOR'],

  // Orders — Status Summary Report
  'orders.status-summary.view': ['SUPER_ADMIN', 'COMPANY_ADMIN', 'TEAM_LEADER', 'MODERATOR'],

  // Orders — Returns
  'orders.returns.view': ['SUPER_ADMIN', 'COMPANY_ADMIN', 'TEAM_LEADER', 'MODERATOR'],
  'orders.returns.manage': ['SUPER_ADMIN', 'COMPANY_ADMIN', 'TEAM_LEADER'],
  'orders.returns.approve': ['SUPER_ADMIN', 'COMPANY_ADMIN', 'TEAM_LEADER'],

  // Orders — Shipping Companies
  'orders.shipping.view': ['SUPER_ADMIN', 'COMPANY_ADMIN', 'TEAM_LEADER', 'MODERATOR'],
  'orders.shipping.manage': ['SUPER_ADMIN', 'COMPANY_ADMIN', 'TEAM_LEADER'],

  // Orders — Turbo Tickets
  'orders.tickets.view': ['SUPER_ADMIN', 'COMPANY_ADMIN', 'TEAM_LEADER', 'MODERATOR'],
  'orders.tickets.create': ['SUPER_ADMIN', 'COMPANY_ADMIN', 'TEAM_LEADER', 'MODERATOR'],
  'orders.tickets.manage': ['SUPER_ADMIN', 'COMPANY_ADMIN', 'TEAM_LEADER'],

  // Orders — Bulk Search
  'orders.bulk-search.view': ['SUPER_ADMIN', 'COMPANY_ADMIN', 'TEAM_LEADER', 'MODERATOR'],

  // Orders — POS (Point of Sale)
  'orders.pos.view': ['SUPER_ADMIN', 'COMPANY_ADMIN', 'TEAM_LEADER', 'MODERATOR'],
  'orders.pos.manage': ['SUPER_ADMIN', 'COMPANY_ADMIN', 'TEAM_LEADER'],

  // Orders — Order Settings
  'orders.settings.view': ['SUPER_ADMIN', 'COMPANY_ADMIN', 'TEAM_LEADER', 'MODERATOR'],
  'orders.settings.manage': ['SUPER_ADMIN', 'COMPANY_ADMIN', 'TEAM_LEADER'],

  // Orders — Customer Blocks
  'orders.customer-blocks.view': ['SUPER_ADMIN', 'COMPANY_ADMIN', 'TEAM_LEADER', 'MODERATOR'],
  'orders.customer-blocks.manage': ['SUPER_ADMIN', 'COMPANY_ADMIN', 'TEAM_LEADER'],

  // Orders — Turbo Settings
  'orders.turbo-settings.view': ['SUPER_ADMIN', 'COMPANY_ADMIN', 'TEAM_LEADER', 'MODERATOR'],
  'orders.turbo-settings.manage': ['SUPER_ADMIN', 'COMPANY_ADMIN', 'TEAM_LEADER'],

  // Orders — Return Settings
  'orders.return-settings.view': ['SUPER_ADMIN', 'COMPANY_ADMIN', 'TEAM_LEADER', 'MODERATOR'],
  'orders.return-settings.manage': ['SUPER_ADMIN', 'COMPANY_ADMIN', 'TEAM_LEADER'],

  // Orders — Cancellation Reasons
  'orders.cancellation-reasons.view': ['SUPER_ADMIN', 'COMPANY_ADMIN', 'TEAM_LEADER', 'MODERATOR'],
  'orders.cancellation-reasons.manage': ['SUPER_ADMIN', 'COMPANY_ADMIN', 'TEAM_LEADER'],

  // Orders — Platform Integrations
  'orders.integrations.view': ['SUPER_ADMIN', 'COMPANY_ADMIN', 'TEAM_LEADER', 'MODERATOR'],
  'orders.integrations.manage': ['SUPER_ADMIN', 'COMPANY_ADMIN', 'TEAM_LEADER'],

  // Orders — Order Workflow
  'orders.workflow.view': ['SUPER_ADMIN', 'COMPANY_ADMIN', 'TEAM_LEADER', 'MODERATOR'],
  'orders.workflow.manage': ['SUPER_ADMIN', 'COMPANY_ADMIN', 'TEAM_LEADER'],

  // Orders — Product Reviews
  'orders.product-reviews.view': ['SUPER_ADMIN', 'COMPANY_ADMIN', 'TEAM_LEADER', 'MODERATOR'],

  // Orders — WhatsApp Order Notifications
  'orders.whatsapp-notifications.view': ['SUPER_ADMIN', 'COMPANY_ADMIN', 'TEAM_LEADER', 'MODERATOR'],
  'orders.whatsapp-notifications.manage': ['SUPER_ADMIN', 'COMPANY_ADMIN', 'TEAM_LEADER'],
};

const {
  ROUTING_MODES,
  getAssignmentRoutingUserIds,
  normalizeRoutingMode
} = require('../services/whatsappConversationRoutingService');

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
 * DB permissions are the source of truth (no hardcoded role fallback)
 */
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userRole = req.user.role;

    // SUPER_ADMIN always passes
    if (userRole === 'SUPER_ADMIN') return next();

    // AI_SERVICE: shared service-token identity (no DB user record).
    if (userRole === 'AI_SERVICE') return next();

    // Company OWNER has unrestricted access
    if (userRole === 'OWNER') return next();

    // DB-based permissions only (loaded by authenticateToken / requireCompanyAccess)
    const permissions = req.user.userPermissions;
    if (!permissions || !Array.isArray(permissions) || !permissions.includes(permission)) {
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
 * Middleware — requires a permission using DB-based roles
 * Loads user permissions from DB on each request (no cache)
 */
const requireDbPermission = (permissionKey) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (req.user.role === 'SUPER_ADMIN') return next();

    // AI_SERVICE: shared service-token identity (no DB user record).
    // Trust the service token; the secret itself is the gate.
    if (req.user.role === 'AI_SERVICE' || req.user.service === true) return next();

    // Company OWNER has unrestricted access to company resources
    if (req.user.role === 'OWNER') return next();

    const companyId = req.user.effectiveCompanyId || req.user.companyId;
    if (!companyId) {
      return res.status(403).json({ error: 'No company context' });
    }

    try {
      const permissions = await permissionService.getUserPermissions(req.user.id, companyId);
      if (!permissions.includes(permissionKey)) {
        return res.status(403).json({
          error: 'Insufficient permissions',
          code: 'INSUFFICIENT_PERMISSIONS',
          requiredPermission: permissionKey,
        });
      }
      next();
    } catch (error) {
      console.error('[RBAC] requireDbPermission error:', error.message);
      return res.status(500).json({ error: 'Permission check failed' });
    }
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

  const routingUserIds = getAssignmentRoutingUserIds(assignment);
  const teamMembers = assignment.team?.members || [];

  const hasNumberAccess =
    routingUserIds.includes(userId) ||
    teamMembers.some((member) => member.userId === userId);

  if (!hasNumberAccess) return false;

  if (
    normalizeRoutingMode(assignment.routingMode) === ROUTING_MODES.ROUND_ROBIN &&
    conversation.assignedUserId &&
    conversation.assignedUserId !== userId
  ) {
    return false;
  }

  return true;
};

module.exports = {
  requirePermission,
  requireDbPermission,
  requireMinRole,
  hasPermission,
  canViewConversation,
  normalizeRole,
  PERMISSIONS,
  ROLES_HIERARCHY
};
