/**
 * 📝 Audit Controller
 * التحكم في سجلات التدقيق
 */

const auditService = require('../services/hr/auditService');

class AuditController {
    /**
     * جلب سجلات التدقيق
     * GET /api/v1/hr/audit-logs
     */
    async getAuditLogs(req, res) {
        try {
            const { companyId } = req.user;
            const { entityType, action, startDate, endDate, search, actorId, limit, page } = req.query;

            const result = await auditService.getLogs(companyId, {
                entityType,
                action,
                startDate,
                endDate,
                search,
                actorId,
                limit,
                page
            });

            res.json({
                success: true,
                ...result
            });
        } catch (error) {
            console.error('❌ Error getting audit logs:', error);
            res.status(500).json({
                success: false,
                message: 'فشل في جلب سجلات التدقيق',
                error: error.message
            });
        }
    }

    /**
     * جلب إحصائيات سجلات التدقيق
     * GET /api/v1/hr/audit-logs/stats
     */
    async getAuditStats(req, res) {
        try {
            const { companyId } = req.user;
            const { startDate, endDate } = req.query;

            const stats = await auditService.getStats(companyId, {
                startDate,
                endDate
            });

            res.json({
                success: true,
                data: stats
            });
        } catch (error) {
            console.error('❌ Error getting audit stats:', error);
            res.status(500).json({
                success: false,
                message: 'فشل في جلب إحصائيات التدقيق',
                error: error.message
            });
        }
    }
}

module.exports = new AuditController();
