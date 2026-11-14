const express = require('express');
const router = express.Router();
const verifyToken = require('../utils/verifyToken');
const controller = require('../controller/educationNotificationController');

router.use(verifyToken.authenticateToken);

// Restrict access: block non-staff roles (STUDENT, CUSTOMER, COURIER, SHIPPING_CLIENT)
const DISALLOWED_ROLES = ['STUDENT', 'CUSTOMER', 'COURIER', 'SHIPPING_CLIENT'];
router.use((req, res, next) => {
  const role = req.user?.role;
  if (!role || DISALLOWED_ROLES.includes(role)) {
    return res.status(403).json({ success: false, error: 'غير مصرح بالوصول إلى لوحة إدارة التعليم' });
  }
  next();
});

router.get('/funnel', controller.getFunnel);
router.get('/logs', controller.getLogs);
router.post('/test', controller.sendTest);
router.get('/schedule', controller.getSchedule);
router.put('/schedule', controller.updateSchedule);
router.get('/flows', controller.getFlows);
router.put('/flows', controller.saveFlows);
router.put('/flows/:id', controller.updateFlow);
router.patch('/flows/:id/toggle', controller.toggleFlow);

module.exports = router;
