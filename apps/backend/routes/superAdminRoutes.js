const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");
const superAdminController = require("../controller/superAdminController");
const devTaskIntegrationController = require("../controller/devTaskIntegrationController");
const superAdminExternalApiController = require("../controller/superAdminExternalApiController");
const storePagesController = require("../controller/storePagesController");
const superAdminCompanyOrdersController = require("../controller/superAdminCompanyOrdersController");
const { getSharedPrismaClient } = require("../services/sharedDatabase");
const aiServiceAdminClient = require("../services/aiServiceAdminClient");
const { TOOLS } = { TOOLS: {} };
const { t } = require("../services/i18n");
const {
  authenticateToken,
  requireSuperAdmin,
  checkPermission,
  preventPrivilegeEscalation,
} = require("../middleware/superAdminMiddleware");
const { addPublicCORS } = require("../middleware/companyMiddleware");
const { cacheMiddleware } = require("../middleware/performanceOptimization");

// 🔐 All super admin routes require authentication + system access role
router.use(addPublicCORS);
router.use(authenticateToken);
router.use(requireSuperAdmin);

// 📊 System Stats
router.get(
  "/key-stats",
  checkPermission("canViewReports"),
  superAdminController.getKeyUsageStats,
);
router.get(
  "/server-usage",
  checkPermission("canViewReports"),
  superAdminController.getServerDiskUsage,
);
router.post(
  "/image-stats/compress",
  checkPermission("canManageSettings"),
  superAdminController.triggerImageCompression,
);
router.get(
  "/image-stats/compress/status",
  checkPermission("canViewReports"),
  superAdminController.getImageCompressionStatus,
);
router.post(
  "/image-stats/delete-old-chat-images",
  checkPermission("canManageSettings"),
  superAdminController.deleteOldChatImages,
);
router.post(
  "/image-stats/delete-company-images",
  checkPermission("canManageSettings"),
  superAdminController.deleteCompanyImages,
);
router.get(
  "/image-stats/orphaned-stats",
  checkPermission("canViewReports"),
  superAdminController.getOrphanedFilesStats,
);
router.post(
  "/image-stats/cleanup-orphaned",
  checkPermission("canManageSettings"),
  superAdminController.performOrphanedCleanup,
);

// 👥 Super Admin Users Management - WITH privilege escalation prevention
router.get(
  "/users",
  checkPermission("canViewAll"),
  superAdminController.getSuperAdminUsers,
);
router.post(
  "/users",
  checkPermission("canCreate"),
  preventPrivilegeEscalation,
  superAdminController.createSuperAdminUser,
);
router.put(
  "/users/:id",
  checkPermission("canEdit"),
  preventPrivilegeEscalation,
  superAdminController.updateSuperAdminUser,
);
router.delete(
  "/users/:id",
  checkPermission("canDelete"),
  superAdminController.deleteSuperAdminUser,
);

// 📈 Dev Dashboard
router.get(
  "/dev/dashboard",
  checkPermission("canViewReports"),
  cacheMiddleware(30000),
  superAdminController.getDevDashboard,
);
router.get(
  "/dev/unified",
  checkPermission("canViewReports"),
  cacheMiddleware(30000),
  superAdminController.getDevUnified,
);

// 👤 Current User Permissions
router.get("/user/permissions", superAdminController.getCurrentUserPermissions);

// ⚙️ Dev System Settings
// GET: Allow all system users to read settings (needed for statuses/priorities in tasks)
// PUT: Only users with canManageTaskSettings can modify settings
router.get("/dev/settings", superAdminController.getDevSettings);
router.put(
  "/dev/settings",
  checkPermission("canManageTaskSettings"),
  superAdminController.updateDevSettings,
);

// 📁 Projects - Protected with viewReports permission
router.get(
  "/dev/projects",
  checkPermission("canViewReports"),
  superAdminController.getDevProjects,
);
router.get(
  "/dev/projects/:id",
  checkPermission("canViewReports"),
  superAdminController.getDevProjectById,
);

// 📋 Tasks - Protected with appropriate permissions (viewScope handled in controller)
router.get("/dev/tasks", superAdminController.getDevTasks); // viewScope applied in controller
router.get("/dev/tasks/kanban", superAdminController.getDevKanbanTasks); // viewScope applied in controller
router.get(
  "/dev/reports",
  checkPermission("canViewReports"),
  superAdminController.getDevReports,
);
router.post(
  "/dev/tasks",
  checkPermission("canCreate"),
  superAdminController.createDevTask,
);
router.post(
  "/dev/tasks/:id/duplicate",
  checkPermission("canCreate"),
  superAdminController.duplicateDevTask,
);
router.post(
  "/dev/tasks/:id/comments",
  checkPermission("canComment"),
  superAdminController.addDevTaskComment,
);
router.put(
  "/dev/tasks/:id",
  checkPermission("canEdit"),
  superAdminController.updateDevTask,
);
router.delete(
  "/dev/tasks/:id",
  checkPermission("canDelete"),
  superAdminController.deleteDevTask,
);
router.get("/dev/tasks/:id", superAdminController.getDevTaskById); // viewScope checked in controller

// 🔑 Dev Task Integrations Credentials
router.get(
  "/dev/task-integrations/credentials",
  checkPermission("canViewReports"),
  devTaskIntegrationController.listCredentials,
);
router.post(
  "/dev/task-integrations/credentials",
  checkPermission("canManageSettings"),
  devTaskIntegrationController.createCredential,
);
router.put(
  "/dev/task-integrations/credentials/:credentialId",
  checkPermission("canManageSettings"),
  devTaskIntegrationController.updateCredential,
);
router.post(
  "/dev/task-integrations/credentials/:credentialId/rotate",
  checkPermission("canManageSettings"),
  devTaskIntegrationController.rotateCredential,
);
router.delete(
  "/dev/task-integrations/credentials/:credentialId",
  checkPermission("canManageSettings"),
  devTaskIntegrationController.revokeCredential,
);

// 🔑 External Marketing API Credentials & Audit Logs
router.get(
  "/external-api/credentials",
  checkPermission("canViewReports"),
  superAdminExternalApiController.listCredentials,
);
router.post(
  "/external-api/credentials",
  checkPermission("canManageSettings"),
  superAdminExternalApiController.createCredential,
);
router.put(
  "/external-api/credentials/:credentialId",
  checkPermission("canManageSettings"),
  superAdminExternalApiController.updateCredential,
);
router.delete(
  "/external-api/credentials/:credentialId",
  checkPermission("canManageSettings"),
  superAdminExternalApiController.revokeCredential,
);
router.get(
  "/external-api/audit-logs",
  checkPermission("canViewReports"),
  superAdminExternalApiController.listAuditLogs,
);
router.get(
  "/external-api/companies",
  checkPermission("canViewReports"),
  superAdminExternalApiController.listTenantCompanies,
);

// 👨‍💻 Team Management - Protected
router.get("/dev/team", superAdminController.getDevTeam);
router.post(
  "/dev/team",
  checkPermission("canManageProjects"),
  superAdminController.createDevTeamMember,
);
router.put(
  "/dev/team/:id",
  checkPermission("canManageProjects"),
  superAdminController.updateDevTeamMember,
);
router.delete(
  "/dev/team/:id",
  checkPermission("canManageProjects"),
  superAdminController.deleteDevTeamMember,
);

