const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const controller = require('../controller/factoryPortalController');
const FactoryPortalService = require('../services/factoryPortalService');

const router = express.Router();

// ----------------------------------------------------------------------------
// Multer Upload Configuration for Factory Portal
// ----------------------------------------------------------------------------
const uploadsDir = path.resolve(__dirname, '../uploads/manufacturing');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const unique = uuidv4();
    cb(null, `portal-${unique}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  // Allow common images and videos
  const allowed = /jpeg|jpg|png|webp|gif|svg|mp4|mov|webm|avi|mkv|pdf/;
  const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
  const mime = file.mimetype.toLowerCase();

  if (allowed.test(ext) || mime.startsWith('image/') || mime.startsWith('video/')) {
    cb(null, true);
  } else {
    cb(new Error('نوع الملف غير مدعوم. المسموح: صور، فيديوهات ومستندات'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
});

// ----------------------------------------------------------------------------
// Factory Portal Token Authentication Middleware
// ----------------------------------------------------------------------------
const verifyFactoryPortalToken = async (req, res, next) => {
  try {
    let token =
      req.headers['x-factory-token'] ||
      req.headers['x-access-token'] ||
      req.query.token;

    if (!token && req.headers.authorization) {
      const parts = req.headers.authorization.split(' ');
      if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
        token = parts[1];
      }
    }

    if (!token) {
      return res.status(403).json({
        success: false,
        error: 'رابط البوابة غير صالح أو انتهت صلاحيته (رمز الدخول مفقود)',
      });
    }

    const factory = await FactoryPortalService.verifyToken(token);
    req.factory = factory;
    req.companyId = factory.companyId;
    next();
  } catch (err) {
    return res.status(err.statusCode || 403).json({
      success: false,
      error: err.message || 'تم تعطيل أو إيقاف بوابة هذا المصنع الشريك حالياً',
    });
  }
};

// All portal endpoints require token verification
router.use(verifyFactoryPortalToken);

// ----------------------------------------------------------------------------
// Endpoints
// ----------------------------------------------------------------------------
router.get('/context', controller.getContext);
router.get('/assignments', controller.getAssignments);
router.post('/assignments/:id/confirm-receipt', controller.confirmReceipt);
router.post('/assignments/:id/start', controller.startStage);
router.post('/assignments/:id/update', controller.updateStage);
router.post('/assignments/:id/media', (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ success: false, error: 'حجم الملف يتجاوز الحد المسموح به (50 ميجابايت)' });
      }
      return res.status(400).json({ success: false, error: err.message });
    }
    if (err) {
      return res.status(400).json({ success: false, error: err.message || 'خطأ أثناء رفع الملف' });
    }
    next();
  });
}, controller.uploadMedia);
router.post('/assignments/:id/request-approval', controller.requestApproval);
router.post('/assignments/:id/issues', controller.reportIssue);

module.exports = router;
