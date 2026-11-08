const express = require('express');
const router = express.Router();
const verifyToken = require('../utils/verifyToken');
const controller = require('../controller/educationNotificationController');

router.use(verifyToken.authenticateToken);

// Restrict access: only staff/admin roles are permitted (block STUDENT, CUSTOMER, COURIER)
router.use((req, res, next) => {
  const role = req.user?.role;
  if (role === 'STUDENT' || role === 'CUSTOMER' || role === 'COURIER') {
    return res.status(403).json({ success: false, error: 'غير مصرح بالوصول إلى لوحة إدارة التعليم' });
  }
  next();
});

router.get('/funnel', controller.getFunnel);
router.get('/logs', controller.getLogs);
router.post('/test', controller.sendTest);

module.exports = router;
