/**
 * 🔄 Order Workflow & Status Permissions Routes
 * مسارات إدارة مسار حالات الطلبات والصلاحيات
 */

const express = require('express');
const router = express.Router();
const orderWorkflowService = require('../services/orderWorkflowService');
const orderService = require('../services/orderService');
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const verifyToken = require("../utils/verifyToken");
const { VALID_ORDER_STATUSES } = require('../utils/constants');

// Apply authentication to all routes
router.use(verifyToken.authenticateToken);

// Helper to get companyId safely
const getCompanyId = (req) => {
    return req.user?.companyId || req.headers['x-company-id'] || req.headers['X-Company-Id'];
};

/**
 * ⚙️ Config Routes
 */
router.get('/config', async (req, res) => {
    try {
        const companyId = getCompanyId(req);
        if (!companyId) return res.status(400).json({ success: false, message: 'معرف الشركة مفقود' });

        const config = await orderWorkflowService.getConfig(companyId);
        res.json({ success: true, data: config });
    } catch (error) {
        console.error('[ORDER-WORKFLOW-ERROR] GET /config:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

router.put('/config', async (req, res) => {
    try {
        const companyId = getCompanyId(req);
        console.log(`[ORDER-WORKFLOW-DEBUG] PUT /config | CompanyId: ${companyId} | Body:`, req.body);

        if (!companyId) {
            console.error('[ORDER-WORKFLOW-ERROR] PUT /config: Missing companyId');
            return res.status(400).json({ success: false, message: 'معرف الشركة مفقود' });
        }

        const config = await orderWorkflowService.updateConfig(companyId, req.body);
        console.log('[ORDER-WORKFLOW-SUCCESS] PUT /config result:', config);
        res.json({ success: true, data: config });
    } catch (error) {
        console.error('[ORDER-WORKFLOW-ERROR] PUT /config:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * 📊 Status Routes
 */
router.get('/statuses', async (req, res) => {
    try {
        const companyId = getCompanyId(req);
        if (!companyId) return res.status(400).json({ success: false, message: 'معرف الشركة مفقود' });

        // Primary source: orderStatusDefinition (workflow table)
        const wfStatuses = await orderWorkflowService.getStatuses(companyId);
        const wfCodes = new Set(wfStatuses.map(s => s.code));

        // Secondary source: orderStatusConfig — include any active statuses not yet mirrored
        const prisma = getSharedPrismaClient();
        const configStatuses = await prisma.orderStatusConfig.findMany({
            where: { companyId, isActive: true, statusType: 'order' },
            orderBy: { sortOrder: 'asc' }
        });

        // Auto-mirror any missing statuses from config into workflow table (backfill)
        const missing = configStatuses.filter(s => !wfCodes.has(s.code));
        for (const s of missing) {
            try {
                await prisma.orderStatusDefinition.create({
                    data: {
                        companyId,
                        name: s.name,
                        code: s.code,
                        color: s.color || '#6B7280',
                        sortOrder: s.sortOrder || 0,
                        description: s.description || null,
                        notifyCustomer: s.notifyCustomer ?? true,
                        isTerminal: false,
                        lockAfterEntry: false,
                        requiresApprovalToExit: false,
                    }
                });
            } catch (_) { /* already exists or race condition — ignore */ }
        }

        // Return a fresh merged list
        const allStatuses = await orderWorkflowService.getStatuses(companyId);
        res.json({ success: true, data: allStatuses });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.post('/statuses', async (req, res) => {
    try {
        const companyId = getCompanyId(req);
        if (!companyId) return res.status(400).json({ success: false, message: 'معرف الشركة مفقود' });

        const status = await orderWorkflowService.upsertStatus(companyId, req.body);
        res.json({ success: true, data: status });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.delete('/statuses/:id', async (req, res) => {
    try {
        const companyId = getCompanyId(req);
        if (!companyId) return res.status(400).json({ success: false, message: 'معرف الشركة مفقود' });

        await orderWorkflowService.deleteStatus(companyId, req.params.id);
        res.json({ success: true, message: 'Status deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Seed default system statuses for a company
router.post('/statuses/seed-defaults', async (req, res) => {
    try {
        const companyId = getCompanyId(req);
        if (!companyId) return res.status(400).json({ success: false, message: 'معرف الشركة مفقود' });

        const created = await orderWorkflowService.seedDefaultStatuses(companyId);
        res.json({ success: true, data: created, message: `تم إنشاء ${created.length} حالة افتراضية` });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * 🔗 Transition Routes
 */
router.get('/transitions', async (req, res) => {
    try {
        const companyId = getCompanyId(req);
        if (!companyId) return res.status(400).json({ success: false, message: 'معرف الشركة مفقود' });

        const transitions = await orderWorkflowService.getTransitions(companyId);
        res.json({ success: true, data: transitions });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.post('/transitions', async (req, res) => {
    try {
        const companyId = getCompanyId(req);
        if (!companyId) return res.status(400).json({ success: false, message: 'معرف الشركة مفقود' });

        const transition = await orderWorkflowService.upsertTransition(companyId, req.body);
        res.json({ success: true, data: transition });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.delete('/transitions/:id', async (req, res) => {
    try {
        const companyId = getCompanyId(req);
        if (!companyId) return res.status(400).json({ success: false, message: 'معرف الشركة مفقود' });

        await orderWorkflowService.deleteTransition(companyId, req.params.id);
        res.json({ success: true, message: 'Transition rule deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * 🔍 Get allowed transitions for current status + user
 */
router.get('/allowed-transitions', async (req, res) => {
    try {
        const companyId = getCompanyId(req);
        if (!companyId) return res.status(400).json({ success: false, message: 'معرف الشركة مفقود' });

        const { currentStatusCode } = req.query;
        if (!currentStatusCode) return res.status(400).json({ success: false, message: 'حالة الطلب الحالية مطلوبة' });

        const allowed = await orderWorkflowService.getAllowedTransitions(
            companyId,
            currentStatusCode.toUpperCase(),
            req.user?.id
        );
        res.json({ success: true, data: allowed });
    } catch (error) {
        console.error('[ORDER-WORKFLOW-ERROR] GET /allowed-transitions:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * ✅ Status Change Execution
 */
router.post('/change-status', async (req, res) => {
    try {
        const companyId = getCompanyId(req);
        if (!companyId) return res.status(400).json({ success: false, message: 'معرف الشركة مفقود' });

        const { orderId, statusId, reason, isOverride } = req.body;

        // 🚀 SPEED OPTIMIZATION: Fetch order once
        const order = await getSharedPrismaClient().order.findUnique({
            where: { id: orderId, companyId },
            include: { company: { include: { orderWorkflowConfig: true } } }
        });

        if (!order) {
            return res.status(404).json({ success: false, message: 'الطلب غير موجود' });
        }

        let targetStatus = await orderWorkflowService.findStatusByCode(companyId, statusId) || await getSharedPrismaClient().orderStatusDefinition.findUnique({
            where: { id: statusId }
        });

        if (!targetStatus && VALID_ORDER_STATUSES.includes(statusId?.toUpperCase())) {
            targetStatus = { code: statusId.toUpperCase(), companyId };
        }

        if (!targetStatus || targetStatus.companyId !== companyId) {
            return res.status(404).json({ success: false, message: 'الحالة المستهدفة غير موجودة' });
        }

        const userName = `${req.user?.firstName || ''} ${req.user?.lastName || ''}`.trim() || req.user?.email || 'System';
        const result = await orderService.updateOrderStatus(
            orderId,
            companyId,
            targetStatus.code,
            reason,
            req.user?.id,
            userName,
            order,
            isOverride
        );

        if (result?.workflowStatus === 'pending') {
            return res.json({
                success: true,
                data: { status: 'pending', requestId: result.workflowRequestId }
            });
        }

        res.json({ success: true, data: result });
    } catch (error) {
        res.status(error.statusCode || 400).json({ success: false, message: error.message });
    }
});

/**
 * 🔔 Approval Requests
 */
router.get('/approvals/pending', async (req, res) => {
    try {
        const companyId = getCompanyId(req);
        if (!companyId) return res.status(400).json({ success: false, message: 'معرف الشركة مفقود' });

        const limit = parseInt(req.query.limit) || 20;
        const offset = parseInt(req.query.offset) || 0;
        const requests = await orderWorkflowService.getPendingRequests(companyId, limit, offset);
        const total = await orderWorkflowService.getPendingRequestsCount(companyId);
        res.json({ success: true, data: requests, total });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.post('/approvals/:id/review', async (req, res) => {
    try {
        const companyId = getCompanyId(req);
        if (!companyId) return res.status(400).json({ success: false, message: 'معرف الشركة مفقود' });

        const { action, reason } = req.body;
        const result = await orderWorkflowService.handleApproval(
            companyId,
            req.params.id,
            req.user?.id,
            action,
            reason
        );
        res.json({ success: true, data: result });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

/**
 * 📝 Audit Logs
 */
router.get('/audit-logs', async (req, res) => {
    try {
        const companyId = getCompanyId(req);
        if (!companyId) return res.status(400).json({ success: false, message: 'معرف الشركة مفقود' });

        const limit = parseInt(req.query.limit) || 20;
        const offset = parseInt(req.query.offset) || 0;
        const userId = req.query.userId || null;
        const logs = await orderWorkflowService.getGlobalAuditLogs(companyId, limit, offset, userId);
        res.json({ success: true, data: logs });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/audit-logs/:orderId', async (req, res) => {
    try {
        const companyId = getCompanyId(req);
        if (!companyId) return res.status(400).json({ success: false, message: 'معرف الشركة مفقود' });

        const logs = await orderWorkflowService.getOrderAuditLogs(companyId, req.params.orderId);
        res.json({ success: true, data: logs });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
