const express = require('express');
const router = express.Router();
const controller = require('../controller/educationGroupsController');
const verifyToken = require('../utils/verifyToken');

router.get('/', verifyToken.authenticateToken, controller.getAll);
router.get('/:id', verifyToken.authenticateToken, controller.getById);
router.post('/', verifyToken.authenticateToken, controller.create);
router.put('/:id', verifyToken.authenticateToken, controller.update);
router.delete('/:id', verifyToken.authenticateToken, controller.remove);

// Members
router.post('/:id/members', verifyToken.authenticateToken, controller.addMember);
router.delete('/:id/members/:studentId', verifyToken.authenticateToken, controller.removeMember);
router.post('/:id/transfer-member', verifyToken.authenticateToken, controller.transferMember);

// Sessions & Bulk Attendance
router.post('/:id/sessions', verifyToken.authenticateToken, controller.recordSession);

// Financials & Teacher Settlement
router.get('/:id/financials', verifyToken.authenticateToken, controller.getFinancials);

module.exports = router;
