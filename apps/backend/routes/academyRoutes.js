const express = require('express');
const router = express.Router();
const controller = require('../controller/academyController');
const { authenticateToken, optionalAuth } = require('../utils/verifyToken');
const checkAppAccess = require('../middleware/checkAppAccess');
const { extractSubdomainMiddleware } = require('../middleware/subdomainMiddleware');
const rateLimit = require('express-rate-limit');

// 🌐 Multi-tenant Subdomain Resolution
router.use(extractSubdomainMiddleware);

const instructorAuth = [authenticateToken, checkAppAccess('academy-app')];

// 🚦 Rate limiters for Student Portal
const studentAuthLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'تجاوزت الحد المسموح لمحاولات الدخول. حاول بعد عدة دقائق.' },
});

const studentVerifyLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'تجاوزت الحد المسموح لمحاولات التحقق من الدفع. حاول بعد عدة دقائق.' },
});

const studentContentLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'تجاوزت الحد المسموح لتصفح المحتوى. حاول بعد دقيقة.' },
});

// 🔒 limiter لصفحة الشهادة العامة (تمنع تعداد المعرفات وسحب البيانات)
const certificateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'تجاوزت الحد المسموح لعرض الشهادات. حاول بعد دقيقة.' },
});

// -------------------------------------------------------------
// Instructor / Company Course Management (Protected)
// -------------------------------------------------------------
router.post('/courses', instructorAuth, controller.createCourse);
router.get('/courses', instructorAuth, controller.getCourses);
router.get('/courses/:id', instructorAuth, controller.getCourseDetails);
router.put('/courses/:id', instructorAuth, controller.updateCourse);
router.delete('/courses/:id', instructorAuth, controller.deleteCourse);
router.get('/store-products', instructorAuth, controller.getStoreProducts);
router.post('/sync-order-enrollment', instructorAuth, controller.syncOrderEnrollment);

// Modules & Lessons
router.post('/courses/:courseId/modules', instructorAuth, controller.addModule);
router.put('/modules/:id', instructorAuth, controller.updateModule);
router.delete('/modules/:id', instructorAuth, controller.deleteModule);

router.post('/modules/:moduleId/lessons', instructorAuth, controller.addLesson);
router.put('/lessons/:id', instructorAuth, controller.updateLesson);
router.delete('/lessons/:id', instructorAuth, controller.deleteLesson);
router.post('/lessons/:id/quiz', instructorAuth, controller.saveLessonQuiz);

// Progress & Analytics for Instructor
router.get('/courses/:id/students', instructorAuth, controller.getStudentsProgress);

// -------------------------------------------------------------
// Student Portal & Catalog (Public / Token Protected)
// -------------------------------------------------------------
router.get('/catalog', optionalAuth, controller.getPublishedCatalog);
router.get('/my-courses', optionalAuth, controller.getMyCourses);
router.get('/courses/:id/outline', optionalAuth, controller.getCourseOutline);
router.get('/lessons/:id/content', studentContentLimiter, optionalAuth, controller.getLessonContent);
router.post('/courses/:courseId/enroll', optionalAuth, controller.enrollStudent);

// Student Authentication & Clean Digital Checkout
router.post('/student/send-code', studentAuthLimiter, controller.sendStudentLoginCode);
router.post('/student/login', studentAuthLimiter, controller.studentLogin);
router.get('/student/me', authenticateToken, controller.getStudentProfile);
router.post('/courses/:courseId/checkout', controller.checkoutCourse);
router.post('/courses/:courseId/verify-payment', studentVerifyLimiter, controller.verifyCoursePayment);

// Student Actions (Protected by Student JWT Token)
router.post('/lessons/:id/complete', authenticateToken, controller.completeLesson);
router.post('/lessons/:id/submit-quiz', authenticateToken, controller.submitQuiz);
router.post('/lessons/:id/submit-exercise', authenticateToken, controller.submitExercise);
router.post('/lessons/:id/coach-chat', authenticateToken, controller.askCoach);

// Instructor Submissions Review
router.get('/courses/:id/submissions', instructorAuth, controller.getCourseSubmissions);
router.get('/lessons/:id/submissions', instructorAuth, controller.getLessonSubmissions);
router.post('/submissions/:id/review', instructorAuth, controller.reviewSubmission);

// Admin: Suspend / Reactivate student enrollment
router.post('/enrollments/:enrollmentId/suspend', instructorAuth, controller.suspendEnrollment);
router.post('/enrollments/:enrollmentId/reactivate', instructorAuth, controller.reactivateEnrollment);

// Certificates
router.get('/certificates/:enrollmentId/view', certificateLimiter, controller.renderCertificate);

module.exports = router;
