const express = require('express');
const router = express.Router();
const telegramAdvancedController = require('../controller/telegramAdvancedController');
const verifyToken = require('../utils/verifyToken');
const { globalSecurity } = require('../middleware/globalSecurity');

router.use(globalSecurity);
router.use(verifyToken.authenticateToken);
router.use(verifyToken.requireCompanyAccess);

// ═══════════════════════════════════════════════════════════════════════════════
// 🚀 Telegram Advanced Features Routes
// ═══════════════════════════════════════════════════════════════════════════════

// --- 1️⃣ Auto-Reply Rules ---
router.get('/auto-reply/:userbotConfigId', telegramAdvancedController.getAutoReplyRules);
router.post('/auto-reply/:userbotConfigId', telegramAdvancedController.createAutoReplyRule);
router.put('/auto-reply/:ruleId', telegramAdvancedController.updateAutoReplyRule);
router.delete('/auto-reply/:ruleId', telegramAdvancedController.deleteAutoReplyRule);

// --- 2️⃣ Bulk Messaging ---
router.get('/bulk-messages', telegramAdvancedController.getBulkMessages);
router.post('/bulk-messages', telegramAdvancedController.createBulkMessage);
router.get('/bulk-messages/:bulkMessageId', telegramAdvancedController.getBulkMessageStatus);
router.post('/bulk-messages/:bulkMessageId/cancel', telegramAdvancedController.cancelBulkMessage);

// --- 3️⃣ Scheduled Messages ---
router.get('/scheduled-messages', telegramAdvancedController.getScheduledMessages);
router.post('/scheduled-messages', telegramAdvancedController.createScheduledMessage);
router.post('/scheduled-messages/:messageId/cancel', telegramAdvancedController.cancelScheduledMessage);

// --- 4️⃣ Group Management ---
router.get('/groups', telegramAdvancedController.getGroups);
router.post('/groups/channel', telegramAdvancedController.createChannel);
router.post('/groups/group', telegramAdvancedController.createGroup);
router.post('/groups/add-members', telegramAdvancedController.addMembersToGroup);
router.get('/groups/:userbotConfigId/:groupId/members', telegramAdvancedController.getGroupMembers);

// --- 5️⃣ Contacts ---
router.get('/contacts', telegramAdvancedController.getContacts);
router.put('/contacts/:contactId', telegramAdvancedController.updateContact);

// --- 6️⃣ Forward Rules ---
router.get('/forward-rules', telegramAdvancedController.getForwardRules);
router.post('/forward-rules', telegramAdvancedController.createForwardRule);
router.put('/forward-rules/:ruleId/toggle', telegramAdvancedController.toggleForwardRule);

// --- 7️⃣ Search ---
router.get('/search', telegramAdvancedController.searchMessages);

// --- 8️⃣ Campaigns ---
router.get('/campaigns', telegramAdvancedController.getCampaigns);
router.post('/campaigns', telegramAdvancedController.createCampaign);
router.get('/campaigns/:campaignId', telegramAdvancedController.getCampaignDetails);
router.post('/campaigns/:campaignId/cancel', telegramAdvancedController.cancelCampaign);
router.delete('/campaigns/:campaignId', telegramAdvancedController.deleteCampaign);

module.exports = router;
