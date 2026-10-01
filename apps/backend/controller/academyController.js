const academyService = require('../services/academyService');

function getCompanyId(req) {
  return (
    req.user?.companyId ||
    req.headers['x-company-id'] ||
    req.query.companyId ||
    req.body?.companyId ||
    null
  );
}

// -------------------------------------------------------------
// Course Management (Admin / Instructor)
// -------------------------------------------------------------

exports.createCourse = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ error: 'Company ID is required' });

    // Only SUPER_ADMIN can create global (platform-wide) courses
    const isGlobal = req.body.isGlobal && req.user?.role === 'SUPER_ADMIN' ? true : false;

    const course = await academyService.createCourse({
      companyId,
      ...req.body,
      isGlobal,
    });

    res.status(201).json({ success: true, course });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.updateCourse = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const { id } = req.params;

    // Only SUPER_ADMIN can toggle isGlobal flag
    const data = { ...req.body };
    if (data.isGlobal !== undefined && req.user?.role !== 'SUPER_ADMIN') {
      delete data.isGlobal;
    }

    const course = await academyService.updateCourse(id, companyId, data);
    res.json({ success: true, course });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.deleteCourse = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const { id } = req.params;
    await academyService.deleteCourse(id, companyId);
    res.json({ success: true, message: 'Course deleted successfully' });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.getCourses = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ error: 'Company ID is required' });

    const courses = await academyService.getCourses(companyId);
    res.json({ success: true, courses });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getCourseDetails = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const { id } = req.params;
    const course = await academyService.getCourseDetails(id, companyId);
    res.json({ success: true, course });
  } catch (err) {
    res.status(404).json({ success: false, error: err.message });
  }
};

// -------------------------------------------------------------
// Modules & Lessons
// -------------------------------------------------------------

exports.addModule = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const { courseId } = req.params;
    const moduleItem = await academyService.addModule({
      companyId,
      courseId,
      ...req.body,
    });
    res.status(201).json({ success: true, module: moduleItem });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.updateModule = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const { id } = req.params;
    const moduleItem = await academyService.updateModule(id, companyId, req.body);
    res.json({ success: true, module: moduleItem });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.deleteModule = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const { id } = req.params;
    await academyService.deleteModule(id, companyId);
    res.json({ success: true, message: 'Module deleted' });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.addLesson = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const { moduleId } = req.params;
    const lesson = await academyService.addLesson({
      companyId,
      moduleId,
      ...req.body,
    });
    res.status(201).json({ success: true, lesson });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.updateLesson = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const { id } = req.params;
    const lesson = await academyService.updateLesson(id, companyId, req.body);
    res.json({ success: true, lesson });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.deleteLesson = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const { id } = req.params;
    await academyService.deleteLesson(id, companyId);
    res.json({ success: true, message: 'Lesson deleted' });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.saveLessonQuiz = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const { id } = req.params; // lessonId
    const quiz = await academyService.saveLessonQuiz(id, companyId, req.body);
    res.json({ success: true, quiz });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// -------------------------------------------------------------
// Student & Catalog Endpoints
// -------------------------------------------------------------

exports.getPublishedCatalog = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ error: 'Company ID is required' });

    const studentUserId = req.user?.id || null;
    const customerId = req.query.customerId || req.headers['x-customer-id'] || null;
    const studentPhone = req.query.phone || req.user?.phone || null;

    let customerTags = [];
    if (req.user?.tags && Array.isArray(req.user.tags)) {
      customerTags = req.user.tags;
    } else if (req.query.tags) {
      customerTags = String(req.query.tags)
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
    }

    const courses = await academyService.getPublishedCatalog({
      companyId,
      studentUserId,
      customerId,
      studentPhone,
      customerTags,
    });
    res.json({ success: true, courses });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getMyCourses = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const studentUserId = req.user?.id || null;
    const customerId = req.query.customerId || req.headers['x-customer-id'] || null;
    const studentPhone = req.query.phone || req.user?.phone || null;

    const enrollments = await academyService.getMyEnrolledCourses({
      companyId,
      studentUserId,
      customerId,
      studentPhone,
    });

    res.json({ success: true, enrollments });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getCourseOutline = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const { id } = req.params; // courseId
    const studentUserId = req.user?.id || null;
    const customerId = req.query.customerId || req.headers['x-customer-id'] || null;
    const studentPhone = req.query.phone || null;

    const data = await academyService.getCourseOutlineWithProgress({
      courseId: id,
      companyId,
      studentUserId,
      customerId,
      studentPhone,
    });

    res.json({ success: true, ...data });
  } catch (err) {
    res.status(404).json({ success: false, error: err.message });
  }
};

