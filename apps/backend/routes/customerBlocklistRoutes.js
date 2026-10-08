const express = require('express');
const router = express.Router();
const verifyToken = require('../utils/verifyToken');
const customerBlocklistController = require('../controller/customerBlocklistController');

router.use(verifyToken.authenticateToken);

const requireBlocklistAdmin = verifyToken.requireRole([
  'SUPER_ADMIN',
  'OWNER',
  'COMPANY_ADMIN',
  'MANAGER',
  'ADMIN',
]);

router.get('/settings', customerBlocklistController.getSettings);
router.put('/settings', requireBlocklistAdmin, customerBlocklistController.updateSettings);
router.get('/rules', customerBlocklistController.listRules);
router.post('/rules', requireBlocklistAdmin, customerBlocklistController.createRule);
router.patch('/rules/:ruleId/lift', requireBlocklistAdmin, customerBlocklistController.liftRule);
router.post('/check', customerBlocklistController.checkRule);
router.get('/risk-report', customerBlocklistController.getRiskReport);

module.exports = router;