// 🚀 Releases - Protected
router.get(
  "/dev/releases",
  checkPermission("canViewReports"),
  superAdminController.getDevReleases,
);
router.get(
  "/dev/releases/:id",
  checkPermission("canViewReports"),
  superAdminController.getDevReleaseById,
);

// Dev Tasks Interactive Features
router.post(
  "/dev/tasks/:taskId/checklists",
  superAdminController.createDevTaskChecklist,
);

const {
  uploadDevTaskFile,
  uploadDevTaskFiles,
} = require("../middleware/devTaskUpload");
const timeTrackingController = require("../controller/timeTrackingController");

// Dev Tasks Interactive Features
router.post(
  "/dev/tasks/:taskId/checklists",
  superAdminController.createDevTaskChecklist,
);
router.post(
  "/dev/tasks/checklists/:checklistId/items",
  superAdminController.addDevTaskChecklistItem,
);
router.patch(
  "/dev/tasks/checklist-items/:itemId",
  superAdminController.toggleDevTaskChecklistItem,
);
router.delete(
  "/dev/tasks/checklist-items/:itemId",
  superAdminController.deleteDevTaskChecklistItem,
);
router.post(
  "/dev/tasks/:taskId/time-logs",
  superAdminController.addDevTaskTimeLog,
);
router.delete(
  "/dev/tasks/time-logs/:logId",
  superAdminController.deleteDevTaskTimeLog,
);
router.patch(
  "/dev/tasks/time-logs/:logId",
  superAdminController.editDevTaskTimeLog,
);
router.post(
  "/dev/tasks/:taskId/timer/start",
  superAdminController.startDevTaskTimer,
);
router.post(
  "/dev/tasks/:taskId/timer/stop",
  superAdminController.stopDevTaskTimer,
);
router.post(
  "/dev/tasks/:taskId/timer/pause",
  superAdminController.pauseDevTaskTimer,
);
router.post(
  "/dev/tasks/:taskId/timer/resume",
  superAdminController.resumeDevTaskTimer,
);
router.get("/dev/timer/active", superAdminController.getActiveTimer);
router.get(
  "/dev/timer/all-active",
  checkPermission("canViewReports"),
  superAdminController.getAllActiveTimers,
);
router.get(
  "/dev/timer/total-working-time",
  superAdminController.getTotalWorkingTime,
);

// ⏱️ Timer Group Routes
router.post("/dev/timer/groups", superAdminController.createTimerGroup);
router.get("/dev/timer/groups", superAdminController.listTimerGroups);
router.delete("/dev/timer/groups/:id", superAdminController.deleteTimerGroup);
router.post("/dev/timer/groups/:id/tasks", superAdminController.addTasksToGroup);
router.delete("/dev/timer/groups/:id/tasks/:taskId", superAdminController.removeTaskFromGroup);
router.post("/dev/timer/groups/:id/timer/start", superAdminController.startTimerGroup);
router.post("/dev/timer/groups/:id/timer/stop", superAdminController.stopTimerGroup);

router.post(
  "/dev/tasks/:taskId/subtasks",
  superAdminController.createDevTaskSubtask,
);
router.post(
  "/dev/tasks/:taskId/attachments",
  uploadDevTaskFiles.array("files", 10),
  superAdminController.uploadDevTaskAttachments,
);
router.post(
  "/dev/tasks/:taskId/attachment",
  uploadDevTaskFile.single("file"),
  superAdminController.uploadDevTaskAttachment,
);

// ⏱️ Time Tracking Dashboard - Protected with viewReports permission
router.get(
  "/time-tracking/dashboard",
  checkPermission("canViewReports"),
  cacheMiddleware(30000),
  timeTrackingController.getDashboardStats,
);
router.get(
  "/time-tracking/live",
  checkPermission("canViewReports"),
  timeTrackingController.getLiveActivity,
);
router.get(
  "/time-tracking/logs",
  checkPermission("canViewReports"),
  timeTrackingController.getTimeLogs,
);
router.get(
  "/time-tracking/members",
  checkPermission("canViewReports"),
  timeTrackingController.getMemberPerformance,
);
router.get(
  "/time-tracking/members/:memberId",
  checkPermission("canViewReports"),
  timeTrackingController.getMemberDetail,
);
router.get(
  "/time-tracking/analytics",
  checkPermission("canViewReports"),
  timeTrackingController.getAnalytics,
);
router.get(
  "/time-tracking/export",
  checkPermission("canExport"),
  timeTrackingController.exportTimesheet,
);
router.delete(
  "/dev/tasks/attachments/:attachmentId",
  superAdminController.deleteDevTaskAttachment,
);
router.patch(
  "/dev/tasks/:taskId/status",
  checkPermission("canChangeStatus"),
  superAdminController.updateDevTaskStatus,
);

// Database Migration & Import Tool
const dbMigrationController = require("../controller/databaseMigrationController");
router.post(
  "/db-migration/test-connection",
  dbMigrationController.testConnection,
);
router.post("/db-migration/start", dbMigrationController.startMigration);
router.get("/db-migration/status/:jobId", dbMigrationController.getStatus);

// Gamification
router.get("/dev/leaderboard", superAdminController.getLeaderboard);
router.get("/リーダーボード", superAdminController.getLeaderboard);

// Escalation History
router.get(
  "/dev/escalations",
  checkPermission("canViewReports"),
  superAdminController.getEscalationHistory,
);

// 📄 Store Pages Management (Global)
router.get(
  "/store-pages",
  checkPermission("canViewAll"),
  storePagesController.getAllPagesSuperAdmin,
);

// GET /companies/quick-list — lightweight listing for dropdowns
router.get("/companies/quick-list", async (req, res) => {
  try {
    const prisma = getSharedPrismaClient();
    const companies = await prisma.company.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
      take: 500,
    });
    return res.json({ success: true, companies });
  } catch (error) {
    console.error('[SA] companies quick-list error:', error.message);
    return res.status(500).json({ success: false, error: 'فشل تحميل قائمة الشركات' });
  }
});

// 📦 Daily Company Orders & Platform Summary Monitor
router.get(
  "/company-orders/daily-summary",
  checkPermission("canViewReports"),
  superAdminCompanyOrdersController.getDailyOrdersSummary,
);

// 💓 Live Platform Operations Pulse (WhatsApp, Orders, Carts, AI, Trials)
router.get(
  "/dashboard/operations-pulse",
  checkPermission("canViewReports"),
  superAdminCompanyOrdersController.getOperationsPulse,
);

