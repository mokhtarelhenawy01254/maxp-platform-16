const express = require('express');
const router = express.Router();
const controller = require('../controller/bookingDraftController');
const verifyToken = require('../utils/verifyToken');

router.get('/', verifyToken.authenticateToken, controller.getAllDrafts);
router.post('/', verifyToken.authenticateToken, controller.createDraft);
router.put('/:id/field', verifyToken.authenticateToken, controller.setDraftField);
router.get('/:id', verifyToken.authenticateToken, controller.getDraft);
router.post('/:id/finalize', verifyToken.authenticateToken, controller.finalizeDraft);
router.delete('/:id', verifyToken.authenticateToken, controller.deleteDraft);

module.exports = router;