exports.getLessonContent = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const { id } = req.params; // lessonId
    const studentUserId = req.user?.id || null;
    const customerId = req.query.customerId || req.headers['x-customer-id'] || null;
    const studentPhone = req.query.phone || null;

    const data = await academyService.getLessonContent({
      lessonId: id,
      companyId,
      studentUserId,
      customerId,
      studentPhone,
    });

    res.json({ success: true, ...data });
  } catch (err) {
    res.status(403).json({ success: false, error: err.message });
  }
};

exports.enrollStudent = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const { courseId } = req.params;
    const { studentName, studentPhone, studentEmail, customerId, orderId, subscriptionDays } = req.body;

    // الأدمن المصادق عليه يستطيع التسجيل بدون دفع
    const byAdmin = Boolean(req.user?.id);

    const enrollment = await academyService.enrollStudent({
      companyId,
      courseId,
      studentUserId: req.user?.id || null,
      customerId: customerId || null,
      orderId: orderId || null,
      studentName: studentName || req.user?.name,
      studentPhone: studentPhone || req.user?.phone,
      studentEmail: studentEmail || req.user?.email,
      subscriptionDays: subscriptionDays ? Number(subscriptionDays) : null,
      byAdmin,
    });

    res.status(201).json({ success: true, enrollment });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.suspendEnrollment = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const { enrollmentId } = req.params;
    const enrollment = await academyService.suspendEnrollment({ enrollmentId, companyId });
    res.json({ success: true, enrollment });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.reactivateEnrollment = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const { enrollmentId } = req.params;
    const enrollment = await academyService.reactivateEnrollment({ enrollmentId, companyId });
    res.json({ success: true, enrollment });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.completeLesson = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const { id } = req.params; // lessonId
    const { enrollmentId } = req.body;

    const progress = await academyService.completeLessonManual({
      lessonId: id,
      enrollmentId,
      companyId,
    });

    res.json({ success: true, progress });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.submitQuiz = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const { id } = req.params; // lessonId
    const { enrollmentId, answers } = req.body;

    const result = await academyService.submitLessonQuiz({
      lessonId: id,
      enrollmentId,
      companyId,
      answers,
    });

    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.askCoach = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const { id } = req.params; // lessonId
    const { message, quizContext } = req.body;

    const result = await academyService.askCoachOnLesson({
      lessonId: id,
      companyId,
      userMessage: message,
      quizContext,
      userId: req.user?.id || req.user?.userId || null,
    });

    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.getStudentsProgress = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const { id } = req.params; // courseId

    const students = await academyService.getStudentsProgress(id, companyId);
    res.json({ success: true, students });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.renderCertificate = async (req, res) => {
  try {
    const { enrollmentId } = req.params;
    const db = academyService.getDb();
    const cert = await db.academyCertificate.findUnique({
      where: { enrollmentId },
      include: {
        enrollment: true,
      },
    });

    if (!cert) return res.status(404).send('Certificate not found');

    const html = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>شهادة إتمام — ${cert.courseTitle}</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #0f172a; color: #f8fafc; margin: 0; padding: 40px; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
    .cert-card { background: linear-gradient(135deg, #1e293b, #0f172a); border: 4px double #38bdf8; border-radius: 24px; padding: 60px 80px; max-width: 800px; text-align: center; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7); position: relative; }
    .badge { display: inline-block; padding: 8px 20px; background: rgba(56, 189, 248, 0.15); border: 1px solid #38bdf8; border-radius: 9999px; color: #38bdf8; font-weight: bold; font-size: 14px; margin-bottom: 24px; letter-spacing: 1px; }
    h1 { font-size: 38px; margin: 0 0 16px; color: #ffffff; }
    p.lead { font-size: 18px; color: #94a3b8; margin: 0 0 28px; }
    h2.student { font-size: 32px; color: #38bdf8; margin: 20px 0; border-bottom: 2px solid rgba(56, 189, 248, 0.2); padding-bottom: 12px; display: inline-block; min-width: 300px; }
    p.course { font-size: 20px; color: #cbd5e1; margin: 24px 0 40px; }
    .meta-row { display: flex; justify-content: space-between; border-top: 1px solid #334155; padding-top: 24px; font-size: 14px; color: #64748b; }
    .print-btn { margin-top: 30px; background: #0284c7; color: white; border: none; padding: 12px 28px; border-radius: 12px; font-size: 16px; font-weight: bold; cursor: pointer; }
    @media print { .print-btn { display: none; } body { background: white; color: black; } .cert-card { border-color: #0284c7; } }
  </style>
</head>
<body>
  <div class="cert-card">
    <div class="badge">MAXP ACADEMY CERTIFICATE OF COMPLETION</div>
    <h1>شهادة إتمام معتمدة</h1>
    <p class="lead">تشهد أكاديمية ماكس بي بأن المتدرب:</p>
    <h2 class="student">${cert.studentName}</h2>
    <p class="course">قد أتم بنجاح كافة متطلبات وتطبيقات الدورة التدريبية المكثفة:<br><strong style="color: #f1f5f9; font-size: 24px;">${cert.courseTitle}</strong></p>
    <div class="meta-row">
      <span>رقم الشهادة: <strong>${cert.certificateNumber}</strong></span>
      <span>تاريخ الإصدار: <strong>${new Date(cert.issuedAt).toLocaleDateString('ar-EG')}</strong></span>
    </div>
    <button class="print-btn" onclick="window.print()">طباعة / حفظ كـ PDF</button>
  </div>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (err) {
    res.status(500).send('Error generating certificate');
  }
};

// -------------------------------------------------------------
// Exercise Submissions & Review Endpoints (M2)
// -------------------------------------------------------------

exports.submitExercise = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const { id } = req.params; // lessonId
    const { enrollmentId, submissionText, submissionUrl } = req.body;
    const studentUserId = req.user?.id || null;
    const customerId = req.query.customerId || req.headers['x-customer-id'] || null;

    const result = await academyService.submitLessonExercise({
      lessonId: id,
      enrollmentId,
      companyId,
      studentUserId,
      customerId,
      submissionText,
      submissionUrl,
    });

    res.status(201).json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.getLessonSubmissions = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const { id } = req.params; // lessonId
    const { status } = req.query;

    const submissions = await academyService.getLessonSubmissions({
      lessonId: id,
      companyId,
      status,
    });

    res.json({ success: true, submissions });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.getCourseSubmissions = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const { id } = req.params; // courseId
    const { status } = req.query;

    const submissions = await academyService.getCourseSubmissions({
      courseId: id,
      companyId,
      status,
    });

    res.json({ success: true, submissions });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.reviewSubmission = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const { id } = req.params; // submissionId
    const { status, instructorNote } = req.body;
    const reviewedBy = req.user?.name || req.user?.email || 'مدرب ماكس بي';

    const submission = await academyService.reviewSubmission({
      submissionId: id,
      companyId,
      reviewedBy,
      status,
      instructorNote,
    });

    res.json({ success: true, submission });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

