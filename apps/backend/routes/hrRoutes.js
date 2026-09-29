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
const employeeInvitationController = require('../controller/employeeInvitationController');
const recruitmentController = require('../controller/recruitmentController');
const applicationFormController = require('../controller/applicationFormController');
const workReportController = require('../controller/workReportController');
const advanceController = require('../controller/advanceController');
const auditController = require('../controller/auditController');
const hrExternalController = require('../controller/hr/hrExternalController');
const assetRoutes = require('./hr/assetRoutes');
const assetReportsRoutes = require('./hr/assetReportsRoutes');
const verifyToken = require("../utils/verifyToken");
const { handleHRError } = require('../utils/hrErrors');
const { cacheMiddleware } = require('../middleware/performanceOptimization');
const checkAppAccess = require('../middleware/checkAppAccess');

const isDev = process.env.NODE_ENV !== 'production';

// 🛠️ Debug Route - للتحقق من بيانات الموظف في قاعدة البيانات
router.get('/debug/user/:id', (req, res, next) => {
  if (isDev) {
    console.log(`📡 [ROUTE-HIT] /debug/user/${req.params.id}`);
  }
  next();
}, hrController.debugGetUser);

// 🌐 Public Application Form Routes - للمتقدمين (بدون مصادقة)
// Must be defined BEFORE verifyToken.authenticateToken
router.get('/recruitment/forms/public/:id', applicationFormController.getPublicForm);
router.post('/recruitment/forms/public/:id/submit', applicationFormController.submitResponse);

// 🔗 Public Employee Self-Onboarding Routes - روابط انضمام الموظفين الذاتي (بدون مصادقة)
router.get('/employee-invitations/verify/:token', employeeInvitationController.verifyEmployeeInvitation);
router.post('/employee-invitations/accept/:token', employeeInvitationController.acceptEmployeeInvitation);

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

router.use(verifyToken.authenticateToken);
router.use(checkAppAccess('hr-core'));

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
router.get('/online-team', verifyToken.authenticateToken, hrController.getOnlineTeam);
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
router.get('/settings', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.getHRSettings);
router.put('/settings', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.updateHRSettings);

