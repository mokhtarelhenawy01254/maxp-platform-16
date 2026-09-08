/**
 * unifiedInboxRoutes.js
 * مسارات الصندوق الموحد - Unified Reply Center API
 */

const express = require('express');
const router = express.Router();
const verifyToken = require('../utils/verifyToken');
const { checkAppAccess } = require('../middleware/checkAppAccess');
const { conversationAccessGuard } = require('../middleware/numberAccessGuard');
const { requireDbPermission } = require('../middleware/rbacMiddleware');
const unifiedInboxController = require('../controller/unifiedInboxController');
const whatsappInboxController = require('../controller/whatsappInboxController');

// ═══════════════════════════════════════════════════════════════════════════════
// 📋 المحادثات
// ═══════════════════════════════════════════════════════════════════════════════

// Get unified conversations (all platforms)
router.get('/conversations',
    verifyToken.authenticateToken,
    checkAppAccess('unified-inbox'),
    unifiedInboxController.getUnifiedConversations
);

// Get messages for a specific conversation
router.get('/conversations/:id/messages',
    verifyToken.authenticateToken,
    checkAppAccess('unified-inbox'),
    unifiedInboxController.getConversationMessages
);

// Send a message to a conversation
router.post('/conversations/:id/messages',
    verifyToken.authenticateToken,
    checkAppAccess('unified-inbox'),
    unifiedInboxController.sendUnifiedMessage
);

// Update conversation (status, assignment, etc.)
router.put('/conversations/:id',
    verifyToken.authenticateToken,
    checkAppAccess('unified-inbox'),
    unifiedInboxController.updateUnifiedConversation
);

// Delete conversation
router.delete('/conversations/:id',
    verifyToken.authenticateToken,
    checkAppAccess('unified-inbox'),
    unifiedInboxController.deleteUnifiedConversation
);

// ═══════════════════════════════════════════════════════════════════════════════
// ✏️ تصحيح رد الوكيل AI (يعمل على جميع المنصات)
// ═══════════════════════════════════════════════════════════════════════════════

// Correct an AI-generated message (works for all platforms)
router.post('/conversations/:conversationId/messages/:messageId/correct',
    verifyToken.authenticateToken,
    checkAppAccess('unified-inbox'),
    conversationAccessGuard,
    whatsappInboxController.correctMessage
);

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 إحصائيات
// ═══════════════════════════════════════════════════════════════════════════════

// Get unified inbox stats
router.get('/stats',
    verifyToken.authenticateToken,
    checkAppAccess('unified-inbox'),
    unifiedInboxController.getUnifiedStats
);

// ═══════════════════════════════════════════════════════════════════════════════
// 👤 العملاء
// ═══════════════════════════════════════════════════════════════════════════════

// Get customer profile
router.get('/customer/:customerId',
    verifyToken.authenticateToken,
    checkAppAccess('unified-inbox'),
    unifiedInboxController.getCustomerProfile
);

// Update customer (notes, etc.)
router.put('/customer/:customerId',
    verifyToken.authenticateToken,
    checkAppAccess('unified-inbox'),
    unifiedInboxController.updateCustomer
);

// Snooze conversation
router.post('/conversations/:id/snooze',
    verifyToken.authenticateToken,
    checkAppAccess('unified-inbox'),
    unifiedInboxController.snoozeConversation
);

// ═══════════════════════════════════════════════════════════════════════════════
// ⚡ الردود السريعة
// ═══════════════════════════════════════════════════════════════════════════════

// Get quick replies
router.get('/quick-replies',
    verifyToken.authenticateToken,
    unifiedInboxController.getQuickReplies
);

// ═══════════════════════════════════════════════════════════════════════════════
// ⚙️ الإعدادات
// ═══════════════════════════════════════════════════════════════════════════════

// Get unified inbox settings
router.get('/settings',
    verifyToken.authenticateToken,
    checkAppAccess('unified-inbox'),
    unifiedInboxController.getSettings
);

console.log('✅ [DEBUG-ROUTE] All routes defined in unifiedInboxRoutes');

module.exports = router;
