const express = require('express');
const router = express.Router();
const verifyToken = require('../utils/verifyToken');
const metaTemplateController = require('../controller/whatsappMetaTemplateController');

// قوالب Meta API - CRUD
router.get('/templates', verifyToken.authenticateToken, metaTemplateController.listMetaTemplates);
router.post('/templates', verifyToken.authenticateToken, metaTemplateController.createMetaTemplate);
router.put('/templates', verifyToken.authenticateToken, metaTemplateController.updateMetaTemplate);
router.delete('/templates', verifyToken.authenticateToken, metaTemplateController.deleteMetaTemplate);

// إرسال قالب لمجموعة (Broadcast)
router.post('/templates/broadcast', verifyToken.authenticateToken, metaTemplateController.broadcastMetaTemplate);

module.exports = router;