// 🔑 إدارة مفاتيح الـ API الخارجية والـ Webhooks (Admin Only)
router.get('/external-api/keys', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER']), hrExternalController.listApiCredentials);
router.post('/external-api/keys', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER']), hrExternalController.createApiCredential);
router.delete('/external-api/keys/:id', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER']), hrExternalController.revokeApiCredential);

router.get('/external-api/webhooks', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER']), hrExternalController.listWebhookEndpoints);
router.post('/external-api/webhooks', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER']), hrExternalController.createWebhookEndpoint);

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 لوحة التحكم - Dashboard
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/dashboard', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), cacheMiddleware(60000), hrController.getHRDashboard);

// ═══════════════════════════════════════════════════════════════════════════════
// 🔄 المزامنة - Sync
// ═══════════════════════════════════════════════════════════════════════════════

router.post('/sync-users', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER']), hrController.syncUsersToEmployees);


// ═══════════════════════════════════════════════════════════════════════════════
// 🏢 الأقسام - Departments
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/departments/stats', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.getDepartmentStats);
router.get('/departments', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.getDepartments);
router.get('/departments/:id', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.getDepartmentById);
router.post('/departments/with-employees', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.createDepartmentWithEmployees);
router.post('/departments', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.createDepartment);
router.put('/departments/:id', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.updateDepartment);
router.delete('/departments/:id', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.deleteDepartment);

// Positions
router.get('/positions', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER', 'AGENT']), hrController.getPositions);
router.post('/positions', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.createPosition);
router.put('/positions/:id', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.updatePosition);
router.delete('/positions/:id', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.deletePosition);

// Promotions
router.get('/my-promotions', verifyToken.authenticateToken, (req, res, next) => {
  console.log('📡 [ROUTE-HIT] /my-promotions matched exactly');
  next();
}, hrController.getMyPromotions);
router.get('/promotions', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER', 'AGENT']), hrController.getPromotions);
router.post('/promotions', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.createPromotion);
router.get('/promotions/:id', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER', 'AGENT']), hrController.getPromotionById);
router.put('/promotions/:id', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.updatePromotion);
router.delete('/promotions/:id', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.deletePromotion);

// ═══════════════════════════════════════════════════════════════════════════════
// 👤 الموظفين - Employees
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/employees/stats', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.getEmployeeStats);
router.get('/employees/organization-chart', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.getOrganizationChart);
router.put('/employees/bulk-salaries', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.updateBulkSalaries);
router.get('/employees/lookup-user', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.lookupUser);
router.get('/employees', verifyToken.authenticateToken, hrController.getEmployees);
router.get('/employees/:id', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.getEmployeeById);
router.post('/employees', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.createEmployee);
router.put('/employees/:id', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.updateEmployee);
router.delete('/employees/:id', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.deleteEmployee);
router.post('/employees/:id/terminate', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.terminateEmployee);
router.post('/employees/:id/link-user', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.linkEmployeeToUser);

// 🔗 دعوات وانضمام الموظفين الذاتي - Employee Invitations Management (Admin)
router.post('/employee-invitations', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), employeeInvitationController.createEmployeeInvitation);
router.get('/employee-invitations', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), employeeInvitationController.listEmployeeInvitations);
router.delete('/employee-invitations/:id', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), employeeInvitationController.revokeEmployeeInvitation);

// ═══════════════════════════════════════════════════════════════════════════════
// ⏰ الحضور والانصراف - Attendance
// ═══════════════════════════════════════════════════════════════════════════════

// 👥 Public for authenticated users (My actions)
router.post('/attendance/check-in', hrController.checkIn);
router.post('/attendance/check-out', hrController.checkOut);

// 🔒 Protected Management Routes
router.get('/attendance/today', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.getTodayAttendance);
router.get('/attendance/stats', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.getAttendanceStats);
router.get('/attendance/monthly-report', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.getMonthlyAttendanceReport);
router.get('/attendance/export', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.exportAttendance);
router.get('/attendance', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.getAttendance);
router.post('/attendance/manual', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.createManualAttendance);
router.put('/attendance/:id/auto-close-review', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.reviewAutoClosedAttendance);
router.put('/attendance/:id', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.updateAttendance);
router.delete('/attendance/:id', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.deleteAttendance);

// ═══════════════════════════════════════════════════════════════════════════════
// 🏖️ الإجازات - Leaves
// ═══════════════════════════════════════════════════════════════════════════════

// 👥 Public for authenticated users
router.post('/leaves', hrController.createLeaveRequest);
router.get('/leaves/balance/:employeeId', hrController.getLeaveBalance); // Accessible for UI
router.get('/leaves/:id', hrController.getLeaveRequestById); // Accessible for viewing own request
router.post('/leaves/:id/cancel', hrController.cancelLeaveRequest); // Accessible for cancelling own request

// 🔒 Protected Management Routes
router.get('/leaves/stats', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.getLeaveStats);
router.get('/leaves/calendar', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.getLeaveCalendar);
router.get('/leaves', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.getLeaveRequests); // View ALL requests
router.post('/leaves/:id/approve', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.approveLeaveRequest);
router.post('/leaves/:id/reject', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.rejectLeaveRequest);
router.post('/leaves/:id/reopen', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.reopenLeaveRequest); // إعادة فتح طلب إجازة مرفوض
router.put('/leaves/:id', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.updateLeaveRequest); // تحديث بيانات طلب إجازة
router.delete('/leaves/:id', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.deleteLeaveRequest); // حذف نهائي لطلب إجازة

// ═══════════════════════════════════════════════════════════════════════════════
// 🕒 الأذونات - Permissions
// ═══════════════════════════════════════════════════════════════════════════════

const permissionController = require('../controller/hr/permissionController');

// 👥 Public for authenticated users
router.post('/permissions', permissionController.createPermissionRequest);
router.get('/permissions/stats', permissionController.getPermissionStats); // Stats for own profile? Or move to protected?
router.get('/permissions/:requestId', permissionController.getPermissionRequestById);

// 🔒 Protected Management Routes
router.get('/permissions', verifyToken.authenticateToken, permissionController.getPermissionRequests);
router.post('/permissions/:requestId/approve', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), permissionController.approvePermissionRequest);
router.post('/permissions/:requestId/reject', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), permissionController.rejectPermissionRequest);
router.delete('/permissions/:requestId', verifyToken.authenticateToken, permissionController.deletePermissionRequest);

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 تقييم الأداء - Performance Reviews
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/performance-reviews/stats', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.getPerformanceStats);
router.get('/performance-reviews', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.getPerformanceReviews);
router.get('/performance-reviews/employee/:employeeId', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.getEmployeeReviews);
router.get('/performance-reviews/:id', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.getReviewById);
router.post('/performance-reviews', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.createPerformanceReview);
router.put('/performance-reviews/:id', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.updateReview);
router.delete('/performance-reviews/:id', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.deleteReview);

// ═══════════════════════════════════════════════════════════════════════════════
// 📚 التدريب - Training
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// 📚 التدريب - Training
// ═══════════════════════════════════════════════════════════════════════════════

// 👥 Public
router.get('/trainings', hrController.getTrainings); // Employees can see available trainings

// 🔒 Protected
router.get('/trainings/my', verifyToken.authenticateToken, hrController.getMyTrainings);
router.get('/trainings/stats', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.getTrainingStats);
router.get('/trainings/employee/:employeeId', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.getEmployeeTrainings);
router.post('/trainings', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.createTraining);
router.put('/trainings/:id', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.updateTraining);
router.delete('/trainings/:id', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.deleteTraining);

// Specific ID route (must be last)
router.get('/trainings/:id', hrController.getTrainingById);

// ═══════════════════════════════════════════════════════════════════════════════
// (Duplicate section removed)

// ═══════════════════════════════════════════════════════════════════════════════
// ⚠️ الإنذارات - Warnings
// ═══════════════════════════════════════════════════════════════════════════════

// ⚠️ warnings/stats moved to top of file
router.get('/warnings/employee/:employeeId', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.getEmployeeWarnings);
router.get('/warnings', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.getWarnings);
router.post('/warnings', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.createWarning);
router.post('/warnings/:id/admin-acknowledge', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.adminAcknowledgeWarning);
router.put('/warnings/:id', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.updateWarning);
router.delete('/warnings/:id', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.deleteWarning);

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

router.get('/salary-history', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.getSalaryHistory);
router.get('/salary-history/stats', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.getSalaryHistoryStats);
router.get('/salary-history/promotions-report', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.getPromotionsReport);
router.get('/salary-history/employee/:employeeId', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.getEmployeeSalaryHistory);
router.get('/salary-history/:id', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.getSalaryHistoryById);
router.post('/salary-history', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.createSalaryHistory);

// ═══════════════════════════════════════════════════════════════════════════════
// 📄 المستندات - Documents
// ═══════════════════════════════════════════════════════════════════════════════

// 👥 Public (to upload/view own documents - handled in controller logic usually, but here we protect stats)
router.get('/documents/stats', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.getDocumentStats);
router.get('/documents/expired', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.getExpiredDocuments);
router.get('/documents/employee/:employeeId', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.getEmployeeDocuments); // Usually only HR views others' docs
router.get('/documents/:id', hrController.getDocumentById);
router.post('/documents', documentUpload.single('file'), hrController.createDocument); // Employees can upload
router.put('/documents/:id', hrController.updateDocument);
router.delete('/documents/:id', hrController.deleteDocument);

// 🔒 Protected verification
router.post('/documents/:id/verify', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.verifyDocument);

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
router.get('/payroll/summary', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.getPayrollSummary);
router.get('/payroll/annual-report', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.getAnnualPayrollReport);
router.get('/payroll', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.getPayrolls);
router.get('/payroll/:id', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.getPayrollById);
router.post('/payroll', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.createPayroll);
router.post('/payroll/generate', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.generateMonthlyPayroll);
router.post('/payroll/auto-calculate', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.autoCalculateAndDeductPayrolls);
router.get('/payroll/auto-status', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.getPayrollAutomationStatus);
router.post('/payroll/bulk-pay', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.bulkMarkPayrollAsPaid);
router.post('/payroll/bulk-approve', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.bulkApprovePayroll);
router.put('/payroll/:id', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.updatePayroll);
router.post('/payroll/:id/approve', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.approvePayroll);
router.post('/payroll/:id/pay', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.markPayrollAsPaid);
router.delete('/payroll/:id', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.deletePayroll);

// ═══════════════════════════════════════════════════════════════════════════════
// 🕐 المناوبات - Shifts
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/shifts/stats', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.getShiftStats);
router.get('/shifts', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.getShifts);
router.get('/shifts/:id', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.getShiftById);
router.post('/shifts', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.createShift);
router.put('/shifts/:id', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.updateShift);
router.delete('/shifts/:id', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.deleteShift);
router.post('/shifts/assign', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.assignShift);
router.post('/shifts/bulk-assign', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.bulkAssignShift);
router.get('/shifts/employee/:employeeId', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.getEmployeeAssignments);
router.delete('/shifts/assignments/:id', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.removeAssignment);

// ═══════════════════════════════════════════════════════════════════════════════
// 💎 المزايا - Benefits
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/benefits/stats', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.getBenefitStats);
router.get('/benefits', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.getBenefits);
router.get('/benefits/:id', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.getBenefitById);
router.post('/benefits', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.createBenefit);
router.put('/benefits/:id', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.updateBenefit);
router.delete('/benefits/:id', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.deleteBenefit);
router.post('/benefits/enroll', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.enrollEmployee);
router.get('/benefits/employee/:employeeId', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.getEmployeeEnrollments);
router.put('/benefits/enrollments/:id', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.updateEnrollment);

// ═══════════════════════════════════════════════════════════════════════════════
// 📈 الأهداف - Goals
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/goals/stats', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.getGoalStats);
router.get('/goals', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.getGoals);
router.get('/goals/:id', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.getGoalById);
router.post('/goals', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.createGoal);
router.put('/goals/:id', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.updateGoal);
router.delete('/goals/:id', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.deleteGoal);

// ═══════════════════════════════════════════════════════════════════════════════
// 💬 التغذية الراجعة - Feedback (Updated: 2026-01-11)
// ═══════════════════════════════════════════════════════════════════════════════

// 👥 Public - Employees can create feedback
router.post('/feedback', hrController.createFeedback);

// 🔒 Protected - HR can view all, Employees view their own (handled in controller)
router.get('/feedback/stats', verifyToken.authenticateToken, hrController.getFeedbackStats);
router.get('/feedback', verifyToken.authenticateToken, hrController.getFeedback);
router.get('/feedback/:id', verifyToken.authenticateToken, hrController.getFeedbackById);
router.post('/feedback/:id/reply', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.replyToFeedback);
router.put('/feedback/:id', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.updateFeedback);
router.delete('/feedback/:id', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.deleteFeedback);

// ═══════════════════════════════════════════════════════════════════════════════
// 📝 الاستقالات - Resignations
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/resignations/stats', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.getResignationStats);
router.get('/resignations/my', verifyToken.authenticateToken, hrController.getMyResignations);
router.get('/resignations', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.getResignations);
router.get('/resignations/:id', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.getResignationById);
router.post('/resignations', hrController.createResignation); // Start own resignation? May require policy check
router.put('/resignations/:id', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.updateResignation);
router.get('/resignations/:id/clearance', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.getClearanceChecklist);
router.patch('/resignations/clearance/:itemId', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.updateClearanceItem);
router.get('/resignations/:id/settlement', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.getFinalSettlement);
router.post('/resignations/:id/settlement/approve', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.approveFinalSettlement);

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
router.get('/advances/my', verifyToken.authenticateToken, advanceController.getMyAdvances);
router.get('/advances/my-config', verifyToken.authenticateToken, advanceController.getMyAdvanceConfig);
router.post('/advances', verifyToken.authenticateToken, advanceController.createAdvanceRequest);

// 🔒 Protected - Only HR can view all and manage
router.get('/advances', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), advanceController.getAllAdvances);
router.post('/advances/:id/approve', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), advanceController.approveAdvanceRequest);
router.post('/advances/:id/reject', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), advanceController.rejectAdvanceRequest);
router.post('/advances/:id/mark-paid', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER', 'AGENT']), advanceController.markAdvancePaid);
router.delete('/advances/:id', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), advanceController.deleteAdvanceRequest);


// ═══════════════════════════════════════════════════════════════════════════════
// 📅 العطلات الرسمية - Public Holidays
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/public-holidays', hrController.getPublicHolidays); // Public read
router.put('/public-holidays', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.updatePublicHolidays);

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 التقارير - Reports
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/reports/employee', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.getEmployeeReport);
router.get('/reports/attendance', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.getAttendanceReport);
router.get('/reports/absent-days', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.getAbsentDaysReport);
router.get('/reports/attendance-sheet', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.getAttendanceSheetReport);
router.get('/reports/performance', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.getPerformanceReport);
router.get('/reports/leaves', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.getLeaveReport);
router.get('/reports/payroll', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.getPayrollReport);

// ═══════════════════════════════════════════════════════════════════════════════
// 🎯 التوظيف - Recruitment
// ═══════════════════════════════════════════════════════════════════════════════

// الوظائف - Jobs
router.get('/recruitment/jobs', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), recruitmentController.getJobPostings);
router.post('/recruitment/jobs', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), recruitmentController.createJobPosting);
router.put('/recruitment/jobs/:id/status', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), recruitmentController.updateJobPostingStatus);
router.delete('/recruitment/jobs/:id', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), recruitmentController.deleteJobPosting);

