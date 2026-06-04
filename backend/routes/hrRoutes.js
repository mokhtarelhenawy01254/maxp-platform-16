/**
 * 👥 HR Routes
 * مسارات API للموارد البشرية
 * Last Updated: 2026-02-11 11:30
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const hrController = require('../controller/hrController');
const recruitmentController = require('../controller/recruitmentController');
const applicationFormController = require('../controller/applicationFormController');
const workReportController = require('../controller/workReportController');
const advanceController = require('../controller/advanceController');
const auditController = require('../controller/auditController');
const assetRoutes = require('./hr/assetRoutes');
const assetReportsRoutes = require('./hr/assetReportsRoutes');
const { requireAuth, requireRole } = require('../middleware/auth');
const { handleHRError } = require('../utils/hrErrors');
const { cacheMiddleware } = require('../middleware/performanceOptimization');

const isDev = process.env.NODE_ENV !== 'production';

// 🛠️ Debug Route - للتحقق من بيانات الموظف في قاعدة البيانات
router.get('/debug/user/:id', (req, res, next) => {
  if (isDev) {
    console.log(`📡 [ROUTE-HIT] /debug/user/${req.params.id}`);
  }
  next();
}, hrController.debugGetUser);

// 🌐 Public Application Form Routes - للمتقدمين (بدون مصادقة)
// Must be defined BEFORE requireAuth
router.get('/recruitment/forms/public/:id', applicationFormController.getPublicForm);
router.post('/recruitment/forms/public/:id/submit', applicationFormController.submitResponse);

// 📎 Public File Upload for Recruitment Form Answers (No Auth Required)
const applicationsDir = path.join(__dirname, '../uploads/hr/applications');
if (!fs.existsSync(applicationsDir)) {
  fs.mkdirSync(applicationsDir, { recursive: true });
}

const applicationFileStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, applicationsDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = uuidv4();
    const extension = path.extname(file.originalname);
    cb(null, `app-${uniqueSuffix}${extension}`);
  }
});

const applicationFileFilter = (req, file, cb) => {
  const allowedMimes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'image/gif',
    'text/plain'
  ];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('نوع الملف غير مسموح به. يرجى رفع PDF، Word، أو صورة فقط.'), false);
  }
};

const applicationUpload = multer({
  storage: applicationFileStorage,
  fileFilter: applicationFileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

router.post('/recruitment/forms/public/upload-file', applicationUpload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'لم يتم رفع أي ملف' });
    }
    const fileUrl = `/uploads/hr/applications/${req.file.filename}`;
    return res.json({
      success: true,
      data: {
        url: fileUrl,
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
        filename: req.file.filename
      }
    });
  } catch (error) {
    console.error('❌ [ApplicationUpload] Error:', error);
    return res.status(500).json({ success: false, message: error.message || 'فشل رفع الملف' });
  }
});

// Multer error handler for upload endpoint
router.use('/recruitment/forms/public/upload-file', (err, req, res, next) => {
  if (err) {
    return res.status(400).json({ success: false, message: err.message || 'فشل رفع الملف' });
  }
  next();
});

if (isDev) {
  console.log('✅ [HR Routes] Loading HR routes...');
}

// تطبيق المصادقة على جميع المسارات (ما عدا test-routes)
router.use((req, res, next) => {
  if (isDev) {
    console.log(`🌐 [HR-ROUTER-ENTRY] ${req.method} ${req.path}`);
  }
  next();
});

router.use(requireAuth);

// Asset Management
router.use('/assets/reports', assetReportsRoutes);
router.use('/assets', assetRoutes);

// 📊 Warnings Statistics - Moved to top to avoid routing conflicts
router.get('/warnings/stats', (req, res, next) => {
  console.log('📡 [ROUTE-HIT] /warnings/stats hit at top level');
  next();
}, hrController.getWarningStats);

// ═══════════════════════════════════════════════════════════════════════════════
// 👤 Employee Self-Service - خدمات الموظف الذاتية
// ═══════════════════════════════════════════════════════════════════════════════

// My Profile
router.get('/employees/me', hrController.getMyProfile);
router.put('/employees/me', hrController.updateMyProfile);

// My Attendance
router.get('/attendance/my-today', hrController.getMyTodayAttendance);
router.get('/attendance/my-stats', hrController.getMyAttendanceStats);
router.get('/attendance/my-recent', hrController.getMyRecentAttendance);


// My Leaves
router.get('/leaves/my-config', hrController.getMyLeaveFormConfig);
router.get('/leaves/my-recent', hrController.getMyRecentLeaves);
router.get('/leaves/my-history', hrController.getMyLeavesHistory);

// (Moved to Promotions section below)

// إعداد multer لرفع مستندات HR
const documentsDir = path.join(__dirname, '../public/uploads/hr/documents');
if (!fs.existsSync(documentsDir)) {
  fs.mkdirSync(documentsDir, { recursive: true });
}

const documentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, documentsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = uuidv4();
    const extension = path.extname(file.originalname);
    cb(null, `doc-${uniqueSuffix}${extension}`);
  }
});

const documentUpload = multer({
  storage: documentStorage,
  limits: {
    fileSize: 25 * 1024 * 1024 // 25MB
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// ⚙️ الإعدادات - Settings
// ═══════════════════════════════════════════════════════════════════════════════

// 🔒 Protected: Only Admins and Managers can manage settings
router.get('/settings', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.getHRSettings);
router.put('/settings', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.updateHRSettings);

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 لوحة التحكم - Dashboard
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/dashboard', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), cacheMiddleware(60000), hrController.getHRDashboard);

// ═══════════════════════════════════════════════════════════════════════════════
// 🔄 المزامنة - Sync
// ═══════════════════════════════════════════════════════════════════════════════

router.post('/sync-users', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER']), hrController.syncUsersToEmployees);


// ═══════════════════════════════════════════════════════════════════════════════
// 🏢 الأقسام - Departments
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/departments/stats', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.getDepartmentStats);
router.get('/departments', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.getDepartments);
router.get('/departments/:id', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.getDepartmentById);
router.post('/departments/with-employees', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.createDepartmentWithEmployees);
router.post('/departments', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.createDepartment);
router.put('/departments/:id', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.updateDepartment);
router.delete('/departments/:id', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.deleteDepartment);

// Positions
router.get('/positions', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER', 'AGENT']), hrController.getPositions);
router.post('/positions', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.createPosition);
router.put('/positions/:id', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.updatePosition);
router.delete('/positions/:id', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.deletePosition);

// Promotions
router.get('/my-promotions', requireAuth, (req, res, next) => {
  console.log('📡 [ROUTE-HIT] /my-promotions matched exactly');
  next();
}, hrController.getMyPromotions);
router.get('/promotions', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER', 'AGENT']), hrController.getPromotions);
router.post('/promotions', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.createPromotion);
router.get('/promotions/:id', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER', 'AGENT']), hrController.getPromotionById);
router.put('/promotions/:id', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.updatePromotion);
router.delete('/promotions/:id', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.deletePromotion);

// ═══════════════════════════════════════════════════════════════════════════════
// 👤 الموظفين - Employees
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/employees/stats', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.getEmployeeStats);
router.get('/employees/organization-chart', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.getOrganizationChart);
router.put('/employees/bulk-salaries', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.updateBulkSalaries);
router.get('/employees', requireAuth, hrController.getEmployees);
router.get('/employees/:id', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.getEmployeeById);
router.post('/employees', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.createEmployee);
router.put('/employees/:id', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.updateEmployee);
router.delete('/employees/:id', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.deleteEmployee);
router.post('/employees/:id/terminate', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.terminateEmployee);
router.post('/employees/:id/link-user', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.linkEmployeeToUser);

// ═══════════════════════════════════════════════════════════════════════════════
// ⏰ الحضور والانصراف - Attendance
// ═══════════════════════════════════════════════════════════════════════════════

// 👥 Public for authenticated users (My actions)
router.post('/attendance/check-in', hrController.checkIn);
router.post('/attendance/check-out', hrController.checkOut);

// 🔒 Protected Management Routes
router.get('/attendance/today', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.getTodayAttendance);
router.get('/attendance/stats', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.getAttendanceStats);
router.get('/attendance/monthly-report', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.getMonthlyAttendanceReport);
router.get('/attendance/export', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.exportAttendance);
router.get('/attendance', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.getAttendance);
router.post('/attendance/manual', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.createManualAttendance);
router.put('/attendance/:id/auto-close-review', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.reviewAutoClosedAttendance);
router.put('/attendance/:id', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.updateAttendance);
router.delete('/attendance/:id', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.deleteAttendance);

// ═══════════════════════════════════════════════════════════════════════════════
// 🏖️ الإجازات - Leaves
// ═══════════════════════════════════════════════════════════════════════════════

// 👥 Public for authenticated users
router.post('/leaves', hrController.createLeaveRequest);
router.get('/leaves/balance/:employeeId', hrController.getLeaveBalance); // Accessible for UI
router.get('/leaves/:id', hrController.getLeaveRequestById); // Accessible for viewing own request
router.post('/leaves/:id/cancel', hrController.cancelLeaveRequest); // Accessible for cancelling own request

// 🔒 Protected Management Routes
router.get('/leaves/stats', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.getLeaveStats);
router.get('/leaves/calendar', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.getLeaveCalendar);
router.get('/leaves', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.getLeaveRequests); // View ALL requests
router.post('/leaves/:id/approve', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.approveLeaveRequest);
router.post('/leaves/:id/reject', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.rejectLeaveRequest);
router.post('/leaves/:id/reopen', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.reopenLeaveRequest); // إعادة فتح طلب إجازة مرفوض
router.put('/leaves/:id', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.updateLeaveRequest); // تحديث بيانات طلب إجازة
router.delete('/leaves/:id', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.deleteLeaveRequest); // حذف نهائي لطلب إجازة

// ═══════════════════════════════════════════════════════════════════════════════
// 🕒 الأذونات - Permissions
// ═══════════════════════════════════════════════════════════════════════════════

const permissionController = require('../controller/hr/permissionController');

// 👥 Public for authenticated users
router.post('/permissions', permissionController.createPermissionRequest);
router.get('/permissions/stats', permissionController.getPermissionStats); // Stats for own profile? Or move to protected?
router.get('/permissions/:requestId', permissionController.getPermissionRequestById);

// 🔒 Protected Management Routes
router.get('/permissions', requireAuth, permissionController.getPermissionRequests);
router.post('/permissions/:requestId/approve', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), permissionController.approvePermissionRequest);
router.post('/permissions/:requestId/reject', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), permissionController.rejectPermissionRequest);
router.delete('/permissions/:requestId', requireAuth, permissionController.deletePermissionRequest);

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 تقييم الأداء - Performance Reviews
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/performance-reviews/stats', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.getPerformanceStats);
router.get('/performance-reviews', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.getPerformanceReviews);
router.get('/performance-reviews/employee/:employeeId', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.getEmployeeReviews);
router.get('/performance-reviews/:id', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.getReviewById);
router.post('/performance-reviews', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.createPerformanceReview);
router.put('/performance-reviews/:id', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.updateReview);
router.delete('/performance-reviews/:id', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.deleteReview);

// ═══════════════════════════════════════════════════════════════════════════════
// 📚 التدريب - Training
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// 📚 التدريب - Training
// ═══════════════════════════════════════════════════════════════════════════════

// 👥 Public
router.get('/trainings', hrController.getTrainings); // Employees can see available trainings

// 🔒 Protected
router.get('/trainings/my', requireAuth, hrController.getMyTrainings);
router.get('/trainings/stats', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.getTrainingStats);
router.get('/trainings/employee/:employeeId', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.getEmployeeTrainings);
router.post('/trainings', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.createTraining);
router.put('/trainings/:id', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.updateTraining);
router.delete('/trainings/:id', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.deleteTraining);

// Specific ID route (must be last)
router.get('/trainings/:id', hrController.getTrainingById);

// ═══════════════════════════════════════════════════════════════════════════════
// (Duplicate section removed)

// ═══════════════════════════════════════════════════════════════════════════════
// ⚠️ الإنذارات - Warnings
// ═══════════════════════════════════════════════════════════════════════════════

// ⚠️ warnings/stats moved to top of file
router.get('/warnings/employee/:employeeId', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.getEmployeeWarnings);
router.get('/warnings', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.getWarnings);
router.post('/warnings', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.createWarning);
router.post('/warnings/:id/admin-acknowledge', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.adminAcknowledgeWarning);
router.put('/warnings/:id', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.updateWarning);
router.delete('/warnings/:id', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.deleteWarning);

// 👥 Public - Parameterized routes come last
router.get('/warnings/my-history', (req, res, next) => {
  console.log('📡 [ROUTE-HIT] /warnings/my-history matched exactly');
  next();
}, hrController.getMyWarnings);

router.post('/warnings/:id/acknowledge', hrController.acknowledgeWarning); // Employees acknowledge their warnings
router.get('/warnings/:id', hrController.getWarningById); // See own warning details


// ═══════════════════════════════════════════════════════════════════════════════
// 💵 سجل الرواتب - Salary History
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/salary-history', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.getSalaryHistory);
router.get('/salary-history/stats', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.getSalaryHistoryStats);
router.get('/salary-history/promotions-report', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.getPromotionsReport);
router.get('/salary-history/employee/:employeeId', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.getEmployeeSalaryHistory);
router.get('/salary-history/:id', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.getSalaryHistoryById);
router.post('/salary-history', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.createSalaryHistory);

// ═══════════════════════════════════════════════════════════════════════════════
// 📄 المستندات - Documents
// ═══════════════════════════════════════════════════════════════════════════════

// 👥 Public (to upload/view own documents - handled in controller logic usually, but here we protect stats)
router.get('/documents/stats', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.getDocumentStats);
router.get('/documents/expired', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.getExpiredDocuments);
router.get('/documents/employee/:employeeId', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.getEmployeeDocuments); // Usually only HR views others' docs
router.get('/documents/:id', hrController.getDocumentById);
router.post('/documents', documentUpload.single('file'), hrController.createDocument); // Employees can upload
router.put('/documents/:id', hrController.updateDocument);
router.delete('/documents/:id', hrController.deleteDocument);

// 🔒 Protected verification
router.post('/documents/:id/verify', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.verifyDocument);

// ═══════════════════════════════════════════════════════════════════════════════
// 💰 الرواتب - Payroll
// ═══════════════════════════════════════════════════════════════════════════════

// My Payroll routes (must come BEFORE /payroll/:id to avoid conflicts)
router.get('/payroll/my-last', hrController.getMyLastPayroll);
router.get('/payroll/my-history', (req, res, next) => {
  console.log('🔍 [HR-ROUTES] /payroll/my-history called');
  console.log('🔍 [HR-ROUTES] User:', req.user);
  next();
}, hrController.getMyPayrollHistory);
router.get('/payroll/my-projection', hrController.getMyPayrollProjection);
router.get('/my-payroll', hrController.getMyPayroll);

// Admin Payroll routes
router.get('/payroll/summary', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.getPayrollSummary);
router.get('/payroll/annual-report', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.getAnnualPayrollReport);
router.get('/payroll', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.getPayrolls);
router.get('/payroll/:id', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.getPayrollById);
router.post('/payroll', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.createPayroll);
router.post('/payroll/generate', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.generateMonthlyPayroll);
router.post('/payroll/bulk-pay', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.bulkMarkPayrollAsPaid);
router.post('/payroll/bulk-approve', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.bulkApprovePayroll);
router.put('/payroll/:id', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.updatePayroll);
router.post('/payroll/:id/approve', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.approvePayroll);
router.post('/payroll/:id/pay', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.markPayrollAsPaid);
router.delete('/payroll/:id', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.deletePayroll);

// ═══════════════════════════════════════════════════════════════════════════════
// 🕐 المناوبات - Shifts
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/shifts/stats', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.getShiftStats);
router.get('/shifts', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.getShifts);
router.get('/shifts/:id', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.getShiftById);
router.post('/shifts', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.createShift);
router.put('/shifts/:id', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.updateShift);
router.delete('/shifts/:id', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.deleteShift);
router.post('/shifts/assign', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.assignShift);
router.post('/shifts/bulk-assign', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.bulkAssignShift);
router.get('/shifts/employee/:employeeId', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.getEmployeeAssignments);
router.delete('/shifts/assignments/:id', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.removeAssignment);

// ═══════════════════════════════════════════════════════════════════════════════
// 💎 المزايا - Benefits
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/benefits/stats', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.getBenefitStats);
router.get('/benefits', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.getBenefits);
router.get('/benefits/:id', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.getBenefitById);
router.post('/benefits', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.createBenefit);
router.put('/benefits/:id', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.updateBenefit);
router.delete('/benefits/:id', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.deleteBenefit);
router.post('/benefits/enroll', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.enrollEmployee);
router.get('/benefits/employee/:employeeId', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.getEmployeeEnrollments);
router.put('/benefits/enrollments/:id', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.updateEnrollment);

// ═══════════════════════════════════════════════════════════════════════════════
// 📈 الأهداف - Goals
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/goals/stats', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.getGoalStats);
router.get('/goals', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.getGoals);
router.get('/goals/:id', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.getGoalById);
router.post('/goals', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.createGoal);
router.put('/goals/:id', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.updateGoal);
router.delete('/goals/:id', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.deleteGoal);

// ═══════════════════════════════════════════════════════════════════════════════
// 💬 التغذية الراجعة - Feedback (Updated: 2026-01-11)
// ═══════════════════════════════════════════════════════════════════════════════

// 👥 Public - Employees can create feedback
router.post('/feedback', hrController.createFeedback);

// 🔒 Protected - HR can view all, Employees view their own (handled in controller)
router.get('/feedback/stats', requireAuth, hrController.getFeedbackStats);
router.get('/feedback', requireAuth, hrController.getFeedback);
router.get('/feedback/:id', requireAuth, hrController.getFeedbackById);
router.post('/feedback/:id/reply', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.replyToFeedback);
router.put('/feedback/:id', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.updateFeedback);
router.delete('/feedback/:id', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.deleteFeedback);

// ═══════════════════════════════════════════════════════════════════════════════
// 📝 الاستقالات - Resignations
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/resignations/stats', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.getResignationStats);
router.get('/resignations/my', requireAuth, hrController.getMyResignations);
router.get('/resignations', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.getResignations);
router.get('/resignations/:id', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.getResignationById);
router.post('/resignations', hrController.createResignation); // Start own resignation? May require policy check
router.put('/resignations/:id', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.updateResignation);
router.get('/resignations/:id/clearance', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.getClearanceChecklist);
router.patch('/resignations/clearance/:itemId', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.updateClearanceItem);
router.get('/resignations/:id/settlement', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.getFinalSettlement);
router.post('/resignations/:id/settlement/approve', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.approveFinalSettlement);

// ═══════════════════════════════════════════════════════════════════════════════
// 🤖 الخصومات التلقائية - Auto Deductions
// ═══════════════════════════════════════════════════════════════════════════════

// TODO: تفعيل بعد تحويل autoDeductionService لاستخدام Prisma بدلاً من MySQL مباشرة
// const autoDeductionRoutes = require('./hr/autoDeductionRoutes');
// router.use('/auto-deductions', autoDeductionRoutes);

// ═══════════════════════════════════════════════════════════════════════════════
// 💰 السلف - Advances
// ═══════════════════════════════════════════════════════════════════════════════

// 👥 Public - Employees can create and view their own advances
router.get('/advances/my', requireAuth, advanceController.getMyAdvances);
router.get('/advances/my-config', requireAuth, advanceController.getMyAdvanceConfig);
router.post('/advances', requireAuth, advanceController.createAdvanceRequest);

// 🔒 Protected - Only HR can view all and manage
router.get('/advances', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), advanceController.getAllAdvances);
router.post('/advances/:id/approve', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), advanceController.approveAdvanceRequest);
router.post('/advances/:id/reject', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), advanceController.rejectAdvanceRequest);
router.post('/advances/:id/mark-paid', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER', 'AGENT']), advanceController.markAdvancePaid);
router.delete('/advances/:id', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), advanceController.deleteAdvanceRequest);


// ═══════════════════════════════════════════════════════════════════════════════
// 📅 العطلات الرسمية - Public Holidays
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/public-holidays', hrController.getPublicHolidays); // Public read
router.put('/public-holidays', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.updatePublicHolidays);

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 التقارير - Reports
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/reports/employee', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.getEmployeeReport);
router.get('/reports/attendance', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.getAttendanceReport);
router.get('/reports/performance', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.getPerformanceReport);
router.get('/reports/leaves', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.getLeaveReport);
router.get('/reports/payroll', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.getPayrollReport);

// ═══════════════════════════════════════════════════════════════════════════════
// 🎯 التوظيف - Recruitment
// ═══════════════════════════════════════════════════════════════════════════════

// الوظائف - Jobs
router.get('/recruitment/jobs', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), recruitmentController.getJobPostings);
router.post('/recruitment/jobs', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), recruitmentController.createJobPosting);
router.put('/recruitment/jobs/:id/status', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), recruitmentController.updateJobPostingStatus);
router.delete('/recruitment/jobs/:id', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), recruitmentController.deleteJobPosting);

// المتقدمين - Applicants
router.get('/recruitment/applicants', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), recruitmentController.getApplicants);
router.post('/recruitment/applicants', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), recruitmentController.createApplicant);
router.put('/recruitment/applicants/:id/status', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), recruitmentController.updateApplicantStatus);
router.delete('/recruitment/applicants/:id', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), recruitmentController.deleteApplicant);

// المقابلات - Interviews
router.get('/recruitment/interviews', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), recruitmentController.getInterviews);
router.post('/recruitment/interviews', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), recruitmentController.scheduleInterview);
router.put('/recruitment/interviews/:id/status', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), recruitmentController.updateInterviewStatus);

// الإحصائيات - Stats
router.get('/recruitment/stats', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), recruitmentController.getStats);


router.get('/recruitment/pipeline-stats', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), recruitmentController.getPipelineStats);

// ═══════════════════════════════════════════════════════════════════════════════
// 📋 استبيانات التوظيف - Application Forms
// ═══════════════════════════════════════════════════════════════════════════════

// 🔒 Protected - إدارة الاستبيانات
router.get('/recruitment/forms', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), applicationFormController.getForms);
router.get('/recruitment/forms/:id', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), applicationFormController.getFormById);
router.post('/recruitment/forms', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), applicationFormController.createForm);
router.put('/recruitment/forms/:id', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), applicationFormController.updateForm);
router.delete('/recruitment/forms/:id', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), applicationFormController.deleteForm);

// إدارة الأسئلة
router.post('/recruitment/forms/:id/questions', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), applicationFormController.addQuestion);
router.put('/recruitment/forms/:id/questions/:questionId', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), applicationFormController.updateQuestion);
router.delete('/recruitment/forms/:id/questions/:questionId', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), applicationFormController.deleteQuestion);

// إدارة الردود
router.get('/recruitment/forms/:id/responses', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), applicationFormController.getFormResponses);
router.get('/recruitment/responses/:responseId', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), applicationFormController.getResponseById);
router.post('/recruitment/responses/:responseId/convert-to-applicant', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), applicationFormController.convertResponseToApplicant);
router.put('/recruitment/responses/:responseId/contact-status', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), applicationFormController.updateResponseContactStatus);
router.delete('/recruitment/responses/:responseId', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), applicationFormController.deleteResponse);

// Dynamic work reporting forms
router.get('/reporting/forms', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), workReportController.getForms);
router.post('/reporting/forms', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), workReportController.createForm);
router.get('/reporting/forms/:id', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), workReportController.getFormById);
router.put('/reporting/forms/:id', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), workReportController.updateForm);
router.delete('/reporting/forms/:id', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), workReportController.deleteForm);
router.get('/reporting/forms/:id/records', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), workReportController.getFormRecords);
router.get('/reporting/forms/:id/fill-context', requireAuth, workReportController.getFillContext);
router.post('/reporting/forms/:id/submit', requireAuth, workReportController.submitForm);

// ═══════════════════════════════════════════════════════════════════════════════
// 📝 سجلات التدقيق - Audit Logs
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/audit-logs/stats', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), auditController.getAuditStats);
router.get('/audit-logs', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), auditController.getAuditLogs);

// ═══════════════════════════════════════════════════════════════════════════════
// 📝 سياسات الشركة - Company Policies
// ═══════════════════════════════════════════════════════════════════════════════

// 👥 Public for employees (read only)
router.get('/policies', requireAuth, hrController.getPolicies);

// 🔒 Protected Management Routes
router.post('/policies', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.createPolicy);
router.put('/policies/:id', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.updatePolicy);
router.delete('/policies/:id', requireAuth, requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.deletePolicy);

// ═══════════════════════════════════════════════════════════════════════════════
// 🌐 Unified Dashboard - لوحة التحكم الموحدة
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/my-companies/today', requireAuth, hrController.getMyCompaniesToday);
router.get('/my-companies/attendance-report', requireAuth, hrController.getMyCompaniesAttendanceReport);
router.get('/my-companies/export', requireAuth, hrController.exportMyCompaniesReport);

// Central error handler for all HR routes - MUST be last
router.use(handleHRError);

module.exports = router;
