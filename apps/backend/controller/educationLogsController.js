const educationAuditService = require('../services/educationAuditService');

/**
 * Education Logs Controller
 * Endpoints for viewing, filtering, and exporting educational system audit logs.
 */

// GET /api/v1/education/logs
exports.getLogs = async (req, res) => {
  try {
    const companyId = req.user?.companyId || req.user?.effectiveCompanyId;
    if (!companyId) {
      return res.status(403).json({ success: false, error: 'غير مصرح' });
    }

    const {
      page,
      limit,
      search,
      action,
      targetType,
      severity,
      startDate,
      endDate,
      userId,
      isSuccess,
    } = req.query;

    const result = await educationAuditService.getEducationLogs({
      companyId,
      page,
      limit,
      search,
      action,
      targetType,
      severity,
      startDate,
      endDate,
      userId,
      isSuccess,
    });

    res.json({
      success: true,
      data: result.logs,
      pagination: result.pagination,
      actionDefinitions: educationAuditService.ACTION_DEFINITIONS,
    });
  } catch (error) {
    console.error('[EducationLogsController] Error fetching logs:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ أثناء جلب سجلات النظام التعليمي' });
  }
};

// GET /api/v1/education/logs/stats
exports.getStats = async (req, res) => {
  try {
    const companyId = req.user?.companyId || req.user?.effectiveCompanyId;
    if (!companyId) {
      return res.status(403).json({ success: false, error: 'غير مصرح' });
    }

    const stats = await educationAuditService.getEducationLogsStats(companyId);
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('[EducationLogsController] Error fetching stats:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ أثناء جلب إحصائيات السجلات' });
  }
};

// GET /api/v1/education/logs/export
exports.exportLogs = async (req, res) => {
  try {
    const companyId = req.user?.companyId || req.user?.effectiveCompanyId;
    if (!companyId) {
      return res.status(403).json({ success: false, error: 'غير مصرح' });
    }

    const {
      search,
      action,
      targetType,
      severity,
      startDate,
      endDate,
      userId,
      isSuccess,
    } = req.query;

    const csvData = await educationAuditService.exportEducationLogsCsv(companyId, {
      search,
      action,
      targetType,
      severity,
      startDate,
      endDate,
      userId,
      isSuccess,
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="education_logs_${new Date().toISOString().slice(0, 10)}.csv"`
    );
    res.send(csvData);
  } catch (error) {
    console.error('[EducationLogsController] Error exporting logs:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ أثناء تصدير السجلات' });
  }
};