// المتقدمين - Applicants
router.get('/recruitment/applicants', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), recruitmentController.getApplicants);
router.post('/recruitment/applicants', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), recruitmentController.createApplicant);
router.put('/recruitment/applicants/:id/status', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), recruitmentController.updateApplicantStatus);
router.delete('/recruitment/applicants/:id', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), recruitmentController.deleteApplicant);

// المقابلات - Interviews
router.get('/recruitment/interviews', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), recruitmentController.getInterviews);
router.post('/recruitment/interviews', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), recruitmentController.scheduleInterview);
router.put('/recruitment/interviews/:id/status', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), recruitmentController.updateInterviewStatus);

// الإحصائيات - Stats
router.get('/recruitment/stats', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), recruitmentController.getStats);


router.get('/recruitment/pipeline-stats', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), recruitmentController.getPipelineStats);

// ═══════════════════════════════════════════════════════════════════════════════
// 📋 استبيانات التوظيف - Application Forms
// ═══════════════════════════════════════════════════════════════════════════════

// 🔒 Protected - إدارة الاستبيانات
router.get('/recruitment/forms', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), applicationFormController.getForms);
router.get('/recruitment/forms/:id', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), applicationFormController.getFormById);
router.post('/recruitment/forms', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), applicationFormController.createForm);
router.put('/recruitment/forms/:id', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), applicationFormController.updateForm);
router.delete('/recruitment/forms/:id', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), applicationFormController.deleteForm);

