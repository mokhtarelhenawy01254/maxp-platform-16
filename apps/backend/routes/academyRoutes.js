const express = require('express');
const router = express.Router();
const controller = require('../controller/academyController');
const { authenticateToken, optionalAuth } = require('../utils/verifyToken');

// -------------------------------------------------------------
// Instructor / Company Course Management (Protected)
// -------------------------------------------------------------
router.post('/courses', authenticateToken, controller.createCourse);
router.get('/courses', authenticateToken, controller.getCourses);
router.get('/courses/:id', authenticateToken, controller.getCourseDetails);
router.put('/courses/:id', authenticateToken, controller.updateCourse);
router.delete('/courses/:id', authenticateToken, controller.deleteCourse);

// Modules & Lessons
router.post('/courses/:courseId/modules', authenticateToken, controller.addModule);
router.put('/modules/:id', authenticateToken, controller.updateModule);
router.delete('/modules/:id', authenticateToken, controller.deleteModule);

router.post('/modules/:moduleId/lessons', authenticateToken, controller.addLesson);
router.put('/lessons/:id', authenticateToken, controller.updateLesson);
router.delete('/lessons/:id', authenticateToken, controller.deleteLesson);
router.post('/lessons/:id/quiz', authenticateToken, controller.saveLessonQuiz);

// Progress & Analytics for Instructor
router.get('/courses/:id/students', authenticateToken, controller.getStudentsProgress);

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
router.get('/courses/:id/submissions', authenticateToken, controller.getCourseSubmissions);
router.get('/lessons/:id/submissions', authenticateToken, controller.getLessonSubmissions);
router.post('/submissions/:id/review', authenticateToken, controller.reviewSubmission);

// Certificates
router.get('/certificates/:enrollmentId/view', controller.renderCertificate);

module.exports = router;
