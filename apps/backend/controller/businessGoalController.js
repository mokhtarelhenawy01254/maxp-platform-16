const goalService = require("../services/businessGoalService");

const MANAGE_GOALS_ROLES = ["SUPER_ADMIN", "COMPANY_ADMIN", "OWNER", "MANAGER"];

function canManageGoals(role) {
  return MANAGE_GOALS_ROLES.includes(role || "");
}

function buildGoalOptions(query = {}) {
  const options = {
    employeeId: query.employeeId || query.userId,
    departmentId: query.departmentId,
    projectId: query.projectId,
    parentGoalId: query.parentGoalId,
    goalType: query.goalType,
    status: query.status,
    goalDate: query.goalDate,
  };

  if (query.includeDaily !== undefined) {
    options.includeDaily = !["false", "0", "no"].includes(
      String(query.includeDaily).toLowerCase(),
    );
  }

  return options;
}

function handleGoalError(res, error, fallbackMessage) {
  console.error(fallbackMessage, error);
  res.status(500).json({
    success: false,
    error: error.message || fallbackMessage,
  });
}

module.exports = {
  async getGoals(req, res) {
    try {
      const goals = await goalService.getGoals(
        req.user.companyId,
        buildGoalOptions(req.query),
      );

      res.json({ success: true, goals });
    } catch (error) {
      handleGoalError(res, error, "حدث خطأ أثناء جلب الأهداف");
    }
  },

  async getGoalById(req, res) {
    try {
      const goal = await goalService.getGoalById(
        req.user.companyId,
        req.params.id,
      );

      if (!canManageGoals(req.user.role) && goal.userId !== req.user.userId) {
        return res.status(403).json({
          success: false,
          error: "غير مسموح لك بعرض هذا الهدف",
        });
      }

      res.json({ success: true, goal });
    } catch (error) {
      handleGoalError(res, error, "حدث خطأ أثناء جلب الهدف");
    }
  },

  async createGoal(req, res) {
    try {
      const goal = await goalService.createGoal(req.user.companyId, req.body);
      res.status(201).json({ success: true, goal });
    } catch (error) {
      handleGoalError(res, error, "حدث خطأ أثناء إنشاء الهدف");
    }
  },

  async updateGoal(req, res) {
    try {
      const goal = await goalService.updateGoal(
        req.user.companyId,
        req.params.id,
        req.body,
      );

      res.json({ success: true, goal });
    } catch (error) {
      handleGoalError(res, error, "حدث خطأ أثناء تحديث الهدف");
    }
  },

  async deleteGoal(req, res) {
    try {
      await goalService.deleteGoal(req.user.companyId, req.params.id);
      res.json({ success: true, message: "تم حذف الهدف بنجاح" });
    } catch (error) {
      handleGoalError(res, error, "حدث خطأ أثناء حذف الهدف");
    }
  },

  async getGoalStats(req, res) {
    try {
      const stats = await goalService.getGoalStats(
        req.user.companyId,
        buildGoalOptions(req.query),
      );

      res.json({ success: true, stats });
    } catch (error) {
      handleGoalError(res, error, "حدث خطأ أثناء جلب إحصائيات الأهداف");
    }
  },

  async getTodayGoals(req, res) {
    try {
      const requestedUserId = req.query.userId || req.query.employeeId;
      const targetUserId =
        requestedUserId && canManageGoals(req.user.role)
          ? requestedUserId
          : req.user.userId;

      const goals = await goalService.getTodayGoalsForUser(
        req.user.companyId,
        targetUserId,
        { date: req.query.date },
      );

      res.json({ success: true, goals });
    } catch (error) {
      handleGoalError(res, error, "حدث خطأ أثناء جلب أهداف اليوم");
    }
  },

  async ensureTodayGoals(req, res) {
    try {
      const requestedUserId = req.body.userId || req.body.employeeId;
      const targetUserId =
        requestedUserId && canManageGoals(req.user.role)
          ? requestedUserId
          : req.user.userId;

      const goals = await goalService.ensureTodayDailyGoalsForUser(
        req.user.companyId,
        targetUserId,
        req.body.attendanceId || null,
        req.body.date ? new Date(req.body.date) : new Date(),
      );

      res.json({ success: true, goals });
    } catch (error) {
      handleGoalError(res, error, "حدث خطأ أثناء تجهيز أهداف اليوم");
    }
  },

  async updateGoalProgress(req, res) {
    try {
      const currentGoal = await goalService.getGoalById(
        req.user.companyId,
        req.params.id,
      );

      if (
        !canManageGoals(req.user.role) &&
        currentGoal.userId &&
        currentGoal.userId !== req.user.userId
      ) {
        return res.status(403).json({
          success: false,
          error: "غير مسموح لك بتحديث هذا الهدف",
        });
      }

      const goal = await goalService.updateGoalProgress(
        req.user.companyId,
        req.params.id,
        req.body,
      );

      res.json({ success: true, goal });
    } catch (error) {
      handleGoalError(res, error, "حدث خطأ أثناء تحديث تقدم الهدف");
    }
  },

  async getMetricsCatalog(req, res) {
    try {
      const goalMetricEngine = require("../services/goalMetricEngine");
      const metrics = goalMetricEngine.getMetricCatalog();
      res.json({ success: true, metrics });
    } catch (error) {
      handleGoalError(res, error, "حدث خطأ أثناء جلب كتالوج المؤشرات");
    }
  },
};

