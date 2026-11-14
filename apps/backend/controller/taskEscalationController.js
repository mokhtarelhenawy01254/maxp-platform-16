const taskEscalationService = require('../services/taskEscalationService');

function getCompanyIdFromToken(req) {
  return req.user?.companyId || null;
}

function getActorUserId(req) {
  return req.user?.userId || req.user?.id || null;
}

const taskEscalationController = {
  /**
   * GET /api/v1/tasks/escalation/settings
   */
  getSettings: async (req, res) => {
    try {
      const companyId = getCompanyIdFromToken(req);
      if (!companyId) {
        return res.status(403).json({
          success: false,
          message: 'معرف الشركة مفقود في التوكن',
        });
      }

      const data = await taskEscalationService.getEscalationSettings(companyId);
      return res.json({
        success: true,
        data,
      });
    } catch (error) {
      console.error('[taskEscalationController.getSettings] Error:', error);
      return res.status(500).json({
        success: false,
        message: 'فشل جلب إعدادات تصعيد المهام',
        error: error.message,
      });
    }
  },

  /**
   * PUT /api/v1/tasks/escalation/settings
   */
  updateSettings: async (req, res) => {
    try {
      const companyId = getCompanyIdFromToken(req);
      if (!companyId) {
        return res.status(403).json({
          success: false,
          message: 'معرف الشركة مفقود في التوكن',
        });
      }

      const data = await taskEscalationService.updateEscalationSettings(
        companyId,
        req.body,
        getActorUserId(req)
      );

      return res.json({
        success: true,
        message: 'تم حفظ إعدادات تصعيد المهام بنجاح',
        data,
      });
    } catch (error) {
      if (error.statusCode === 400) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }
      console.error('[taskEscalationController.updateSettings] Error:', error);
      return res.status(500).json({
        success: false,
        message: 'فشل تحديث إعدادات تصعيد المهام',
        error: error.message,
      });
    }
  },

  /**
   * POST /api/v1/tasks/:id/snooze
   */
  snoozeTask: async (req, res) => {
    try {
      const companyId = getCompanyIdFromToken(req);
      if (!companyId) {
        return res.status(403).json({
          success: false,
          message: 'معرف الشركة مفقود في التوكن',
        });
      }

      const taskId = req.params.id;
      const { days, snoozedUntil, reason } = req.body || {};

      const data = await taskEscalationService.snoozeTask({
        companyId,
        taskId,
        userId: getActorUserId(req),
        days,
        snoozedUntil,
        reason,
      });

      return res.json({
        success: true,
        message: 'تم تأجيل تصعيد المهمة بنجاح',
        data,
      });
    } catch (error) {
      if (error.statusCode === 400 || error.statusCode === 404) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      }
      console.error('[taskEscalationController.snoozeTask] Error:', error);
      return res.status(500).json({
        success: false,
        message: 'فشل تأجيل تصعيد المهمة',
        error: error.message,
      });
    }
  },

  /**
   * GET /api/v1/tasks/escalation/attention
   */
  getAttentionTasks: async (req, res) => {
    try {
      const companyId = getCompanyIdFromToken(req);
      if (!companyId) {
        return res.status(403).json({
          success: false,
          message: 'معرف الشركة مفقود في التوكن',
        });
      }

      const summary = await taskEscalationService.getAttentionSummary(companyId);
      return res.json({
        success: true,
        count: summary.count,
        top5: summary.top5,
        data: summary,
      });
    } catch (error) {
      console.error('[taskEscalationController.getAttentionTasks] Error:', error);
      return res.status(500).json({
        success: false,
        message: 'فشل جلب قائمة المهام التي تحتاج تدخلاً',
        error: error.message,
      });
    }
  },

  /**
   * GET /api/v1/tasks/escalation/dead-tasks
   */
  getDeadTasksReport: async (req, res) => {
    try {
      const companyId = getCompanyIdFromToken(req);
      if (!companyId) {
        return res.status(403).json({
          success: false,
          message: 'معرف الشركة مفقود في التوكن',
        });
      }

      let windowDays = 7;
      if (req.query?.windowDays !== undefined && req.query?.windowDays !== null && req.query?.windowDays !== '') {
        const parsed = Number(req.query.windowDays);
        if (Number.isFinite(parsed) && parsed > 0) {
          windowDays = Math.min(Math.floor(parsed), 90);
        }
      }

      const data = await taskEscalationService.buildDeadTasksReport(companyId, { windowDays });
      return res.json({
        success: true,
        data,
      });
    } catch (error) {
      console.error('[taskEscalationController.getDeadTasksReport] Error:', error);
      return res.status(500).json({
        success: false,
        message: 'فشل جلب تقرير المهام الميتة',
        error: error.message,
      });
    }
  },
};

module.exports = taskEscalationController;
