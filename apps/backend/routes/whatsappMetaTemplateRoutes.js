const express = require('express');
const router = express.Router();
const multer = require('multer');
const verifyToken = require('../utils/verifyToken');
const { checkAppAccess } = require('../middleware/checkAppAccess');
const metaTemplateController = require('../controller/whatsappMetaTemplateController');

router.use(verifyToken.authenticateToken);
router.use(checkAppAccess('whatsapp-business'));

// رفع وسيط (صورة/فيديو/مستند) في الذاكرة — نمرره مباشرة لـ Resumable Upload API في ميتا
const mediaUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB
});

// قوالب Meta API - CRUD
router.get('/templates', verifyToken.authenticateToken, metaTemplateController.listMetaTemplates);
router.post('/templates', verifyToken.authenticateToken, metaTemplateController.createMetaTemplate);
router.put('/templates', verifyToken.authenticateToken, metaTemplateController.updateMetaTemplate);
router.delete('/templates', verifyToken.authenticateToken, metaTemplateController.deleteMetaTemplate);

// رفع وسائط HEADER القالب (يرجع handle يُستخدم في example.header_handle / header parameter)
router.post('/templates/upload-media', verifyToken.authenticateToken, mediaUpload.single('file'), metaTemplateController.uploadTemplateMedia);

// إرسال قالب لمجموعة (Broadcast)
router.post('/templates/broadcast', verifyToken.authenticateToken, metaTemplateController.broadcastMetaTemplate);

module.exports = router;