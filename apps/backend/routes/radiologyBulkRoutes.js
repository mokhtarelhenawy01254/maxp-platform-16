const express = require('express');
const router = express.Router();
const controller = require('../controller/radiologyBulkController');
const verifyToken = require('../utils/verifyToken');

const MANAGER_ROLES = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER'];

router.use(verifyToken.authenticateToken);

router.post('/appointments/convert', verifyToken.requireRole(MANAGER_ROLES), controller.bulkConvertAppointments);
router.post('/appointments/checkin', verifyToken.requireRole(MANAGER_ROLES), controller.bulkCheckinAppointments);
router.post('/studies/advance', verifyToken.requireRole(MANAGER_ROLES), controller.bulkAdvanceStudies);
router.post('/studies/deliver', verifyToken.requireRole(MANAGER_ROLES), controller.bulkDeliverStudies);
router.post('/studies/labels', verifyToken.requireRole(MANAGER_ROLES), controller.bulkStudiesLabels);
router.post('/reports/advance', verifyToken.requireRole(MANAGER_ROLES), controller.bulkAdvanceReports);

module.exports = router;