// إدارة الأسئلة
router.post('/recruitment/forms/:id/questions', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), applicationFormController.addQuestion);
router.put('/recruitment/forms/:id/questions/:questionId', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), applicationFormController.updateQuestion);
router.delete('/recruitment/forms/:id/questions/:questionId', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), applicationFormController.deleteQuestion);

// إدارة الردود
router.get('/recruitment/forms/:id/responses', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), applicationFormController.getFormResponses);
router.get('/recruitment/responses/:responseId', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), applicationFormController.getResponseById);
router.post('/recruitment/responses/:responseId/convert-to-applicant', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), applicationFormController.convertResponseToApplicant);
router.put('/recruitment/responses/:responseId/contact-status', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), applicationFormController.updateResponseContactStatus);
router.delete('/recruitment/responses/:responseId', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), applicationFormController.deleteResponse);

// Dynamic work reporting forms
router.get('/reporting/forms', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), workReportController.getForms);
router.post('/reporting/forms', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), workReportController.createForm);
router.get('/reporting/forms/:id', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), workReportController.getFormById);
router.put('/reporting/forms/:id', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), workReportController.updateForm);
router.delete('/reporting/forms/:id', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), workReportController.deleteForm);
router.get('/reporting/forms/:id/records', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), workReportController.getFormRecords);
router.get('/reporting/forms/:id/fill-context', verifyToken.authenticateToken, workReportController.getFillContext);
router.post('/reporting/forms/:id/submit', verifyToken.authenticateToken, workReportController.submitForm);

