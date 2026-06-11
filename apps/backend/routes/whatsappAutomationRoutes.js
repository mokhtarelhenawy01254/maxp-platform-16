const express = require('express');
const router = express.Router();
const whatsappAutomationController = require('../controller/whatsappAutomationController');
const { checkAppAccess } = require('../middleware/checkAppAccess');
const verifyToken = require('../utils/verifyToken');

// Keep explicit auth on these routes (defense in depth) because
// global middleware may be bypassed in some flows.

// Flows management
router.get('/flows', verifyToken.authenticateToken, checkAppAccess('whatsapp-notifications'), (req, res) => whatsappAutomationController.getFlows(req, res));
router.post('/flows', verifyToken.authenticateToken, checkAppAccess('whatsapp-notifications'), (req, res) => whatsappAutomationController.createFlow(req, res));
router.put('/flows/:id', verifyToken.authenticateToken, checkAppAccess('whatsapp-notifications'), (req, res) => whatsappAutomationController.updateFlow(req, res));
router.delete('/flows/:id', verifyToken.authenticateToken, checkAppAccess('whatsapp-notifications'), (req, res) => whatsappAutomationController.deleteFlow(req, res));

// Steps management
router.get('/flows/:flowId/steps', verifyToken.authenticateToken, checkAppAccess('whatsapp-notifications'), (req, res) => whatsappAutomationController.getFlowSteps(req, res));
router.post('/flows/:flowId/steps', verifyToken.authenticateToken, checkAppAccess('whatsapp-notifications'), (req, res) => whatsappAutomationController.upsertStep(req, res));
router.delete('/steps/:id', verifyToken.authenticateToken, checkAppAccess('whatsapp-notifications'), (req, res) => whatsappAutomationController.deleteStep(req, res));

// Journeys monitoring
router.get('/journeys', verifyToken.authenticateToken, checkAppAccess('whatsapp-notifications'), (req, res) => whatsappAutomationController.getJourneys(req, res));

module.exports = router;
