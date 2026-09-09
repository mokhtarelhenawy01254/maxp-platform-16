const express = require('express');
const router = express.Router();
const controller = require('../controller/academyController');
const verifyToken = require('../utils/verifyToken');

// Optional auth helper: if token provided, decode user; otherwise proceed
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }
  verifyToken(req, res, next);
};

// -------------------------------------------------------------
// Instructor / Company Course Management (Protected)
// -------------------------------------------------------------
router.post('/courses', verifyToken, controller.createCourse);
router.get('/courses', verifyToken, controller.getCourses);
router.get('/courses/:id', verifyToken, controller.getCourseDetails);
router.put('/courses/:id', verifyToken, controller.updateCourse);
router.delete('/courses/:id', verifyToken, controller.deleteCourse);

// Modules & Lessons
router.post('/courses/:courseId/modules', verifyToken, controller.addModule);
router.put('/modules/:id', verifyToken, controller.updateModule);
router.delete('/modules/:id', verifyToken, controller.deleteModule);

router.post('/modules/:moduleId/lessons', verifyToken, controller.addLesson);
router.put('/lessons/:id', verifyToken, controller.updateLesson);
router.delete('/lessons/:id', verifyToken, controller.deleteLesson);
router.post('/lessons/:id/quiz', verifyToken, controller.saveLessonQuiz);

// Progress & Analytics for Instructor
router.get('/courses/:id/students', verifyToken, controller.getStudentsProgress);

// -------------------------------------------------------------
// Student Portal & Catalog (Public / Token Protected)
// -------------------------------------------------------------
router.get('/catalog', optionalAuth, controller.getPublishedCatalog);
router.get('/courses/:id/outline', optionalAuth, controller.getCourseOutline);
router.get('/lessons/:id/content', optionalAuth, controller.getLessonContent);
router.post('/courses/:courseId/enroll', optionalAuth, controller.enrollStudent);

// Student Actions
router.post('/lessons/:id/complete', optionalAuth, controller.completeLesson);
router.post('/lessons/:id/submit-quiz', optionalAuth, controller.submitQuiz);
router.post('/lessons/:id/coach-chat', optionalAuth, controller.askCoach);

// Certificates
router.get('/certificates/:enrollmentId/view', controller.renderCertificate);

module.exports = router;
