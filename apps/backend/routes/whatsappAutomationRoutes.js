const express = require('express');
const router = express.Router();
const whatsappAutomationController = require('../controller/whatsappAutomationController');

const verifyToken = require('../utils/verifyToken');
const { checkAppAccess } = require('../middleware/checkAppAccess');

// Keep explicit auth and WhatsApp subscription guard on these routes
router.use(verifyToken.authenticateToken);
router.use(checkAppAccess('whatsapp-business'));

// Flows management
router.get('/flows', verifyToken.authenticateToken, (req, res) => whatsappAutomationController.getFlows(req, res));
router.post('/flows', verifyToken.authenticateToken, (req, res) => whatsappAutomationController.createFlow(req, res));
router.post('/flows/preset', verifyToken.authenticateToken, (req, res) => whatsappAutomationController.createPresetFlow(req, res));
router.put('/flows/:id', verifyToken.authenticateToken, (req, res) => whatsappAutomationController.updateFlow(req, res));
router.delete('/flows/:id', verifyToken.authenticateToken, (req, res) => whatsappAutomationController.deleteFlow(req, res));

// Steps management
router.get('/flows/:flowId/steps', verifyToken.authenticateToken, (req, res) => whatsappAutomationController.getFlowSteps(req, res));
router.post('/flows/:flowId/steps', verifyToken.authenticateToken, (req, res) => whatsappAutomationController.upsertStep(req, res));
router.delete('/steps/:id', verifyToken.authenticateToken, (req, res) => whatsappAutomationController.deleteStep(req, res));

// Journeys monitoring
router.get('/journeys', verifyToken.authenticateToken, (req, res) => whatsappAutomationController.getJourneys(req, res));
router.post('/journeys/re-enroll', verifyToken.authenticateToken, (req, res) => whatsappAutomationController.reEnrollJourney(req, res));

module.exports = router;
