/**
 * 🔗 Reward System Routes
 * مسارات نظام المكافآت
 */

const express = require('express');
const router = express.Router();
const rewardController = require('../controller/rewardController');
const kudosController = require('../controller/kudosController');
const verifyToken = require("../utils/verifyToken");
const { handleHRError } = require('../utils/hrErrors');

// All routes require authentication
router.use(verifyToken.authenticateToken);

// ═══════════════════════════════════════════════════════════════════════════════
// 🏆 أنواع المكافآت - Reward Types
// ═══════════════════════════════════════════════════════════════════════════════

router.post('/types', verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), rewardController.createRewardType);
router.get('/types', verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), rewardController.getRewardTypes);
router.get('/types/:id', verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), rewardController.getRewardTypeById);
router.put('/types/:id', verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), rewardController.updateRewardType);
router.delete('/types/:id', verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), rewardController.deleteRewardType);
router.patch('/types/:id/toggle', verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), rewardController.toggleRewardTypeStatus);
router.post('/types/seed', verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), rewardController.seedRewardTypes);

// ═══════════════════════════════════════════════════════════════════════════════
// 🎁 تطبيق واعتماد المكافآت - Application & Approval
// ═══════════════════════════════════════════════════════════════════════════════

router.post('/apply', verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), rewardController.applyReward);
router.post('/apply/bulk', verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), rewardController.applyBulkRewards);
router.patch('/approve/:id', verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), rewardController.approveReward);
router.patch('/reject/:id', verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), rewardController.rejectReward);

// ⚠️ Voiding requires higher privileges (Admin/Owner only, NOT Manager)
router.patch('/void/:id', verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER']), rewardController.voidReward);

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 التقارير وعرض الموظف - Reporting & View
// ═══════════════════════════════════════════════════════════════════════════════

// Employee Self-View
router.get('/my-rewards', rewardController.getMyRewards);

// Manager Views
router.get('/employee/:userId', verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), rewardController.getEmployeeRewards);
router.get('/reports/monthly', verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), rewardController.getMonthlyReport);
router.get('/reports/cost-analysis', verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), rewardController.getCostAnalysis);

// ═══════════════════════════════════════════════════════════════════════════════
// 📋 إدارة المكافآت - Reward Management (CRUD)
// ═══════════════════════════════════════════════════════════════════════════════

// List all rewards with filters and pagination
router.get('/records', verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER', 'HR_MANAGER', 'HR']), rewardController.getAllRewards);

// Get single reward details
router.get('/records/:id', verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER', 'HR_MANAGER', 'HR']), rewardController.getRewardById);

// Create manual reward
router.post('/records', verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER', 'HR_MANAGER', 'HR']), rewardController.createManualReward);

// Update reward
router.put('/records/:id', verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER', 'HR_MANAGER', 'HR']), rewardController.updateReward);

// Delete reward
router.delete('/records/:id', verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER', 'HR_MANAGER']), rewardController.deleteReward);

// Get statistics
router.get('/statistics', verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER', 'HR_MANAGER', 'HR']), rewardController.getRewardStatistics);

// Get employee reward history
router.get('/history/:userId', verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER', 'HR_MANAGER', 'HR']), rewardController.getEmployeeRewardHistory);

// ═══════════════════════════════════════════════════════════════════════════════
// 🌟 تقدير الزملاء - Peer-to-Peer Kudos
// ═══════════════════════════════════════════════════════════════════════════════

router.post('/kudos', kudosController.sendKudos);
router.get('/kudos', kudosController.getKudos);
router.get('/kudos/stats', kudosController.getKudosStats);

// ⚡ المكافآت التلقائية - Automated Tasks
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/automations/trigger-streaks', verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER']), kudosController.triggerStreakCheck);

// Error Handler
router.use(handleHRError);

module.exports = router;
