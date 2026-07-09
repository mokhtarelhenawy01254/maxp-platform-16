const express = require('express');
const router = express.Router();
const leadFollowUpController = require('../controller/leadFollowUpController');
const verifyToken = require('../utils/verifyToken');

router.get('/settings', verifyToken.authenticateToken, (req, res) => leadFollowUpController.getSettings(req, res));
router.put('/settings', verifyToken.authenticateToken, (req, res) => leadFollowUpController.updateSettings(req, res));
router.get('/enrollments', verifyToken.authenticateToken, (req, res) => leadFollowUpController.getEnrollments(req, res));
router.get('/stats', verifyToken.authenticateToken, (req, res) => leadFollowUpController.getStats(req, res));

module.exports = router;
