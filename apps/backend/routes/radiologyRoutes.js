const express = require('express');
const router = express.Router();
const multer = require('multer');
const controller = require('../controller/radiologyController');
const examCategories = require('../controller/radiologyExamCategoriesController');
const verifyToken = require('../utils/verifyToken');
const checkAppAccess = require('../middleware/checkAppAccess');

const MANAGER_ROLES = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER'];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024, files: 200 },
  fileFilter: (_req, file, cb) => {
    const name = String(file.originalname || '').toLowerCase();
    const mimetype = String(file.mimetype || '').toLowerCase();
    if (name.endsWith('.dcm') || mimetype === 'application/dicom' || mimetype === 'application/octet-stream') {
      cb(null, true);
    } else {
      cb(new Error('يُسمح فقط بملفات DICOM (dcm.)'));
    }
  },
});

router.use(verifyToken.authenticateToken);
router.use(checkAppAccess('radiology-app'));

// Exam types
router.get('/exam-types', controller.listExamTypes);
router.post('/exam-types', verifyToken.requireRole(MANAGER_ROLES), controller.createExamType);
router.put('/exam-types/:id', verifyToken.requireRole(MANAGER_ROLES), controller.updateExamType);
router.delete('/exam-types/:id', verifyToken.requireRole(MANAGER_ROLES), controller.deleteExamType);

// Exam categories
router.get('/exam-categories', examCategories.listCategories);
router.post('/exam-categories', verifyToken.requireRole(MANAGER_ROLES), examCategories.createCategory);
router.put('/exam-categories/:id', verifyToken.requireRole(MANAGER_ROLES), examCategories.updateCategory);
router.delete('/exam-categories/:id', verifyToken.requireRole(MANAGER_ROLES), examCategories.deleteCategory);

// Studies
router.get('/studies', controller.listStudies);
router.post('/studies', controller.createStudy);
router.post('/studies/:id/duplicate', verifyToken.requireRole(MANAGER_ROLES), controller.duplicateStudy);
router.get('/studies/:id/report', controller.getStudyReport);
router.put('/studies/:id/report', controller.upsertStudyReport);
router.put('/studies/:id/report/:kind', verifyToken.requireRole(MANAGER_ROLES), controller.advanceReport);
router.get('/studies/:id/report/pdf', controller.getStudyReportPdf);
router.put('/studies/:id/deliver', verifyToken.requireRole(MANAGER_ROLES), controller.markDelivered);
router.get('/studies/:id/details', controller.getStudyDetails);
router.get('/studies/:id', controller.getStudy);
router.put('/studies/:id', controller.updateStudy);

// Contracts
router.get('/contracts', controller.listContracts);
router.post('/contracts', verifyToken.requireRole(MANAGER_ROLES), controller.createContract);
router.put('/contracts/:id', verifyToken.requireRole(MANAGER_ROLES), controller.updateContract);
router.delete('/contracts/:id', verifyToken.requireRole(MANAGER_ROLES), controller.deleteContract);

// Report templates
router.get('/report-templates', controller.listReportTemplates);
router.post('/report-templates', verifyToken.requireRole(MANAGER_ROLES), controller.createReportTemplate);
router.put('/report-templates/:id', verifyToken.requireRole(MANAGER_ROLES), controller.updateReportTemplate);
router.delete('/report-templates/:id', verifyToken.requireRole(MANAGER_ROLES), controller.deleteReportTemplate);

// Images
router.post('/studies/:id/images', upload.array('files', 200), controller.uploadStudyImages);
router.get('/studies/:id/images/:imageId', controller.getStudyImageFile);
router.get('/studies/:id/images/:imageId/file', controller.getStudyImageFile);
router.delete('/studies/:id/images/:imageId', verifyToken.requireRole(MANAGER_ROLES), controller.deleteStudyImage);

// Multer error handler
router.use((err, _req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ success: false, error: 'حجم الملف يتجاوز الحد المسموح' });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ success: false, error: 'عدد الملفات يتجاوز الحد المسموح' });
    }
    return res.status(400).json({ success: false, error: err.message });
  }
  if (err) {
    return res.status(400).json({ success: false, error: err.message || 'حدث خطأ أثناء رفع الملفات' });
  }
  next();
});

module.exports = router;
