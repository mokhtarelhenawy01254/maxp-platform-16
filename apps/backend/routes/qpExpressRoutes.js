/**
 * QP Express Routes
 * مسارات الربط مع شركة كيو بي إكسبريس
 */

const express = require('express');
const router = express.Router();
const verifyToken = require('../utils/verifyToken');
const qpExpressController = require('../controller/qpExpressController');

// إنشاء بوليصة شحن لأوردر
router.post('/orders/:orderId/shipment', verifyToken.authenticateToken, qpExpressController.createShipment);

// إنشاء بوالص شحن مجمعة لمجموعة أوردرات
router.post('/bulk/create-shipments', verifyToken.authenticateToken, qpExpressController.bulkCreateShipments);

// تتبع شحنة برقم البوليصة
router.get('/track/:trackingNumber', verifyToken.authenticateToken, qpExpressController.trackShipment);

// قائمة المحافظات والمدن
router.get('/cities', verifyToken.authenticateToken, qpExpressController.getCities);

// قائمة أسعار التعاقد لجميع المحافظات
router.get('/pricing', verifyToken.authenticateToken, qpExpressController.getPricing);

// بيانات الحساب والعنوان المسجل
router.get('/account', verifyToken.authenticateToken, qpExpressController.getCustomerInfo);

// أحدث الشحنات المسجلة
router.get('/recent-orders', verifyToken.authenticateToken, qpExpressController.getRecentOrders);

// طباعة بوليصة شحن حرارية (80mm x 50mm)
router.get('/waybill/:trackingNumber', verifyToken.authenticateToken, qpExpressController.printWaybill);

// طباعة مجمعة لبوالص شحن حرارية
router.get('/bulk/print-waybills', verifyToken.authenticateToken, qpExpressController.bulkPrintWaybills);
router.post('/bulk/print-waybills', verifyToken.authenticateToken, qpExpressController.bulkPrintWaybills);

// إلغاء وحذف شحنة من كيو بي إكسبريس
router.post('/cancel', verifyToken.authenticateToken, qpExpressController.cancelShipment);

module.exports = router;
