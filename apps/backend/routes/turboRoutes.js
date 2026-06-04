/**
 * Turbo Shipping Routes
 * مسارات Turbo للشحن
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const { requireAuth } = require('../middleware/auth');
const { checkAppAccess } = require('../middleware/checkAppAccess');
const turboController = require('../controller/turboController');

// إعداد multer للتعامل مع رفع الملفات (في الذاكرة)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max
  },
  fileFilter: (req, file, cb) => {
    // السماح بصور فقط
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

/**
 * Public Routes (No Authentication Required)
 * المسارات العامة (لا تتطلب مصادقة)
 */

/**
 * GET /api/turbo/orders/:orderId/waybill
 * طباعة بوليصة الشحنة - عام بدون مصادقة
 */
router.get('/orders/:orderId/waybill', turboController.printWaybill);

// جميع المسارات التالية تتطلب المصادقة


/**
 * POST /api/turbo/orders/:orderId/shipment
 * إنشاء شحنة جديدة للطلب
 */
router.post('/orders/:orderId/shipment', requireAuth, checkAppAccess('order-shipping-turbo'), turboController.createShipment);

/**
 * POST /api/turbo/bulk/create-shipments
 * إنشاء شحنات لعدة طلبات دفعة واحدة
 */
router.post('/bulk/create-shipments', requireAuth, checkAppAccess('order-shipping-turbo'), turboController.bulkCreateShipments);

/**
 * GET /api/turbo/orders/:orderId/track
 * تتبع الشحنة
 */
router.get('/orders/:orderId/track', requireAuth, checkAppAccess('order-shipping-turbo'), turboController.trackShipment);

/**
 * POST /api/turbo/calculate
 * حساب تكلفة الشحن
 */
router.post('/calculate', requireAuth, checkAppAccess('order-shipping-turbo'), turboController.calculateShippingCost);

/**
 * GET /api/turbo/orders/:orderId/shipping-comparison
 * جلب مقارنة أسعار الشحن
 */
router.get('/orders/:orderId/shipping-comparison', requireAuth, checkAppAccess('order-shipping-turbo'), turboController.getShippingComparison);

/**
 * POST /api/turbo/orders/:orderId/cancel
 * إلغاء الشحنة
 */
router.post('/orders/:orderId/cancel', requireAuth, checkAppAccess('order-shipping-turbo'), turboController.cancelShipment);

/**
 * POST /api/turbo/orders/:orderId/unlink
 * إلغاء ربط Turbo المحلي من الطلب بدون إلغاء الشحنة خارج MaxP
 */
router.post('/orders/:orderId/unlink', requireAuth, checkAppAccess('order-shipping-turbo'), turboController.unlinkShipment);

/**
 * GET /api/turbo/orders/:orderId/label
 * طباعة ملصق الشحنة
 */
router.get('/orders/:orderId/label', requireAuth, checkAppAccess('order-shipping-turbo'), turboController.printLabel);

/**
 * GET /api/turbo/governments
 * جلب قائمة المحافظات من Turbo API
 */
router.get('/governments', requireAuth, checkAppAccess('order-shipping-turbo'), turboController.getGovernments);

/**
 * GET /api/turbo/areas/:governmentId
 * جلب قائمة المناطق بناءً على المحافظة
 */
router.get('/areas/:governmentId', requireAuth, checkAppAccess('order-shipping-turbo'), turboController.getAreas);

/**
 * GET /api/turbo/reports/shipping
 * جلب تقرير الشحن
 */
const turboReportController = require('../controller/turboReportController');
router.get('/reports/shipping', requireAuth, checkAppAccess('order-shipping-reports'), turboReportController.getShippingReport);

/**
 * GET /api/turbo/branches
 * جلب فروع Turbo
 */
router.get('/branches', requireAuth, checkAppAccess('order-shipping-turbo'), turboController.getBranches);

/**
 * PUT /api/turbo/orders/:orderId/shipment
 * تحديث بيانات الشحنة
 */
router.put('/orders/:orderId/shipment', requireAuth, checkAppAccess('order-shipping-turbo'), turboController.updateShipment);

/**
 * POST /api/turbo/tickets
 * إضافة تذكرة دعم إلى Turbo
 */
router.post('/tickets', requireAuth, checkAppAccess('order-shipping-turbo'), turboController.addTicket);

/**
 * GET /api/turbo/inquiries-types
 * جلب أنواع الاستفسارات من Turbo
 * يدعم POST و GET
 */
router.get('/inquiries-types', requireAuth, checkAppAccess('order-shipping-turbo'), turboController.getInquiriesTypes);
router.post('/inquiries-types', requireAuth, checkAppAccess('order-shipping-turbo'), turboController.getInquiriesTypes);

/**
 * GET /api/turbo/tickets/unread-count
 * جلب عدد التذاكر غير المقروءة من Turbo
 * يجب أن يأتي قبل /tickets/:id لتجنب التطابق الخاطئ
 */
router.get('/tickets/unread-count', requireAuth, checkAppAccess('order-shipping-turbo'), turboController.getUnreadTicketsCount);

/**
 * GET /api/turbo/tickets/:id/log
 * جلب سجل التذكرة من Turbo
 * يجب أن يأتي قبل /tickets/:id لتجنب التطابق الخاطئ
 */
router.get('/tickets/:id/log', requireAuth, checkAppAccess('order-shipping-turbo'), turboController.getTicketLog);

/**
 * POST /api/turbo/tickets/:id/reply
 * الرد على تذكرة في Turbo
 * يجب أن يأتي قبل /tickets/:id لتجنب التطابق الخاطئ
 */
router.post('/tickets/:id/reply', requireAuth, upload.single('image'), checkAppAccess('order-shipping-turbo'), turboController.replyToTicket);

/**
 * GET /api/turbo/tickets/:id
 * جلب تفاصيل تذكرة معينة من Turbo
 */
router.get('/tickets/:id', requireAuth, checkAppAccess('order-shipping-turbo'), turboController.getTicket);

/**
 * GET /api/turbo/tickets
 * جلب قائمة التذاكر من Turbo
 */
router.get('/tickets', requireAuth, checkAppAccess('order-shipping-turbo'), turboController.getTickets);

module.exports = router;


