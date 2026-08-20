const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../utils/verifyToken');

const statusMatrixController = require('../controller/orderMovement/statusMatrixController');
const sankeyController = require('../controller/orderMovement/sankeyController');
const pathsController = require('../controller/orderMovement/pathsController');
const dwellTimeController = require('../controller/orderMovement/dwellTimeController');
const outcomesController = require('../controller/orderMovement/outcomesController');
const teamController = require('../controller/orderMovement/teamController');
const agingController = require('../controller/orderMovement/agingController');
const approvalsController = require('../controller/orderMovement/approvalsController');

router.get('/matrix', authenticateToken, statusMatrixController);
router.get('/sankey', authenticateToken, sankeyController);
router.get('/paths', authenticateToken, pathsController);
router.get('/dwell-time', authenticateToken, dwellTimeController);
router.get('/outcomes', authenticateToken, outcomesController);
router.get('/team', authenticateToken, teamController);
router.get('/aging', authenticateToken, agingController);
router.get('/approvals', authenticateToken, approvalsController);

module.exports = router;
