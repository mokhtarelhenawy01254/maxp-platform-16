const express = require('express');
const router = express.Router();
const controller = require('../controller/serviceOrdersController');
const verifyToken = require('../utils/verifyToken');

// General endpoints (placed before /:id)
router.get('/', verifyToken.authenticateToken, controller.getAll);
router.get('/settings', verifyToken.authenticateToken, controller.getSettings);
router.put('/settings', verifyToken.authenticateToken, controller.updateSettings);
router.get('/team-members', verifyToken.authenticateToken, controller.getTeamMembers);
router.get('/invoices', verifyToken.authenticateToken, controller.getInvoices);
router.post('/', verifyToken.optionalAuth, controller.createPublic); // Public - optional auth for logged-in users

// Order specific endpoints
router.get('/:id', verifyToken.authenticateToken, controller.getById);
router.put('/:id', verifyToken.authenticateToken, controller.update);
router.put('/:id/status', verifyToken.authenticateToken, controller.updateStatus);
router.put('/:id/payment', verifyToken.authenticateToken, controller.updatePayment);
router.delete('/:id', verifyToken.authenticateToken, controller.deleteOrder);
router.get('/:id/whatsapp-session', verifyToken.authenticateToken, controller.getWhatsAppSessionForOrder);
router.post('/:id/send-whatsapp', verifyToken.authenticateToken, controller.sendWhatsAppMessage);

module.exports = router;
