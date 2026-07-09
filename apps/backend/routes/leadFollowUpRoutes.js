const express = require('express');
const router = express.Router();
const leadFollowUpController = require('../controller/leadFollowUpController');
const verifyToken = require('../utils/verifyToken');

router.get('/flows', verifyToken.authenticateToken, (req, res) => leadFollowUpController.getFlows(req, res));
router.post('/flows', verifyToken.authenticateToken, (req, res) => leadFollowUpController.createFlow(req, res));
router.put('/flows/:id', verifyToken.authenticateToken, (req, res) => leadFollowUpController.updateFlow(req, res));
router.delete('/flows/:id', verifyToken.authenticateToken, (req, res) => leadFollowUpController.deleteFlow(req, res));

router.get('/flows/:flowId/steps', verifyToken.authenticateToken, (req, res) => leadFollowUpController.getFlowSteps(req, res));
router.post('/flows/:flowId/steps', verifyToken.authenticateToken, (req, res) => leadFollowUpController.upsertStep(req, res));
router.delete('/steps/:id', verifyToken.authenticateToken, (req, res) => leadFollowUpController.deleteStep(req, res));

router.get('/enrollments', verifyToken.authenticateToken, (req, res) => leadFollowUpController.getEnrollments(req, res));

module.exports = router;
