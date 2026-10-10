const express = require('express');
const router = express.Router();
const controller = require('../controller/academyController');
const { authenticateToken, optionalAuth } = require('../utils/verifyToken');
const checkAppAccess = require('../middleware/checkAppAccess');

const instructorAuth = [authenticateToken, checkAppAccess('academy-app')];

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
router.get('/lessons/:id/content', optionalAuth, controller.getLessonContent);
router.post('/courses/:courseId/enroll', optionalAuth, controller.enrollStudent);

// Student Actions
router.post('/lessons/:id/complete', optionalAuth, controller.completeLesson);
router.post('/lessons/:id/submit-quiz', optionalAuth, controller.submitQuiz);
router.post('/lessons/:id/submit-exercise', optionalAuth, controller.submitExercise);
router.post('/lessons/:id/coach-chat', optionalAuth, controller.askCoach);

// Instructor Submissions Review
router.get('/courses/:id/submissions', instructorAuth, controller.getCourseSubmissions);
router.get('/lessons/:id/submissions', instructorAuth, controller.getLessonSubmissions);
router.post('/submissions/:id/review', instructorAuth, controller.reviewSubmission);

// Admin: Suspend / Reactivate student enrollment
router.post('/enrollments/:enrollmentId/suspend', instructorAuth, controller.suspendEnrollment);
router.post('/enrollments/:enrollmentId/reactivate', instructorAuth, controller.reactivateEnrollment);

// Certificates
router.get('/certificates/:enrollmentId/view', controller.renderCertificate);

module.exports = router;