// ═══════════════════════════════════════════════════════════════════════════════
// 📝 سجلات التدقيق - Audit Logs
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/audit-logs/stats', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), auditController.getAuditStats);
router.get('/audit-logs', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), auditController.getAuditLogs);

// ═══════════════════════════════════════════════════════════════════════════════
// 📝 سياسات الشركة - Company Policies
// ═══════════════════════════════════════════════════════════════════════════════

// 👥 Public for employees (read only)
router.get('/policies', verifyToken.authenticateToken, hrController.getPolicies);

// 🔒 Protected Management Routes
router.post('/policies', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.createPolicy);
router.put('/policies/:id', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.updatePolicy);
router.delete('/policies/:id', verifyToken.authenticateToken, verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']), hrController.deletePolicy);

// ═══════════════════════════════════════════════════════════════════════════════
// 🌐 Unified Dashboard - لوحة التحكم الموحدة
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/my-companies/today', verifyToken.authenticateToken, hrController.getMyCompaniesToday);
router.get('/my-companies/attendance-report', verifyToken.authenticateToken, hrController.getMyCompaniesAttendanceReport);
router.get('/my-companies/export', verifyToken.authenticateToken, hrController.exportMyCompaniesReport);

// Central error handler for all HR routes - MUST be last
router.use(handleHRError);

module.exports = router;
