const express = require("express");
const router = express.Router();
const taskController = require("../controller/taskController");
const businessGoalController = require("../controller/businessGoalController");
const taskIntegrationController = require("../controller/taskIntegrationController");
const verifyToken = require("../utils/verifyToken");
const { cacheMiddleware } = require("../middleware/performanceOptimization");

const MANAGE_GOALS_ROLES = ["SUPER_ADMIN", "COMPANY_ADMIN", "OWNER", "MANAGER"];

// Apply authentication middleware to all routes
router.use(verifyToken.authenticateToken);

// ==================== Templates Routes (MUST be before /:id) ====================
router.get("/templates", taskController.getTemplates);
router.post("/templates", taskController.createTemplate);
router.put("/templates/:id", taskController.updateTemplate);
router.delete("/templates/:id", taskController.deleteTemplate);

// ==================== Categories Routes (MUST be before /:id) ====================
router.get("/categories/list", taskController.getCategories);
router.post("/categories", taskController.createCategory);
router.put("/categories/:id", taskController.updateCategory);
router.delete("/categories/:id", taskController.deleteCategory);

// ==================== Integrations Routes (MUST be before /:id) ====================
router.get(
  "/integrations/credentials",
  verifyToken.requireRole(["SUPER_ADMIN", "COMPANY_ADMIN", "OWNER"]),
  taskIntegrationController.listCredentials,
);
router.post(
  "/integrations/credentials",
  verifyToken.requireRole(["SUPER_ADMIN", "COMPANY_ADMIN", "OWNER"]),
  taskIntegrationController.createCredential,
);
router.put(
  "/integrations/credentials/:credentialId",
  verifyToken.requireRole(["SUPER_ADMIN", "COMPANY_ADMIN", "OWNER"]),
  taskIntegrationController.updateCredential,
);
router.post(
  "/integrations/credentials/:credentialId/rotate",
  verifyToken.requireRole(["SUPER_ADMIN", "COMPANY_ADMIN", "OWNER"]),
  taskIntegrationController.rotateCredential,
);
router.delete(
  "/integrations/credentials/:credentialId",
  verifyToken.requireRole(["SUPER_ADMIN", "COMPANY_ADMIN", "OWNER"]),
  taskIntegrationController.revokeCredential,
);
router.get(
  "/integrations/openclaw-profiles",
  verifyToken.requireRole(["SUPER_ADMIN", "COMPANY_ADMIN", "OWNER"]),
  taskIntegrationController.listOpenClawProfiles,
);
router.post(
  "/integrations/openclaw-profiles",
  verifyToken.requireRole(["SUPER_ADMIN", "COMPANY_ADMIN", "OWNER"]),
  taskIntegrationController.createOpenClawProfile,
);
router.put(
  "/integrations/openclaw-profiles/:profileId",
  verifyToken.requireRole(["SUPER_ADMIN", "COMPANY_ADMIN", "OWNER"]),
  taskIntegrationController.updateOpenClawProfile,
);
router.delete(
  "/integrations/openclaw-profiles/:profileId",
  verifyToken.requireRole(["SUPER_ADMIN", "COMPANY_ADMIN", "OWNER"]),
  taskIntegrationController.deleteOpenClawProfile,
);
router.post(
  "/integrations/openclaw-profiles/:profileId/reveal",
  verifyToken.requireRole(["SUPER_ADMIN", "COMPANY_ADMIN", "OWNER"]),
  taskIntegrationController.revealOpenClawProfile,
);
router.get(
  "/integrations/webhooks",
  verifyToken.requireRole(["SUPER_ADMIN", "COMPANY_ADMIN", "OWNER"]),
  taskIntegrationController.listWebhooks,
);
router.post(
  "/integrations/webhooks",
  verifyToken.requireRole(["SUPER_ADMIN", "COMPANY_ADMIN", "OWNER"]),
  taskIntegrationController.createWebhook,
);
router.put(
  "/integrations/webhooks/:webhookId",
  verifyToken.requireRole(["SUPER_ADMIN", "COMPANY_ADMIN", "OWNER"]),
  taskIntegrationController.updateWebhook,
);
router.delete(
  "/integrations/webhooks/:webhookId",
  verifyToken.requireRole(["SUPER_ADMIN", "COMPANY_ADMIN", "OWNER"]),
  taskIntegrationController.deleteWebhook,
);
router.post(
  "/integrations/webhooks/:webhookId/test",
  verifyToken.requireRole(["SUPER_ADMIN", "COMPANY_ADMIN", "OWNER"]),
  taskIntegrationController.testWebhook,
);
router.post(
  "/integrations/webhooks/:webhookId/deliveries/:deliveryId/retry",
  verifyToken.requireRole(["SUPER_ADMIN", "COMPANY_ADMIN", "OWNER"]),
  taskIntegrationController.retryWebhookDelivery,
);
router.get(
  "/integrations/webhooks/:webhookId/deliveries",
  verifyToken.requireRole(["SUPER_ADMIN", "COMPANY_ADMIN", "OWNER"]),
  taskIntegrationController.listWebhookDeliveries,
);

