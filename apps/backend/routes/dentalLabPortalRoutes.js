const express = require('express');
const multer = require('multer');
const router = express.Router();
const controller = require('../controller/dentalLabPortalController');
const { dentalPortalAuth } = require('../utils/dentalPortalAuth');
const { upload } = require('../utils/dentalLabUpload');

// Public login
router.post('/login', controller.portalLogin);

// Everything else requires dentist auth
router.use(dentalPortalAuth);

router.get('/dashboard', controller.portalDashboard);
router.get('/catalog', controller.portalCatalog);
router.post('/orders', controller.placeOrder);
router.get('/cases', controller.myCases);
router.get('/cases/:id', controller.myCaseDetail);
router.get('/cases/:id/work-order', controller.getWorkOrderPdf);
router.post('/cases/:id/design-approval', controller.designApproval);
router.post('/cases/:id/attachments', upload.single('file'), controller.uploadCaseAttachment);
router.get('/invoices', controller.myInvoices);

// Multer error handler
router.use((err, _req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ success: false, error: 'حجم الملف يتجاوز الحد المسموح' });
    }
    return res.status(400).json({ success: false, error: err.message });
  }
  if (err) {
    return res.status(400).json({ success: false, error: err.message || 'حدث خطأ أثناء رفع الملفات' });
  }
  next();
});

module.exports = router;