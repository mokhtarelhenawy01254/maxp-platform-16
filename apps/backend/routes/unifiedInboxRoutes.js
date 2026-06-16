/**
 * unifiedInboxRoutes.js
 * مسارات الصندوق الموحد - Unified Reply Center API
 */

const express = require('express');
const router = express.Router();
const verifyToken = require('../utils/verifyToken');
const unifiedInboxController = require('../controller/unifiedInboxController');

// ═══════════════════════════════════════════════════════════════════════════════
// 📋 المحادثات
// ═══════════════════════════════════════════════════════════════════════════════

// Get unified conversations (all platforms)
router.get('/conversations',
    verifyToken.authenticateToken,
    unifiedInboxController.getUnifiedConversations
);

// Get messages for a specific conversation
router.get('/conversations/:id/messages',
    verifyToken.authenticateToken,
    unifiedInboxController.getConversationMessages
);

// Send a message to a conversation
router.post('/conversations/:id/messages',
    verifyToken.authenticateToken,
    unifiedInboxController.sendUnifiedMessage
);

// Update conversation (status, assignment, etc.)
router.put('/conversations/:id',
    verifyToken.authenticateToken,
    unifiedInboxController.updateUnifiedConversation
);

// Delete conversation
router.delete('/conversations/:id',
    verifyToken.authenticateToken,
    unifiedInboxController.deleteUnifiedConversation
);

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 إحصائيات
// ═══════════════════════════════════════════════════════════════════════════════

// Get unified inbox stats
router.get('/stats',
    verifyToken.authenticateToken,
    unifiedInboxController.getUnifiedStats
);

// ═══════════════════════════════════════════════════════════════════════════════
// 👤 العملاء
// ═══════════════════════════════════════════════════════════════════════════════

// Get customer profile
router.get('/customer/:customerId',
    verifyToken.authenticateToken,
    unifiedInboxController.getCustomerProfile
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
    unifiedInboxController.getSettings
);

console.log('✅ [DEBUG-ROUTE] All routes defined in unifiedInboxRoutes');

module.exports = router;