// ==================== Goals Routes (MUST be before /:id) ====================
router.get("/goals/today", businessGoalController.getTodayGoals);
router.post("/goals/today/ensure", businessGoalController.ensureTodayGoals);
router.get("/goals/metrics", businessGoalController.getMetricsCatalog);
router.get(
  "/goals/stats",
  verifyToken.requireRole(MANAGE_GOALS_ROLES),
  businessGoalController.getGoalStats,
);
router.get("/goals", businessGoalController.getGoals);
router.get("/goals/:id", businessGoalController.getGoalById);
router.post(
  "/goals",
  verifyToken.requireRole(MANAGE_GOALS_ROLES),
  businessGoalController.createGoal,
);
router.put(
  "/goals/:id",
  verifyToken.requireRole(MANAGE_GOALS_ROLES),
  businessGoalController.updateGoal,
);
router.post("/goals/:id/progress", businessGoalController.updateGoalProgress);
router.delete(
  "/goals/:id",
  verifyToken.requireRole(MANAGE_GOALS_ROLES),
  businessGoalController.deleteGoal,
);

// ==================== Task Routes ====================
router.get("/", taskController.getAllTasks);
router.get("/my-tasks", taskController.getMyTasks);
router.get("/assigned-by-me", taskController.getTasksAssignedByMe);
router.get("/company-users", taskController.getCompanyUsers);
router.get("/time-entries", taskController.getCompanyTimeEntries);
router.get(
  "/dashboard-stats",
  cacheMiddleware(30000),
  taskController.getDashboardStats,
);
router.get("/kanban", taskController.getKanbanTasks);
router.get("/running-timer", taskController.getRunningTimer);
router.get("/company-active-timers", taskController.getCompanyActiveTimers);
router.get("/notifications", taskController.getNotifications);
router.post("/", taskController.createTask);
router.get("/:id", taskController.getTaskById);
router.get("/:id/details", taskController.getTaskDetails);
router.put("/:id", taskController.updateTask);
router.delete("/:id", taskController.deleteTask);
router.put("/:id/status", taskController.updateTaskStatus);
router.post("/:id/ask-execution", taskController.askTaskExecution);
router.put("/:id/order", taskController.updateTaskOrder);

// ==================== Subtasks Routes ====================
router.get("/:parentTaskId/subtasks", taskController.getSubtasks);
router.post("/:parentTaskId/subtasks", taskController.createSubtask);

// ==================== Comments Routes ====================
router.get("/:taskId/comments", taskController.getComments);
router.post("/:taskId/comments", taskController.addComment);
router.put("/comments/:commentId", taskController.updateComment);
router.delete("/comments/:commentId", taskController.deleteComment);

// ==================== Time Tracking Routes ====================
router.get("/:taskId/time-entries", taskController.getTimeEntries);
router.post("/:taskId/time-entries", taskController.addManualTimeEntry);
router.post("/:taskId/time-tracking/start", taskController.startTimeTracking);
router.put("/time-tracking/:entryId/stop", taskController.stopTimeTracking);

// ==================== Activity Log Routes ====================
router.get("/:taskId/activities", taskController.getTaskActivities);

// ==================== Watchers Routes ====================
router.get("/:taskId/watchers", taskController.getWatchers);
router.post("/:taskId/watchers", taskController.addWatcher);
router.delete("/:taskId/watchers/:watcherUserId", taskController.removeWatcher);

// ==================== Notifications Routes ====================
router.put(
  "/notifications/:notificationId/read",
  taskController.markNotificationAsRead,
);
router.put(
  "/notifications/read-all",
  taskController.markAllNotificationsAsRead,
);
router.post(
  "/notifications/:notificationId/resend-whatsapp",
  taskController.resendTaskNotificationWhatsApp,
);

// ==================== Attachments Routes ====================
router.get("/:taskId/attachments", taskController.getAttachments);
router.post("/:taskId/attachments", taskController.addAttachment);
router.delete("/attachments/:attachmentId", taskController.deleteAttachment);

// ==================== Checklists Routes ====================
router.get("/:taskId/checklists", taskController.getChecklists);
router.post("/:taskId/checklists", taskController.createChecklist);
router.delete("/checklists/:checklistId", taskController.deleteChecklist);
router.post("/checklists/:checklistId/items", taskController.addChecklistItem);
router.put("/checklists/items/:itemId", taskController.updateChecklistItem);
router.delete("/checklists/items/:itemId", taskController.deleteChecklistItem);

// ==================== Dependencies Routes ====================
router.get("/:taskId/dependencies", taskController.getDependencies);
router.post("/:taskId/dependencies", taskController.addDependency);
router.delete("/dependencies/:dependencyId", taskController.removeDependency);

module.exports = router;