// 📊 Company Activity — active vs dormant vs dead
router.get("/company-activity", checkPermission("canViewReports"), async (req, res) => {
  try {
    const prisma = getSharedPrismaClient();
    const days = parseInt(req.query.days) || 30;
    const statusFilter = req.query.status || "all";

    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - days);

    const [companies, userLastLogin, recentOrders, recentConvs, recentAiLogs, waSessions] = await Promise.all([
      prisma.company.findMany({
        select: {
          id: true, name: true, email: true, phone: true, isActive: true, createdAt: true,
          _count: { select: { users: true, customers: true } },
          platformSubscription: { select: { status: true, plan: true, trialEndDate: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.user.groupBy({
        by: ["companyId"], _max: { lastLoginAt: true },
        where: { companyId: { not: null } },
      }),
      prisma.order.groupBy({
        by: ["companyId"], _count: { id: true },
        where: { createdAt: { gte: dateThreshold } },
      }),
      prisma.conversation.groupBy({
        by: ["companyId"], _count: { id: true },
        where: { lastMessageAt: { gte: dateThreshold } },
      }),
      prisma.aiProviderLog.groupBy({
        by: ["companyId"], _count: { id: true },
        where: { createdAt: { gte: dateThreshold }, companyId: { not: null } },
      }),
      prisma.whatsAppSession.findMany({
        select: { companyId: true },
        where: { status: "CONNECTED" },
      }),
    ]);

    const loginMap = {};
    for (const u of userLastLogin) { if (u.companyId) loginMap[u.companyId] = u._max.lastLoginAt; }
    const orderMap = {};
    for (const o of recentOrders) orderMap[o.companyId] = o._count.id;
    const convMap = {};
    for (const c of recentConvs) convMap[c.companyId] = c._count.id;
    const aiMap = {};
    for (const a of recentAiLogs) { if (a.companyId) aiMap[a.companyId] = a._count.id; }
    const waSet = new Set(waSessions.map(w => w.companyId));

    const now = new Date();
    const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = companies.map(c => {
      const lastLogin = loginMap[c.id] || null;
      const userCount = c._count.users;
      const customerCount = c._count.customers;
      const recentOrderCount = orderMap[c.id] || 0;
      const recentConvCount = convMap[c.id] || 0;
      const recentAiCount = aiMap[c.id] || 0;
      const hasWhatsApp = waSet.has(c.id);
      const subStatus = c.platformSubscription?.status || "NONE";
      const isActive = c.isActive;

      const dates = [lastLogin].filter(Boolean);
      const lastActivity = dates.length > 0
        ? dates.reduce((a, b) => a > b ? a : b)
        : null;

      const hasRecentLogin = lastLogin && lastLogin >= sevenDaysAgo;
      const hasRecentActivity = recentOrderCount > 0 || recentConvCount > 0 || recentAiCount > 0;
      const hasAnyUsers = userCount > 0;
      const hasAnyCustomers = customerCount > 0;

      let status;
      if (hasRecentLogin || hasRecentActivity || (hasWhatsApp && (hasAnyCustomers || hasAnyUsers))) {
        status = "active";
      } else if (hasAnyUsers || hasAnyCustomers || subStatus !== "NONE" || isActive) {
        status = "dormant";
      } else {
        status = "dead";
      }

      const daysSinceCreation = Math.floor((now - c.createdAt) / (24 * 60 * 60 * 1000));
      const daysSinceLastActivity = lastActivity
        ? Math.floor((now - lastActivity) / (24 * 60 * 60 * 1000))
        : daysSinceCreation;

      return {
        id: c.id, name: c.name, email: c.email, phone: c.phone,
        isActive: c.isActive, createdAt: c.createdAt, daysSinceCreation, status,
        metrics: {
          users: userCount, customers: customerCount,
          recentOrders: recentOrderCount, recentConversations: recentConvCount,
          recentAiInteractions: recentAiCount, hasWhatsApp,
        },
        lastLogin, lastActivity, daysSinceLastActivity,
        subscription: { status: subStatus, plan: c.platformSubscription?.plan || null },
      };
    });

    let filtered = result;
    if (statusFilter !== "all") filtered = result.filter(c => c.status === statusFilter);

    const total = result.length;
    const active = result.filter(c => c.status === "active").length;
    const dormant = result.filter(c => c.status === "dormant").length;
    const dead = result.filter(c => c.status === "dead").length;

    res.json({
      success: true,
      summary: { total, active, dormant, dead },
      companies: filtered,
    });
  } catch (error) {
    console.error("[SA] company-activity error:", error.message);
    res.status(500).json({ success: false, error: "فشل تحميل بيانات نشاط الشركات" });
  }
});

// 🤖 AI Agent Templates — now managed by ai-service (AgentTemplate table)
// 2026 refactor: agent_definitions table is deprecated; templates live in ai.agent_templates
// These routes proxy to the ai-service admin API.

// GET /agents — list all agent templates
router.get("/agents", async (req, res) => {
  try {
    const result = await aiServiceAdminClient.listAgentTemplates({ all: 'true' });
    return res.json({
      success: true,
      agents: Array.isArray(result) ? result.map(a => ({
        id: a.slug, name: a.name, type: a.slug,
        description: a.role || '', icon: '🤖',
        isBuiltIn: true,
      })) : [],
    });
  } catch (error) {
    console.error('[SA-AGENTS] GET list error:', error.message);
    return res.status(500).json({ success: false, error: 'فشل تحميل قائمة الوكلاء' });
  }
});

const AGENT_ICONS = {
  CEO: '👔', SUPPORT: '🎧', SALES: '🤝', SMART_SELLER: '🛒',
  MARKETING: '📢', ORDER: '📦', INVENTORY: '📊', COMPETITOR: '🔍',
  FACEBOOK_SALES_SUPPORT: '💬', SAS_SALES: '🛍️', SALES_REP: '🛒',
  ORDER_CONFIRMATION: '✅', VOICE_ORDER_CONFIRMATION: '📞', SHIPPING: '🚚', STOCK_TARGET_MONITOR: '📈',
  BROWSER_COPILOT: '🌐',
};

const AGENT_INDUSTRIES = {
  'browser-copilot-agent': ['مساعد المتصفح', 'تجارة إلكترونية', 'عمليات المتجر', 'دعم فني'],
  'support-agent': ['خدمة عملاء', 'تجارة إلكترونية', 'خدمات'],
  'sales-agent': ['مبيعات', 'تجارة إلكترونية', 'عقارات'],
  'smart-seller-agent': ['تجارة إلكترونية', 'تجزئة'],
  'marketing-agent': ['تسويق', 'إعلانات', 'علامات تجارية'],
  'order-agent': ['طلبات', 'تجارة إلكترونية', 'مطاعم'],
  'order-confirmation-agent': ['طلبات', 'تجارة إلكترونية', 'تأكيد الطلبات', 'واتساب', 'شحن'],
  'voice-order-confirmation-agent': ['مكالمات صوتية', 'طلبات', 'تجارة إلكترونية', 'تأكيد الطلبات', 'شحن'],
  'shipping-agent': ['شحن', 'لوجستيات', 'تتبع الشحنات', 'تذاكر الشحن', 'تجارة إلكترونية'],
  'stock-target-monitor-agent': ['مخزون', 'مبيعات', 'متابعة أهداف', 'تجزئة', 'تجارة إلكترونية'],
  'inventory-pricing-agent': ['مخزون', 'تجارة إلكترونية', 'تجزئة'],
  'manager-ceo': ['إدارة', 'ريادة أعمال'],
  'competitor-analysis': ['أبحاث سوق', 'تحليل تنافسي'],
  'facebook-sales-support-agent': ['مبيعات فيسبوك', 'خدمة عملاء', 'تجارة إلكترونية', 'شات ومحادثات'],
  'customer-ceo': ['خدمة عملاء', 'تجارة إلكترونية'],
  'sas-sales-agent': ['مبيعات', 'تجارة إلكترونية', 'فيس بوك'],
};

function getDiskAgentTemplates() {
  const agentsDir = path.resolve(__dirname, '../agents');
  if (!fs.existsSync(agentsDir)) return [];
  const list = [];
  try {
    const entries = fs.readdirSync(agentsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith('_')) continue;
      const manifestPath = path.join(agentsDir, entry.name, 'agent.json');
      if (!fs.existsSync(manifestPath)) continue;
      try {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        const soulPath = path.join(agentsDir, entry.name, 'SOUL.md');
        const soulText = fs.existsSync(soulPath) ? fs.readFileSync(soulPath, 'utf8') : '';
        list.push({
          slug: manifest.slug || entry.name,
          name: manifest.name || entry.name,
          role: manifest.role || 'AGENT',
          version: manifest.version || '1.0.0',
          allowed_tools: manifest.allowedTools || [],
          allowed_skills: manifest.allowedSkills || [],
          channels: manifest.channels || [],
          budget: manifest.budget || {},
          persona_meta: manifest.personaMeta || {},
          instructions_soul: soulText,
          is_active: manifest.isActive !== false,
          companies_count: 0,
        });
      } catch (manifestErr) {
        // ignore single parse error
      }
    }
  } catch (err) {
    console.warn('[SA-AGENTS] Could not read agentsDir:', err.message);
  }
  return list;
}

// GET /agents/marketplace — enriched listing for the template marketplace
router.get("/agents/marketplace", async (req, res) => {
  try {
    let result = [];
    try {
      result = await aiServiceAdminClient.listAgentTemplates({ all: 'true' });
    } catch (apiErr) {
      console.warn('[SA-AGENTS] aiService listAgentTemplates fallback to disk:', apiErr.message);
    }
    const dbTemplates = Array.isArray(result) ? result : [];
    const dbSlugs = new Set(dbTemplates.map(t => t.slug));

    // Merge any missing disk templates (like newly added voice or confirmation agents)
    const diskTemplates = getDiskAgentTemplates();
    const merged = [...dbTemplates];
    for (const dt of diskTemplates) {
      if (!dbSlugs.has(dt.slug)) {
        merged.push(dt);
      }
    }

    return res.json({
      success: true,
      templates: merged.map(a => ({
        slug: a.slug,
        name: a.name,
        role: a.role,
        version: a.version,
        icon: AGENT_ICONS[a.role] || (a.channels?.includes('voice') ? '📞' : '🤖'),
        description: a.role || '',
        personaMeta: a.persona_meta || {},
        soulPreview: a.instructions_soul?.split('\n').slice(0, 3).join('\n').substring(0, 200) || '',
        toolsCount: a.allowed_tools?.length || 0,
        skillsCount: a.allowed_skills?.length || 0,
        channels: a.channels || [],
        budget: a.budget || {},
        industries: AGENT_INDUSTRIES[a.slug] || ['تجارة إلكترونية'],
        isActive: a.is_active !== false,
        companiesCount: a.companies_count || 0,
      })),
    });
  } catch (error) {
    console.error('[SA-AGENTS] GET marketplace error:', error.message);
    return res.status(500).json({ success: false, error: 'فشل تحميل سوق القوالب' });
  }
});

// POST /agents/sync-templates — sync filesystem templates to ai-service and database
router.post("/agents/sync-templates", async (req, res) => {
  try {
    const diskTemplates = getDiskAgentTemplates();
    const synced = [];
    const errors = [];

    for (const dt of diskTemplates) {
      try {
        const agentFolder = path.resolve(__dirname, '../agents', dt.slug);
        const readMd = (name) => {
          if (!name) return '';
          const p = path.join(agentFolder, name);
          return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
        };

        const payload = {
          slug: dt.slug,
          role: dt.role,
          name: dt.name,
          version: dt.version,
          model_policy: dt.model_policy || { default: "deepseek-flash" },
          allowed_tools: dt.allowed_tools || [],
          allowed_skills: dt.allowed_skills || [],
          channels: dt.channels || [],
          guardrails: dt.guardrails || {},
          persona_meta: dt.persona_meta || {},
          instructions_soul: readMd('SOUL.md'),
          instructions_agents: readMd('AGENTS.md'),
          instructions_tools: readMd('TOOLS.md'),
          instructions_persona: readMd('PERSONA.md'),
          is_active: dt.is_active !== false,
        };

        try {
          await aiServiceAdminClient.createAgentTemplate(payload);
          synced.push(dt.slug);
        } catch (postErr) {
          try {
            await aiServiceAdminClient.updateAgentTemplate(dt.slug, payload);
            synced.push(dt.slug);
          } catch (putErr) {
            errors.push({ slug: dt.slug, error: putErr.message });
          }
        }
      } catch (err) {
        errors.push({ slug: dt.slug, error: err.message });
      }
    }

    return res.json({
      success: true,
      message: `تمت مزامنة ${synced.length} قالب بنجاح`,
      syncedCount: synced.length,
      syncedSlugs: synced,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('[SA-AGENTS] POST sync-templates error:', error.message);
    return res.status(500).json({ success: false, error: 'فشل مزامنة القوالب' });
  }
});

// GET /agents/available-models — list all enabled models for super admin
router.get("/agents/available-models", async (req, res) => {
  try {
    const prisma = getSharedPrismaClient();
    const models = await prisma.aiModelConfig.findMany({
      where: { isEnabled: true, aiKey: { isActive: true } },
      include: { aiKey: { select: { id: true, name: true, provider: true, keyType: true } } },
      orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
    });
    return res.json({ success: true, models: models.map(m => ({ id: m.id, modelName: m.modelName, provider: m.aiKey.provider, keyId: m.aiKey.id, keyName: m.aiKey.name, keyType: m.aiKey.keyType, priority: m.priority })), count: models.length });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /agents/tools — all available tools from tool registry
router.get("/agents/tools", async (req, res) => {
  try {
    const tools = await aiServiceAdminClient.listTools();
    const list = Array.isArray(tools) ? tools.map(t => ({ name: t.name, description: t.description, group: t.group })) : [];
    return res.json({ success: true, tools: list, count: list.length });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /agents/skills — all available skills
router.get("/agents/skills", async (req, res) => {
  try {
    const skills = await aiServiceAdminClient.listSkills();
    const list = Array.isArray(skills) ? skills.map(s => ({ id: s.id, displayName: s.displayName, description: s.description })) : [];
    return res.json({ success: true, skills: list, count: list.length });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /agents/apply-template — apply a template to a company
router.post("/agents/apply-template", async (req, res) => {
  try {
    const { templateSlug, companyId, model } = req.body || {};
    if (!templateSlug || !companyId)
      return res.status(400).json({ success: false, error: 'templateSlug و companyId مطلوبان' });
    const template = await aiServiceAdminClient.getAgentTemplate(templateSlug);
    if (!template)
      return res.status(404).json({ success: false, error: 'القالب غير موجود' });
    const result = await aiServiceAdminClient.spawnAgent({
      companyId, template_slug: templateSlug, role: template.role || 'CEO',
      name: template.name, model: model || undefined,
    });
    return res.json({ success: true, agent: result, message: 'تم تطبيق القالب بنجاح' });
  } catch (error) {
    console.error('[SA-AGENTS] apply-template error:', error.message);
    return res.status(500).json({ success: false, error: 'فشل تطبيق القالب' });
  }
});

// GET /agents/default-template — get the default agent template slug
router.get("/agents/default-template", async (req, res) => {
  try {
    const prisma = getSharedPrismaClient();
    const setting = await prisma.systemSettings.findFirst({
      where: { systemName: 'defaultAgentTemplate' },
    });
    const templateSlug = setting?.config ? JSON.parse(setting.config).templateSlug : 'support-agent';
    return res.json({ success: true, templateSlug });
  } catch (error) {
    console.error('[SA-AGENTS] GET default-template error:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /agents/default-template — set the default agent template slug
router.put("/agents/default-template", async (req, res) => {
  try {
    const { templateSlug } = req.body || {};
    if (!templateSlug) return res.status(400).json({ success: false, error: 'templateSlug مطلوب' });
    const prisma = getSharedPrismaClient();
    await prisma.systemSettings.upsert({
      where: { systemName: 'defaultAgentTemplate' },
      update: { config: JSON.stringify({ templateSlug }), updatedAt: new Date() },
      create: {
        id: `sys_defaultAgentTemplate`,
        systemName: 'defaultAgentTemplate',
        displayName: 'Default Agent Template',
        description: 'الوكيل الافتراضي الذي يتم إنشاؤه تلقائيًا للشركات الجديدة',
        category: 'ai',
        isEnabled: true,
        config: JSON.stringify({ templateSlug }),
      },
    });
    return res.json({ success: true, templateSlug, message: 'تم تعيين القالب الافتراضي بنجاح' });
  } catch (error) {
    console.error('[SA-AGENTS] PUT default-template error:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
});
// ── AI Agent Template Details ──────────────────────────────────────

// GET /agents/:slug/companies — list companies using this template
router.get("/agents/:slug/companies", async (req, res) => {
  try {
    const result = await aiServiceAdminClient.getTemplateCompanies(req.params.slug);
    return res.json({ success: true, ...result });
  } catch (error) {
    console.error('[SA-AGENTS] GET template companies error:', error.message);
    return res.status(500).json({ success: false, error: 'فشل تحميل الشركات المستخدمة للوكيل' });
  }
});

// PUT /agents/:slug/company/:agentId — update company-specific agent
router.put("/agents/:slug/company/:agentId", async (req, res) => {
  try {
    const { companyId } = req.body || {};
    if (!companyId) return res.status(400).json({ success: false, error: 'companyId مطلوب' });
    const result = await aiServiceAdminClient.updateAgent(req.params.agentId, companyId, req.body || {});
    return res.json({ success: true, agent: result, message: 'تم تحديث الوكيل بنجاح' });
  } catch (error) {
    console.error('[SA-AGENTS] PUT company agent error:', error.message);
    return res.status(500).json({ success: false, error: 'فشل تحديث الوكيل' });
  }
});

// DELETE /agents/:slug/company/:agentId — archive company-specific agent
router.delete("/agents/:slug/company/:agentId", async (req, res) => {
  try {
    const companyId = req.query.companyId;
    if (!companyId) return res.status(400).json({ success: false, error: 'companyId مطلوب' });
    await aiServiceAdminClient.archiveAgent(req.params.agentId, companyId);
    return res.json({ success: true, message: 'تم أرشفة الوكيل بنجاح' });
  } catch (error) {
    console.error('[SA-AGENTS] DELETE company agent error:', error.message);
    return res.status(500).json({ success: false, error: 'فشل أرشفة الوكيل' });
  }
});

// POST /agents/:slug/company/:agentId/reconcile — reset company agent to template defaults
router.post("/agents/:slug/company/:agentId/reconcile", async (req, res) => {
  try {
    const companyId = req.query.companyId || req.body?.companyId;
    if (!companyId) return res.status(400).json({ success: false, error: 'companyId مطلوب' });
    const result = await aiServiceAdminClient.reconcileCompanyAgent(req.params.agentId, companyId);
    return res.json({ success: true, agent: result, message: 'تم إعادة تعيين الوكيل إلى إعدادات القالب الافتراضية' });
  } catch (error) {
    console.error('[SA-AGENTS] POST reconcile agent error:', error.message);
    return res.status(500).json({ success: false, error: 'فشل إعادة تعيين الوكيل' });
  }
});

// GET /agents/:id — get agent template with expanded details
router.get("/agents/:id", async (req, res) => {
  try {
    let result = null;
    try {
      result = await aiServiceAdminClient.getAgentTemplate(req.params.id);
    } catch (e) {
      // fallback to disk if ai-service is unreachable or template not in DB
    }
    if (!result) {
      const diskList = getDiskAgentTemplates();
      const match = diskList.find(d => d.slug === req.params.id);
      if (match) {
        const agentFolder = path.resolve(__dirname, '../agents', match.slug);
        const readMd = (name) => {
          if (!name) return '';
          const p = path.join(agentFolder, name);
          return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
        };
        result = {
          ...match,
          instructions_soul: readMd('SOUL.md'),
          instructions_agents: readMd('AGENTS.md'),
          instructions_tools: readMd('TOOLS.md'),
          instructions_persona: readMd('PERSONA.md'),
        };
      }
    }
    if (!result) return res.status(404).json({ success: false, error: 'الوكيل غير موجود' });
    return res.json({ success: true, agent: result });
  } catch (error) {
    console.error('[SA-AGENTS] GET one error:', error.message);
    return res.status(500).json({ success: false, error: 'فشل تحميل إعدادات الوكيل' });
  }
});

// POST /agents — create new agent template (via ai-service)
router.post("/agents", async (req, res) => {
  try {
    const { name, type, slug, role: bodyRole, ...rest } = req.body || {};
    const templateSlug = slug || type;
    if (!name?.trim() || !templateSlug?.trim())
      return res.status(400).json({ success: false, error: 'الاسم والمعرف مطلوبان' });
    const result = await aiServiceAdminClient.createAgentTemplate({
      slug: templateSlug.trim(), name: name.trim(),
      role: (bodyRole || templateSlug).trim().toUpperCase(),
      ...rest,
    });
    return res.status(201).json({ success: true, agent: result });
  } catch (error) {
    console.error('[SA-AGENTS] POST error:', error.message);
    return res.status(500).json({ success: false, error: 'فشل إنشاء الوكيل' });
  }
});

// PUT /agents/:id — update agent template
router.put("/agents/:id", async (req, res) => {
  try {
    const result = await aiServiceAdminClient.updateAgentTemplate(req.params.id, req.body || {});
    return res.json({ success: true, message: 'تم حفظ الإعدادات ✅' });
  } catch (error) {
    console.error('[SA-AGENTS] PUT error:', error.message);
    return res.status(500).json({ success: false, error: 'فشل حفظ الإعدادات' });
  }
});

// PATCH /agents/bulk-status — bulk activate/deactivate templates
router.patch("/agents/bulk-status", async (req, res) => {
  try {
    const { slugs, isActive } = req.body || {};
    if (!Array.isArray(slugs) || slugs.length === 0)
      return res.status(400).json({ success: false, error: 'slugs array is required' });
    const result = await aiServiceAdminClient.bulkUpdateAgentTemplatesStatus(slugs, isActive);
    return res.json({ success: true, ...result });
  } catch (error) {
    console.error('[SA-AGENTS] bulk-status error:', error.message);
    return res.status(500).json({ success: false, error: 'فشل تحديث الحالة الجماعي' });
  }
});

// DELETE /agents/:id — delete agent template
router.delete("/agents/:id", async (req, res) => {
  try {
    await aiServiceAdminClient.deleteAgentTemplate(req.params.id);
    return res.json({ success: true, message: 'تم حذف الوكيل' });
  } catch (error) {
    console.error('[SA-AGENTS] DELETE error:', error.message);
    return res.status(500).json({ success: false, error: 'فشل حذف الوكيل' });
  }
});



// ── Dev Goals (OKRs) ──────────────────────────────────────────────
const devGoalService = require('../services/devGoalService');

// Goals CRUD
router.get('/dev/goals', async (req, res) => {
  try {
    const goals = await devGoalService.listGoals(req.query);
    return res.json({ success: true, data: goals });
  } catch (error) {
    console.error('[SA-GOALS] LIST error:', error.message);
    return res.status(500).json({ success: false, error: t('devGoals.list_failed') });
  }
});

router.get('/dev/goals/dashboard', async (req, res) => {
  try {
    const stats = await devGoalService.getDashboardStats(req.query);
    return res.json({ success: true, data: stats });
  } catch (error) {
    console.error('[SA-GOALS] DASHBOARD error:', error.message);
    return res.status(500).json({ success: false, error: t('devGoals.dashboard_failed') });
  }
});

router.get('/dev/goals/alignment-tree', async (req, res) => {
  try {
    const tree = await devGoalService.getAlignmentTree(req.query);
    return res.json({ success: true, data: tree });
  } catch (error) {
    console.error('[SA-GOALS] ALIGNMENT error:', error.message);
    return res.status(500).json({ success: false, error: t('devGoals.alignment_failed') });
  }
});

router.get('/dev/goals/:id', async (req, res) => {
  try {
    const goal = await devGoalService.getGoalById(req.params.id);
    if (!goal) return res.status(404).json({ success: false, error: t('devGoals.not_found') });
    return res.json({ success: true, data: goal });
  } catch (error) {
    console.error('[SA-GOALS] GET error:', error.message);
    return res.status(500).json({ success: false, error: t('devGoals.get_failed') });
  }
});

router.post('/dev/goals', async (req, res) => {
  try {
    const goal = await devGoalService.createGoal(req.body);
    return res.status(201).json({ success: true, data: goal });
  } catch (error) {
    console.error('[SA-GOALS] CREATE error:', error.message);
    return res.status(500).json({ success: false, error: t('devGoals.create_failed') });
  }
});

router.put('/dev/goals/:id', async (req, res) => {
  try {
    const goal = await devGoalService.updateGoal(req.params.id, req.body);
    return res.json({ success: true, data: goal });
  } catch (error) {
    console.error('[SA-GOALS] UPDATE error:', error.message);
    return res.status(500).json({ success: false, error: t('devGoals.update_failed') });
  }
});

router.delete('/dev/goals/:id', async (req, res) => {
  try {
    await devGoalService.deleteGoal(req.params.id);
    return res.json({ success: true, message: t('devGoals.delete_success') });
  } catch (error) {
    console.error('[SA-GOALS] DELETE error:', error.message);
    return res.status(500).json({ success: false, error: error.message || t('devGoals.delete_failed') });
  }
});

// Key Results
router.post('/dev/goals/:goalId/key-results', async (req, res) => {
  try {
    const kr = await devGoalService.addKeyResult(req.params.goalId, req.body);
    return res.status(201).json({ success: true, data: kr });
  } catch (error) {
    console.error('[SA-GOALS] ADD_KR error:', error.message);
    return res.status(500).json({ success: false, error: t('devGoals.keyResult_add_failed') });
  }
});

router.put('/dev/goals/key-results/:id', async (req, res) => {
  try {
    const kr = await devGoalService.updateKeyResult(req.params.id, req.body);
    return res.json({ success: true, data: kr });
  } catch (error) {
    console.error('[SA-GOALS] UPDATE_KR error:', error.message);
    return res.status(500).json({ success: false, error: t('devGoals.keyResult_update_failed') });
  }
});

router.delete('/dev/goals/key-results/:id', async (req, res) => {
  try {
    await devGoalService.deleteKeyResult(req.params.id);
    return res.json({ success: true, message: t('devGoals.keyResult_delete_success') });
  } catch (error) {
    console.error('[SA-GOALS] DELETE_KR error:', error.message);
    return res.status(500).json({ success: false, error: t('devGoals.keyResult_delete_failed') });
  }
});

// Progress
router.put('/dev/goals/:id/progress', async (req, res) => {
  try {
    const { progress, currentValue } = req.body;
    const goal = await devGoalService.updateProgress(req.params.id, progress, currentValue);
    return res.json({ success: true, data: goal });
  } catch (error) {
    console.error('[SA-GOALS] PROGRESS error:', error.message);
    return res.status(500).json({ success: false, error: t('devGoals.progress_update_failed') });
  }
});

router.post('/dev/goals/bulk-progress', async (req, res) => {
  try {
    const results = await devGoalService.bulkUpdateProgress(req.body.updates);
    return res.json({ success: true, data: results });
  } catch (error) {
    console.error('[SA-GOALS] BULK_PROGRESS error:', error.message);
    return res.status(500).json({ success: false, error: t('devGoals.bulk_update_failed') });
  }
});

// Check-ins
router.post('/dev/goals/check-ins', async (req, res) => {
  try {
    const checkIn = await devGoalService.addCheckIn(req.body);
    return res.status(201).json({ success: true, data: checkIn });
  } catch (error) {
    console.error('[SA-GOALS] CHECK_IN error:', error.message);
    return res.status(500).json({ success: false, error: t('devGoals.checkIn_add_failed') });
  }
});

router.get('/dev/goals/:goalId/check-ins', async (req, res) => {
  try {
    const checkIns = await devGoalService.getCheckIns(req.params.goalId, parseInt(req.query.limit) || 20);
    return res.json({ success: true, data: checkIns });
  } catch (error) {
    console.error('[SA-GOALS] GET_CHECKINS error:', error.message);
    return res.status(500).json({ success: false, error: t('devGoals.checkIns_list_failed') });
  }
});

// Link / Unlink Tasks
router.post('/dev/goals/:goalId/link-task', async (req, res) => {
  try {
    await devGoalService.linkTask(req.params.goalId, req.body.taskId);
    return res.json({ success: true, message: t('devGoals.link_task_success') });
  } catch (error) {
    console.error('[SA-GOALS] LINK_TASK error:', error.message);
    return res.status(500).json({ success: false, error: t('devGoals.link_task_failed') });
  }
});

router.post('/dev/goals/:goalId/bulk-link-tasks', async (req, res) => {
  try {
    const results = await devGoalService.bulkLinkTasks(req.params.goalId, req.body.taskIds);
    return res.json({ success: true, data: results });
  } catch (error) {
    console.error('[SA-GOALS] BULK_LINK error:', error.message);
    return res.status(500).json({ success: false, error: t('devGoals.bulk_link_failed') });
  }
});

router.post('/dev/goals/unlink-task', async (req, res) => {
  try {
    await devGoalService.unlinkTask(req.body.taskId);
    return res.json({ success: true, message: t('devGoals.unlink_task_success') });
  } catch (error) {
    console.error('[SA-GOALS] UNLINK_TASK error:', error.message);
    return res.status(500).json({ success: false, error: t('devGoals.unlink_task_failed') });
  }
});

router.get('/dev/evaluations', superAdminController.getEvaluations);
router.get('/dev/evaluations/member/:memberId', superAdminController.getMemberEvaluations);
router.post('/dev/evaluations/calculate', superAdminController.calculateEvaluation);
router.post('/dev/evaluations/compare', superAdminController.compareEvaluations);

// 🔍 Global Search - super admin only
router.get("/global-search", superAdminController.globalSearch);

// 📊 AI Company Consumption — aggregated AI usage per company
const { calculateCost, MODEL_COSTS_PER_M } = require("../config/modelCosts");

// AI Playground — proxied to Python ai-service
router.post("/ai/playground/chat", checkPermission("canAccessSettings"), async (req, res) => {
  try {
    const result = await aiServiceAdminClient.playgroundChat(req.body);
    return res.json({ success: result.success, data: result, message: result.error || undefined });
  } catch (error) {
    console.error("[SA] playground chat error:", error.message);
    return res.status(502).json({ success: false, error: error.message });
  }
});
router.get("/ai/playground/chat/stream", checkPermission("canAccessSettings"), async (req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  try {
    const result = await aiServiceAdminClient.playgroundChat({
      provider: req.query.provider,
      model: req.query.model,
      prompt: req.query.prompt,
      systemPrompt: req.query.systemPrompt,
      temperature: req.query.temperature,
      maxTokens: req.query.maxTokens,
    });
    if (!result.success) {
      res.write(`data: ${JSON.stringify({ error: result.error || "Playground request failed" })}\n\n`);
      return res.end();
    }
    const reply = result.reply || "";
    res.write(`data: ${JSON.stringify({ chunk: reply, reply })}\n\n`);
    res.write(`data: ${JSON.stringify({ done: true, latencyMs: result.latencyMs, provider: result.provider, model: result.model, finalChunk: "" })}\n\n`);
    res.end();
  } catch (error) {
    console.error("[SA] playground stream error:", error.message);
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
});

router.get("/ai/company-consumption", checkPermission("canViewReports"), async (req, res) => {
  try {
    const prisma = getSharedPrismaClient();
    const days = parseInt(req.query.days) || 30;

    const dateFilter = new Date();
    dateFilter.setDate(dateFilter.getDate() - days);

    const [providers, companiesList, totalLogs] = await Promise.all([
      prisma.aiProviderLog.groupBy({
        by: ["companyId", "provider", "model", "status"],
        _count: { id: true },
        _sum: { latencyMs: true },
        where: { createdAt: { gte: dateFilter } },
      }),
      prisma.company.findMany({
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      prisma.aiProviderLog.count({ where: { createdAt: { gte: dateFilter } } }),
    ]);

    const companyMap = {};
    for (const c of companiesList) {
      companyMap[c.id] = { id: c.id, name: c.name, totalRequests: 0, successCount: 0, failedCount: 0, totalTokens: 0, totalCost: 0, totalLatency: 0, models: {}, providers: {}, lastActivity: null };
    }

    // ponytail: cost estimated from modelCosts.js (not persisted)
    for (const row of providers) {
      const cid = row.companyId;
      if (!companyMap[cid]) continue;
      const c = companyMap[cid];
      const count = row._count.id;
      c.totalRequests += count;
      if (row.status === "success" || row.status === "ok") c.successCount += count;
      else c.failedCount += count;
      if (row._sum.latencyMs) c.totalLatency += row._sum.latencyMs;

      if (row.provider) c.providers[row.provider] = (c.providers[row.provider] || 0) + count;
      if (row.model) c.models[row.model] = (c.models[row.model] || 0) + count;
    }

    // Get token usage from metadata (JSON) — sample recent logs for token estimates
    const tokenSample = await prisma.aiProviderLog.findMany({
      where: { createdAt: { gte: dateFilter }, metadata: { not: null } },
      select: { companyId: true, model: true, metadata: true },
      take: 5000,
    });

    const tokenCounts = {};
    for (const s of tokenSample) {
      if (!s.metadata) continue;
      try {
        const meta = JSON.parse(s.metadata);
        const tokens = meta?.tokens;
        if (tokens) {
          const key = `${s.companyId}::${s.model || "unknown"}`;
          if (!tokenCounts[key]) tokenCounts[key] = { input: 0, output: 0, count: 0 };
          tokenCounts[key].input += tokens.prompt_tokens || tokens.input_tokens || tokens.input || 0;
          tokenCounts[key].output += tokens.completion_tokens || tokens.output_tokens || tokens.output || 0;
          tokenCounts[key].count++;
        }
      } catch { /* skip bad JSON */ }
    }

    for (const [key, counts] of Object.entries(tokenCounts)) {
      const [cid, model] = key.split("::");
      if (!companyMap[cid]) continue;
      companyMap[cid].totalTokens += counts.input + counts.output;
      const cost = calculateCost(model, counts.input, counts.output);
      companyMap[cid].totalCost += cost;
    }

    // Get last activity per company
    const lastActivity = await prisma.aiProviderLog.groupBy({
      by: ["companyId"],
      _max: { createdAt: true },
      where: { createdAt: { gte: dateFilter } },
    });
    for (const la of lastActivity) {
      if (companyMap[la.companyId]) {
        companyMap[la.companyId].lastActivity = la._max.createdAt;
      }
    }

    const companies = Object.values(companyMap)
      .filter(c => c.totalRequests > 0)
      .sort((a, b) => b.totalCost - a.totalCost);

    const totalCost = companies.reduce((s, c) => s + c.totalCost, 0);
    const totalRequests = companies.reduce((s, c) => s + c.totalRequests, 0);
    const activeCompanies = companies.length;
    const totalFailed = companies.reduce((s, c) => s + c.failedCount, 0);
    const errorRate = totalRequests > 0 ? (totalFailed / totalRequests * 100) : 0;

    // Model distribution across all companies
    const modelDist = {};
    for (const c of companies) {
      for (const [model, count] of Object.entries(c.models)) {
        modelDist[model] = (modelDist[model] || 0) + count;
      }
    }

    res.json({
      success: true,
      summary: {
        totalCost: Math.round(totalCost * 100) / 100,
        totalRequests,
        activeCompanies,
        failedCount: totalFailed,
        errorRate: Math.round(errorRate * 100) / 100,
        periodDays: days,
      },
      modelDistribution: Object.entries(modelDist)
        .map(([model, count]) => ({ model, count, pct: totalRequests > 0 ? Math.round(count / totalRequests * 10000) / 100 : 0 }))
        .sort((a, b) => b.count - a.count),
      companies,
    });
  } catch (error) {
    console.error("[SA] company-consumption error:", error.message);
    res.status(500).json({ success: false, error: "فشل تحميل بيانات الاستهلاك" });
  }
});

// 🧩 AI Embedding Status & Sync — proxied to ai-service admin API
router.get(
  "/ai/product-embeddings/status",
  checkPermission("canAccessSettings"),
  async (req, res) => {
    try {
      const result = await aiServiceAdminClient.getProductEmbeddingStatus(req.query.company_id);
      return res.json({ success: true, data: result });
    } catch (error) {
      console.error("[SA] product-embeddings status error:", error.message);
      return res.status(502).json({ success: false, error: error.message });
    }
  },
);
router.post(
  "/ai/product-embeddings/sync",
  checkPermission("canAccessSettings"),
  async (req, res) => {
    try {
      const result = await aiServiceAdminClient.triggerProductEmbeddingSync(req.body.company_id);
      return res.json({ success: true, data: result });
    } catch (error) {
      console.error("[SA] product-embeddings sync error:", error.message);
      return res.status(502).json({ success: false, error: error.message });
    }
  },
);
router.get(
  "/ai/knowledge-embeddings/status",
  checkPermission("canAccessSettings"),
  async (req, res) => {
    try {
      const result = await aiServiceAdminClient.getKnowledgeEmbeddingStatus(req.query.company_id);
      return res.json({ success: true, data: result });
    } catch (error) {
      console.error("[SA] knowledge-embeddings status error:", error.message);
      return res.status(502).json({ success: false, error: error.message });
    }
  },
);
router.post(
  "/ai/knowledge-embeddings/sync",
  checkPermission("canAccessSettings"),
  async (req, res) => {
    try {
      const result = await aiServiceAdminClient.triggerKnowledgeEmbeddingSync(req.body.company_id);
      return res.json({ success: true, data: result });
    } catch (error) {
      console.error("[SA] knowledge-embeddings sync error:", error.message);
      return res.status(502).json({ success: false, error: error.message });
    }
  },
);

// 🔍 Visual Search Logs
router.get(
  "/ai/visual-search-logs",
  checkPermission("canViewReports"),
  async (req, res) => {
    try {
      const prisma = getSharedPrismaClient();
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const pageSize = Math.min(Math.max(1, parseInt(req.query.pageSize) || 25), 100);
      const days = parseInt(req.query.days) || 30;
      const companyId = req.query.companyId || null;
      const status = req.query.status || null; // "success" or "failed"

      const dateFilter = new Date();
      dateFilter.setDate(dateFilter.getDate() - days);

      const where = {
        createdAt: { gte: dateFilter },
        intent: "visual_search",
        ...(companyId ? { companyId } : {}),
        ...(status === "success" ? { wasSuccessful: true } : {}),
        ...(status === "failed" ? { wasSuccessful: false } : {}),
      };

      const [total, logs, companies] = await Promise.all([
        prisma.searchAnalytic.count({ where }),
        prisma.searchAnalytic.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        prisma.company.findMany({
          select: { id: true, name: true },
          where: companyId ? { id: companyId } : undefined,
        }),
      ]);

      const companyMap = {};
      for (const c of companies) companyMap[c.id] = c.name;

      // Summary stats
      const [totalCount, successCount, failedCount] = await Promise.all([
        prisma.searchAnalytic.count({ where: { createdAt: { gte: dateFilter }, intent: "visual_search" } }),
        prisma.searchAnalytic.count({ where: { createdAt: { gte: dateFilter }, intent: "visual_search", wasSuccessful: true } }),
        prisma.searchAnalytic.count({ where: { createdAt: { gte: dateFilter }, intent: "visual_search", wasSuccessful: false } }),
      ]);

      return res.json({
        success: true,
        data: {
          logs: logs.map((l) => ({
            ...l,
            companyName: companyMap[l.companyId] || l.companyId,
            metadata: l.metadata ? JSON.parse(l.metadata) : null,
          })),
          summary: {
            total: totalCount,
            success: successCount,
            failed: failedCount,
            successRate: totalCount > 0 ? Math.round((successCount / totalCount) * 100) : 0,
          },
          pagination: {
            page,
            pageSize,
            total,
            totalPages: Math.ceil(total / pageSize),
          },
        },
      });
    } catch (error) {
      console.error("[SA] visual-search-logs error:", error.message);
      return res.status(500).json({ success: false, error: "فشل تحميل سجل البحث بالصورة" });
    }
  },
);

// 🆕 Support Settings (WhatsApp number)
router.get("/support-settings", async (req, res) => {
  try {
    const prisma = getSharedPrismaClient();
    let settings = await prisma.systemSettings.findUnique({
      where: { systemName: "support_whatsapp" },
    });
    if (!settings) {
      settings = await prisma.systemSettings.create({
        data: {
          systemName: "support_whatsapp",
          displayName: "Support WhatsApp",
          category: "support",
          config: JSON.stringify({ phone: "" }),
        },
      });
    }
    const config = typeof settings.config === "string" ? JSON.parse(settings.config) : settings.config;
    return res.json({ success: true, data: { phone: config.phone || "" } });
  } catch (error) {
    console.error("[SA] support-settings error:", error.message);
    return res.status(500).json({ success: false, error: "فشل تحميل إعدادات الدعم الفني" });
  }
});

router.put("/support-settings", async (req, res) => {
  try {
    const prisma = getSharedPrismaClient();
    const { phone } = req.body;
    await prisma.systemSettings.upsert({
      where: { systemName: "support_whatsapp" },
      update: { config: JSON.stringify({ phone: phone || "" }) },
      create: {
        systemName: "support_whatsapp",
        displayName: "Support WhatsApp",
        category: "support",
        config: JSON.stringify({ phone: phone || "" }),
      },
    });
    return res.json({ success: true, data: { phone: phone || "" } });
  } catch (error) {
    console.error("[SA] support-settings error:", error.message);
    return res.status(500).json({ success: false, error: "فشل حفظ إعدادات الدعم الفني" });
  }
});

// 🖼️ AI Image Generator Settings
const superAdminAIImageGeneratorController = require('../controller/superAdminAIImageGeneratorController');
router.get('/ai-image-generator-settings', superAdminAIImageGeneratorController.getConfig);
router.put('/ai-image-generator-settings', superAdminAIImageGeneratorController.updateConfig);
router.get('/ai-image-generator-settings/companies', superAdminAIImageGeneratorController.listCompanies);
router.put('/ai-image-generator-settings/companies/:companyId', superAdminAIImageGeneratorController.updateCompanyOverride);

// ⚡ AI Agent & Tool Incidents Telemetry (2026 Observability Standard)
const superAdminAiIncidentsController = require('../controller/superAdminAiIncidentsController');
router.get('/ai/incidents', checkPermission('canViewReports'), superAdminAiIncidentsController.getIncidents);
router.post('/ai/incidents/:id/retest', checkPermission('canManageSettings'), superAdminAiIncidentsController.retestIncident);
router.post('/ai/incidents/:id/notify-tenant', checkPermission('canManageSettings'), superAdminAiIncidentsController.notifyTenant);
router.post('/ai/incidents/:id/kill-switch', checkPermission('canManageSettings'), superAdminAiIncidentsController.toggleKillSwitch);

module.exports = router;

