const express = require('express');
const router = express.Router();
const controller = require('../controller/radiologyTagsController');
const verifyToken = require('../utils/verifyToken');

const MANAGER_ROLES = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER'];

router.use(verifyToken.authenticateToken);

router.get('/exam-tags', controller.listTags);
router.post('/exam-tags', verifyToken.requireRole(MANAGER_ROLES), controller.createTag);
router.put('/exam-tags/:id', verifyToken.requireRole(MANAGER_ROLES), controller.updateTag);
router.delete('/exam-tags/:id', verifyToken.requireRole(MANAGER_ROLES), controller.deleteTag);

router.get('/modalities', controller.listModalities);

module.exports = router;
