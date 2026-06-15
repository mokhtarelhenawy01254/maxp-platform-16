const express = require("express");
const router = express.Router();
const superAdminController = require("../controller/superAdminController");
const superAdminAiController = require("../controller/superAdminAiController");
const devTaskIntegrationController = require("../controller/devTaskIntegrationController");
const storePagesController = require("../controller/storePagesController");
const docsController = require("../controller/docsController");
const { getSharedPrismaClient } = require("../services/sharedDatabase");
const { TOOLS } = { TOOLS: {} };
const { t } = require("../services/i18n");
const { clearCache, clearAgentCache } = { clearCache: async () => {}, clearAgentCache: async () => {} };
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

// 📄 Documentation Files
router.get("/docs/:filename", docsController.getDocumentation);

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

// AI Provider Management
router.get(
  "/ai/config",
  checkPermission("canAccessSettings"),
  superAdminAiController.getGlobalAIConfig,
);
router.post(
  "/ai/config",
  checkPermission("canAccessSettings"),
  superAdminAiController.updateGlobalAIConfig,
);
router.get(
  "/ai/provider-priority",
  checkPermission("canAccessSettings"),
  superAdminAiController.getProviderPriority,
);
router.get(
  "/ai/provider-dashboard",
  checkPermission("canAccessSettings"),
  superAdminAiController.getProviderDashboard,
);
router.post(
  "/ai/provider-priority",
  checkPermission("canAccessSettings"),
  superAdminAiController.updateProviderPriority,
);
router.get(
  "/ai/keys",
  checkPermission("canAccessSettings"),
  superAdminAiController.getAllAIKeys,
);
router.post(
  "/ai/keys",
  checkPermission("canAccessSettings"),
  superAdminAiController.addNewAIKey,
);
router.post(
  "/ai/routing-preview",
  checkPermission("canAccessSettings"),
  superAdminAiController.previewAIRouting,
);
router.get(
  "/ai/provider-logs",
  checkPermission("canAccessSettings"),
  superAdminAiController.getProviderLogs,
);
router.delete(
  "/ai/preferred-key/:provider",
  checkPermission("canAccessSettings"),
  superAdminAiController.clearPreferredAIKey,
);
// Bulk operations MUST come BEFORE routes with :id to avoid matching conflicts
router.post(
  "/ai/keys/bulk-delete",
  checkPermission("canAccessSettings"),
  superAdminAiController.bulkDeleteAIKeys,
);
router.post(
  "/ai/keys/bulk-update-status",
  checkPermission("canAccessSettings"),
  superAdminAiController.bulkUpdateKeysActiveStatus,
);
// Individual key operations
router.get(
  "/ai/keys/:id/details",
  checkPermission("canAccessSettings"),
  superAdminAiController.getAIKeyDetails,
);
router.get(
  "/ai/keys/:id/logs",
  checkPermission("canAccessSettings"),
  superAdminAiController.getAIKeyProviderLogs,
);
router.post(
  "/ai/keys/:id/test",
  checkPermission("canAccessSettings"),
  superAdminAiController.testAIKey,
);
router.post(
  "/ai/keys/:id/test-chat",
  checkPermission("canAccessSettings"),
  superAdminAiController.testAIKeyChat,
);
router.post(
  "/ai/keys/:id/preferred",
  checkPermission("canAccessSettings"),
  superAdminAiController.setPreferredAIKey,
);
router.delete(
  "/ai/keys/:id",
  checkPermission("canAccessSettings"),
  superAdminAiController.deleteAIKey,
);
router.patch(
  "/ai/keys/:id/active-status",
  checkPermission("canAccessSettings"),
  superAdminAiController.updateKeyActiveStatus,
);
router.post(
  "/ai/keys/:id/active-model",
  checkPermission("canAccessSettings"),
  superAdminAiController.updateKeyActiveModel,
);
router.get(
  "/ai/ollama/models",
  checkPermission("canAccessSettings"),
  superAdminAiController.getOllamaModels,
);
router.get(
    "/ai/openrouter/models",
    checkPermission("canAccessSettings"),
    superAdminAiController.getOpenRouterModels,
);
router.post(
    "/ai/playground/chat",
    checkPermission("canAccessSettings"),
    superAdminAiController.playgroundChat,
);
router.get(
    "/ai/embedding/models",
    checkPermission("canAccessSettings"),
    superAdminAiController.getEmbeddingModels,
);
router.post(
    "/ai/embedding/test",
    checkPermission("canAccessSettings"),
    superAdminAiController.testEmbeddingKey,
);
router.get(
    "/ai/product-embeddings/status",
    checkPermission("canAccessSettings"),
    superAdminAiController.getProductEmbeddingStatus,
);
router.post(
    "/ai/product-embeddings/sync",
    checkPermission("canAccessSettings"),
    superAdminAiController.triggerProductEmbeddingSync,
);
router.get(
    "/ai/knowledge-embeddings/status",
    checkPermission("canAccessSettings"),
    superAdminAiController.getKnowledgeEmbeddingStatus,
);
router.post(
    "/ai/knowledge-embeddings/sync",
    checkPermission("canAccessSettings"),
    superAdminAiController.triggerKnowledgeEmbeddingSync,
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

// 🤖 Dynamic AI Agents Configuration
// Each AgentDefinition stores its own soul/rules/skills.
// All companies without custom config inherit from the matching AgentDefinition.

function getAllToolNames() {
  return Object.keys(TOOLS);
}

function buildSkillsList(enabledSkillNames) {
  const tools = TOOLS;
  return getAllToolNames().map(name => ({
    name,
    description: tools[name]?.description || '',
    params: tools[name]?.params || {},
    readOnly: tools[name]?.readOnly !== false,
    enabled: enabledSkillNames.includes(name),
  }));
}

// Seed CEO agent from legacy GlobalAiConfig if no agents exist yet
async function seedCeoAgentIfEmpty(prisma) {
  const count = await prisma.agentDefinition.count();
  if (count > 0) return;

  let legacyConfig = {};
  try {
    const row = await prisma.globalAiConfig.findFirst({ orderBy: { createdAt: 'asc' } });
    if (row?.settings) {
      const gs = parseJson(row.settings, {});
      legacyConfig = gs.agentConfig || {};
    }
  } catch { /* ignore */ }

  await prisma.agentDefinition.create({
    data: {
      name: 'CEO Agent',
      type: 'ceo',
      description: 'المساعد الذكي الرئيسي لإدارة الأعمال التجارية',
      icon: '🧠',
      isBuiltIn: true,
      settings: JSON.stringify({
        soul: legacyConfig.soul || '',
        rules: legacyConfig.rules || [],
        skills: legacyConfig.skills || ALL_TOOL_NAMES,
      }),
    },
  });
}

// GET /agents — list all agent definitions
router.get("/agents", async (req, res) => {
  try {
    const prisma = getSharedPrismaClient();
    await seedCeoAgentIfEmpty(prisma);
    const agents = await prisma.agentDefinition.findMany({ orderBy: { createdAt: 'asc' } });
    return res.json({
      success: true,
      agents: agents.map(a => ({
        id: a.id, name: a.name, type: a.type,
        description: a.description || '', icon: a.icon || '🤖',
        isBuiltIn: a.isBuiltIn,
      })),
    });
  } catch (error) {
    console.error('[SA-AGENTS] GET list error:', error.message);
    return res.status(500).json({ success: false, error: 'فشل تحميل قائمة الوكلاء' });
  }
});

// GET /agents/:id — get agent with expanded skills
router.get("/agents/:id", async (req, res) => {
  try {
    const prisma = getSharedPrismaClient();
    const agent = await prisma.agentDefinition.findUnique({ where: { id: req.params.id } });
    if (!agent) return res.status(404).json({ success: false, error: 'الوكيل غير موجود' });

    const settings = parseJson(agent.settings, {});
    const enabledNames = Array.isArray(settings.skills) && settings.skills.length > 0
      ? settings.skills : ALL_TOOL_NAMES;

    return res.json({
      success: true,
      agent: {
        id: agent.id, name: agent.name, type: agent.type,
        description: agent.description || '', icon: agent.icon || '🤖',
        isBuiltIn: agent.isBuiltIn,
        soul: settings.soul || '',
        rules: Array.isArray(settings.rules) ? settings.rules : [],
        skills: buildSkillsList(enabledNames),
      },
    });
  } catch (error) {
    console.error('[SA-AGENTS] GET one error:', error.message);
    return res.status(500).json({ success: false, error: 'فشل تحميل إعدادات الوكيل' });
  }
});

// POST /agents — create new agent
router.post("/agents", async (req, res) => {
  try {
    const prisma = getSharedPrismaClient();
    const { name, type, description, icon } = req.body || {};
    if (!name?.trim() || !type?.trim())
      return res.status(400).json({ success: false, error: 'الاسم والمعرف مطلوبان' });

    const existing = await prisma.agentDefinition.findUnique({ where: { type: type.trim() } });
    if (existing)
      return res.status(400).json({ success: false, error: 'هذا المعرف مستخدم بالفعل' });

    const agent = await prisma.agentDefinition.create({
      data: {
        name: name.trim(), type: type.trim(),
        description: description?.trim() || '',
        icon: icon?.trim() || '🤖',
        isBuiltIn: false,
        settings: JSON.stringify({ soul: '', rules: [], skills: ALL_TOOL_NAMES }),
      },
    });

    return res.status(201).json({
      success: true,
      agent: {
        id: agent.id, name: agent.name, type: agent.type,
        description: agent.description || '', icon: agent.icon || '🤖',
        isBuiltIn: agent.isBuiltIn,
      },
    });
  } catch (error) {
    console.error('[SA-AGENTS] POST error:', error.message);
    return res.status(500).json({ success: false, error: 'فشل إنشاء الوكيل' });
  }
});

// PUT /agents/:id — update soul/rules/skills
router.put("/agents/:id", async (req, res) => {
  try {
    const prisma = getSharedPrismaClient();
    const agent = await prisma.agentDefinition.findUnique({ where: { id: req.params.id } });
    if (!agent) return res.status(404).json({ success: false, error: 'الوكيل غير موجود' });

    const { soul, rules, enabledSkills } = req.body || {};
    const current = parseJson(agent.settings, {});
    const updated = {
      ...current,
      soul: soul?.trim() ?? current.soul ?? '',
      rules: Array.isArray(rules) ? rules.map(r => String(r).trim()).filter(Boolean) : (current.rules || []),
      skills: Array.isArray(enabledSkills)
        ? enabledSkills.filter(s => ALL_TOOL_NAMES.includes(s))
        : ALL_TOOL_NAMES,
    };

    await prisma.agentDefinition.update({
      where: { id: req.params.id },
      data: { settings: JSON.stringify(updated) },
    });

    clearAgentCache(agent.type);

    return res.json({ success: true, message: `تم حفظ إعدادات ${agent.name} ✅` });
  } catch (error) {
    console.error('[SA-AGENTS] PUT error:', error.message);
    return res.status(500).json({ success: false, error: 'فشل حفظ الإعدادات' });
  }
});

// DELETE /agents/:id — delete non-built-in agent
router.delete("/agents/:id", async (req, res) => {
  try {
    const prisma = getSharedPrismaClient();
    const agent = await prisma.agentDefinition.findUnique({ where: { id: req.params.id } });
    if (!agent) return res.status(404).json({ success: false, error: 'الوكيل غير موجود' });
    if (agent.isBuiltIn) return res.status(400).json({ success: false, error: 'لا يمكن حذف الوكلاء المدمجين' });

    await prisma.agentDefinition.delete({ where: { id: req.params.id } });
    clearAgentCache(agent.type);

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

module.exports = router;
